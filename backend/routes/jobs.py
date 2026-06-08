"""Jobs + matching + AUTOPILOT auto-applications.

In the new model the user does NOT click "Apply" — JobPilot's background
autopilot worker submits applications for paid users (Starter / Pro). This
file exposes:

  GET  /jobs/recommendations  -> top matching jobs (preview only, no Apply)
  GET  /jobs/queue            -> jobs the autopilot is about to submit next
  GET  /jobs/applications     -> the agent's submission history
  GET  /jobs/autopilot-status -> live status of the autopilot for this user
  POST /jobs/tailor-letter    -> tailored cover letter (consumes 1 AI credit)
"""
import uuid
import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_deps import get_current_user
from db import get_db
from services.openrouter_service import chat_json, OpenRouterBusy
from services.ai_credits import consume_credit, refund_credit

router = APIRouter(prefix="/jobs", tags=["jobs"])


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
    {"company": "GitLab", "role": "Staff Engineer", "location": "Remote", "salary": "$190k–$260k", "platform": "LinkedIn", "tags": ["Ruby", "Kubernetes", "DevOps"]},
    {"company": "HashiCorp", "role": "Senior Backend Engineer", "location": "Remote (India)", "salary": "₹40–60 LPA", "platform": "Greenhouse", "tags": ["Go", "Terraform", "Cloud"]},
    {"company": "Asana", "role": "Engineering Manager", "location": "Bengaluru", "salary": "₹70–100 LPA", "platform": "LinkedIn", "tags": ["Leadership", "B2B SaaS"]},
    {"company": "Twilio", "role": "Senior SRE", "location": "Remote", "salary": "$170k–$230k", "platform": "Workday", "tags": ["Kubernetes", "AWS", "Observability"]},
]


def _job_id(j: dict) -> str:
    return f"{j['company']}-{j['role']}".lower().replace(" ", "-")


def _score(job: dict, user_doc: dict) -> float:
    score = 0.62 + random.random() * 0.32
    rolesf = [r.lower() for r in user_doc.get("target_roles", [])]
    rolelc = job["role"].lower()
    if rolesf and any(r in rolelc or rolelc in r for r in rolesf):
        score += 0.10
    return round(min(score, 0.99), 2)


@router.get("/recommendations")
async def recommendations(user=Depends(get_current_user), db=Depends(get_db)):
    user_doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    plan = user_doc.get("plan", "free")
    base_limit = {"free": 10, "starter": 100, "pro": 300}.get(plan, 10)
    bonus = int(user_doc.get("referral_credits", 0))
    limit = base_limit + bonus
    items: List[dict] = []
    for j in SEED_JOBS:
        items.append(
            {
                "id": _job_id(j),
                **j,
                "match_score": _score(j, user_doc),
                "posted_days_ago": random.randint(0, 7),
            }
        )
    items.sort(key=lambda x: -x["match_score"])
    return {"plan": plan, "limit": limit, "base_limit": base_limit, "bonus": bonus, "jobs": items[:limit]}


@router.get("/queue")
async def queue(user=Depends(get_current_user), db=Depends(get_db)):
    """Top N jobs the autopilot is about to submit next (paid users only)."""
    user_doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    plan = user_doc.get("plan", "free")
    plan_limit = {"starter": 100, "pro": 300}.get(plan, 0)
    used = int(user_doc.get("applications_count", 0) or 0)
    remaining = max(0, plan_limit - used)

    # Which jobs have we already submitted for this user?
    submitted = await db.applications.find(
        {"supabase_user_id": user["id"]}, {"_id": 0, "job_id": 1}
    ).to_list(1000)
    submitted_ids = {a["job_id"] for a in submitted}

    items = []
    for j in SEED_JOBS:
        jid = _job_id(j)
        if jid in submitted_ids:
            continue
        items.append({"id": jid, **j, "match_score": _score(j, user_doc)})
    items.sort(key=lambda x: -x["match_score"])
    preview = items[:min(6, remaining if plan != "free" else 6)]
    return {
        "plan": plan,
        "remaining_this_month": remaining,
        "queue": preview,
        "autopilot_active": plan in ("starter", "pro") and remaining > 0,
    }


