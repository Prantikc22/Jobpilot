"""Authentication dependencies - Supabase user and admin JWT."""
import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Header, HTTPException, Depends
from typing import Optional

from services.supabase_service import verify_jwt

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
ADMIN_JWT_SECRET = os.environ["ADMIN_JWT_SECRET"]


def create_admin_token() -> str:
    payload = {
        "role": "admin",
        "email": ADMIN_EMAIL,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm="HS256")


def verify_admin_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        if payload.get("role") == "admin":
            return payload
    except Exception:
        return None
    return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    user = verify_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Supabase token")
    return user


async def get_current_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    payload = verify_admin_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return payload
