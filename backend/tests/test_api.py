"""JobPilot backend API tests covering activity, admin, payments, jobs, users, resumes."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@jobpilot.ai"
ADMIN_PASSWORD = "JobPilot@2026"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------------- Health & root ----------------
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_health(self, s):
        r = s.get(f"{API}/health")
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        assert body.get("db") is True
        assert body.get("backend") == "supabase-postgres"


# ---------------- Activity (public) ----------------
class TestActivity:
    def test_feed(self, s):
        r = s.get(f"{API}/activity/feed")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and isinstance(data["items"], list)
        assert len(data["items"]) > 0
        sample = data["items"][0]
        assert "name" in sample and "kind" in sample

    def test_stats(self, s):
        r = s.get(f"{API}/activity/stats")
        assert r.status_code == 200
        data = r.json()
        for k in ["applications_submitted", "job_seekers", "interviews", "offers"]:
            assert k in data
        assert data["applications_submitted"] >= 50000
        assert data["job_seekers"] >= 8500
        assert data["interviews"] >= 2400
        assert data["offers"] >= 1200


# ---------------- Auth required ----------------
class TestAuthGating:
    @pytest.mark.parametrize("path,method", [
        ("/users/me", "GET"),
        ("/jobs/recommendations", "GET"),
        ("/jobs/applications", "GET"),
        ("/payments/create-order", "POST"),
        ("/admin/stats", "GET"),
        ("/admin/users", "GET"),
        ("/admin/orders", "GET"),
        ("/resumes/upload", "POST"),
    ])
    def test_protected_requires_auth(self, s, path, method):
        if method == "GET":
            r = s.get(f"{API}{path}")
        else:
            r = s.post(f"{API}{path}", json={})
        assert r.status_code == 401, f"{path} expected 401, got {r.status_code}"

    def test_invalid_supabase_token(self, s):
        r = s.get(f"{API}/users/me", headers={"Authorization": "Bearer not.a.real.jwt"})
        assert r.status_code == 401


# ---------------- Admin ----------------
class TestAdmin:
    def test_login_success(self, s):
        r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data.get("token"), str) and len(data["token"]) > 20
        assert data.get("email") == ADMIN_EMAIL

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_login_wrong_email(self, s):
        r = s.post(f"{API}/admin/login", json={"email": "x@y.com", "password": ADMIN_PASSWORD})
        assert r.status_code == 401

    def test_admin_me(self, s, admin_headers):
        r = s.get(f"{API}/admin/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL
        assert r.json()["role"] == "admin"

    def test_admin_stats(self, s, admin_headers):
        r = s.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        for k in ["total_users", "paid_users", "free_users", "total_applications", "total_orders", "paid_orders", "revenue_inr"]:
            assert k in data, f"missing {k}"
        assert isinstance(data["total_users"], int)
        assert isinstance(data["revenue_inr"], (int, float))

    def test_admin_users(self, s, admin_headers):
        r = s.get(f"{API}/admin/users", headers=admin_headers)
        assert r.status_code == 200
        assert "users" in r.json()
        assert isinstance(r.json()["users"], list)

    def test_admin_orders(self, s, admin_headers):
        r = s.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        assert "orders" in r.json()

    def test_admin_applications(self, s, admin_headers):
        r = s.get(f"{API}/admin/applications", headers=admin_headers)
        assert r.status_code == 200
        assert "applications" in r.json()

    def test_admin_change_plan_invalid(self, s, admin_headers):
        r = s.put(f"{API}/admin/users/non-existent-uid/plan",
                  json={"plan": "premium"}, headers=admin_headers)
        assert r.status_code == 400

    def test_admin_change_plan_valid(self, s, admin_headers):
        # ok even if user doesn't exist (no error - just no docs updated)
        r = s.put(f"{API}/admin/users/non-existent-uid/plan",
                  json={"plan": "starter"}, headers=admin_headers)
        assert r.status_code == 200

    def test_admin_bad_token(self, s):
        r = s.get(f"{API}/admin/stats", headers={"Authorization": "Bearer bad.token.here"})
        assert r.status_code == 401


# ---------------- Mock Supabase user for testing user/payment/jobs flow ----------------
# We can't easily mint a Supabase JWT here. Validate by ensuring 401 path is consistent.
# For deeper auth-required testing we rely on UI flow.

class TestPaymentsAuthShape:
    def test_create_order_unauth(self, s):
        r = s.post(f"{API}/payments/create-order", json={"plan": "starter"})
        assert r.status_code == 401

    def test_verify_unauth(self, s):
        r = s.post(f"{API}/payments/verify", json={
            "razorpay_order_id": "x", "razorpay_payment_id": "y",
            "razorpay_signature": "z", "plan": "starter"
        })
        assert r.status_code == 401
