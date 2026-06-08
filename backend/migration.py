"""One-shot data migration: copy every document from MongoDB into Supabase.

Runs at most once per backend boot. Idempotent — uses upserts keyed on the
canonical primary key of each table, so re-runs are safe and cheap.

Skipped automatically if:
  • Mongo is unreachable (e.g. local Mongo not running)
  • The migration marker file exists at /tmp/jobpilot_supabase_migration.done

To force a re-migration, delete the marker file and restart the backend.
"""
import os
import logging
import asyncio
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client

logger = logging.getLogger("migration")

MARKER = Path("/tmp/jobpilot_supabase_migration.done")

COLLECTION_TO_TABLE_PK = {
    "users": "supabase_user_id",
    "applications": "id",
    "orders": "razorpay_order_id",
    "subscriptions": "razorpay_subscription_id",
    "shares": "token",
}

# Whitelist of columns each Supabase table accepts. Anything outside this set
# (e.g. legacy Mongo-only fields) is dropped before the upsert so PostgREST
# does not 400 on unknown columns.
TABLE_COLUMNS = {
    "users": {
        "supabase_user_id", "email", "full_name", "phone", "linkedin_url",
        "target_roles", "target_countries", "preferred_salary",
        "job_search_email", "job_search_email_password",
        "plan", "pricing_variant", "applications_count", "interviews_count", "offers_count",
        "resume_url", "resume_path", "resume_filename", "resume_text", "resume_parsed",
        "onboarding_step", "onboarding_completed",
        "ai_credits_used", "ai_credits_period", "ai_credits_last_used_at",
        "last_auto_apply_at",
        "referral_code", "referred_by_code", "referral_credits",
        "razorpay_customer_id", "razorpay_subscription_id", "subscription_status",
        "subscription_active_until", "current_period_end", "current_plan_started_at",
        "downgraded_at",
        "created_at", "updated_at",
    },
    "applications": {
        "id", "supabase_user_id", "job_id", "company", "role", "platform",
        "match_score", "status", "submitted_by", "submitted_at",
    },
    "orders": {
        "razorpay_order_id", "supabase_user_id", "razorpay_payment_id",
        "razorpay_signature", "amount", "currency", "plan", "status",
        "created_at", "updated_at", "raw",
    },
    "subscriptions": {
        "razorpay_subscription_id", "supabase_user_id", "plan", "plan_id",
        "status", "short_url", "current_start", "current_end",
        "created_at", "updated_at", "raw",
    },
    "shares": {"token", "supabase_user_id", "snapshot", "created_at"},
}


def _clean(doc: dict, allowed: set[str]) -> dict:
    out = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        if k in allowed:
            out[k] = v
    return out


async def migrate_mongo_to_supabase() -> dict:
    if MARKER.exists():
        return {"skipped": True, "reason": "marker present"}

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "test_database")
    if not mongo_url:
        return {"skipped": True, "reason": "MONGO_URL not set"}

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
        # Force a probe so we fail-fast if mongo is unreachable
        await client.admin.command("ping")
    except Exception as e:
        logger.info(f"[migration] Mongo unreachable, skipping ({e})")
        return {"skipped": True, "reason": "mongo unreachable"}

    db = client[db_name]
    summary: dict = {}

    for col_name, pk in COLLECTION_TO_TABLE_PK.items():
        allowed = TABLE_COLUMNS[col_name]
        try:
            docs = await db[col_name].find({}).to_list(10000)
        except Exception as e:
            logger.warning(f"[migration] failed to read {col_name}: {e}")
            summary[col_name] = {"error": str(e)}
            continue

        if not docs:
            summary[col_name] = {"copied": 0}
            continue

        rows = []
        for d in docs:
            cleaned = _clean(d, allowed)
            if pk not in cleaned or cleaned[pk] in (None, ""):
                continue
            rows.append(cleaned)

        if not rows:
            summary[col_name] = {"copied": 0}
            continue

        try:
            # Upsert in chunks to keep payloads small
            CHUNK = 100
            for i in range(0, len(rows), CHUNK):
                chunk = rows[i: i + CHUNK]
                # Run sync supabase call in thread
                await asyncio.to_thread(
                    lambda c=chunk: sb.table(col_name).upsert(c, on_conflict=pk).execute()
                )
            summary[col_name] = {"copied": len(rows)}
            logger.info(f"[migration] {col_name}: copied {len(rows)} rows")
        except Exception as e:
            logger.exception(f"[migration] failed to upsert into {col_name}: {e}")
            summary[col_name] = {"error": str(e), "attempted": len(rows)}

    # Mark complete only if nothing errored hard
    if not any("error" in v for v in summary.values()):
        try:
            MARKER.write_text("ok")
        except Exception:
            pass

    return {"skipped": False, "summary": summary}
