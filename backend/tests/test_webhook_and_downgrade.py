"""Iteration 3 tests: Razorpay webhook + auto-downgrade + iter-2 regression fixes.

Covers:
- POST /api/payments/webhook event=payment.captured renews user (extends from current expiry / starts fresh)
- POST /api/payments/webhook missing notes -> {ok:true, ignored:true, reason:'missing notes'}
- POST /api/payments/webhook payment.failed -> sets last_payment_failed_at, NOT downgraded
- POST /api/payments/webhook subscription.cancelled -> logged
- All webhook calls are stored in db.webhook_events and admin can list them
- GET /api/admin/webhook-events requires admin JWT
- _ensure_user auto-downgrades starter->free if subscription_active_until in past; keeps plan if in future
- /api/payments/verify (existing flow) - already covered in iter-2 (skipped here, regression covered separately)
- REGRESSION: /api/ab/variant/pricing_copy logs 'view' only on first cookie issuance
- REGRESSION: /api/referrals/apply does NOT return referrer_email_hint
- REGRESSION: /api/health, /api/activity/feed, /api/activity/stats, /api/share/{token}/og.png 1200x630
"""
import io
import os
import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

SB_URL = "https://uywqvvgmtqfxxwggectv.supabase.co"
SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2dmdtdHFmeHh3Z2dlY3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDYxMDgsImV4cCI6MjA5NjIyMjEwOH0.M2t5fM2fk1N-m8CognedP6oYHWYrDB7osR01TNciMvA"
SB_SRV = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2dmdtdHFmeHh3Z2dlY3R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NjEwOCwiZXhwIjoyMDk2MjIyMTA4fQ.BzEjzwy8mPPPOQmiBdXIol_saUmGodYdkHKgNU1-pRc"

ADMIN_EMAIL = "admin@jobpilot.ai"
ADMIN_PASSWORD = "JobPilot@2026"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ---------- helpers ----------
def _make_sb_user():
    ts = int(time.time())
    email = f"testpilot+wh_{ts}_{uuid.uuid4().hex[:6]}@jobpilot.ai"
    password = "TestPilot@2026"
    r = requests.post(
        f"{SB_URL}/auth/v1/admin/users",
        headers={"apikey": SB_SRV, "Authorization": f"Bearer {SB_SRV}", "Content-Type": "application/json"},
        json={"email": email, "password": password, "email_confirm": True,
              "user_metadata": {"full_name": "TEST Pilot Webhook"}},
        timeout=30,
    )
    if r.status_code not in (200, 201):
        pytest.skip(f"Supabase admin create failed: {r.status_code} {r.text}")
    uid = r.json()["id"]
    r2 = requests.post(
        f"{SB_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SB_ANON, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=30,
    )
    if r2.status_code != 200:
        pytest.skip(f"Supabase signin failed: {r2.status_code} {r2.text}")
    return {"id": uid, "email": email, "token": r2.json()["access_token"]}


def _delete_sb_user(uid):
    try:
        requests.delete(
            f"{SB_URL}/auth/v1/admin/users/{uid}",
            headers={"apikey": SB_SRV, "Authorization": f"Bearer {SB_SRV}"},
            timeout=15,
        )
    except Exception:
        pass


def _h(u):
    return {"Authorization": f"Bearer {u['token']}", "Content-Type": "application/json"}


def _admin_token():
    r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def mongo_db():
    from pymongo import MongoClient
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture(scope="module")
def user_wh():
    """A real Supabase user used for webhook+auto-downgrade tests."""
    u = _make_sb_user()
    # Trigger /me to ensure user doc exists in mongo
    r = requests.get(f"{API}/users/me", headers=_h(u), timeout=30)
    assert r.status_code == 200, r.text
    yield u
    _delete_sb_user(u["id"])


@pytest.fixture(scope="module")
def admin_token():
    return _admin_token()


