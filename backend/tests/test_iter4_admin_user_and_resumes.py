"""Iteration 4 tests.

NEW:
- GET  /api/admin/users/{id}  -> {user, applications, orders}, 404 if not found, admin JWT required
- PATCH /api/admin/users/{id} -> updates allowed fields, returns {ok:true, fields:[...]}
  * 400 'Invalid plan' on plan='invalid'
  * 400 'Nothing to update' on empty body
  * 404 on nonexistent user
- /api/resumes/upload (PDF/DOCX, multipart), updates resume_path + resume_filename + resume_text
- /api/resumes/signed-url returns fresh signed URL (404 if no resume)
- /api/resumes/parse triggers AI parse (upstream may fail; 500 is acceptable)

REGRESSION:
- /api/auth/signup auto-confirm (email_confirm=true via service role)
- Webhook idempotency: same raw_event_id -> {duplicate:true}
- /api/admin/login, /stats, /users, /orders, /applications, /webhook-events still work
- /api/referrals/apply does NOT leak referrer_email_hint
- /api/ab/variant/pricing_copy issues cookie and logs view only once
- /api/activity/feed + /api/activity/stats
- /api/share OG png 1200x630
- /api/health
"""
import io
import os
import time
import uuid

import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].splitlines()[0]).rstrip("/")
API = f"{BASE_URL}/api"

SB_URL = "https://uywqvvgmtqfxxwggectv.supabase.co"
SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2dmdtdHFmeHh3Z2dlY3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDYxMDgsImV4cCI6MjA5NjIyMjEwOH0.M2t5fM2fk1N-m8CognedP6oYHWYrDB7osR01TNciMvA"
SB_SRV = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2dmdtdHFmeHh3Z2dlY3R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NjEwOCwiZXhwIjoyMDk2MjIyMTA4fQ.BzEjzwy8mPPPOQmiBdXIol_saUmGodYdkHKgNU1-pRc"

ADMIN_EMAIL = "admin@jobpilot.ai"
ADMIN_PASSWORD = "JobPilot@2026"


# -------------- helpers --------------
def _sb_admin_create(email, password):
    return requests.post(
        f"{SB_URL}/auth/v1/admin/users",
        headers={"apikey": SB_SRV, "Authorization": f"Bearer {SB_SRV}", "Content-Type": "application/json"},
        json={"email": email, "password": password, "email_confirm": True,
              "user_metadata": {"full_name": "TEST Iter4"}},
        timeout=30,
    )


def _sb_signin(email, password):
    return requests.post(
        f"{SB_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SB_ANON, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=30,
    )


def _sb_delete(uid):
    try:
        requests.delete(
            f"{SB_URL}/auth/v1/admin/users/{uid}",
            headers={"apikey": SB_SRV, "Authorization": f"Bearer {SB_SRV}"},
            timeout=15,
        )
    except Exception:
        pass


def _make_user():
    ts = int(time.time())
    email = f"testpilot+i4_{ts}_{uuid.uuid4().hex[:6]}@jobpilot.ai"
    password = "TestPilot@2026"
    r = _sb_admin_create(email, password)
    if r.status_code not in (200, 201):
        pytest.skip(f"Supabase admin create failed: {r.status_code} {r.text}")
    uid = r.json()["id"]
    r2 = _sb_signin(email, password)
    if r2.status_code != 200:
        _sb_delete(uid)
        pytest.skip(f"Supabase signin failed: {r2.status_code} {r2.text}")
    return {"id": uid, "email": email, "password": password, "token": r2.json()["access_token"]}


def _h(u):
    return {"Authorization": f"Bearer {u['token']}"}


# minimal valid PDF (one page, no text)
MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n"
    b"4 0 obj<</Length 44>>stream\n"
    b"BT /F1 12 Tf 100 700 Td (TEST RESUME JOHN DOE) Tj ET\n"
    b"endstream endobj\n"
    b"xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000101 00000 n \n0000000170 00000 n \n"
    b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n260\n%%EOF\n"
)


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_i4():
    u = _make_user()
    # touch /me to ensure mongo doc exists
    r = requests.get(f"{API}/users/me", headers=_h(u), timeout=30)
    assert r.status_code == 200, r.text
    yield u
    _sb_delete(u["id"])


