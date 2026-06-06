"""JobPilot main FastAPI server."""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

import os
import logging
from dotenv import load_dotenv

load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from db import get_db, close as close_db
from services.supabase_service import ensure_bucket
from routes.users import router as users_router
from routes.resumes import router as resumes_router
from routes.jobs import router as jobs_router
from routes.payments import router as payments_router
from routes.ai import router as ai_router
from routes.activity import router as activity_router
from routes.admin import router as admin_router
from routes.referrals import router as referrals_router
from routes.share import router as share_router
from routes.ab import router as ab_router
from routes.auth import router as auth_router

app = FastAPI(title="JobPilot API", version="1.0.0")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"name": "JobPilot API", "status": "ok"}


@api_router.get("/health")
async def health():
    db = get_db()
    try:
        await db.command("ping")
        mongo_ok = True
    except Exception:
        mongo_ok = False
    return {"ok": True, "mongo": mongo_ok}


api_router.include_router(users_router)
api_router.include_router(resumes_router)
api_router.include_router(jobs_router)
api_router.include_router(payments_router)
api_router.include_router(ai_router)
api_router.include_router(activity_router)
api_router.include_router(admin_router)
api_router.include_router(referrals_router)
api_router.include_router(share_router)
api_router.include_router(ab_router)
api_router.include_router(auth_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("jobpilot")


@app.on_event("startup")
async def on_startup():
    try:
        ensure_bucket()
    except Exception as e:
        logger.warning(f"Bucket ensure failed: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    close_db()