# ============ A. Webhook event handler ============
class TestWebhookRenewal:
    def test_webhook_payment_captured_renews_fresh(self, user_wh, mongo_db):
        """User starts on free plan. payment.captured event with valid notes should renew them to starter."""
        # Ensure baseline: user is on free, no subscription_active_until
        mongo_db.users.update_one(
            {"supabase_user_id": user_wh["id"]},
            {"$set": {"plan": "free", "applications_count": 5},
             "$unset": {"subscription_active_until": ""}},
        )
        payload = {
            "event": "payment.captured",
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "payload": {
                "payment": {
                    "entity": {
                        "id": f"pay_{uuid.uuid4().hex[:8]}",
                        "amount": 49900,
                        "status": "captured",
                        "notes": {"supabase_user_id": user_wh["id"], "plan": "starter"},
                    }
                }
            },
        }
        r = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("renewed") is True
        assert "until" in data
        # ~30d in future
        until = datetime.fromisoformat(data["until"].replace("Z", "+00:00"))
        delta = (until - datetime.now(timezone.utc)).days
        assert 28 <= delta <= 31, f"expected ~30d, got {delta}"
        # DB verification
        doc = mongo_db.users.find_one({"supabase_user_id": user_wh["id"]})
        assert doc["plan"] == "starter"
        assert doc["applications_count"] == 0  # reset on renewal
        assert doc.get("subscription_active_until")
        assert doc.get("last_renewal_at")

    def test_webhook_payment_captured_extends_from_current_expiry(self, user_wh, mongo_db):
        """If subscription_active_until is in the future, new expiry extends from THAT, not from now."""
        future = datetime.now(timezone.utc) + timedelta(days=15)
        mongo_db.users.update_one(
            {"supabase_user_id": user_wh["id"]},
            {"$set": {"plan": "starter", "subscription_active_until": future.isoformat(),
                      "applications_count": 7}},
        )
        payload = {
            "event": "payment.captured",
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "payload": {"payment": {"entity": {
                "id": f"pay_{uuid.uuid4().hex[:8]}", "amount": 49900, "status": "captured",
                "notes": {"supabase_user_id": user_wh["id"], "plan": "starter"},
            }}},
        }
        r = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        until = datetime.fromisoformat(r.json()["until"].replace("Z", "+00:00"))
        # expected ~45d from now (15 existing + 30 added)
        delta = (until - datetime.now(timezone.utc)).days
        assert 43 <= delta <= 46, f"expected ~45d (extended), got {delta}"
        # applications_count was reset
        doc = mongo_db.users.find_one({"supabase_user_id": user_wh["id"]})
        assert doc["applications_count"] == 0

    def test_webhook_missing_notes_returns_ignored(self):
        payload = {
            "event": "payment.captured",
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "payload": {"payment": {"entity": {
                "id": "pay_nonotes", "amount": 49900, "status": "captured",
                # notes missing entirely
            }}},
        }
        r = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert d.get("ignored") is True
        assert d.get("reason") == "missing notes"

    def test_webhook_payment_failed_sets_flag_does_not_downgrade(self, user_wh, mongo_db):
        # Pre-state: user is starter with future expiry
        future = datetime.now(timezone.utc) + timedelta(days=20)
        mongo_db.users.update_one(
            {"supabase_user_id": user_wh["id"]},
            {"$set": {"plan": "starter", "subscription_active_until": future.isoformat()},
             "$unset": {"last_payment_failed_at": ""}},
        )
        payload = {
            "event": "payment.failed",
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "payload": {"payment": {"entity": {
                "id": f"pay_{uuid.uuid4().hex[:8]}", "amount": 49900, "status": "failed",
                "notes": {"supabase_user_id": user_wh["id"], "plan": "starter"},
            }}},
        }
        r = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        doc = mongo_db.users.find_one({"supabase_user_id": user_wh["id"]})
        assert doc["plan"] == "starter", "plan should NOT be downgraded on payment.failed"
        assert doc.get("last_payment_failed_at")

    def test_webhook_subscription_cancelled_accepted(self):
        payload = {
            "event": "subscription.cancelled",
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "payload": {"subscription": {"entity": {"id": f"sub_{uuid.uuid4().hex[:8]}"}}},
        }
        r = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_webhook_works_without_signature_when_secret_empty(self):
        # No X-Razorpay-Signature header provided
        payload = {
            "event": "payment.captured",
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "payload": {"payment": {"entity": {
                "id": f"pay_{uuid.uuid4().hex[:8]}", "amount": 49900, "status": "captured",
                # no notes -> ignored, but still 200
            }}},
        }
        r = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r.status_code == 200


