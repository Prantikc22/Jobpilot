"""Razorpay service - one-time orders + recurring subscriptions."""
import os
import razorpay

_client: razorpay.Client | None = None


def get_client() -> razorpay.Client:
    global _client
    if _client is None:
        key_id = os.environ.get("RAZORPAY_KEY_ID", "")
        key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
        if not key_id or not key_secret:
            raise RuntimeError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables")
        _client = razorpay.Client(auth=(key_id, key_secret))
    return _client


def get_key_id() -> str:
    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    if not key_id:
        raise RuntimeError("RAZORPAY_KEY_ID must be set in environment variables")
    return key_id


# --- One-time orders --------------------------------------------------------
def create_order(amount_paise: int, receipt: str, notes: dict | None = None) -> dict:
    return get_client().order.create(
        data={
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": notes or {},
        }
    )


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    try:
        get_client().utility.verify_payment_signature(
            {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
        )
        return True
    except Exception:
        return False


# --- Recurring subscriptions ------------------------------------------------
def create_subscription(plan_id: str, total_count: int = 12, notes: dict | None = None) -> dict:
    return get_client().subscription.create(
        data={
            "plan_id": plan_id,
            "total_count": total_count,
            "customer_notify": 1,
            "notes": notes or {},
        }
    )


def verify_subscription_signature(subscription_id: str, payment_id: str, signature: str) -> bool:
    try:
        get_client().utility.verify_subscription_payment_signature(
            {
                "razorpay_subscription_id": subscription_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
        )
        return True
    except Exception:
        return False


def fetch_subscription(subscription_id: str) -> dict:
    return get_client().subscription.fetch(subscription_id)


def cancel_subscription(subscription_id: str, cancel_at_cycle_end: bool = True) -> dict:
    return get_client().subscription.cancel(
        subscription_id,
        {"cancel_at_cycle_end": 1 if cancel_at_cycle_end else 0},
    )
