"""Jobs + matching + applications."""
import uuid
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_deps import get_current_user
from db import get_db
from services.llm_service import chat_json

router = APIRouter(prefix="/jobs", tags=["jobs"])


# Seed jobs (in lieu of a real scraper). Real scraping would live here.
SEED_JOBS = [
    {"company": "Stripe", "role": "Senior Software Engineer", "location": "Bangalore, India", "salary": "₹45–70 LPA", "platform": "LinkedIn", "tags": ["Python", "Distributed Systems", "Payments"]},
    {"company": "Linear", "role": "Product Engineer", "location": "Remote", "salary": "$140k–$190k", "platform": "Wellfound", "tags": ["TypeScript", "React", "GraphQL"]},
    {"company": "Vercel", "role": "Frontend Engineer", "location": "Remote", "salary": "$160k–$220k", "platform": "LinkedIn", "tags": ["Next.js", "React", "Edge"]},
    {"company": "Airbnb", "role": "Software Engineer II", "location": "Gurgaon, India", "salary": "₹38–52 LPA", "platform": "Indeed", "tags": ["Java", "Kotlin", "Microservices"]},
    {"company": "Notion", "role": "Full Stack Engineer", "location": "Remote", "salary": "$150k–$200k", "platform": "Wellfound", "tags": ["TypeScript", "Postgres", "Realtime"]},
    {"company": "Figma", "role": "Senior Frontend Engineer", "location": "Hybrid – Bengaluru", "salary": "₹50–80 LPA", "platform": "LinkedIn", "tags": ["WebGL", "TypeScript", "React"]},
    {"company": "Razorpay", "role": "SDET", "location": "Bengaluru, India", "salary": "₹22–32 LPA", "platform": "Glassdoor", "tags": ["QA", "Automation", "Python"]},
    {"company": "Atlassian", "role": "Product Manager", "location": "Bengaluru / Remote", "salary": "₹55–85 LPA", "platform": "LinkedIn", "tags": ["Product", "Agile", "B2B"]},
    {"company": "Datadog", "role": "Data Analyst", "location": "Remote", "salary": "$110k–$150k", "platform": "Indeed", "tags": ["SQL", "Python", "Analytics"]},
    {"company": "Shopify", "role": "Senior QA Engineer", "location": "Remote (India)", "salary": "₹28–42 LPA", "platform": "Workday", "tags": ["Cypress", "Playwright", "CI"]},
    {"company": "OpenAI", "role": "ML Engineer", "location": "San Francisco / Remote", "salary": "$220k–$320k", "platform": "LinkedIn", "tags": ["PyTorch", "LLMs", "Research"]},
    {"company": "Cloudflare", "role": "Backend Engineer", "location": "Remote", "salary": "$150k–$200k", "platform": "Wellfound", "tags": ["Rust", "Go", "Networking"]},
]


class ApplicationCreate(BaseModel):
    job_id: str
    tailored_letter: Optional[str] = None


def _job_id(j: dict) -> str:
    return f"{j['company']}-{j['role']}".lower().replace(" ", "-")


@router.get("/recommendations")
async def recommendations(user=Depends(get_current_user), db=Depends(get_db)):
    user_doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    plan = user_doc.get("plan", "free")
    base_limit = {"free": 10, "starter": 100, "pro": 300}.get(plan, 10)
    bonus = int(user_doc.get("referral_credits", 0))
    limit = base_limit + bonus
    rolesf = [r.lower() for r in user_doc.get("target_roles", [])]
    items: List[dict] = []
    for j in SEED_JOBS:
        score = 0.6 + random.random() * 0.35
        rolelc = j["role"].lower()
        if rolesf and any(r in rolelc or rolelc in r for r in rolesf):
            score += 0.1
        items.append(
            {
                "id": _job_id(j),
                **j,
                "match_score": round(min(score, 0.99), 2),
                "posted_days_ago": random.randint(0, 7),
            }
        )
    items.sort(key=lambda x: -x["match_score"])
    return {"plan": plan, "limit": limit, "base_limit": base_limit, "bonus": bonus, "jobs": items[:limit]}


@router.post("/apply")
async def apply(payload: ApplicationCreate, user=Depends(get_current_user), db=Depends(get_db)):
    user_doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    plan = user_doc.get("plan", "free")
    if plan == "free":
        raise HTTPException(status_code=403, detail="Auto-apply requires Starter or Pro plan")

    job = next((j for j in SEED_JOBS if _job_id(j) == payload.job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Quota check
    plan_limit = {"starter": 100, "pro": 300}.get(plan, 0)
    used = user_doc.get("applications_count", 0)
    if used >= plan_limit:
        raise HTTPException(status_code=403, detail="Monthly application quota reached")

    app_doc = {
        "id": str(uuid.uuid4()),
        "supabase_user_id": user["id"],
        "job_id": payload.job_id,
        "company": job["company"],
        "role": job["role"],
        "platform": job["platform"],
        "status": "submitted",
        "tailored_letter": payload.tailored_letter,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.applications.insert_one(dict(app_doc))
    await db.users.update_one(
        {"supabase_user_id": user["id"]},
        {"$inc": {"applications_count": 1}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "application_id": app_doc["id"]}


@router.get("/applications")
async def list_applications(user=Depends(get_current_user), db=Depends(get_db)):
    items = await db.applications.find({"supabase_user_id": user["id"]}, {"_id": 0}).sort("submitted_at", -1).to_list(500)
    return {"applications": items}


@router.post("/tailor-letter")
async def tailor_letter(payload: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Generate a tailored cover letter for a given job using the user's resume."""
    user_doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    if not user_doc.get("resume_text"):
        raise HTTPException(status_code=400, detail="Upload your resume first")
    job_id = payload.get("job_id")
    job = next((j for j in SEED_JOBS if _job_id(j) == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    system = (
        "You write concise, persuasive, human-sounding cover letters for senior tech professionals. "
        "Return JSON with keys: subject (string), body (string, 180-260 words)."
    )
    prompt = (
        f"CANDIDATE RESUME:\n{user_doc['resume_text'][:5000]}\n\n"
        f"JOB:\nCompany: {job['company']}\nRole: {job['role']}\nLocation: {job['location']}\nSkills: {', '.join(job['tags'])}"
    )
    try:
        result = await chat_json(system, prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI failed: {e}")
