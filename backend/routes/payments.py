"""Razorpay payments routes."""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_deps import get_current_user
from db import get_db
from services.razorpay_service import create_order, verify_signature

router = APIRouter(prefix="/payments", tags=["payments"])

PLAN_PRICES = {"starter": 49900, "pro": 99900}  # in paise


class CreateOrder(BaseModel):
    plan: str


class Verify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


@router.post("/create-order")
async def create_order_route(body: CreateOrder, user=Depends(get_current_user), db=Depends(get_db)):
    if body.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    amount = PLAN_PRICES[body.plan]
    receipt = f"jp_{user['id'][:8]}_{int(datetime.now(timezone.utc).timestamp())}"
    order = create_order(amount, receipt, notes={"supabase_user_id": user["id"], "plan": body.plan})
    await db.orders.insert_one(
        {
            "razorpay_order_id": order["id"],
            "supabase_user_id": user["id"],
            "plan": body.plan,
            "amount": amount,
            "currency": "INR",
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "key_id": os.environ["RAZORPAY_KEY_ID"],
    }


@router.post("/verify")
async def verify_route(body: Verify, user=Depends(get_current_user), db=Depends(get_db)):
    ok = verify_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid signature")
    if body.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    await db.orders.update_one(
        {"razorpay_order_id": body.razorpay_order_id},
        {"$set": {"status": "paid", "razorpay_payment_id": body.razorpay_payment_id, "paid_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.users.update_one(
        {"supabase_user_id": user["id"]},
        {"$set": {"plan": body.plan, "subscription_started_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "plan": body.plan}
