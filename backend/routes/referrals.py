"""Referrals - apply referral codes + view referral stats."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_deps import get_current_user
from db import get_db

router = APIRouter(prefix="/referrals", tags=["referrals"])

# Each successful referral grants the referrer +25 application credits
REFERRAL_CREDIT = 25


class ApplyRef(BaseModel):
    code: str


@router.post("/apply")
async def apply_ref(body: ApplyRef, user=Depends(get_current_user), db=Depends(get_db)):
    code = (body.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Empty code")
    me = await db.users.find_one({"supabase_user_id": user["id"]})
    if not me:
        raise HTTPException(status_code=404, detail="User not found")
    if me.get("referred_by_code"):
        raise HTTPException(status_code=400, detail="Referral code already applied")
    if me.get("referral_code") == code:
        raise HTTPException(status_code=400, detail="Cannot use your own code")
    referrer = await db.users.find_one({"referral_code": code})
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    # Apply
    await db.users.update_one(
        {"supabase_user_id": user["id"]},
        {"$set": {"referred_by_code": code, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    # Credit the referrer
    await db.users.update_one(
        {"supabase_user_id": referrer["supabase_user_id"]},
        {"$inc": {"referral_credits": REFERRAL_CREDIT}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


@router.get("/mine")
async def my_referrals(user=Depends(get_current_user), db=Depends(get_db)):
    me = await db.users.find_one({"supabase_user_id": user["id"]})
    if not me:
        raise HTTPException(status_code=404, detail="User not found")
    invited = await db.users.count_documents({"referred_by_code": me.get("referral_code")})
    return {
        "referral_code": me.get("referral_code"),
        "referral_credits": me.get("referral_credits", 0),
        "invited_count": invited,
        "credit_per_invite": REFERRAL_CREDIT,
    }