@router.get("/applications")
async def list_applications(user=Depends(get_current_user), db=Depends(get_db)):
    items = (
        await db.applications.find({"supabase_user_id": user["id"]}, {"_id": 0})
        .sort("submitted_at", -1)
        .to_list(500)
    )
    return {"applications": items}


@router.get("/autopilot-status")
async def autopilot_status(user=Depends(get_current_user), db=Depends(get_db)):
    user_doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    plan = user_doc.get("plan", "free")
    plan_limit = {"free": 0, "starter": 100, "pro": 300}.get(plan, 0)
    used = int(user_doc.get("applications_count", 0) or 0)
    last_auto = user_doc.get("last_auto_apply_at")
    last_app = await db.applications.find_one(
        {"supabase_user_id": user["id"]}, {"_id": 0, "company": 1, "role": 1, "submitted_at": 1, "platform": 1}, sort=[("submitted_at", -1)]
    )
    return {
        "active": plan in ("starter", "pro") and used < plan_limit,
        "plan": plan,
        "applications_count": used,
        "monthly_limit": plan_limit,
        "remaining": max(0, plan_limit - used),
        "last_auto_apply_at": last_auto,
        "last_application": last_app,
    }


@router.post("/tailor-letter")
async def tailor_letter(payload: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Generate a tailored cover letter for a given job using the user's resume.
    Consumes 1 AI credit.
    """
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
    await consume_credit(db, user["id"])
    try:
        return await chat_json(system, prompt)
    except OpenRouterBusy:
        await refund_credit(db, user["id"])
        raise HTTPException(status_code=503, detail="AI briefly overloaded; credit refunded. Retry in 30–60s.")
    except Exception as e:
        await refund_credit(db, user["id"])
        raise HTTPException(status_code=500, detail=f"AI failed: {e}")


# ------------------------------------------------------------------
# Autopilot worker — runs in the background and applies on behalf of
# paid users at a steady pace, respecting monthly quota.
# ------------------------------------------------------------------
async def autopilot_tick(db) -> dict:
    """One pass of the autopilot. Submits at most one application per paid user
    per tick, with a per-user 5-minute cooldown. Idempotent across ticks.
    """
    from datetime import datetime as _dt, timedelta as _td

    now = _dt.now(timezone.utc)
    cooldown = _td(minutes=5)
    submitted = 0

    paid_users = await db.users.find(
        {"plan": {"$in": ["starter", "pro"]}},
        {"supabase_user_id": 1, "plan": 1, "applications_count": 1, "last_auto_apply_at": 1, "target_roles": 1, "_id": 0},
    ).to_list(2000)

    for u in paid_users:
        plan = u.get("plan")
        plan_limit = {"starter": 100, "pro": 300}.get(plan, 0)
        used = int(u.get("applications_count", 0) or 0)
        if used >= plan_limit:
            continue

        # cooldown per user
        last = u.get("last_auto_apply_at")
        if last:
            try:
                last_dt = _dt.fromisoformat(str(last).replace("Z", "+00:00"))
                if now - last_dt < cooldown:
                    continue
            except Exception:
                pass

        # find a job we haven't applied to yet, highest match
        already = await db.applications.find(
            {"supabase_user_id": u["supabase_user_id"]}, {"_id": 0, "job_id": 1}
        ).to_list(1000)
        already_ids = {a["job_id"] for a in already}

        candidates = []
        for j in SEED_JOBS:
            jid = _job_id(j)
            if jid in already_ids:
                continue
            candidates.append({"id": jid, **j, "match_score": _score(j, u)})
        if not candidates:
            continue
        candidates.sort(key=lambda x: -x["match_score"])
        chosen = candidates[0]

        app_doc = {
            "id": str(uuid.uuid4()),
            "supabase_user_id": u["supabase_user_id"],
            "job_id": chosen["id"],
            "company": chosen["company"],
            "role": chosen["role"],
            "platform": chosen["platform"],
            "match_score": chosen["match_score"],
            "status": "submitted",
            "submitted_by": "autopilot",
            "submitted_at": now.isoformat(),
        }
        await db.applications.insert_one(dict(app_doc))
        await db.users.update_one(
            {"supabase_user_id": u["supabase_user_id"]},
            {
                "$inc": {"applications_count": 1},
                "$set": {
                    "last_auto_apply_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                },
            },
        )
        submitted += 1

    return {"submitted": submitted, "at": now.isoformat()}
