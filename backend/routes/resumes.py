"""Resume upload + parse routes."""
import io
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from auth_deps import get_current_user
from db import get_db
from services.supabase_service import upload_resume, get_signed_url
from services.openrouter_service import chat_json, OpenRouterBusy
from services.ai_credits import consume_credit, refund_credit

router = APIRouter(prefix="/resumes", tags=["resumes"])

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}


def extract_text(content: bytes, ext: str) -> str:
    try:
        if ext == "pdf":
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(content))
            return "\n".join((p.extract_text() or "") for p in reader.pages)[:20000]
        if ext == "docx":
            from docx import Document

            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)[:20000]
    except Exception as e:
        print(f"[resume] extract_text error: {e}")
    return ""


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF or DOCX accepted")
    ext = ALLOWED_TYPES[file.content_type]
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    safe_name = re.sub(r"[^A-Za-z0-9_.-]", "_", file.filename or f"resume.{ext}")
    filename = f"{int(datetime.now(timezone.utc).timestamp())}_{safe_name}"

    res = upload_resume(user["id"], filename, content, file.content_type)
    text = extract_text(content, ext)

    await db.users.update_one(
        {"supabase_user_id": user["id"]},
        {
            "$set": {
                "resume_path": res["path"],
                "resume_filename": file.filename,
                "resume_url": res["signed_url"],
                "resume_text": text,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
    return {"path": res["path"], "signed_url": res["signed_url"], "extracted_chars": len(text)}


@router.post("/parse")
async def parse_resume(user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.users.find_one({"supabase_user_id": user["id"]})
    if not doc or not doc.get("resume_text"):
        raise HTTPException(status_code=400, detail="No resume uploaded yet")

    system = (
        "You are an expert resume parser. Extract structured data. "
        "Return JSON with keys: name, email, phone, headline, summary, "
        "skills (array of strings), experience (array of {company, role, duration, highlights[]}), "
        "education (array of {school, degree, year}), suggested_roles (array of strings, up to 5)."
    )
    text = doc["resume_text"][:8000]
    await consume_credit(db, user["id"])
    try:
        parsed = await chat_json(system, f"RESUME:\n{text}")
    except OpenRouterBusy:
        await refund_credit(db, user["id"])
        raise HTTPException(
            status_code=503,
            detail="Our AI is briefly overloaded. We didn't charge a credit — please retry in 30–60 seconds.",
        )
    except Exception as e:
        await refund_credit(db, user["id"])
        raise HTTPException(status_code=500, detail=f"AI parse failed: {e}")

    await db.users.update_one(
        {"supabase_user_id": user["id"]},
        {"$set": {"resume_parsed": parsed, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return parsed


@router.get("/signed-url")
async def signed_url(user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.users.find_one({"supabase_user_id": user["id"]})
    if not doc or not doc.get("resume_path"):
        raise HTTPException(status_code=404, detail="No resume")
    url = get_signed_url(doc["resume_path"], 3600)
    return {"signed_url": url}
