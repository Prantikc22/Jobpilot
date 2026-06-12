#!/usr/bin/env python3
"""
JobPilot Backend Testing Suite
Tests all critical backend flows after the major refactor.
"""
import os
import sys
import time
import json
import random
import string
import requests
from datetime import datetime

# External preview URL - CURRENTLY NOT WORKING (404 on all /api routes)
# Using localhost for testing as external ingress is not routing /api/* to backend
EXTERNAL_URL = "https://repo-monitor-3.preview.emergentagent.com/api"
BASE_URL = "http://localhost:8001/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@jobpilot.ai"
ADMIN_PASSWORD = "JobPilot@2026"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log(msg, level="INFO"):
    """Log with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def generate_test_email():
    """Generate unique test email"""
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{rand}@jobpilot-test.com"

def create_test_pdf():
    """Create a minimal test PDF for resume upload"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        import io
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.drawString(100, 750, "JOHN DOE")
        c.drawString(100, 730, "Senior Software Engineer")
        c.drawString(100, 710, "Email: john.doe@example.com | Phone: +1-555-0100")
        c.drawString(100, 680, "")
        c.drawString(100, 660, "EXPERIENCE")
        c.drawString(100, 640, "Senior Software Engineer at TechCorp (2020-Present)")
        c.drawString(100, 620, "- Led development of microservices architecture using Python and FastAPI")
        c.drawString(100, 600, "- Implemented CI/CD pipelines reducing deployment time by 60%")
        c.drawString(100, 580, "- Mentored team of 5 junior engineers")
        c.drawString(100, 550, "")
        c.drawString(100, 530, "SKILLS")
        c.drawString(100, 510, "Python, FastAPI, React, TypeScript, Docker, Kubernetes, AWS, PostgreSQL")
        c.drawString(100, 480, "")
        c.drawString(100, 460, "EDUCATION")
        c.drawString(100, 440, "B.S. Computer Science, MIT (2016)")
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
    except ImportError:
        log("reportlab not available, using fallback minimal PDF", "WARNING")
        # Minimal valid PDF without reportlab
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(JOHN DOE - Senior Software Engineer) Tj
0 -20 Td
(Email: john.doe@example.com) Tj
0 -20 Td
(Skills: Python, FastAPI, React, TypeScript, Docker, AWS) Tj
0 -20 Td
(Experience: 5+ years in full-stack development) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
0000000304 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
554
%%EOF"""
        return pdf_content

def test_health():
    """Test basic health endpoint"""
    log("Testing health endpoint...")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and data.get("mongo"):
                log("✅ Health check passed", "SUCCESS")
                test_results["passed"].append("Health endpoint")
                return True
            else:
                log(f"❌ Health check failed: {data}", "ERROR")
                test_results["failed"].append(f"Health endpoint - mongo not ok: {data}")
                return False
        else:
            log(f"❌ Health endpoint returned {resp.status_code}", "ERROR")
            test_results["failed"].append(f"Health endpoint - status {resp.status_code}")
            return False
    except Exception as e:
        log(f"❌ Health check exception: {e}", "ERROR")
        test_results["failed"].append(f"Health endpoint - exception: {e}")
        return False

def test_auth_signup():
    """Test 1: Auth + Onboarding - Sign up and get user profile"""
    log("\n=== TEST 1: Auth + Onboarding ===")
    
    test_email = generate_test_email()
    test_password = "TestPass123!"
    
    log(f"Creating test user: {test_email}")
    
    # Sign up
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "full_name": "Test User"
            },
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            user_id = data.get("user_id")
            log(f"✅ Signup successful: user_id={user_id}")
        else:
            log(f"❌ Signup failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Auth signup - status {resp.status_code}")
            return None, None
    except Exception as e:
        log(f"❌ Signup exception: {e}", "ERROR")
        test_results["failed"].append(f"Auth signup - exception: {e}")
        return None, None
    
    # Now sign in to get access token (using Supabase REST API)
    log("Signing in to get access token...")
    try:
        supabase_url = "https://uywqvvgmtqfxxwggectv.supabase.co"
        supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2dmdtdHFmeHh3Z2dlY3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDYxMDgsImV4cCI6MjA5NjIyMjEwOH0.M2t5fM2fk1N-m8CognedP6oYHWYrDB7osR01TNciMvA"
        
        resp = requests.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            json={
                "email": test_email,
                "password": test_password
            },
            headers={
                "apikey": supabase_anon_key,
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            access_token = data.get("access_token")
            log(f"✅ Sign-in successful, got access token")
        else:
            log(f"❌ Sign-in failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Auth sign-in - status {resp.status_code}")
            return None, None
    except Exception as e:
        log(f"❌ Sign-in exception: {e}", "ERROR")
        test_results["failed"].append(f"Auth sign-in - exception: {e}")
        return None, None
    
    # Get user profile (should auto-create Mongo doc)
    log("Getting user profile (GET /api/users/me)...")
    try:
        resp = requests.get(
            f"{BASE_URL}/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("plan") == "free" and data.get("applications_count") == 0:
                log(f"✅ User profile created: plan={data.get('plan')}, applications_count={data.get('applications_count')}")
                test_results["passed"].append("Auth + Onboarding - signup and profile creation")
                return access_token, data
            else:
                log(f"⚠️ User profile created but unexpected values: {data}", "WARNING")
                test_results["warnings"].append(f"Auth - unexpected profile values: {data}")
                return access_token, data
        else:
            log(f"❌ Get profile failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Auth get profile - status {resp.status_code}")
            return None, None
    except Exception as e:
        log(f"❌ Get profile exception: {e}", "ERROR")
        test_results["failed"].append(f"Auth get profile - exception: {e}")
        return None, None

def test_ai_credits(access_token):
    """Test 2: AI Credits Flow"""
    log("\n=== TEST 2: AI Credits ===")
    
    if not access_token:
        log("❌ Skipping AI credits test - no access token", "ERROR")
        test_results["failed"].append("AI Credits - no access token")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 2.1: Get initial credits (should be 3/3)
    log("Getting initial AI credits...")
    try:
        resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("total") == 3 and data.get("used") == 0 and data.get("remaining") == 3:
                log(f"✅ Initial credits correct: {data}")
                test_results["passed"].append("AI Credits - initial state (3/3)")
            else:
                log(f"❌ Initial credits incorrect: {data}", "ERROR")
                test_results["failed"].append(f"AI Credits - initial state wrong: {data}")
                return
        else:
            log(f"❌ Get credits failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"AI Credits GET - status {resp.status_code}")
            return
    except Exception as e:
        log(f"❌ Get credits exception: {e}", "ERROR")
        test_results["failed"].append(f"AI Credits GET - exception: {e}")
        return
    
    # 2.2: Try ATS check WITHOUT resume (should 400)
    log("Testing ATS check without resume (should fail with 400)...")
    try:
        resp = requests.post(f"{BASE_URL}/ai/ats-check", headers=headers, timeout=10)
        if resp.status_code == 400 and "resume" in resp.text.lower():
            log(f"✅ ATS check without resume correctly rejected: {resp.json()}")
            test_results["passed"].append("AI Credits - ATS check without resume rejected")
        else:
            log(f"❌ ATS check without resume should return 400, got {resp.status_code}", "ERROR")
            test_results["failed"].append(f"AI Credits - ATS check without resume returned {resp.status_code}")
    except Exception as e:
        log(f"❌ ATS check exception: {e}", "ERROR")
        test_results["failed"].append(f"AI Credits - ATS check exception: {e}")
    
    # Verify credits still 3/3 (no charge)
    log("Verifying credits still 3/3 after failed ATS check...")
    try:
        resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("remaining") == 3:
                log(f"✅ Credits still 3/3 after failed check: {data}")
                test_results["passed"].append("AI Credits - no charge on failed ATS check")
            else:
                log(f"❌ Credits changed after failed check: {data}", "ERROR")
                test_results["failed"].append(f"AI Credits - charged on failed check: {data}")
        else:
            log(f"❌ Get credits failed: {resp.status_code}", "ERROR")
    except Exception as e:
        log(f"❌ Get credits exception: {e}", "ERROR")
    
    # 2.3: Upload resume
    log("Uploading test resume...")
    try:
        pdf_content = create_test_pdf()
        files = {"file": ("test_resume.pdf", pdf_content, "application/pdf")}
        resp = requests.post(
            f"{BASE_URL}/resumes/upload",
            headers=headers,
            files=files,
            timeout=15
        )
        
        if resp.status_code == 200:
            data = resp.json()
            log(f"✅ Resume uploaded: extracted {data.get('extracted_chars')} chars")
            test_results["passed"].append("AI Credits - resume upload")
        else:
            log(f"❌ Resume upload failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"AI Credits - resume upload failed: {resp.status_code}")
            return
    except Exception as e:
        log(f"❌ Resume upload exception: {e}", "ERROR")
        test_results["failed"].append(f"AI Credits - resume upload exception: {e}")
        return
    
    # 2.4: Try ATS check WITH resume (should work or 503 with refund)
    log("Testing ATS check with resume...")
    successful_calls = 0
    
    for attempt in range(1, 5):  # Try up to 4 times to test quota exhaustion
        log(f"ATS check attempt {attempt}/4...")
        try:
            resp = requests.post(f"{BASE_URL}/ai/ats-check", headers=headers, timeout=30)
            
            if resp.status_code == 200:
                data = resp.json()
                # Verify expected keys
                required_keys = ["score", "passes", "warnings", "missing_keywords", "formatting_issues"]
                if all(k in data for k in required_keys):
                    log(f"✅ ATS check #{attempt} successful: score={data.get('score')}")
                    successful_calls += 1
                    test_results["passed"].append(f"AI Credits - ATS check #{attempt} success")
                else:
                    log(f"⚠️ ATS check #{attempt} missing keys: {data}", "WARNING")
                    test_results["warnings"].append(f"AI Credits - ATS check #{attempt} missing keys")
                    successful_calls += 1
                
                # Check remaining credits
                cred_resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
                if cred_resp.status_code == 200:
                    cred_data = cred_resp.json()
                    expected_remaining = 3 - successful_calls
                    if cred_data.get("remaining") == expected_remaining:
                        log(f"✅ Credits correctly decremented: {cred_data}")
                    else:
                        log(f"❌ Credits not correctly decremented: expected {expected_remaining}, got {cred_data}", "ERROR")
                        test_results["failed"].append(f"AI Credits - decrement wrong after call #{attempt}")
                
            elif resp.status_code == 503:
                # AI overloaded - should NOT charge credit
                log(f"⚠️ ATS check #{attempt} returned 503 (AI overloaded): {resp.json()}", "WARNING")
                test_results["warnings"].append(f"AI Credits - ATS check #{attempt} returned 503")
                
                # Verify credit was refunded
                cred_resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
                if cred_resp.status_code == 200:
                    cred_data = cred_resp.json()
                    expected_remaining = 3 - successful_calls
                    if cred_data.get("remaining") == expected_remaining:
                        log(f"✅ Credit correctly refunded after 503: {cred_data}")
                        test_results["passed"].append(f"AI Credits - refund on 503 (attempt #{attempt})")
                    else:
                        log(f"❌ Credit not refunded after 503: {cred_data}", "ERROR")
                        test_results["failed"].append(f"AI Credits - no refund on 503 (attempt #{attempt})")
                
                # Don't count as successful call, retry
                time.sleep(2)
                continue
                
            elif resp.status_code == 402:
                # Quota exhausted
                if successful_calls >= 3:
                    log(f"✅ ATS check #{attempt} correctly returned 402 (quota exhausted): {resp.json()}")
                    test_results["passed"].append("AI Credits - 402 after quota exhausted")
                    break
                else:
                    log(f"❌ Got 402 too early (only {successful_calls} successful calls): {resp.json()}", "ERROR")
                    test_results["failed"].append(f"AI Credits - premature 402 after {successful_calls} calls")
                    break
            else:
                log(f"❌ ATS check #{attempt} unexpected status {resp.status_code}: {resp.text}", "ERROR")
                test_results["failed"].append(f"AI Credits - ATS check #{attempt} status {resp.status_code}")
                break
                
        except Exception as e:
            log(f"❌ ATS check #{attempt} exception: {e}", "ERROR")
            test_results["failed"].append(f"AI Credits - ATS check #{attempt} exception: {e}")
            break
        
        time.sleep(1)  # Small delay between calls
    
    # Final credits check
    log("Final credits check...")
    try:
        resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            log(f"Final credits state: {data}")
            if successful_calls >= 3 and data.get("remaining") == 0:
                log("✅ All credits consumed as expected")
                test_results["passed"].append("AI Credits - quota exhaustion flow complete")
            elif successful_calls < 3:
                log(f"⚠️ Only {successful_calls} successful calls (may be due to AI overload)", "WARNING")
                test_results["warnings"].append(f"AI Credits - only {successful_calls}/3 successful calls")
    except Exception as e:
        log(f"❌ Final credits check exception: {e}", "ERROR")

def test_autopilot_endpoints(access_token):
    """Test 3: Autopilot Endpoints"""
    log("\n=== TEST 3: Autopilot Endpoints ===")
    
    if not access_token:
        log("❌ Skipping autopilot endpoints test - no access token", "ERROR")
        test_results["failed"].append("Autopilot endpoints - no access token")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 3.1: GET /jobs/queue
    log("Testing GET /api/jobs/queue...")
    try:
        resp = requests.get(f"{BASE_URL}/jobs/queue", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["plan", "remaining_this_month", "queue", "autopilot_active"]
            if all(k in data for k in required_keys):
                log(f"✅ Queue endpoint working: plan={data.get('plan')}, autopilot_active={data.get('autopilot_active')}")
                test_results["passed"].append("Autopilot - queue endpoint")
                
                # For free user, autopilot should be inactive
                if data.get("plan") == "free" and data.get("autopilot_active") == False:
                    log("✅ Free user correctly has autopilot_active=false")
                    test_results["passed"].append("Autopilot - free user inactive")
                elif data.get("plan") == "free" and data.get("autopilot_active") == True:
                    log("❌ Free user should have autopilot_active=false", "ERROR")
                    test_results["failed"].append("Autopilot - free user incorrectly active")
            else:
                log(f"❌ Queue endpoint missing keys: {data}", "ERROR")
                test_results["failed"].append(f"Autopilot - queue missing keys: {data}")
        else:
            log(f"❌ Queue endpoint failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Autopilot - queue status {resp.status_code}")
    except Exception as e:
        log(f"❌ Queue endpoint exception: {e}", "ERROR")
        test_results["failed"].append(f"Autopilot - queue exception: {e}")
    
    # 3.2: GET /jobs/autopilot-status
    log("Testing GET /api/jobs/autopilot-status...")
    try:
        resp = requests.get(f"{BASE_URL}/jobs/autopilot-status", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["active", "plan", "monthly_limit", "remaining", "applications_count"]
            if all(k in data for k in required_keys):
                log(f"✅ Autopilot status endpoint working: {data}")
                test_results["passed"].append("Autopilot - status endpoint")
                
                # For free user
                if data.get("plan") == "free":
                    if data.get("active") == False and data.get("monthly_limit") == 0:
                        log("✅ Free user autopilot status correct")
                        test_results["passed"].append("Autopilot - free user status correct")
                    else:
                        log(f"❌ Free user autopilot status incorrect: {data}", "ERROR")
                        test_results["failed"].append("Autopilot - free user status wrong")
            else:
                log(f"❌ Autopilot status missing keys: {data}", "ERROR")
                test_results["failed"].append(f"Autopilot - status missing keys: {data}")
        else:
            log(f"❌ Autopilot status failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Autopilot - status {resp.status_code}")
    except Exception as e:
        log(f"❌ Autopilot status exception: {e}", "ERROR")
        test_results["failed"].append(f"Autopilot - status exception: {e}")

def test_autopilot_worker(access_token, user_data):
    """Test 4: Autopilot Worker (requires admin upgrade)"""
    log("\n=== TEST 4: Autopilot Worker ===")
    
    if not access_token or not user_data:
        log("❌ Skipping autopilot worker test - no access token or user data", "ERROR")
        test_results["failed"].append("Autopilot worker - no access token")
        return
    
    # 4.1: Admin login
    log("Admin login...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            admin_token = data.get("token")
            log(f"✅ Admin login successful")
            test_results["passed"].append("Autopilot worker - admin login")
        else:
            log(f"❌ Admin login failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Autopilot worker - admin login {resp.status_code}")
            return
    except Exception as e:
        log(f"❌ Admin login exception: {e}", "ERROR")
        test_results["failed"].append(f"Autopilot worker - admin login exception: {e}")
        return
    
    # 4.2: Upgrade user to pro
    user_id = user_data.get("supabase_user_id")
    log(f"Upgrading user {user_id} to pro plan...")
    try:
        resp = requests.put(
            f"{BASE_URL}/admin/users/{user_id}/plan",
            json={"plan": "pro"},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if resp.status_code == 200:
            log(f"✅ User upgraded to pro")
            test_results["passed"].append("Autopilot worker - user upgrade to pro")
        else:
            log(f"❌ User upgrade failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Autopilot worker - upgrade {resp.status_code}")
            return
    except Exception as e:
        log(f"❌ User upgrade exception: {e}", "ERROR")
        test_results["failed"].append(f"Autopilot worker - upgrade exception: {e}")
        return
    
    # 4.3: Verify autopilot status changed
    log("Verifying autopilot status after upgrade...")
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        resp = requests.get(f"{BASE_URL}/jobs/autopilot-status", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("active") == True and data.get("monthly_limit") == 300:
                log(f"✅ Autopilot activated: {data}")
                test_results["passed"].append("Autopilot worker - status after upgrade")
            else:
                log(f"❌ Autopilot status incorrect after upgrade: {data}", "ERROR")
                test_results["failed"].append(f"Autopilot worker - status wrong after upgrade: {data}")
        else:
            log(f"❌ Autopilot status check failed: {resp.status_code}", "ERROR")
    except Exception as e:
        log(f"❌ Autopilot status check exception: {e}", "ERROR")
    
    # 4.4: Wait for autopilot worker to run (75 seconds)
    log("Waiting 75 seconds for autopilot worker to submit application...")
    for i in range(15):
        time.sleep(5)
        log(f"  ... {(i+1)*5}s / 75s elapsed")
    
    # 4.5: Check applications
    log("Checking for autopilot-submitted applications...")
    try:
        resp = requests.get(f"{BASE_URL}/jobs/applications", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            applications = data.get("applications", [])
            autopilot_apps = [app for app in applications if app.get("submitted_by") == "autopilot"]
            
            if len(autopilot_apps) > 0:
                log(f"✅ Found {len(autopilot_apps)} autopilot application(s): {autopilot_apps[0]}")
                test_results["passed"].append("Autopilot worker - application submitted")
                
                # Verify autopilot status updated
                status_resp = requests.get(f"{BASE_URL}/jobs/autopilot-status", headers=headers, timeout=10)
                if status_resp.status_code == 200:
                    status_data = status_resp.json()
                    if status_data.get("applications_count") >= 1 and status_data.get("last_application"):
                        log(f"✅ Autopilot status updated: applications_count={status_data.get('applications_count')}")
                        test_results["passed"].append("Autopilot worker - status updated after submission")
                    else:
                        log(f"⚠️ Autopilot status not fully updated: {status_data}", "WARNING")
                        test_results["warnings"].append("Autopilot worker - status not updated")
            else:
                log(f"❌ No autopilot applications found. Total applications: {len(applications)}", "ERROR")
                test_results["failed"].append("Autopilot worker - no applications submitted")
                if applications:
                    log(f"  Found applications but not from autopilot: {applications}")
        else:
            log(f"❌ Get applications failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Autopilot worker - get applications {resp.status_code}")
    except Exception as e:
        log(f"❌ Get applications exception: {e}", "ERROR")
        test_results["failed"].append(f"Autopilot worker - get applications exception: {e}")

def test_razorpay(access_token):
    """Test 5: Razorpay Payments"""
    log("\n=== TEST 5: Razorpay Payments ===")
    
    if not access_token:
        log("❌ Skipping Razorpay test - no access token", "ERROR")
        test_results["failed"].append("Razorpay - no access token")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 5.1: Create order
    log("Testing POST /api/payments/create-order...")
    try:
        resp = requests.post(
            f"{BASE_URL}/payments/create-order",
            json={"plan": "starter"},
            headers=headers,
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["order_id", "amount", "currency", "key_id"]
            if all(k in data for k in required_keys):
                if data.get("amount") == 49900 and data.get("currency") == "INR":
                    log(f"✅ Create order successful: {data}")
                    test_results["passed"].append("Razorpay - create order")
                    
                    # Verify key_id matches env
                    if data.get("key_id") == "rzp_test_SyENxR5DvcJ1N6":
                        log("✅ Razorpay key_id matches env")
                        test_results["passed"].append("Razorpay - key_id correct")
                    else:
                        log(f"⚠️ Razorpay key_id mismatch: {data.get('key_id')}", "WARNING")
                        test_results["warnings"].append("Razorpay - key_id mismatch")
                else:
                    log(f"❌ Order amount/currency incorrect: {data}", "ERROR")
                    test_results["failed"].append(f"Razorpay - order values wrong: {data}")
            else:
                log(f"❌ Create order missing keys: {data}", "ERROR")
                test_results["failed"].append(f"Razorpay - order missing keys: {data}")
        else:
            log(f"❌ Create order failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Razorpay - create order {resp.status_code}")
    except Exception as e:
        log(f"❌ Create order exception: {e}", "ERROR")
        test_results["failed"].append(f"Razorpay - create order exception: {e}")
    
    # 5.2: Get subscription status
    log("Testing GET /api/payments/subscription-status...")
    try:
        resp = requests.get(f"{BASE_URL}/payments/subscription-status", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            # User has no subscription, should return active=false
            if data.get("active") == False:
                log(f"✅ Subscription status correct (no subscription): {data}")
                test_results["passed"].append("Razorpay - subscription status")
            else:
                log(f"⚠️ Subscription status unexpected: {data}", "WARNING")
                test_results["warnings"].append(f"Razorpay - subscription status: {data}")
        else:
            log(f"❌ Subscription status failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Razorpay - subscription status {resp.status_code}")
    except Exception as e:
        log(f"❌ Subscription status exception: {e}", "ERROR")
        test_results["failed"].append(f"Razorpay - subscription status exception: {e}")

def test_legal_pages():
    """Test 6: Legal Pages"""
    log("\n=== TEST 6: Legal Pages ===")
    
    legal_pages = [
        "/refund-policy",
        "/terms",
        "/privacy",
        "/shipping",
        "/contact-us",
        "/about-us"
    ]
    
    base_url = "https://repo-monitor-3.preview.emergentagent.com"
    
    for page in legal_pages:
        log(f"Testing {page}...")
        try:
            resp = requests.get(f"{base_url}{page}", timeout=10)
            if resp.status_code == 200 and len(resp.text) > 100:
                log(f"✅ {page} accessible (length: {len(resp.text)} bytes)")
                test_results["passed"].append(f"Legal pages - {page}")
            else:
                log(f"❌ {page} failed: status={resp.status_code}, length={len(resp.text)}", "ERROR")
                test_results["failed"].append(f"Legal pages - {page} status {resp.status_code}")
        except Exception as e:
            log(f"❌ {page} exception: {e}", "ERROR")
            test_results["failed"].append(f"Legal pages - {page} exception: {e}")

def print_summary():
    """Print test summary"""
    log("\n" + "="*70)
    log("TEST SUMMARY")
    log("="*70)
    
    log(f"\n✅ PASSED: {len(test_results['passed'])}")
    for test in test_results['passed']:
        log(f"  ✅ {test}")
    
    if test_results['warnings']:
        log(f"\n⚠️  WARNINGS: {len(test_results['warnings'])}")
        for test in test_results['warnings']:
            log(f"  ⚠️  {test}")
    
    if test_results['failed']:
        log(f"\n❌ FAILED: {len(test_results['failed'])}")
        for test in test_results['failed']:
            log(f"  ❌ {test}")
    
    log("\n" + "="*70)
    
    total = len(test_results['passed']) + len(test_results['failed'])
    if total > 0:
        pass_rate = (len(test_results['passed']) / total) * 100
        log(f"PASS RATE: {pass_rate:.1f}% ({len(test_results['passed'])}/{total})")
    
    if test_results['failed']:
        log("\n⚠️  CRITICAL ISSUES FOUND - Review failed tests above")
        return 1
    elif test_results['warnings']:
        log("\n⚠️  All tests passed but with warnings - Review above")
        return 0
    else:
        log("\n✅ ALL TESTS PASSED")
        return 0

def main():
    log("="*70)
    log("JobPilot Backend Testing Suite")
    log("="*70)
    log(f"Base URL: {BASE_URL}")
    log(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log("="*70)
    
    # Test health first
    if not test_health():
        log("\n❌ Health check failed - aborting tests", "ERROR")
        print_summary()
        return 1
    
    # Test 1: Auth + Onboarding
    access_token, user_data = test_auth_signup()
    
    # Test 2: AI Credits
    test_ai_credits(access_token)
    
    # Test 3: Autopilot Endpoints
    test_autopilot_endpoints(access_token)
    
    # Test 4: Autopilot Worker (long-running)
    test_autopilot_worker(access_token, user_data)
    
    # Test 5: Razorpay
    test_razorpay(access_token)
    
    # Test 6: Legal Pages
    test_legal_pages()
    
    # Print summary
    return print_summary()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
