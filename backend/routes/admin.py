"""Admin routes - separate JWT auth."""
import os
import io
import csv
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from auth_deps import get_current_admin, create_admin_token
from db import get_db
from services.supabase_service import get_signed_url

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


class AdminLogin(BaseModel):
    email: str
    password: str


class PlanChange(BaseModel):
    plan: str


class UserPatch(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    target_roles: Optional[list[str]] = None
    target_countries: Optional[list[str]] = None
    preferred_salary: Optional[str] = None
    plan: Optional[str] = None
    applications_count: Optional[int] = None
    interviews_count: Optional[int] = None
    offers_count: Optional[int] = None
    job_search_email: Optional[str] = None
    job_search_email_password: Optional[str] = None


class ApplicationPatch(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    job_url: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None


class AddApplication(BaseModel):
    company: str
    role: str
    platform: str = "Manual"
    job_url: Optional[str] = None
    status: str = "submitted"


@router.post("/login")
async def login(body: AdminLogin):
    if body.email != ADMIN_EMAIL or body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_admin_token()
    return {"token": token, "email": ADMIN_EMAIL}


@router.get("/me")
async def me(admin=Depends(get_current_admin)):
    return {"email": admin.get("email"), "role": "admin"}


@router.get("/stats")
async def admin_stats(admin=Depends(get_current_admin), db=Depends(get_db)):
    total_users = await db.users.count_documents({})
    paid_users = await db.users.count_documents({"plan": {"$in": ["starter", "pro"]}})
    free_users = await db.users.count_documents({"plan": "free"})
    total_apps = await db.applications.count_documents({})
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"status": "paid"})
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    revenue_agg = await db.orders.aggregate(pipeline).to_list(1)
    revenue_paise = revenue_agg[0]["total"] if revenue_agg else 0
    return {
        "total_users": total_users,
        "paid_users": paid_users,
        "free_users": free_users,
        "total_applications": total_apps,
        "total_orders": total_orders,
        "paid_orders": paid_orders,
        "revenue_inr": round(revenue_paise / 100, 2),
    }


@router.get("/users")
async def list_users(admin=Depends(get_current_admin), db=Depends(get_db), limit: int = 100):
    users = await db.users.find({}, {"_id": 0, "resume_text": 0}).sort("created_at", -1).to_list(limit)
    return {"users": users}


