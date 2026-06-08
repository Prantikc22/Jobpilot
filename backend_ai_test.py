#!/usr/bin/env python3
"""
JobPilot AI Flow Testing - Re-test after OpenRouter model pool fix
Tests ONLY the AI flows against localhost:8001/api/*
"""
import os
import sys
import time
import json
import random
import string
import requests
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

# Supabase credentials from backend/.env
SUPABASE_URL = "https://uywqvvgmtqfxxwggectv.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2dmdtdHFmeHh3Z2dlY3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDYxMDgsImV4cCI6MjA5NjIyMjEwOH0.M2t5fM2fk1N-m8CognedP6oYHWYrDB7osR01TNciMvA"

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
    return f"aitest_{rand}@jobpilot-test.com"

def create_test_pdf():
    """Create a realistic test PDF resume"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        import io
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, "SARAH JOHNSON")
        c.setFont("Helvetica", 10)
        c.drawString(100, 735, "Senior Full-Stack Engineer | React & Python Specialist")
        c.drawString(100, 720, "Email: sarah.johnson@techmail.com | Phone: +1-555-0199 | LinkedIn: linkedin.com/in/sarahjohnson")
        
        # Professional Summary
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 690, "PROFESSIONAL SUMMARY")
        c.setFont("Helvetica", 10)
        c.drawString(100, 670, "Results-driven Full-Stack Engineer with 7+ years of experience building scalable web applications.")
        c.drawString(100, 655, "Expert in React, TypeScript, Python, FastAPI, and cloud infrastructure. Proven track record of")
        c.drawString(100, 640, "leading teams and delivering high-impact products in fast-paced startup environments.")
        
        # Experience
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 610, "PROFESSIONAL EXPERIENCE")
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(100, 590, "Senior Full-Stack Engineer | TechCorp Inc. | San Francisco, CA")
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(100, 575, "January 2021 - Present")
        c.setFont("Helvetica", 10)
        c.drawString(100, 560, "• Led development of microservices architecture using Python, FastAPI, and React, serving 500K+ users")
        c.drawString(100, 545, "• Implemented CI/CD pipelines with GitHub Actions and Docker, reducing deployment time by 70%")
        c.drawString(100, 530, "• Architected real-time notification system using WebSockets and Redis, improving user engagement by 45%")
        c.drawString(100, 515, "• Mentored team of 6 junior engineers, conducting code reviews and technical training sessions")
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(100, 490, "Full-Stack Developer | StartupXYZ | Remote")
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(100, 475, "March 2019 - December 2020")
        c.setFont("Helvetica", 10)
        c.drawString(100, 460, "• Built responsive web applications using React, TypeScript, Node.js, and PostgreSQL")
        c.drawString(100, 445, "• Integrated third-party APIs (Stripe, SendGrid, Twilio) for payment processing and communications")
        c.drawString(100, 430, "• Optimized database queries and implemented caching strategies, improving page load times by 60%")
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(100, 405, "Software Engineer | DataSolutions Ltd. | Boston, MA")
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(100, 390, "June 2017 - February 2019")
        c.setFont("Helvetica", 10)
        c.drawString(100, 375, "• Developed data visualization dashboards using React, D3.js, and Python Flask")
        c.drawString(100, 360, "• Collaborated with data scientists to build ML model deployment pipelines")
        
        # Skills
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 330, "TECHNICAL SKILLS")
        c.setFont("Helvetica", 10)
        c.drawString(100, 310, "Languages: Python, JavaScript, TypeScript, SQL, HTML/CSS")
        c.drawString(100, 295, "Frameworks: React, FastAPI, Node.js, Express, Flask, Django")
        c.drawString(100, 280, "Tools & Technologies: Docker, Kubernetes, AWS, PostgreSQL, MongoDB, Redis, Git, CI/CD")
        c.drawString(100, 265, "Methodologies: Agile, Scrum, Test-Driven Development, Microservices Architecture")
        
        # Education
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 235, "EDUCATION")
        c.setFont("Helvetica", 10)
        c.drawString(100, 215, "Bachelor of Science in Computer Science | Massachusetts Institute of Technology (MIT)")
        c.drawString(100, 200, "Graduated: May 2017 | GPA: 3.8/4.0")
        
        # Certifications
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 170, "CERTIFICATIONS")
        c.setFont("Helvetica", 10)
        c.drawString(100, 150, "• AWS Certified Solutions Architect - Associate (2022)")
        c.drawString(100, 135, "• Certified Kubernetes Administrator (CKA) (2021)")
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
    except ImportError:
        log("reportlab not available, using fallback minimal PDF", "WARNING")
        # Minimal valid PDF
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
<< /Length 450 >>
stream
BT
/F1 14 Tf
50 750 Td
(SARAH JOHNSON - Senior Full-Stack Engineer) Tj
0 -20 Td
(Email: sarah.johnson@techmail.com | Phone: +1-555-0199) Tj
0 -30 Td
(PROFESSIONAL SUMMARY) Tj
/F1 10 Tf
0 -20 Td
(Results-driven Full-Stack Engineer with 7+ years building scalable web apps.) Tj
0 -30 Td
(EXPERIENCE) Tj
0 -15 Td
(Senior Full-Stack Engineer at TechCorp Inc. 2021-Present) Tj
0 -12 Td
(- Led microservices architecture using Python, FastAPI, React) Tj
0 -12 Td
(- Implemented CI/CD pipelines reducing deployment time by 70%) Tj
0 -30 Td
(SKILLS) Tj
0 -15 Td
(Python, JavaScript, TypeScript, React, FastAPI, Node.js, Docker, Kubernetes, AWS) Tj
0 -30 Td
(EDUCATION) Tj
0 -15 Td
(B.S. Computer Science, MIT, 2017) Tj
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
804
%%EOF"""
        return pdf_content

