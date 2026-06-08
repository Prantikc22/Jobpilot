"""Auth helpers - server-side signup that auto-confirms emails via Supabase admin API."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from services.supabase_service import get_admin_client

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupBody(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class ConfirmBody(BaseModel):
    email: EmailStr


class ResetPasswordBody(BaseModel):
    email: EmailStr
    new_password: str


@router.post("/signup")
async def signup(body: SignupBody):
    """
    Server-side signup that bypasses Supabase email-confirmation requirement.
    Uses service-role key to create a user with email_confirm=True so the user
    can sign in immediately.
    """
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    client = get_admin_client()
    try:
        result = client.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.full_name or ""},
        })
    except Exception as e:
        msg = str(e)
        # Friendlier message on existing user
        if "already" in msg.lower() or "registered" in msg.lower() or "exists" in msg.lower():
            raise HTTPException(status_code=409, detail="An account with this email already exists. Try signing in.")
        raise HTTPException(status_code=400, detail=msg)

    user = getattr(result, "user", None) or (result.get("user") if isinstance(result, dict) else None)
    if not user:
        raise HTTPException(status_code=500, detail="Signup failed: no user returned")
    return {
        "ok": True,
        "user_id": getattr(user, "id", None) or (user.get("id") if isinstance(user, dict) else None),
        "email": getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None),
    }


@router.post("/confirm-email")
async def confirm_email(body: ConfirmBody):
    """
    For users who signed up via the old client-side flow (before /api/auth/signup
    existed) and never received/clicked the confirmation email: this endpoint
    marks their email as confirmed via the admin API so they can sign in.
    """
    client = get_admin_client()
    try:
        # Find user by email — Supabase admin list_users supports email filter
        resp = client.auth.admin.list_users()
        users = getattr(resp, "users", None) or (resp if isinstance(resp, list) else [])
        target = None
        for u in users:
            ue = getattr(u, "email", None) or (u.get("email") if isinstance(u, dict) else None)
            if ue and ue.lower() == body.email.lower():
                target = u
                break
        if not target:
            raise HTTPException(status_code=404, detail="No account found with that email")
        uid = getattr(target, "id", None) or (target.get("id") if isinstance(target, dict) else None)
        client.auth.admin.update_user_by_id(uid, {"email_confirm": True})
        return {"ok": True, "confirmed": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody):
    """
    Self-service password reset for MVP — looks up the user by email via the
    admin API and sets a new password + email_confirm=True so the user can sign
    in immediately. This unblocks users who forgot their password and don't
    have email-link delivery configured.
    """
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    client = get_admin_client()
    try:
        resp = client.auth.admin.list_users()
        users = getattr(resp, "users", None) or (resp if isinstance(resp, list) else [])
        target = None
        for u in users:
            ue = getattr(u, "email", None) or (u.get("email") if isinstance(u, dict) else None)
            if ue and ue.lower() == body.email.lower():
                target = u
                break
        if not target:
            raise HTTPException(status_code=404, detail="No account found with that email")
        uid = getattr(target, "id", None) or (target.get("id") if isinstance(target, dict) else None)
        client.auth.admin.update_user_by_id(
            uid,
            {"password": body.new_password, "email_confirm": True},
        )
        return {"ok": True, "reset": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
