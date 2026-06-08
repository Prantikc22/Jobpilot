"""Razorpay payments routes."""
import os
import hmac
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel

from auth_deps import get_current_user
from db import get_db
from services.razorpay_service import (
    create_order,
    verify_signature,
    create_subscription,
    verify_subscription_signature,
    fetch_subscription,
    cancel_subscription,
)

logger = logging.getLogger("payments")
router = APIRouter(prefix="/payments", tags=["payments"])

PLAN_PRICES = {"starter": 49900, "pro": 99900}  # in paise
PLAN_DAYS = 30
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
RAZORPAY_PLAN_IDS = {
    "starter": os.environ.get("RAZORPAY_PLAN_STARTER", ""),
    "pro": os.environ.get("RAZORPAY_PLAN_PRO", ""),
}


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
    if body.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    order = await db.orders.find_one({"razorpay_order_id": body.razorpay_order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("supabase_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Order does not belong to this user")
    if order.get("plan") != body.plan:
        raise HTTPException(status_code=400, detail="Plan mismatch with order")
    ok = verify_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid signature")
    await db.orders.update_one(
        {"razorpay_order_id": body.razorpay_order_id},
        {"$set": {"status": "paid", "razorpay_payment_id": body.razorpay_payment_id, "paid_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.users.update_one(
        {"supabase_user_id": user["id"]},
        {
            "$set": {
                "plan": body.plan,
                "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                "subscription_active_until": (datetime.now(timezone.utc) + timedelta(days=PLAN_DAYS)).isoformat(),
                "applications_count": 0,  # reset monthly quota
            }
        },
        upsert=True,
    )
    return {"ok": True, "plan": body.plan}


@router.post("/webhook")
async def webhook(request: Request, x_razorpay_signature: str = Header(None), db=Depends(get_db)):
    """
    Razorpay webhook handler for renewal events.

    Configure in Razorpay dashboard: webhook URL = {host}/api/payments/webhook
    Events: payment.captured, payment.failed, subscription.charged, subscription.cancelled
    Set RAZORPAY_WEBHOOK_SECRET env var to enable signature verification.
    """
    raw_body = await request.body()

    # Verify signature (only if webhook secret is configured)
    if RAZORPAY_WEBHOOK_SECRET:
        if not x_razorpay_signature:
            raise HTTPException(status_code=400, detail="Missing webhook signature")
        expected = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, x_razorpay_signature):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        import json
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event", "")
    raw_event_id = payload.get("id")
    entity = (payload.get("payload", {}).get("payment", {}) or {}).get("entity") or \
             (payload.get("payload", {}).get("subscription", {}) or {}).get("entity") or {}

    # Idempotency: Razorpay can redeliver the same webhook up to 24 times. Skip if we've already processed.
    if raw_event_id:
        existing = await db.webhook_events.find_one({"raw_event_id": raw_event_id, "processed": True})
        if existing:
            return {"ok": True, "duplicate": True, "raw_event_id": raw_event_id}

    # Always log the webhook event for admin observability
    await db.webhook_events.insert_one(
        {
            "event": event,
            "raw_event_id": raw_event_id,
            "entity_id": entity.get("id"),
            "received_at": datetime.now(timezone.utc).isoformat(),
            "processed": False,
            "summary": {
                "amount": entity.get("amount"),
                "status": entity.get("status"),
                "notes": entity.get("notes", {}),
            },
        }
    )

    if event == "payment.captured":
        notes = entity.get("notes") or {}
        supabase_user_id = notes.get("supabase_user_id")
        plan = notes.get("plan")
        if not supabase_user_id or plan not in PLAN_PRICES:
            return {"ok": True, "ignored": True, "reason": "missing notes"}

        # Determine new expiry: if current expiry in future, extend; else start fresh
        user_doc = await db.users.find_one({"supabase_user_id": supabase_user_id})
        now = datetime.now(timezone.utc)
        current_expiry = None
        if user_doc and user_doc.get("subscription_active_until"):
            try:
                current_expiry = datetime.fromisoformat(user_doc["subscription_active_until"].replace("Z", "+00:00"))
            except Exception:
                current_expiry = None
        base = current_expiry if current_expiry and current_expiry > now else now
        new_expiry = base + timedelta(days=PLAN_DAYS)

        await db.users.update_one(
            {"supabase_user_id": supabase_user_id},
            {
                "$set": {
                    "plan": plan,
                    "subscription_active_until": new_expiry.isoformat(),
                    "last_renewal_at": now.isoformat(),
                    "applications_count": 0,  # reset monthly quota on renewal
                }
            },
            upsert=False,
        )
        logger.info(f"[webhook] renewed plan={plan} user={supabase_user_id} until={new_expiry.isoformat()}")
        if raw_event_id:
            await db.webhook_events.update_one({"raw_event_id": raw_event_id}, {"$set": {"processed": True}})
        return {"ok": True, "renewed": True, "until": new_expiry.isoformat()}

    if event in ("payment.failed", "subscription.cancelled"):
        notes = entity.get("notes") or {}
        supabase_user_id = notes.get("supabase_user_id")
        if not supabase_user_id and event == "subscription.cancelled":
            sub_doc = await db.subscriptions.find_one({"razorpay_subscription_id": entity.get("id")})
            supabase_user_id = sub_doc.get("supabase_user_id") if sub_doc else None
        if supabase_user_id:
            update = {"last_payment_failed_at": datetime.now(timezone.utc).isoformat()}
            if event == "subscription.cancelled":
                update["plan"] = "free"
                update["subscription_active_until"] = datetime.now(timezone.utc).isoformat()
            await db.users.update_one(
                {"supabase_user_id": supabase_user_id},
                {"$set": update},
            )
        return {"ok": True, "noted": True}

    if event == "subscription.charged":
        sub_id = entity.get("id") or (payload.get("payload", {}).get("subscription", {}).get("entity", {}) or {}).get("id")
        sub_doc = await db.subscriptions.find_one({"razorpay_subscription_id": sub_id}) if sub_id else None
        supabase_user_id = (sub_doc or {}).get("supabase_user_id")
        plan = (sub_doc or {}).get("plan")
        if not supabase_user_id or plan not in PLAN_PRICES:
            return {"ok": True, "ignored": True, "reason": "missing subscription mapping"}

        user_doc = await db.users.find_one({"supabase_user_id": supabase_user_id})
        now = datetime.now(timezone.utc)
        current_expiry = None
        if user_doc and user_doc.get("subscription_active_until"):
            try:
                current_expiry = datetime.fromisoformat(user_doc["subscription_active_until"].replace("Z", "+00:00"))
            except Exception:
                current_expiry = None
        base = current_expiry if current_expiry and current_expiry > now else now
        new_expiry = base + timedelta(days=PLAN_DAYS)
        await db.users.update_one(
            {"supabase_user_id": supabase_user_id},
            {
                "$set": {
                    "plan": plan,
                    "subscription_active_until": new_expiry.isoformat(),
                    "last_renewal_at": now.isoformat(),
                    "applications_count": 0,
                }
            },
        )
        if raw_event_id:
            await db.webhook_events.update_one({"raw_event_id": raw_event_id}, {"$set": {"processed": True}})
        return {"ok": True, "renewed": True, "until": new_expiry.isoformat()}

    return {"ok": True, "ignored": True, "event": event}


# === Subscriptions (recurring monthly billing) ==============================
class CreateSubscription(BaseModel):
    plan: str


class VerifySubscription(BaseModel):
    razorpay_subscription_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


@router.post("/create-subscription")
async def create_subscription_route(body: CreateSubscription, user=Depends(get_current_user), db=Depends(get_db)):
    if body.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan_id = RAZORPAY_PLAN_IDS.get(body.plan)
    if not plan_id or "placeholder" in plan_id:
        raise HTTPException(
            status_code=503,
            detail="Subscription plan not configured. Set RAZORPAY_PLAN_STARTER / RAZORPAY_PLAN_PRO env vars with real plan IDs from your Razorpay dashboard.",
        )
    try:
        sub = create_subscription(
            plan_id=plan_id,
            total_count=12,
            notes={"supabase_user_id": user["id"], "plan": body.plan},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay subscription failed: {e}")

    await db.subscriptions.insert_one(
        {
            "razorpay_subscription_id": sub["id"],
            "razorpay_plan_id": plan_id,
            "supabase_user_id": user["id"],
            "plan": body.plan,
            "status": sub.get("status", "created"),
            "short_url": sub.get("short_url"),
            "total_count": sub.get("total_count"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {
        "subscription_id": sub["id"],
        "short_url": sub.get("short_url"),
        "key_id": os.environ["RAZORPAY_KEY_ID"],
        "plan": body.plan,
    }


@router.post("/verify-subscription")
async def verify_subscription_route(body: VerifySubscription, user=Depends(get_current_user), db=Depends(get_db)):
    if body.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    sub = await db.subscriptions.find_one({"razorpay_subscription_id": body.razorpay_subscription_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.get("supabase_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Subscription does not belong to this user")

    ok = verify_subscription_signature(
        body.razorpay_subscription_id, body.razorpay_payment_id, body.razorpay_signature
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid signature")

    await db.subscriptions.update_one(
        {"razorpay_subscription_id": body.razorpay_subscription_id},
        {
            "$set": {
                "status": "active",
                "razorpay_payment_id": body.razorpay_payment_id,
                "activated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    await db.users.update_one(
        {"supabase_user_id": user["id"]},
        {
            "$set": {
                "plan": body.plan,
                "razorpay_subscription_id": body.razorpay_subscription_id,
                "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                "subscription_active_until": (datetime.now(timezone.utc) + timedelta(days=PLAN_DAYS)).isoformat(),
                "applications_count": 0,
                "subscription_billing": "recurring",
            }
        },
        upsert=True,
    )
    return {"ok": True, "plan": body.plan, "subscription_id": body.razorpay_subscription_id}


@router.post("/cancel-subscription")
async def cancel_subscription_route(user=Depends(get_current_user), db=Depends(get_db)):
    user_doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    sub_id = user_doc.get("razorpay_subscription_id")
    if not sub_id:
        raise HTTPException(status_code=404, detail="No active subscription")
    try:
        cancelled = cancel_subscription(sub_id, cancel_at_cycle_end=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay cancel failed: {e}")
    await db.subscriptions.update_one(
        {"razorpay_subscription_id": sub_id},
        {"$set": {"status": cancelled.get("status", "cancelled"), "cancelled_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.users.update_one(
        {"supabase_user_id": user["id"]},
        {"$set": {"subscription_will_cancel_at_cycle_end": True}},
    )
    return {"ok": True, "status": cancelled.get("status"), "cancel_at_cycle_end": True}


@router.get("/subscription-status")
async def subscription_status(user=Depends(get_current_user), db=Depends(get_db)):
    user_doc = await db.users.find_one({"supabase_user_id": user["id"]}) or {}
    sub_id = user_doc.get("razorpay_subscription_id")
    if not sub_id:
        return {"active": False}
    try:
        live = fetch_subscription(sub_id)
    except Exception:
        live = {}
    return {
        "active": (live.get("status") in ("active", "authenticated")) if live else False,
        "status": live.get("status"),
        "current_end": live.get("current_end"),
        "charge_at": live.get("charge_at"),
        "plan": user_doc.get("plan"),
        "subscription_id": sub_id,
        "will_cancel_at_cycle_end": user_doc.get("subscription_will_cancel_at_cycle_end", False),
    }
