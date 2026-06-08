"""Razorpay service - one-time orders + recurring subscriptions."""
import os
import razorpay

RAZORPAY_KEY_ID = os.environ["RAZORPAY_KEY_ID"]
RAZORPAY_KEY_SECRET = os.environ["RAZORPAY_KEY_SECRET"]

_client: razorpay.Client | None = None


def get_client() -> razorpay.Client:
    global _client
    if _client is None:
        _client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    return _client


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
    """Create a Razorpay subscription. plan_id is the Razorpay plan ID configured
    in the Razorpay dashboard. total_count is the number of billing cycles
    (12 = one year of monthly billing)."""
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