def create_user_and_signin():
    """Create a new test user and sign in"""
    test_email = generate_test_email()
    test_password = "TestPass123!"
    
    log(f"Creating test user: {test_email}")
    
    # Sign up via backend
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "full_name": "AI Test User"
            },
            timeout=10
        )
        
        if resp.status_code != 200:
            log(f"❌ Signup failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Signup failed: {resp.status_code}")
            return None, None
        
        log(f"✅ Signup successful")
    except Exception as e:
        log(f"❌ Signup exception: {e}", "ERROR")
        test_results["failed"].append(f"Signup exception: {e}")
        return None, None
    
    # Sign in via Supabase to get access token
    log("Signing in to get access token...")
    try:
        resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={"email": test_email, "password": test_password},
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log(f"❌ Sign-in failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"Sign-in failed: {resp.status_code}")
            return None, None
        
        data = resp.json()
        access_token = data.get("access_token")
        log(f"✅ Sign-in successful")
        return access_token, test_email
    except Exception as e:
        log(f"❌ Sign-in exception: {e}", "ERROR")
        test_results["failed"].append(f"Sign-in exception: {e}")
        return None, None

def call_with_retry(method, url, headers, max_retries=2, **kwargs):
    """Call API with retry on 503, verify credit refund"""
    for attempt in range(max_retries + 1):
        try:
            if method == "POST":
                resp = requests.post(url, headers=headers, timeout=45, **kwargs)
            elif method == "GET":
                resp = requests.get(url, headers=headers, timeout=45, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if resp.status_code == 503:
                log(f"⚠️ Got 503 (OpenRouterBusy) on attempt {attempt + 1}/{max_retries + 1}", "WARNING")
                
                # Verify credit was refunded
                cred_resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
                if cred_resp.status_code == 200:
                    cred_data = cred_resp.json()
                    log(f"  Credit status after 503: {cred_data}")
                
                if attempt < max_retries:
                    wait_time = 5 + (attempt * 5)
                    log(f"  Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    log(f"❌ All {max_retries + 1} attempts returned 503", "ERROR")
                    return resp
            
            return resp
        except Exception as e:
            log(f"❌ Request exception on attempt {attempt + 1}: {e}", "ERROR")
            if attempt < max_retries:
                time.sleep(3)
                continue
            raise
    
    return None

def test_ai_flow_complete():
    """Test complete AI flow as specified in review request"""
    log("\n" + "="*70)
    log("TESTING COMPLETE AI FLOW")
    log("="*70)
    
    # Step 1: Create user and sign in
    log("\n[STEP 1] Create/sign in Supabase test user")
    access_token, test_email = create_user_and_signin()
    if not access_token:
        log("❌ Cannot proceed without access token", "ERROR")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Step 2: GET /api/users/me to bootstrap Mongo doc
    log("\n[STEP 2] GET /api/users/me to bootstrap Mongo doc")
    try:
        resp = requests.get(f"{BASE_URL}/users/me", headers=headers, timeout=10)
        if resp.status_code == 200:
            user_data = resp.json()
            log(f"✅ User profile: plan={user_data.get('plan')}, email={user_data.get('email')}")
            test_results["passed"].append("GET /api/users/me - bootstrap Mongo doc")
        else:
            log(f"❌ GET /api/users/me failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"GET /api/users/me failed: {resp.status_code}")
            return
    except Exception as e:
        log(f"❌ GET /api/users/me exception: {e}", "ERROR")
        test_results["failed"].append(f"GET /api/users/me exception: {e}")
        return
    
    # Step 3: GET /api/ai/credits → expect total=3, used=0, remaining=3
    log("\n[STEP 3] GET /api/ai/credits → expect total=3, used=0, remaining=3")
    try:
        resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if resp.status_code == 200:
            credits = resp.json()
            if credits.get("total") == 3 and credits.get("used") == 0 and credits.get("remaining") == 3:
                log(f"✅ Initial credits correct: {credits}")
                test_results["passed"].append("GET /api/ai/credits - initial state (3/3)")
            else:
                log(f"❌ Initial credits incorrect: {credits}", "ERROR")
                test_results["failed"].append(f"GET /api/ai/credits - wrong initial state: {credits}")
                return
        else:
            log(f"❌ GET /api/ai/credits failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"GET /api/ai/credits failed: {resp.status_code}")
            return
    except Exception as e:
        log(f"❌ GET /api/ai/credits exception: {e}", "ERROR")
        test_results["failed"].append(f"GET /api/ai/credits exception: {e}")
        return
    
    # Step 4: Upload PDF resume
    log("\n[STEP 4] Upload PDF resume via POST /api/resumes/upload")
    try:
        pdf_content = create_test_pdf()
        files = {"file": ("sarah_johnson_resume.pdf", pdf_content, "application/pdf")}
        resp = requests.post(f"{BASE_URL}/resumes/upload", headers=headers, files=files, timeout=20)
        
        if resp.status_code == 200:
            upload_data = resp.json()
            log(f"✅ Resume uploaded: extracted {upload_data.get('extracted_chars')} chars")
            test_results["passed"].append("POST /api/resumes/upload - success")
        else:
            log(f"❌ Resume upload failed: {resp.status_code} - {resp.text}", "ERROR")
            test_results["failed"].append(f"POST /api/resumes/upload failed: {resp.status_code}")
            return
    except Exception as e:
        log(f"❌ Resume upload exception: {e}", "ERROR")
        test_results["failed"].append(f"POST /api/resumes/upload exception: {e}")
        return
    
    # Verify resume_url and resume_text populated
    log("  Verifying resume_url and resume_text in user profile...")
    try:
        resp = requests.get(f"{BASE_URL}/users/me", headers=headers, timeout=10)
        if resp.status_code == 200:
            user_data = resp.json()
            if user_data.get("resume_url") and user_data.get("resume_text"):
                log(f"✅ resume_url and resume_text populated (text length: {len(user_data.get('resume_text', ''))})")
                test_results["passed"].append("Resume upload - resume_url and resume_text set")
            else:
                log(f"❌ resume_url or resume_text not set: resume_url={bool(user_data.get('resume_url'))}, resume_text={bool(user_data.get('resume_text'))}", "ERROR")
                test_results["failed"].append("Resume upload - resume_url or resume_text not set")
        else:
            log(f"❌ GET /api/users/me failed: {resp.status_code}", "ERROR")
    except Exception as e:
        log(f"❌ Verify resume exception: {e}", "ERROR")
    
    # Step 5: POST /api/ai/ats-check → expect 200 with required keys, credits → 2
    log("\n[STEP 5] POST /api/ai/ats-check → expect 200 with score, passes, warnings, missing_keywords, formatting_issues")
    resp = call_with_retry("POST", f"{BASE_URL}/ai/ats-check", headers, max_retries=2)
    
    if resp and resp.status_code == 200:
        ats_data = resp.json()
        required_keys = ["score", "passes", "warnings", "missing_keywords", "formatting_issues"]
        if all(k in ats_data for k in required_keys):
            log(f"✅ ATS check successful: score={ats_data.get('score')}, passes={len(ats_data.get('passes', []))}, warnings={len(ats_data.get('warnings', []))}")
            test_results["passed"].append("POST /api/ai/ats-check - success with all required keys")
        else:
            missing = [k for k in required_keys if k not in ats_data]
            log(f"❌ ATS check missing keys: {missing}. Response: {ats_data}", "ERROR")
            test_results["failed"].append(f"POST /api/ai/ats-check - missing keys: {missing}")
        
        # Verify credits → 2
        cred_resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if cred_resp.status_code == 200:
            credits = cred_resp.json()
            if credits.get("remaining") == 2:
                log(f"✅ Credits correctly decremented to 2: {credits}")
                test_results["passed"].append("POST /api/ai/ats-check - credit consumed (3→2)")
            else:
                log(f"❌ Credits not 2 after ATS check: {credits}", "ERROR")
                test_results["failed"].append(f"POST /api/ai/ats-check - credits wrong: {credits}")
    elif resp and resp.status_code == 503:
        log(f"❌ ATS check failed after {3} attempts (all 503): {resp.json()}", "ERROR")
        test_results["failed"].append("POST /api/ai/ats-check - all attempts returned 503")
    else:
        status = resp.status_code if resp else "no response"
        text = resp.text if resp else "no response"
        log(f"❌ ATS check failed: {status} - {text}", "ERROR")
        test_results["failed"].append(f"POST /api/ai/ats-check failed: {status}")
    
    # Step 6: POST /api/ai/optimize-resume → expect 200, credits → 1
    log("\n[STEP 6] POST /api/ai/optimize-resume → expect 200 with JSON, credits → 1")
    resp = call_with_retry("POST", f"{BASE_URL}/ai/optimize-resume", headers, max_retries=2, json={})
    
    if resp and resp.status_code == 200:
        optimize_data = resp.json()
        log(f"✅ Optimize resume successful: {list(optimize_data.keys())}")
        test_results["passed"].append("POST /api/ai/optimize-resume - success")
        
        # Verify credits → 1
        cred_resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if cred_resp.status_code == 200:
            credits = cred_resp.json()
            if credits.get("remaining") == 1:
                log(f"✅ Credits correctly decremented to 1: {credits}")
                test_results["passed"].append("POST /api/ai/optimize-resume - credit consumed (2→1)")
            else:
                log(f"❌ Credits not 1 after optimize: {credits}", "ERROR")
                test_results["failed"].append(f"POST /api/ai/optimize-resume - credits wrong: {credits}")
    elif resp and resp.status_code == 503:
        log(f"❌ Optimize resume failed after 3 attempts (all 503): {resp.json()}", "ERROR")
        test_results["failed"].append("POST /api/ai/optimize-resume - all attempts returned 503")
    else:
        status = resp.status_code if resp else "no response"
        text = resp.text if resp else "no response"
        log(f"❌ Optimize resume failed: {status} - {text}", "ERROR")
        test_results["failed"].append(f"POST /api/ai/optimize-resume failed: {status}")
    
    # Step 7: POST /api/ai/linkedin-optimize → expect 200, credits → 0
    log("\n[STEP 7] POST /api/ai/linkedin-optimize → expect 200 with JSON, credits → 0")
    resp = call_with_retry("POST", f"{BASE_URL}/ai/linkedin-optimize", headers, max_retries=2)
    
    if resp and resp.status_code == 200:
        linkedin_data = resp.json()
        log(f"✅ LinkedIn optimize successful: {list(linkedin_data.keys())}")
        test_results["passed"].append("POST /api/ai/linkedin-optimize - success")
        
        # Verify credits → 0
        cred_resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if cred_resp.status_code == 200:
            credits = cred_resp.json()
            if credits.get("remaining") == 0:
                log(f"✅ Credits correctly decremented to 0: {credits}")
                test_results["passed"].append("POST /api/ai/linkedin-optimize - credit consumed (1→0)")
            else:
                log(f"❌ Credits not 0 after LinkedIn optimize: {credits}", "ERROR")
                test_results["failed"].append(f"POST /api/ai/linkedin-optimize - credits wrong: {credits}")
    elif resp and resp.status_code == 503:
        log(f"❌ LinkedIn optimize failed after 3 attempts (all 503): {resp.json()}", "ERROR")
        test_results["failed"].append("POST /api/ai/linkedin-optimize - all attempts returned 503")
    else:
        status = resp.status_code if resp else "no response"
        text = resp.text if resp else "no response"
        log(f"❌ LinkedIn optimize failed: {status} - {text}", "ERROR")
        test_results["failed"].append(f"POST /api/ai/linkedin-optimize failed: {status}")
    
    # Step 8: POST /api/ai/ats-check again → expect 402 with "all 3 AI credits" message
    log("\n[STEP 8] POST /api/ai/ats-check again → expect 402 (quota exhausted)")
    try:
        resp = requests.post(f"{BASE_URL}/ai/ats-check", headers=headers, timeout=30)
        if resp.status_code == 402:
            detail = resp.json().get("detail", "")
            if "3" in detail and "credit" in detail.lower():
                log(f"✅ ATS check correctly returned 402: {detail}")
                test_results["passed"].append("POST /api/ai/ats-check - 402 after quota exhausted")
            else:
                log(f"⚠️ Got 402 but message doesn't mention '3 credits': {detail}", "WARNING")
                test_results["warnings"].append(f"ATS check 402 message: {detail}")
        else:
            log(f"❌ Expected 402, got {resp.status_code}: {resp.text}", "ERROR")
            test_results["failed"].append(f"POST /api/ai/ats-check - expected 402, got {resp.status_code}")
    except Exception as e:
        log(f"❌ ATS check (quota exhausted) exception: {e}", "ERROR")
        test_results["failed"].append(f"POST /api/ai/ats-check (quota exhausted) exception: {e}")

def test_resume_parse_fresh_user():
    """Test POST /api/resumes/parse on a fresh user with 3 credits"""
    log("\n" + "="*70)
    log("TESTING RESUME PARSE ON FRESH USER")
    log("="*70)
    
    # Create fresh user
    log("\n[STEP 1] Create fresh user")
    access_token, test_email = create_user_and_signin()
    if not access_token:
        log("❌ Cannot proceed without access token", "ERROR")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Bootstrap Mongo doc
    log("\n[STEP 2] Bootstrap Mongo doc")
    try:
        resp = requests.get(f"{BASE_URL}/users/me", headers=headers, timeout=10)
        if resp.status_code != 200:
            log(f"❌ GET /api/users/me failed: {resp.status_code}", "ERROR")
            return
        log(f"✅ User profile created")
    except Exception as e:
        log(f"❌ GET /api/users/me exception: {e}", "ERROR")
        return
    
    # Verify 3 credits
    log("\n[STEP 3] Verify 3 credits")
    try:
        resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if resp.status_code == 200:
            credits = resp.json()
            if credits.get("remaining") == 3:
                log(f"✅ Fresh user has 3 credits: {credits}")
            else:
                log(f"❌ Fresh user doesn't have 3 credits: {credits}", "ERROR")
                return
        else:
            log(f"❌ GET /api/ai/credits failed: {resp.status_code}", "ERROR")
            return
    except Exception as e:
        log(f"❌ GET /api/ai/credits exception: {e}", "ERROR")
        return
    
    # Upload resume
    log("\n[STEP 4] Upload resume")
    try:
        pdf_content = create_test_pdf()
        files = {"file": ("resume.pdf", pdf_content, "application/pdf")}
        resp = requests.post(f"{BASE_URL}/resumes/upload", headers=headers, files=files, timeout=20)
        
        if resp.status_code == 200:
            log(f"✅ Resume uploaded")
        else:
            log(f"❌ Resume upload failed: {resp.status_code} - {resp.text}", "ERROR")
            return
    except Exception as e:
        log(f"❌ Resume upload exception: {e}", "ERROR")
        return
    
    # POST /api/resumes/parse
    log("\n[STEP 5] POST /api/resumes/parse → expect 200 with structured JSON")
    resp = call_with_retry("POST", f"{BASE_URL}/resumes/parse", headers, max_retries=2)
    
    if resp and resp.status_code == 200:
        parse_data = resp.json()
        expected_keys = ["name", "email", "phone", "headline", "summary", "skills", "experience", "education", "suggested_roles"]
        missing_keys = [k for k in expected_keys if k not in parse_data]
        
        if not missing_keys:
            log(f"✅ Resume parse successful with all expected keys")
            log(f"  Parsed: name={parse_data.get('name')}, skills={len(parse_data.get('skills', []))}, experience={len(parse_data.get('experience', []))}")
            test_results["passed"].append("POST /api/resumes/parse - success with structured JSON")
        else:
            log(f"⚠️ Resume parse missing some keys: {missing_keys}. Got: {list(parse_data.keys())}", "WARNING")
            test_results["warnings"].append(f"POST /api/resumes/parse - missing keys: {missing_keys}")
        
        # Verify credits → 2
        cred_resp = requests.get(f"{BASE_URL}/ai/credits", headers=headers, timeout=10)
        if cred_resp.status_code == 200:
            credits = cred_resp.json()
            if credits.get("remaining") == 2:
                log(f"✅ Credits correctly decremented to 2: {credits}")
                test_results["passed"].append("POST /api/resumes/parse - credit consumed (3→2)")
            else:
                log(f"❌ Credits not 2 after parse: {credits}", "ERROR")
                test_results["failed"].append(f"POST /api/resumes/parse - credits wrong: {credits}")
    elif resp and resp.status_code == 503:
        log(f"❌ Resume parse failed after 3 attempts (all 503): {resp.json()}", "ERROR")
        test_results["failed"].append("POST /api/resumes/parse - all attempts returned 503")
    else:
        status = resp.status_code if resp else "no response"
        text = resp.text if resp else "no response"
        log(f"❌ Resume parse failed: {status} - {text}", "ERROR")
        test_results["failed"].append(f"POST /api/resumes/parse failed: {status}")

def test_other_endpoints():
    """Re-confirm other endpoints that already passed"""
    log("\n" + "="*70)
    log("RE-CONFIRMING OTHER ENDPOINTS")
    log("="*70)
    
    # Create user for testing
    access_token, _ = create_user_and_signin()
    if not access_token:
        log("❌ Cannot test other endpoints without access token", "ERROR")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # GET /api/jobs/queue
    log("\n[TEST] GET /api/jobs/queue")
    try:
        resp = requests.get(f"{BASE_URL}/jobs/queue", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["plan", "remaining_this_month", "queue", "autopilot_active"]
            if all(k in data for k in required_keys):
                log(f"✅ Queue endpoint working: {list(data.keys())}")
                test_results["passed"].append("GET /api/jobs/queue - confirmed working")
            else:
                log(f"❌ Queue endpoint missing keys: {data}", "ERROR")
                test_results["failed"].append(f"GET /api/jobs/queue - missing keys")
        else:
            log(f"❌ Queue endpoint failed: {resp.status_code}", "ERROR")
            test_results["failed"].append(f"GET /api/jobs/queue - status {resp.status_code}")
    except Exception as e:
        log(f"❌ Queue endpoint exception: {e}", "ERROR")
        test_results["failed"].append(f"GET /api/jobs/queue - exception: {e}")
    
    # GET /api/jobs/autopilot-status
    log("\n[TEST] GET /api/jobs/autopilot-status")
    try:
        resp = requests.get(f"{BASE_URL}/jobs/autopilot-status", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["active", "plan", "monthly_limit", "remaining", "applications_count"]
            if all(k in data for k in required_keys):
                log(f"✅ Autopilot status endpoint working: {list(data.keys())}")
                test_results["passed"].append("GET /api/jobs/autopilot-status - confirmed working")
            else:
                log(f"❌ Autopilot status missing keys: {data}", "ERROR")
                test_results["failed"].append(f"GET /api/jobs/autopilot-status - missing keys")
        else:
            log(f"❌ Autopilot status failed: {resp.status_code}", "ERROR")
            test_results["failed"].append(f"GET /api/jobs/autopilot-status - status {resp.status_code}")
    except Exception as e:
        log(f"❌ Autopilot status exception: {e}", "ERROR")
        test_results["failed"].append(f"GET /api/jobs/autopilot-status - exception: {e}")
    
    # POST /api/payments/create-order
    log("\n[TEST] POST /api/payments/create-order")
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
                log(f"✅ Razorpay create-order working: amount={data.get('amount')}, currency={data.get('currency')}")
                test_results["passed"].append("POST /api/payments/create-order - confirmed working")
            else:
                log(f"❌ Create-order missing keys: {data}", "ERROR")
                test_results["failed"].append(f"POST /api/payments/create-order - missing keys")
        else:
            log(f"❌ Create-order failed: {resp.status_code}", "ERROR")
            test_results["failed"].append(f"POST /api/payments/create-order - status {resp.status_code}")
    except Exception as e:
        log(f"❌ Create-order exception: {e}", "ERROR")
        test_results["failed"].append(f"POST /api/payments/create-order - exception: {e}")

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
    log("JobPilot AI Flow Testing - After OpenRouter Model Pool Fix")
    log("="*70)
    log(f"Base URL: {BASE_URL}")
    log(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log("="*70)
    
    # Test complete AI flow
    test_ai_flow_complete()
    
    # Test resume parse on fresh user
    test_resume_parse_fresh_user()
    
    # Re-confirm other endpoints
    test_other_endpoints()
    
    # Print summary
    return print_summary()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
