"""Per-user monthly AI credit tracking (3 free uses per calendar month).

Each AI invocation consumes 1 credit regardless of which tool was used. Credits
roll over at the start of every calendar month (UTC).
"""
from datetime import datetime, timezone
from fastapi import HTTPException

MONTHLY_AI_CREDITS = 3


def _current_period() -> str:
    """YYYY-MM in UTC — the 'monthly bucket' key."""
    now = datetime.now(timezone.utc)
    return f"{now.year:04d}-{now.month:02d}"


async def get_credits_status(db, user_id: str) -> dict:
    """Read-only snapshot of credits for the current month."""
    doc = await db.users.find_one({"supabase_user_id": user_id}, {"ai_credits_used": 1, "ai_credits_period": 1})
    period = _current_period()
    used = 0
    if doc and doc.get("ai_credits_period") == period:
        used = int(doc.get("ai_credits_used", 0) or 0)
    remaining = max(0, MONTHLY_AI_CREDITS - used)
    return {
        "total": MONTHLY_AI_CREDITS,
        "used": used,
        "remaining": remaining,
        "period": period,
    }


async def consume_credit(db, user_id: str) -> dict:
    """Reserve one credit before calling the LLM. Raises 402-style HTTPException if exhausted.

    Returns the updated status. We update *before* invoking AI so that a successful
    user-visible response always corresponds to a debited credit; on a service-busy
    error we refund via ``refund_credit``.
    """
    period = _current_period()
    doc = await db.users.find_one({"supabase_user_id": user_id}, {"ai_credits_used": 1, "ai_credits_period": 1})
    used = 0
    if doc and doc.get("ai_credits_period") == period:
        used = int(doc.get("ai_credits_used", 0) or 0)
    if used >= MONTHLY_AI_CREDITS:
        raise HTTPException(
            status_code=402,
            detail=(
                f"You've used all {MONTHLY_AI_CREDITS} AI credits for this month. "
                "Credits reset on the 1st of next month."
            ),
        )
    new_used = used + 1
    await db.users.update_one(
        {"supabase_user_id": user_id},
        {
            "$set": {
                "ai_credits_used": new_used,
                "ai_credits_period": period,
                "ai_credits_last_used_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
    return {
        "total": MONTHLY_AI_CREDITS,
        "used": new_used,
        "remaining": MONTHLY_AI_CREDITS - new_used,
        "period": period,
    }


async def refund_credit(db, user_id: str) -> None:
    """Roll back one credit if the AI call ultimately failed (e.g. service busy)."""
    period = _current_period()
    doc = await db.users.find_one({"supabase_user_id": user_id}, {"ai_credits_used": 1, "ai_credits_period": 1})
    if not doc or doc.get("ai_credits_period") != period:
        return
    used = int(doc.get("ai_credits_used", 0) or 0)
    if used <= 0:
        return
    await db.users.update_one(
        {"supabase_user_id": user_id},
        {"$set": {"ai_credits_used": used - 1}},
    )
