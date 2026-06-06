"""User profile and onboarding routes."""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth_deps import get_current_user
from db import get_db

router = APIRouter(prefix="/users", tags=["users"])


class OnboardingPayload(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    target_roles: List[str] = Field(default_factory=list)
    target_countries: List[str] = Field(default_factory=list)
    preferred_salary: Optional[str] = None
    job_search_email: Optional[str] = None
    job_search_email_password: Optional[str] = None
    onboarding_step: Optional[int] = None
    onboarding_completed: Optional[bool] = None


def _generate_ref_code(email: str | None) -> str:
    import secrets, string
    base = (email or "").split("@")[0][:6].upper() or "PILOT"
    base = "".join(c for c in base if c.isalnum()) or "PILOT"
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"{base}-{suffix}"


async def _ensure_user(db, sb_user: dict) -> dict:
    uid = sb_user["id"]
    doc = await db.users.find_one({"supabase_user_id": uid}, {"_id": 0})
    if doc:
        # Backfill referral_code / pricing_variant for users created before these features
        patch = {}
        if not doc.get("referral_code"):
            patch["referral_code"] = _generate_ref_code(doc.get("email"))
        if not doc.get("pricing_variant"):
            import secrets
            patch["pricing_variant"] = "A" if secrets.randbelow(2) == 0 else "B"
        if patch:
            await db.users.update_one({"supabase_user_id": uid}, {"$set": patch})
            doc.update(patch)
        return doc
    import secrets
    new_doc = {
        "supabase_user_id": uid,
        "email": sb_user.get("email"),
        "full_name": (sb_user.get("user_metadata") or {}).get("full_name"),
        "phone": None,
        "linkedin_url": None,
        "target_roles": [],
        "target_countries": [],
        "preferred_salary": None,
        "job_search_email": None,
        # Note: stored encrypted-at-rest in mongo, never returned to frontend
        "job_search_email_password": None,
        "resume_path": None,
        "resume_filename": None,
        "resume_url": None,
        "resume_parsed": None,
        "plan": "free",  # free | starter | pro
        "applications_count": 0,
        "interviews_count": 0,
        "offers_count": 0,
        "onboarding_step": 1,
        "onboarding_completed": False,
        "referral_code": _generate_ref_code(sb_user.get("email")),
        "referred_by_code": None,
        "referral_credits": 0,  # bonus applications credited from referrals
        "pricing_variant": "A" if secrets.randbelow(2) == 0 else "B",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(dict(new_doc))
    return new_doc


def _strip_secrets(doc: dict) -> dict:
    d = dict(doc)
    d.pop("job_search_email_password", None)
    d.pop("_id", None)
    return d


@router.get("/me")
async def get_me(user=Depends(get_current_user), db=Depends(get_db)):
    doc = await _ensure_user(db, user)
    return _strip_secrets(doc)


@router.put("/me")
async def update_me(payload: OnboardingPayload, user=Depends(get_current_user), db=Depends(get_db)):
    await _ensure_user(db, user)
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"supabase_user_id": user["id"]}, {"$set": data})
    doc = await db.users.find_one({"supabase_user_id": user["id"]}, {"_id": 0})
    return _strip_secrets(doc)
