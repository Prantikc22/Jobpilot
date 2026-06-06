"""AI routes - resume optimization, ATS score, LinkedIn optimizer."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_deps import get_current_user
from db import get_db
from services.openrouter_service import chat_json

router = APIRouter(prefix="/ai", tags=["ai"])


class OptimizeBody(BaseModel):
    target_role: str | None = None


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
    try:
        result = await chat_json(system, prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI failed: {e}")


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
    try:
        return await chat_json(system, doc["resume_text"][:6000])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI failed: {e}")


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
    try:
        return await chat_json(system, doc["resume_text"][:6000])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI failed: {e}")
