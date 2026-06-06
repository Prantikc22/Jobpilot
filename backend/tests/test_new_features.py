"""Tests for iteration 2: referrals, share/OG image, A/B variant, backfill.

Provisions two Supabase users (UserA, UserB) via admin API, then tests:
- A/B variant cookie stickiness + /ab/track + admin /ab/stats
- Referrals: backfill, /mine, apply (own/invalid/valid + double-apply)
- Share: create -> public GET -> og.png 1200x630 PNG; invalid token -> 404
- /api/jobs/recommendations includes base_limit + bonus (referral_credits)
- Iteration-1 regressions: payments/verify enforces ownership, admin plan 404
"""
import os
import io
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

SB_URL = "https://uywqvvgmtqfxxwggectv.supabase.co"
SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2dmdtdHFmeHh3Z2dlY3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDYxMDgsImV4cCI6MjA5NjIyMjEwOH0.M2t5fM2fk1N-m8CognedP6oYHWYrDB7osR01TNciMvA"
SB_SRV = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2dmdtdHFmeHh3Z2dlY3R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NjEwOCwiZXhwIjoyMDk2MjIyMTA4fQ.BzEjzwy8mPPPOQmiBdXIol_saUmGodYdkHKgNU1-pRc"

ADMIN_EMAIL = "admin@jobpilot.ai"
ADMIN_PASSWORD = "JobPilot@2026"


def _make_sb_user():
    ts = int(time.time())
    email = f"testpilot+{ts}_{uuid.uuid4().hex[:6]}@jobpilot.ai"
    password = "TestPilot@2026"
    r = requests.post(
        f"{SB_URL}/auth/v1/admin/users",
        headers={"apikey": SB_SRV, "Authorization": f"Bearer {SB_SRV}", "Content-Type": "application/json"},
        json={"email": email, "password": password, "email_confirm": True,
              "user_metadata": {"full_name": "TEST Pilot"}},
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
            headers={"apikey": SB_SRV, "Authorization": f"Bearer {SB_SRV}"}, timeout=15,
        )
    except Exception:
        pass


@pytest.fixture(scope="module")
def user_a():
    u = _make_sb_user()
    yield u
    _delete_sb_user(u["id"])


@pytest.fixture(scope="module")
def user_b():
    u = _make_sb_user()
    yield u
    _delete_sb_user(u["id"])


def _h(u):
    return {"Authorization": f"Bearer {u['token']}", "Content-Type": "application/json"}