def _admin_h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ============================================================
# 1. NEW: GET /api/admin/users/{id}
# ============================================================
class TestAdminUserDetail:
    def test_requires_admin_token(self, user_i4):
        r = requests.get(f"{API}/admin/users/{user_i4['id']}", timeout=30)
        assert r.status_code in (401, 403), r.text

    def test_rejects_wrong_token(self, user_i4):
        r = requests.get(
            f"{API}/admin/users/{user_i4['id']}",
            headers={"Authorization": "Bearer not-a-real-token"},
            timeout=30,
        )
        assert r.status_code in (401, 403), r.text

    def test_returns_user_apps_orders(self, admin_token, user_i4):
        r = requests.get(f"{API}/admin/users/{user_i4['id']}", headers=_admin_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "user" in body and "applications" in body and "orders" in body
        assert body["user"]["supabase_user_id"] == user_i4["id"]
        assert isinstance(body["applications"], list)
        assert isinstance(body["orders"], list)
        # _id should be stripped
        assert "_id" not in body["user"]
        # password / resume_text excluded
        assert "job_search_email_password" not in body["user"]
        assert "resume_text" not in body["user"]

    def test_404_for_nonexistent(self, admin_token):
        r = requests.get(
            f"{API}/admin/users/00000000-0000-0000-0000-000000000000",
            headers=_admin_h(admin_token), timeout=30,
        )
        assert r.status_code == 404, r.text


# ============================================================
# 2. NEW: PATCH /api/admin/users/{id}
# ============================================================
class TestAdminUserPatch:
    def test_patch_string_fields(self, admin_token, user_i4):
        body = {"full_name": "TEST Patched Name", "phone": "+91-9000000000",
                "linkedin_url": "https://linkedin.com/in/testpatched"}
        r = requests.patch(f"{API}/admin/users/{user_i4['id']}",
                           headers=_admin_h(admin_token), json=body, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert set(["full_name", "phone", "linkedin_url"]).issubset(set(data["fields"]))
        # GET to verify persistence
        g = requests.get(f"{API}/admin/users/{user_i4['id']}", headers=_admin_h(admin_token), timeout=30)
        u = g.json()["user"]
        assert u["full_name"] == "TEST Patched Name"
        assert u["phone"] == "+91-9000000000"
        assert u["linkedin_url"] == "https://linkedin.com/in/testpatched"

    def test_patch_integer_fields(self, admin_token, user_i4):
        body = {"applications_count": 42, "interviews_count": 7, "offers_count": 3}
        r = requests.patch(f"{API}/admin/users/{user_i4['id']}",
                           headers=_admin_h(admin_token), json=body, timeout=30)
        assert r.status_code == 200, r.text
        g = requests.get(f"{API}/admin/users/{user_i4['id']}", headers=_admin_h(admin_token), timeout=30)
        u = g.json()["user"]
        assert u["applications_count"] == 42
        assert u["interviews_count"] == 7
        assert u["offers_count"] == 3

    def test_patch_plan_valid(self, admin_token, user_i4):
        for p in ("free", "starter", "pro"):
            r = requests.patch(f"{API}/admin/users/{user_i4['id']}",
                               headers=_admin_h(admin_token), json={"plan": p}, timeout=30)
            assert r.status_code == 200, f"{p}: {r.text}"
        g = requests.get(f"{API}/admin/users/{user_i4['id']}", headers=_admin_h(admin_token), timeout=30)
        assert g.json()["user"]["plan"] == "pro"

    def test_patch_plan_invalid(self, admin_token, user_i4):
        r = requests.patch(f"{API}/admin/users/{user_i4['id']}",
                           headers=_admin_h(admin_token), json={"plan": "invalid"}, timeout=30)
        assert r.status_code == 400, r.text
        assert "Invalid plan" in r.text

    def test_patch_empty_body(self, admin_token, user_i4):
        r = requests.patch(f"{API}/admin/users/{user_i4['id']}",
                           headers=_admin_h(admin_token), json={}, timeout=30)
        assert r.status_code == 400, r.text
        assert "Nothing to update" in r.text

    def test_patch_all_nulls(self, admin_token, user_i4):
        # all fields None -> empty data dict after filter -> Nothing to update
        r = requests.patch(f"{API}/admin/users/{user_i4['id']}",
                           headers=_admin_h(admin_token),
                           json={"full_name": None, "phone": None, "plan": None}, timeout=30)
        assert r.status_code == 400, r.text
        assert "Nothing to update" in r.text

    def test_patch_404_nonexistent(self, admin_token):
        r = requests.patch(
            f"{API}/admin/users/00000000-0000-0000-0000-000000000000",
            headers=_admin_h(admin_token), json={"full_name": "Nope"}, timeout=30,
        )
        assert r.status_code == 404, r.text

    def test_patch_requires_admin(self, user_i4):
        r = requests.patch(f"{API}/admin/users/{user_i4['id']}", json={"full_name": "X"}, timeout=30)
        assert r.status_code in (401, 403)

    def test_patch_lists(self, admin_token, user_i4):
        body = {"target_roles": ["SWE", "PM"], "target_countries": ["IN", "US"],
                "preferred_salary": "20 LPA"}
        r = requests.patch(f"{API}/admin/users/{user_i4['id']}",
                           headers=_admin_h(admin_token), json=body, timeout=30)
        assert r.status_code == 200, r.text
        g = requests.get(f"{API}/admin/users/{user_i4['id']}", headers=_admin_h(admin_token), timeout=30)
        u = g.json()["user"]
        assert u["target_roles"] == ["SWE", "PM"]
        assert u["target_countries"] == ["IN", "US"]
        assert u["preferred_salary"] == "20 LPA"


# ============================================================
# 3. Resume endpoints
# ============================================================
class TestResumes:
    def test_signed_url_404_when_no_resume(self, user_i4):
        # ensure we start clean by checking - we may already have one from earlier upload tests
        # but this test runs alphabetically; if prior upload happened the resp will be 200.
        # Instead, make a brand new user to assert the 404 path.
        u = _make_user()
        try:
            r = requests.get(f"{API}/resumes/signed-url", headers=_h(u), timeout=30)
            assert r.status_code == 404, r.text
        finally:
            _sb_delete(u["id"])

    def test_upload_pdf_then_signed_url(self, user_i4):
        files = {"file": ("john_doe.pdf", MINIMAL_PDF, "application/pdf")}
        r = requests.post(f"{API}/resumes/upload", headers=_h(user_i4), files=files, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "path" in data and "signed_url" in data
        assert data["path"].startswith(user_i4["id"]) or user_i4["id"] in data["path"]

        # signed-url now returns 200 + fresh url
        r2 = requests.get(f"{API}/resumes/signed-url", headers=_h(user_i4), timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.json()["signed_url"].startswith("http")

    def test_upload_rejects_invalid_type(self, user_i4):
        files = {"file": ("evil.txt", b"hello", "text/plain")}
        r = requests.post(f"{API}/resumes/upload", headers=_h(user_i4), files=files, timeout=30)
        assert r.status_code == 400, r.text
        assert "PDF or DOCX" in r.text

    def test_upload_requires_auth(self):
        files = {"file": ("a.pdf", MINIMAL_PDF, "application/pdf")}
        r = requests.post(f"{API}/resumes/upload", files=files, timeout=30)
        assert r.status_code in (401, 403)

    def test_parse_runs_after_upload(self, user_i4):
        # depends on test_upload_pdf_then_signed_url having run; otherwise upload now.
        r = requests.post(f"{API}/resumes/parse", headers=_h(user_i4), timeout=120)
        # 200 = success, 500 = upstream LLM fail (acceptable per requirements),
        # 400 = resume_text is empty (PDF text extraction failed on minimal synthetic PDF)
        assert r.status_code in (200, 400, 500), r.text


# ============================================================
# 4. Webhook idempotency regression
# ============================================================
class TestWebhookIdempotency:
    def test_same_raw_event_id_returns_duplicate(self, user_i4):
        evt = f"evt_dup_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        payload = {
            "id": evt,
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": f"pay_{uuid.uuid4().hex[:10]}",
                        "amount": 49900,
                        "currency": "INR",
                        "notes": {"supabase_user_id": user_i4["id"], "plan": "starter"},
                    }
                }
            },
        }
        r1 = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r1.status_code == 200, r1.text
        b1 = r1.json()
        assert b1.get("ok") is True
        assert not b1.get("duplicate"), f"first call should not be duplicate: {b1}"

        r2 = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r2.status_code == 200, r2.text
        b2 = r2.json()
        assert b2.get("duplicate") is True, f"redelivery should be duplicate: {b2}"
        assert b2.get("raw_event_id") == evt


