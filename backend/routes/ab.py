"""A/B testing - public variant fetch + admin stats."""
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from auth_deps import get_current_admin
from db import get_db

router = APIRouter(prefix="/ab", tags=["ab"])

EXPERIMENTS = {
    "pricing_copy": {
        "A": {
            "headline": "Targeted applications.",
            "subhead": "Never spam.",
            "tagline": "Every application is matched to your experience, skills, locations, salary and work authorization.",
        },
        "B": {
            "headline": "Your AI hunter.",
            "subhead": "Always on.",
            "tagline": "We don't blast resumes. We submit applications worth the recruiter's time — and yours.",
        },
    },
}


class TrackBody(BaseModel):
    experiment: str
    variant: str
    event: str  # "view" | "click" | "convert"


@router.get("/variant/{experiment}")
async def get_variant(experiment: str, request: Request, response: Response, db=Depends(get_db)):
    if experiment not in EXPERIMENTS:
        return {"variant": "A", "copy": EXPERIMENTS["pricing_copy"]["A"]}
    # Use cookie for stickiness
    cookie_key = f"jp_ab_{experiment}"
    existing_variant = request.cookies.get(cookie_key)
    is_first_visit = existing_variant not in EXPERIMENTS[experiment]
    if is_first_visit:
        variant = "A" if secrets.randbelow(2) == 0 else "B"
        response.set_cookie(cookie_key, variant, max_age=60 * 60 * 24 * 60, samesite="lax")
        # Log a 'view' event only on FIRST cookie issuance (avoid inflating on refresh)
        try:
            await db.ab_events.insert_one(
                {
                    "experiment": experiment,
                    "variant": variant,
                    "event": "view",
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            )
        except Exception:
            pass
    else:
        variant = existing_variant
    return {"variant": variant, "copy": EXPERIMENTS[experiment][variant]}


@router.post("/track")
async def track(body: TrackBody, db=Depends(get_db)):
    if body.experiment not in EXPERIMENTS or body.variant not in EXPERIMENTS[body.experiment]:
        return {"ok": False}
    if body.event not in ("view", "click", "convert"):
        return {"ok": False}
    await db.ab_events.insert_one(
        {
            "experiment": body.experiment,
            "variant": body.variant,
            "event": body.event,
            "at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {"ok": True}


@router.get("/stats")
async def stats(admin=Depends(get_current_admin), db=Depends(get_db)):
    """Admin-only A/B aggregate."""
    result = {}
    for exp in EXPERIMENTS.keys():
        pipeline = [
            {"$match": {"experiment": exp}},
            {"$group": {"_id": {"variant": "$variant", "event": "$event"}, "count": {"$sum": 1}}},
        ]
        agg = await db.ab_events.aggregate(pipeline).to_list(100)
        breakdown = {}
        for row in agg:
            v = row["_id"]["variant"]
            e = row["_id"]["event"]
            breakdown.setdefault(v, {"view": 0, "click": 0, "convert": 0})
            breakdown[v][e] = row["count"]
        # CTR / CVR
        for v, counts in breakdown.items():
            views = counts["view"] or 1
            counts["click_rate"] = round(counts["click"] / views * 100, 2)
            counts["convert_rate"] = round(counts["convert"] / views * 100, 2)
        result[exp] = breakdown
    return result