# ===== A/B variant =====
class TestABVariant:
    def test_variant_returns_copy_and_sets_cookie(self):
        s = requests.Session()
        r = s.get(f"{API}/ab/variant/pricing_copy", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["variant"] in ("A", "B")
        copy = data["copy"]
        assert "headline" in copy and "subhead" in copy and "tagline" in copy
        # Cookie set
        assert "jp_ab_pricing_copy" in s.cookies
        first_variant = s.cookies["jp_ab_pricing_copy"]
        # Sticky on subsequent calls
        for _ in range(3):
            r2 = s.get(f"{API}/ab/variant/pricing_copy", timeout=30)
            assert r2.json()["variant"] == first_variant

    def test_unknown_experiment_returns_default_A(self):
        r = requests.get(f"{API}/ab/variant/does_not_exist", timeout=30)
        assert r.status_code == 200
        assert r.json()["variant"] == "A"

    def test_track_valid_event(self):
        r = requests.post(f"{API}/ab/track", json={"experiment": "pricing_copy", "variant": "A", "event": "click"}, timeout=30)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_track_invalid_experiment_or_event(self):
        r = requests.post(f"{API}/ab/track", json={"experiment": "bogus", "variant": "A", "event": "click"}, timeout=30)
        assert r.status_code == 200
        assert r.json() == {"ok": False}
        r2 = requests.post(f"{API}/ab/track", json={"experiment": "pricing_copy", "variant": "A", "event": "boom"}, timeout=30)
        assert r2.json() == {"ok": False}

    def test_stats_requires_admin(self):
        # No auth
        r = requests.get(f"{API}/ab/stats", timeout=30)
        assert r.status_code in (401, 403)

    def test_stats_with_admin(self):
        login = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert login.status_code == 200, login.text
        token = login.json()["token"]
        # Ensure at least one event exists
        requests.post(f"{API}/ab/track", json={"experiment": "pricing_copy", "variant": "B", "event": "view"}, timeout=30)
        requests.post(f"{API}/ab/track", json={"experiment": "pricing_copy", "variant": "B", "event": "convert"}, timeout=30)
        r = requests.get(f"{API}/ab/stats", headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "pricing_copy" in data
        for v, counts in data["pricing_copy"].items():
            assert v in ("A", "B")
            assert "click_rate" in counts and "convert_rate" in counts
            assert isinstance(counts["click_rate"], (int, float))


# ===== Referrals =====
class TestReferrals:
    def test_mine_requires_auth(self):
        r = requests.get(f"{API}/referrals/mine", timeout=30)
        assert r.status_code in (401, 403)

    def test_mine_returns_code_and_backfill(self, user_a):
        # First /me triggers _ensure_user which backfills referral_code
        r0 = requests.get(f"{API}/users/me", headers=_h(user_a), timeout=30)
        assert r0.status_code == 200
        assert r0.json().get("referral_code")  # backfilled
        r = requests.get(f"{API}/referrals/mine", headers=_h(user_a), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["referral_code"]
        assert isinstance(d["referral_code"], str) and "-" in d["referral_code"]
        assert d["credit_per_invite"] == 25
        assert d["referral_credits"] == 0
        assert d["invited_count"] == 0

    def test_apply_own_code_returns_400(self, user_a):
        r = requests.get(f"{API}/referrals/mine", headers=_h(user_a), timeout=30)
        my_code = r.json()["referral_code"]
        r2 = requests.post(f"{API}/referrals/apply", headers=_h(user_a), json={"code": my_code}, timeout=30)
        assert r2.status_code == 400
        assert "own" in r2.json()["detail"].lower()

    def test_apply_invalid_code_returns_404(self, user_b):
        # Ensure user_b is created
        requests.get(f"{API}/users/me", headers=_h(user_b), timeout=30)
        r = requests.post(f"{API}/referrals/apply", headers=_h(user_b), json={"code": "ZZZZ-XXXX"}, timeout=30)
        assert r.status_code == 404
        assert "invalid" in r.json()["detail"].lower()

    def test_apply_valid_code_then_double(self, user_a, user_b):
        # Get A's code
        ra = requests.get(f"{API}/referrals/mine", headers=_h(user_a), timeout=30)
        a_code = ra.json()["referral_code"]
        a_credits_before = ra.json()["referral_credits"]
        # User B applies A's code
        r = requests.post(f"{API}/referrals/apply", headers=_h(user_b), json={"code": a_code}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        # A's credits should now be +25
        ra2 = requests.get(f"{API}/referrals/mine", headers=_h(user_a), timeout=30)
        assert ra2.json()["referral_credits"] == a_credits_before + 25
        assert ra2.json()["invited_count"] >= 1
        # Second apply by same user fails
        r2 = requests.post(f"{API}/referrals/apply", headers=_h(user_b), json={"code": a_code}, timeout=30)
        assert r2.status_code == 400
        assert "already" in r2.json()["detail"].lower()


# ===== Share =====
class TestShare:
    def test_create_requires_auth(self):
        r = requests.post(f"{API}/share/create", timeout=30)
        assert r.status_code in (401, 403)

    def test_create_share_token(self, user_a):
        requests.get(f"{API}/users/me", headers=_h(user_a), timeout=30)
        r = requests.post(f"{API}/share/create", headers=_h(user_a), timeout=30)
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        assert isinstance(token, str) and len(token) == 14
        # all hex
        int(token, 16)
        # Public GET
        r2 = requests.get(f"{API}/share/{token}", timeout=30)
        assert r2.status_code == 200, r2.text
        d = r2.json()
        for k in ("first_name", "applications_count", "interviews_count", "offers_count", "plan", "created_at", "token"):
            assert k in d, f"missing {k}"
        assert "supabase_user_id" not in d
        assert "_id" not in d
        # OG image
        r3 = requests.get(f"{API}/share/{token}/og.png", timeout=60)
        assert r3.status_code == 200
        assert r3.headers["content-type"].startswith("image/png")
        # PNG sig + dimensions
        assert r3.content[:8] == b"\x89PNG\r\n\x1a\n"
        from PIL import Image
        im = Image.open(io.BytesIO(r3.content))
        assert im.size == (1200, 630)

    def test_invalid_token_404(self):
        r = requests.get(f"{API}/share/notarealtoken", timeout=30)
        assert r.status_code == 404
        r2 = requests.get(f"{API}/share/notarealtoken/og.png", timeout=30)
        assert r2.status_code == 404


# ===== Jobs recommendations bonus =====
class TestRecommendationsBonus:
    def test_recommendations_with_bonus_after_referral(self, user_a):
        # user_a should have referral_credits >= 25 after TestReferrals.test_apply_valid_code_then_double
        r = requests.get(f"{API}/jobs/recommendations", headers=_h(user_a), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "base_limit" in d and "bonus" in d and "limit" in d
        assert d["base_limit"] == 10  # free plan
        assert d["limit"] == d["base_limit"] + d["bonus"]
        # bonus should equal referral_credits (>=25 since user_b applied)
        assert d["bonus"] >= 25
        assert len(d["jobs"]) <= d["limit"]


# ===== Iter-1 regression: payments/verify ownership & admin plan 404 =====
class TestRegressions:
    def test_payments_verify_enforces_ownership(self, user_a, user_b):
        # user_a creates order, user_b tries to verify with that order_id -> should NOT succeed
        ro = requests.post(f"{API}/payments/create-order", headers=_h(user_a), json={"plan": "starter"}, timeout=30)
        assert ro.status_code == 200
        order_id = ro.json()["order_id"]
        # user_b attempts to verify with user_a's order
        rv = requests.post(
            f"{API}/payments/verify", headers=_h(user_b),
            json={
                "razorpay_order_id": order_id,
                "razorpay_payment_id": "pay_FAKE",
                "razorpay_signature": "deadbeef",
                "plan": "starter",
            }, timeout=30,
        )
        # Should be 403 (ownership) or 400 (bad sig). 200 = FAIL
        assert rv.status_code in (400, 403), rv.text
        # If ownership is enforced first we'd expect 403; if signature is checked first we'd see 400
        # Critical: must NOT be 200

    def test_admin_plan_change_missing_user_returns_404(self):
        login = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert login.status_code == 200
        token = login.json()["token"]
        # Non-existent user
        r = requests.put(
            f"{API}/admin/users/{uuid.uuid4().hex}/plan",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"plan": "pro"}, timeout=30,
        )
        assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text}"
