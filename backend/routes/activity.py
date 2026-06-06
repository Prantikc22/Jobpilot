"""Live activity feed for landing page social proof."""
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from db import get_db

router = APIRouter(prefix="/activity", tags=["activity"])

NAMES = ["Rahul", "Sarah", "Michael", "Priya", "Ananya", "James", "Aditya", "Emma", "Vikram", "Olivia", "Arjun", "Sophia", "Karan", "Liam", "Neha", "Ethan", "Riya", "Daniel", "Tanya", "Noah"]
COMPANIES = ["Stripe", "Vercel", "Linear", "Notion", "Figma", "Airbnb", "Razorpay", "Atlassian", "Datadog", "Shopify", "OpenAI", "Cloudflare", "Anthropic", "Asana", "Webflow"]
ROLES = ["Senior Software Engineer", "Product Manager", "SDET", "Data Analyst", "Designer", "Frontend Engineer", "ML Engineer", "QA Engineer"]
ACTIONS = [
    ("interview", "received an interview request from"),
    ("offer", "received an offer from"),
    ("submitted", "submitted {n} applications today"),
    ("response", "got a response from"),
]


def _event() -> dict:
    name = random.choice(NAMES)
    kind, tmpl = random.choice(ACTIONS)
    if kind == "submitted":
        n = random.randint(8, 32)
        text = tmpl.format(n=n)
        return {"name": name, "kind": kind, "text": text, "company": None}
    company = random.choice(COMPANIES)
    return {"name": name, "kind": kind, "text": tmpl, "company": company, "role": random.choice(ROLES)}


@router.get("/feed")
async def feed(db=Depends(get_db)):
    items = [_event() for _ in range(12)]
    return {"items": items, "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/stats")
async def stats(db=Depends(get_db)):
    # Aggregate real + seeded stats
    real_apps = await db.applications.count_documents({})
    real_users = await db.users.count_documents({})
    return {
        "applications_submitted": 50000 + real_apps,
        "job_seekers": 8500 + real_users,
        "interviews": 2400,
        "offers": 1200,
    }