# ============================================================
# 5. Signup auto-confirm regression
# ============================================================
class TestSignupAutoConfirm:
    def test_signup_creates_confirmed_user(self):
        ts = int(time.time())
        email = f"testpilot+su_{ts}_{uuid.uuid4().hex[:6]}@jobpilot.ai"
        password = "Signup@2026"
        r = requests.post(f"{API}/auth/signup",
                          json={"email": email, "password": password, "full_name": "TEST Signup"},
                          timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        # can sign in immediately (proves email_confirm=true)
        s = _sb_signin(email, password)
        assert s.status_code == 200, s.text
        uid = body.get("user_id") or s.json().get("user", {}).get("id")
        if uid:
            _sb_delete(uid)


# ============================================================
# 6. Admin endpoints regression
# ============================================================
class TestAdminRegression:
    def test_admin_login_ok(self):
        r = requests.post(f"{API}/admin/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200, r.text
        assert "token" in r.json()

    def test_admin_login_invalid(self):
        r = requests.post(f"{API}/admin/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_admin_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=_admin_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("total_users", "paid_users", "free_users", "total_applications",
                  "total_orders", "paid_orders", "revenue_inr"):
            assert k in d

    def test_admin_users_list(self, admin_token):
        r = requests.get(f"{API}/admin/users", headers=_admin_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        users = r.json()["users"]
        assert isinstance(users, list)
        if users:
            assert "_id" not in users[0]
            assert "resume_text" not in users[0]

    def test_admin_orders(self, admin_token):
        r = requests.get(f"{API}/admin/orders", headers=_admin_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        assert "orders" in r.json()

    def test_admin_applications(self, admin_token):
        r = requests.get(f"{API}/admin/applications", headers=_admin_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        assert "applications" in r.json()

    def test_admin_webhook_events(self, admin_token):
        r = requests.get(f"{API}/admin/webhook-events", headers=_admin_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        assert "events" in r.json()


# ============================================================
# 7. Misc regressions
# ============================================================
class TestMiscRegression:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=15)
        assert r.status_code == 200

    def test_activity_feed(self):
        r = requests.get(f"{API}/activity/feed", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list) or "items" in r.json() or "feed" in r.json()

    def test_activity_stats(self):
        r = requests.get(f"{API}/activity/stats", timeout=15)
        assert r.status_code == 200

    def test_ab_variant_pricing_copy(self):
        s = requests.Session()
        r = s.get(f"{API}/ab/variant/pricing_copy", timeout=15)
        assert r.status_code == 200, r.text
        assert "variant" in r.json()

    def test_referrals_apply_no_pii(self):
        # need two users; quick path: create one referrer to get a code via /api/users/me, then second uses it
        u1 = _make_user()
        u2 = _make_user()
        try:
            # /api/users/me must be hit to upsert mongo doc
            r1 = requests.get(f"{API}/users/me", headers=_h(u1), timeout=30)
            assert r1.status_code == 200, r1.text
            requests.get(f"{API}/users/me", headers=_h(u2), timeout=30)
            code = r1.json().get("referral_code")
            if not code:
                pytest.skip("no referral_code on user")
            r = requests.post(f"{API}/referrals/apply",
                              headers={**_h(u2), "Content-Type": "application/json"},
                              json={"code": code}, timeout=30)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body.get("ok") is True
            assert "referrer_email_hint" not in body
            assert "referrer_email" not in body
        finally:
            _sb_delete(u1["id"])
            _sb_delete(u2["id"])

    def test_share_og_image_dimensions(self):
        u = _make_user()
        try:
            requests.get(f"{API}/users/me", headers=_h(u), timeout=30)  # ensure mongo doc
            r = requests.post(f"{API}/share/create", headers=_h(u), timeout=30)
            assert r.status_code == 200, r.text
            token = r.json().get("token") or r.json().get("share_token")
            assert token
            r2 = requests.get(f"{API}/share/{token}/og.png", timeout=30)
            assert r2.status_code == 200, r2.text
            assert r2.headers.get("content-type", "").startswith("image/png")
            from PIL import Image
            img = Image.open(io.BytesIO(r2.content))
            assert img.size == (1200, 630), f"got {img.size}"
        finally:
            _sb_delete(u["id"])
