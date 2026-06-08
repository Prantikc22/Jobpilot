"""AI routes - resume optimization, ATS score, LinkedIn optimizer.

Each invocation consumes one monthly AI credit (3/user/month). Calls run through
the smart OpenRouter fallback pool so users almost never see a 429.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_deps import get_current_user
from db import get_db
from services.openrouter_service import chat_json, OpenRouterBusy
from services.ai_credits import consume_credit, refund_credit, get_credits_status

router = APIRouter(prefix="/ai", tags=["ai"])


class OptimizeBody(BaseModel):
    target_role: str | None = None


@router.get("/credits")
async def credits(user=Depends(get_current_user), db=Depends(get_db)):
    return await get_credits_status(db, user["id"])


async def _run(db, uid: str, system: str, prompt: str):
    await consume_credit(db, uid)
    try:
        return await chat_json(system, prompt)
    except OpenRouterBusy:
        await refund_credit(db, uid)
        raise HTTPException(
            status_code=503,
            detail="Our AI is briefly overloaded. We didn't charge a credit — please retry in 30–60 seconds.",
        )
    except HTTPException:
        await refund_credit(db, uid)
        raise
    except Exception as e:
        await refund_credit(db, uid)
        raise HTTPException(status_code=500, detail=f"AI failed: {e}")


@router.post("/optimize-resume")
async def optimize_resume(body: OptimizeBody, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    if not doc.get("resume_text"):
        raise HTTPException(status_code=400, detail="Upload your resume first")
    system = (
        "You are a senior resume coach. Return JSON with keys: "
        "improvements (array of {section, before, after, reason}), "
        "summary_rewrite (string), keywords_to_add (array of strings), "
        "ats_score (integer 0-100), overall_grade (string A-F)."
    )
    target = body.target_role or (doc.get("target_roles") or ["Software Engineer"])[0]
    prompt = f"TARGET ROLE: {target}\n\nRESUME:\n{doc['resume_text'][:6000]}"
    return await _run(db, user["id"], system, prompt)


@router.post("/ats-check")
async def ats_check(user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    if not doc.get("resume_text"):
        raise HTTPException(status_code=400, detail="Upload your resume first")
    system = (
        "You are an ATS expert. Return JSON with keys: "
        "score (0-100), passes (array of strings), warnings (array of strings), "
        "missing_keywords (array of strings), formatting_issues (array of strings)."
    )
    return await _run(db, user["id"], system, doc["resume_text"][:6000])


@router.post("/linkedin-optimize")
async def linkedin_optimize(user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    if not doc.get("resume_text"):
        raise HTTPException(status_code=400, detail="Upload your resume first")
    system = (
        "You are a LinkedIn profile expert. Return JSON with keys: "
        "headline (string, <=220 chars), about (string, 3-4 short paragraphs), "
        "skills (array of 15 strings), recommendations (array of 5 actionable tips)."
    )
    return await _run(db, user["id"], system, doc["resume_text"][:6000])
