"""Public share cards - generate OG image of user stats."""
import io
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from PIL import Image, ImageDraw, ImageFont

from auth_deps import get_current_user
from db import get_db

router = APIRouter(prefix="/share", tags=["share"])


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


@router.post("/create")
async def create_share(user=Depends(get_current_user), db=Depends(get_db)):
    me = await db.users.find_one({"supabase_user_id": user["id"]})
    if not me:
        raise HTTPException(status_code=404, detail="User not found")
    token = uuid.uuid4().hex[:14]
    # Snapshot the stats so the share card is stable
    snapshot = {
        "token": token,
        "supabase_user_id": user["id"],
        "first_name": (me.get("full_name") or "").split(" ")[0] or "Pilot",
        "applications_count": me.get("applications_count", 0),
        "interviews_count": me.get("interviews_count", 0),
        "offers_count": me.get("offers_count", 0),
        "plan": me.get("plan", "free"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.shares.insert_one(dict(snapshot))
    return {"token": token}


@router.get("/{token}")
async def get_share(token: str, db=Depends(get_db)):
    doc = await db.shares.find_one({"token": token}, {"_id": 0, "supabase_user_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Share not found")
    return doc


def _draw_rounded_rect(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


@router.get("/{token}/og.png")
async def og_image(token: str, db=Depends(get_db)):
    doc = await db.shares.find_one({"token": token})
    if not doc:
        raise HTTPException(status_code=404, detail="Share not found")

    W, H = 1200, 630
    img = Image.new("RGB", (W, H), (10, 15, 28))
    draw = ImageDraw.Draw(img, "RGBA")

    # Background beams (soft circles)
    for cx, cy, r, color in [
        (200, 120, 360, (59, 130, 246, 80)),
        (1020, 540, 380, (139, 92, 246, 80)),
        (600, 320, 220, (236, 72, 153, 35)),
    ]:
        for i in range(10, 0, -1):
            alpha = int(color[3] * (i / 10))
            draw.ellipse([cx - r * i / 10, cy - r * i / 10, cx + r * i / 10, cy + r * i / 10], fill=(color[0], color[1], color[2], alpha // 6))

    # Brand top-left
    draw.text((60, 50), "JobPilot", font=_font(34, bold=True), fill=(255, 255, 255, 235))
    draw.text((60, 92), "Job Search · On Autopilot", font=_font(18), fill=(255, 255, 255, 160))

    # Pilot name
    first = doc.get("first_name", "Pilot")
    draw.text((60, 170), f"{first}'s pilot dispatch", font=_font(34), fill=(255, 255, 255, 200))

    # Headline numbers
    apps = doc.get("applications_count", 0)
    interviews = doc.get("interviews_count", 0)
    offers = doc.get("offers_count", 0)
    plan = doc.get("plan", "free").upper()

    # Big stat boxes
    box_x = 60
    box_y = 240
    box_w, box_h = 340, 220
    gap = 30

    stats = [
        ("APPLICATIONS", str(apps), (96, 165, 250)),
        ("INTERVIEWS", str(interviews), (167, 139, 250)),
        ("OFFERS", str(offers), (251, 191, 36)),
    ]
    for i, (label, value, color) in enumerate(stats):
        x = box_x + i * (box_w + gap)
        # Card
        _draw_rounded_rect(draw, [x, box_y, x + box_w, box_y + box_h], 24, (255, 255, 255, 14))
        # Accent bar
        _draw_rounded_rect(draw, [x + 24, box_y + 24, x + 60, box_y + 36], 6, color + (255,))
        # Label
        draw.text((x + 24, box_y + 52), label, font=_font(16, bold=True), fill=(255, 255, 255, 150))
        # Value
        draw.text((x + 24, box_y + 86), value, font=_font(96, bold=True), fill=(255, 255, 255, 245))

    # Footer tagline
    draw.text((60, 510), "Sleep. We're applying.", font=_font(28, bold=True), fill=(255, 255, 255, 220))
    draw.text((60, 550), "jobpilot.ai · join the pilots", font=_font(18), fill=(255, 255, 255, 140))

    # Plan badge top-right
    badge_text = f"{plan} PILOT"
    badge_w = 230
    _draw_rounded_rect(draw, [W - 60 - badge_w, 56, W - 60, 102], 23, (255, 255, 255, 24))
    draw.text((W - 60 - badge_w + 22, 70), badge_text, font=_font(18, bold=True), fill=(255, 255, 255, 230))

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return Response(content=buf.getvalue(), media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