@router.get("/users/{supabase_user_id}")
async def get_user_detail(supabase_user_id: str, admin=Depends(get_current_admin), db=Depends(get_db)):
    user = await db.users.find_one({"supabase_user_id": supabase_user_id}, {"_id": 0, "resume_text": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    apps = await db.applications.find({"supabase_user_id": supabase_user_id}, {"_id": 0}).sort("submitted_at", -1).to_list(200)
    orders = await db.orders.find({"supabase_user_id": supabase_user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"user": user, "applications": apps, "orders": orders}


@router.patch("/users/{supabase_user_id}")
async def patch_user(supabase_user_id: str, body: UserPatch, admin=Depends(get_current_admin), db=Depends(get_db)):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if data.get("plan") and data["plan"] not in ("free", "starter", "pro"):
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"supabase_user_id": supabase_user_id}, {"$set": data})
    return {"ok": True, "fields": list(data.keys())}


@router.put("/users/{supabase_user_id}/plan")
async def change_plan(supabase_user_id: str, body: PlanChange, admin=Depends(get_current_admin), db=Depends(get_db)):
    if body.plan not in ["free", "starter", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    await db.users.update_one(
        {"supabase_user_id": supabase_user_id},
        {"$set": {"plan": body.plan, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


@router.get("/orders")
async def list_orders(admin=Depends(get_current_admin), db=Depends(get_db), limit: int = 100):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"orders": orders}


@router.get("/applications")
async def list_applications(admin=Depends(get_current_admin), db=Depends(get_db), limit: int = 200):
    apps = await db.applications.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(limit)
    return {"applications": apps}


@router.patch("/applications/{app_id}")
async def patch_application(app_id: str, body: ApplicationPatch, admin=Depends(get_current_admin), db=Depends(get_db)):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.applications.update_one({"id": app_id}, {"$set": data})
    return {"ok": True}


@router.post("/users/{supabase_user_id}/applications")
async def add_application(
    supabase_user_id: str,
    body: AddApplication,
    admin=Depends(get_current_admin),
    db=Depends(get_db),
):
    doc = {
        "id": str(uuid.uuid4()),
        "supabase_user_id": supabase_user_id,
        "company": body.company,
        "role": body.role,
        "platform": body.platform,
        "job_url": body.job_url,
        "status": body.status,
        "submitted_by": "admin",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "match_score": None,
        "job_id": None,
    }
    await db.applications.insert_one(doc)
    # Increment the user's applications_count so their dashboard reflects the new total
    await db.users.update_one(
        {"supabase_user_id": supabase_user_id},
        {
            "$inc": {"applications_count": 1},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    return {"ok": True, "id": doc["id"]}


def _parse_bulk_file(content: bytes, filename: str) -> list[dict]:
    """Parse .xlsx or .csv file into a list of application dicts."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Normalise a header string to a simple key
    def _norm(h: str) -> str:
        return h.strip().lower().replace(" ", "_").replace("-", "_")

    COL_ALIASES = {
        "company": ["company", "company_name", "employer", "organization"],
        "role": ["role", "job_title", "title", "position", "job_role", "job_name"],
        "platform": ["platform", "source", "job_board", "site", "website"],
        "job_url": ["job_url", "url", "link", "job_link", "apply_url"],
        "status": ["status", "application_status", "state"],
    }

    def _map_headers(headers: list[str]) -> dict[str, int]:
        """Return {field: col_index} for whatever columns we can recognise."""
        mapping = {}
        normed = [_norm(h) for h in headers]
        for field, aliases in COL_ALIASES.items():
            for alias in aliases:
                if alias in normed:
                    mapping[field] = normed.index(alias)
                    break
        return mapping

    rows = []

    if ext in ("xlsx", "xls"):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        all_rows = list(ws.iter_rows(values_only=True))
        if not all_rows:
            return []
        headers = [str(c) if c is not None else "" for c in all_rows[0]]
        col_map = _map_headers(headers)
        if "company" not in col_map or "role" not in col_map:
            raise ValueError("Excel must have at least 'Company' and 'Role' columns")
        for row in all_rows[1:]:
            company = str(row[col_map["company"]] or "").strip()
            role = str(row[col_map["role"]] or "").strip()
            if not company or not role:
                continue
            rows.append({
                "company": company,
                "role": role,
                "platform": str(row[col_map["platform"]] or "").strip() if "platform" in col_map else "Manual",
                "job_url": str(row[col_map["job_url"]] or "").strip() if "job_url" in col_map else None,
                "status": str(row[col_map["status"]] or "").strip() if "status" in col_map else "submitted",
            })

    elif ext == "csv":
        text = content.decode("utf-8-sig", errors="replace")
        reader = csv.reader(io.StringIO(text))
        all_rows = list(reader)
        if not all_rows:
            return []
        headers = all_rows[0]
        col_map = _map_headers(headers)
        if "company" not in col_map or "role" not in col_map:
            raise ValueError("CSV must have at least 'Company' and 'Role' columns")
        for row in all_rows[1:]:
            if len(row) <= max(col_map["company"], col_map["role"]):
                continue
            company = row[col_map["company"]].strip()
            role = row[col_map["role"]].strip()
            if not company or not role:
                continue
            rows.append({
                "company": company,
                "role": role,
                "platform": row[col_map["platform"]].strip() if "platform" in col_map and len(row) > col_map["platform"] else "Manual",
                "job_url": row[col_map["job_url"]].strip() or None if "job_url" in col_map and len(row) > col_map["job_url"] else None,
                "status": row[col_map["status"]].strip() if "status" in col_map and len(row) > col_map["status"] else "submitted",
            })
    else:
        raise ValueError("Only .xlsx or .csv files are supported")

    return rows


@router.post("/users/{supabase_user_id}/applications/bulk")
async def bulk_add_applications(
    supabase_user_id: str,
    file: UploadFile = File(...),
    admin=Depends(get_current_admin),
    db=Depends(get_db),
):
    """Upload an Excel (.xlsx) or CSV file and bulk-insert applications for a user."""
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    try:
        parsed_rows = _parse_bulk_file(content, file.filename or "upload.xlsx")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

    if not parsed_rows:
        raise HTTPException(status_code=400, detail="No valid rows found (need Company + Role columns)")

    now = datetime.now(timezone.utc).isoformat()
    added = 0
    skipped = 0
    for row in parsed_rows:
        status_val = row.get("status") or "submitted"
        if not status_val or status_val.lower() in ("", "none", "null"):
            status_val = "submitted"
        doc = {
            "id": str(uuid.uuid4()),
            "supabase_user_id": supabase_user_id,
            "company": row["company"],
            "role": row["role"],
            "platform": row.get("platform") or "Manual",
            "job_url": row.get("job_url") or None,
            "status": status_val,
            "submitted_by": "admin",
            "submitted_at": now,
            "match_score": None,
            "job_id": None,
        }
        try:
            await db.applications.insert_one(doc)
            added += 1
        except Exception:
            skipped += 1

    if added > 0:
        await db.users.update_one(
            {"supabase_user_id": supabase_user_id},
            {
                "$inc": {"applications_count": added},
                "$set": {"updated_at": now},
            },
        )

    return {"ok": True, "added": added, "skipped": skipped, "total_rows": len(parsed_rows)}


@router.get("/users/{supabase_user_id}/resume-url")
async def get_user_resume_url(
    supabase_user_id: str,
    admin=Depends(get_current_admin),
    db=Depends(get_db),
):
    user = await db.users.find_one({"supabase_user_id": supabase_user_id})
    if not user or not user.get("resume_path"):
        raise HTTPException(status_code=404, detail="No resume on file for this user")
    try:
        url = get_signed_url(user["resume_path"], 3600)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not generate URL: {e}")
    return {"signed_url": url, "filename": user.get("resume_filename", "resume")}


@router.get("/webhook-events")
async def list_webhook_events(admin=Depends(get_current_admin), db=Depends(get_db), limit: int = 100):
    events = await db.webhook_events.find({}, {"_id": 0}).sort("received_at", -1).to_list(limit)
    return {"events": events}
