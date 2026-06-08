"""Admin routes - separate JWT auth."""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_deps import get_current_admin, create_admin_token
from db import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


class AdminLogin(BaseModel):
    email: str
    password: str


class PlanChange(BaseModel):
    plan: str


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
    users = await db.users.find({}, {"_id": 0, "job_search_email_password": 0, "resume_text": 0}).sort("created_at", -1).to_list(limit)
    return {"users": users}


@router.get("/users/{supabase_user_id}")
async def get_user_detail(supabase_user_id: str, admin=Depends(get_current_admin), db=Depends(get_db)):
    user = await db.users.find_one({"supabase_user_id": supabase_user_id}, {"_id": 0, "job_search_email_password": 0, "resume_text": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    apps = await db.applications.find({"supabase_user_id": supabase_user_id}, {"_id": 0}).sort("submitted_at", -1).to_list(100)
    orders = await db.orders.find({"supabase_user_id": supabase_user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"user": user, "applications": apps, "orders": orders}


class UserPatch(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    target_roles: list[str] | None = None
    target_countries: list[str] | None = None
    preferred_salary: str | None = None
    plan: str | None = None
    applications_count: int | None = None
    interviews_count: int | None = None
    offers_count: int | None = None


@router.patch("/users/{supabase_user_id}")
async def patch_user(supabase_user_id: str, body: UserPatch, admin=Depends(get_current_admin), db=Depends(get_db)):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if data.get("plan") and data["plan"] not in ("free", "starter", "pro"):
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one({"supabase_user_id": supabase_user_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "fields": list(data.keys())}


@router.put("/users/{supabase_user_id}/plan")
async def change_plan(supabase_user_id: str, body: PlanChange, admin=Depends(get_current_admin), db=Depends(get_db)):
    if body.plan not in ["free", "starter", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    result = await db.users.update_one(
        {"supabase_user_id": supabase_user_id},
        {"$set": {"plan": body.plan, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@router.get("/orders")
async def list_orders(admin=Depends(get_current_admin), db=Depends(get_db), limit: int = 100):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"orders": orders}


@router.get("/applications")
async def list_applications(admin=Depends(get_current_admin), db=Depends(get_db), limit: int = 200):
    apps = await db.applications.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(limit)
    return {"applications": apps}


@router.get("/webhook-events")
async def list_webhook_events(admin=Depends(get_current_admin), db=Depends(get_db), limit: int = 100):
    events = await db.webhook_events.find({}, {"_id": 0}).sort("received_at", -1).to_list(limit)
    return {"events": events}