# ============ B. webhook_events collection + admin listing ============
class TestWebhookEventsLogging:
    def test_webhook_logs_to_db_and_admin_lists(self, mongo_db, admin_token):
        unique_evt_id = f"evt_uniq_{uuid.uuid4().hex[:10]}"
        payload = {
            "event": "payment.captured",
            "id": unique_evt_id,
            "payload": {"payment": {"entity": {
                "id": f"pay_{uuid.uuid4().hex[:8]}", "amount": 49900, "status": "captured",
                # missing notes -> should still be logged
            }}},
        }
        r = requests.post(f"{API}/payments/webhook", json=payload, timeout=30)
        assert r.status_code == 200
        # Direct DB verification
        doc = mongo_db.webhook_events.find_one({"raw_event_id": unique_evt_id})
        assert doc is not None, "webhook event not logged in db.webhook_events"
        assert doc["event"] == "payment.captured"

        # Admin listing endpoint
        r2 = requests.get(
            f"{API}/admin/webhook-events",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert "events" in data
        assert isinstance(data["events"], list)
        found = [e for e in data["events"] if e.get("raw_event_id") == unique_evt_id]
        assert len(found) >= 1, "admin listing should include our event"
        # Ensure _id not leaked
        for e in data["events"][:5]:
            assert "_id" not in e

    def test_admin_webhook_events_requires_auth(self):
        r = requests.get(f"{API}/admin/webhook-events", timeout=30)
        assert r.status_code in (401, 403)


# ============ C. Auto-downgrade on /api/users/me ============
class TestAutoDowngrade:
    def test_expired_starter_downgrades_to_free(self, user_wh, mongo_db):
        past = datetime.now(timezone.utc) - timedelta(days=2)
        mongo_db.users.update_one(
            {"supabase_user_id": user_wh["id"]},
            {"$set": {"plan": "starter", "subscription_active_until": past.isoformat()},
             "$unset": {"downgraded_at": ""}},
        )
        r = requests.get(f"{API}/users/me", headers=_h(user_wh), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "free", f"expected free after expiry, got {d['plan']}"
        assert d.get("downgraded_at")

    def test_future_starter_keeps_plan(self, user_wh, mongo_db):
        future = datetime.now(timezone.utc) + timedelta(days=10)
        mongo_db.users.update_one(
            {"supabase_user_id": user_wh["id"]},
            {"$set": {"plan": "starter", "subscription_active_until": future.isoformat()},
             "$unset": {"downgraded_at": ""}},
        )
        r = requests.get(f"{API}/users/me", headers=_h(user_wh), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "starter"


# ============ D. Regression: A/B view event logged only on first cookie issuance ============
class TestABViewOnceOnly:
    def test_ab_view_not_double_logged_for_same_cookie(self, mongo_db, admin_token):
        s = requests.Session()
        # First call - sets cookie + logs view
        r1 = s.get(f"{API}/ab/variant/pricing_copy", timeout=30)
        assert r1.status_code == 200
        variant = r1.json()["variant"]
        # Count views for this variant before/after second call
        before = mongo_db.ab_events.count_documents({"experiment": "pricing_copy", "variant": variant, "event": "view"})
        # Same cookie -> second call should NOT log
        r2 = s.get(f"{API}/ab/variant/pricing_copy", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["variant"] == variant  # sticky
        after = mongo_db.ab_events.count_documents({"experiment": "pricing_copy", "variant": variant, "event": "view"})
        assert after == before, f"view event was double-logged: before={before} after={after}"


# ============ E. Regression: referrals/apply does NOT leak email hint ============
class TestReferralsNoEmailHint:
    def test_apply_response_has_no_email_hint(self, mongo_db):
        # Create two fresh users
        ua = _make_sb_user()
        ub = _make_sb_user()
        try:
            # ensure both exist in mongo
            requests.get(f"{API}/users/me", headers=_h(ua), timeout=30)
            requests.get(f"{API}/users/me", headers=_h(ub), timeout=30)
            # get a's code
            ra = requests.get(f"{API}/referrals/mine", headers=_h(ua), timeout=30)
            assert ra.status_code == 200
            a_code = ra.json()["referral_code"]
            # b applies a's code
            r = requests.post(f"{API}/referrals/apply", headers=_h(ub), json={"code": a_code}, timeout=30)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body == {"ok": True}, f"expected only ok:true, got {body}"
            assert "referrer_email_hint" not in body
            assert "email" not in body
        finally:
            _delete_sb_user(ua["id"])
            _delete_sb_user(ub["id"])


# ============ F. Regression: previously passing endpoints still work ============
class TestRegressionEndpoints:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=30)
        assert r.status_code == 200

    def test_activity_feed(self):
        r = requests.get(f"{API}/activity/feed", timeout=30)
        assert r.status_code == 200
        # tolerate any shape but expect dict or list
        assert r.json() is not None

    def test_activity_stats(self):
        r = requests.get(f"{API}/activity/stats", timeout=30)
        assert r.status_code == 200

    def test_ab_variant_pricing_copy(self):
        r = requests.get(f"{API}/ab/variant/pricing_copy", timeout=30)
        assert r.status_code == 200
        assert r.json()["variant"] in ("A", "B")

    def test_referrals_mine_requires_auth(self):
        r = requests.get(f"{API}/referrals/mine", timeout=30)
        assert r.status_code in (401, 403)

    def test_admin_login(self):
        r = requests.post(f"{API}/admin/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200
        assert "token" in r.json()

    def test_share_og_png_dimensions(self):
        # Create a share for a fresh user, then GET its og.png
        u = _make_sb_user()
        try:
            requests.get(f"{API}/users/me", headers=_h(u), timeout=30)
            r = requests.post(f"{API}/share/create", headers=_h(u), timeout=30)
            assert r.status_code == 200, r.text
            token = r.json()["token"]
            r2 = requests.get(f"{API}/share/{token}/og.png", timeout=60)
            assert r2.status_code == 200
            assert r2.headers["content-type"].startswith("image/png")
            assert r2.content[:8] == b"\x89PNG\r\n\x1a\n"
            from PIL import Image
            im = Image.open(io.BytesIO(r2.content))
            assert im.size == (1200, 630)
        finally:
            _delete_sb_user(u["id"])
