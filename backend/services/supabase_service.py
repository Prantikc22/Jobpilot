"""Supabase service - Auth verification and Storage operations."""
import os
from typing import Optional
from supabase import create_client, Client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
RESUME_BUCKET = os.environ.get("SUPABASE_RESUME_BUCKET", "resumes")

# Admin client (server-side; bypasses RLS)
_admin_client: Optional[Client] = None
# Anon client (used for verifying tokens via get_user)
_anon_client: Optional[Client] = None


def get_admin_client() -> Client:
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _admin_client


def get_anon_client() -> Client:
    global _anon_client
    if _anon_client is None:
        _anon_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _anon_client


def verify_jwt(token: str) -> Optional[dict]:
    """Verify a Supabase JWT and return user info."""
    try:
        client = get_anon_client()
        resp = client.auth.get_user(token)
        if resp and resp.user:
            return {
                "id": resp.user.id,
                "email": resp.user.email,
                "user_metadata": resp.user.user_metadata or {},
            }
    except Exception as e:
        print(f"[supabase] verify_jwt error: {e}")
    return None


def ensure_bucket():
    """Ensure the resumes bucket exists (idempotent)."""
    try:
        client = get_admin_client()
        buckets = client.storage.list_buckets()
        names = []
        for b in buckets:
            name = getattr(b, "name", None) or (b.get("name") if isinstance(b, dict) else None)
            if name:
                names.append(name)
        if RESUME_BUCKET not in names:
            client.storage.create_bucket(
                RESUME_BUCKET,
                options={"public": False, "allowed_mime_types": ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]},
            )
            print(f"[supabase] created bucket {RESUME_BUCKET}")
    except Exception as e:
        print(f"[supabase] ensure_bucket warning: {e}")


def upload_resume(user_id: str, filename: str, content: bytes, content_type: str) -> dict:
    client = get_admin_client()
    path = f"{user_id}/{filename}"
    try:
        client.storage.from_(RESUME_BUCKET).upload(
            path,
            content,
            file_options={"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        # try update if upload conflict
        try:
            client.storage.from_(RESUME_BUCKET).update(path, content, file_options={"content-type": content_type})
        except Exception as inner:
            raise RuntimeError(f"Upload failed: {e} / {inner}")
    signed = client.storage.from_(RESUME_BUCKET).create_signed_url(path, 60 * 60 * 24 * 7)
    signed_url = signed.get("signedURL") or signed.get("signed_url") or signed.get("signedUrl")
    return {"path": path, "signed_url": signed_url}


def get_signed_url(path: str, expires_seconds: int = 3600) -> str:
    client = get_admin_client()
    signed = client.storage.from_(RESUME_BUCKET).create_signed_url(path, expires_seconds)
    return signed.get("signedURL") or signed.get("signed_url") or signed.get("signedUrl")
