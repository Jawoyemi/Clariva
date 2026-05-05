from datetime import datetime, timezone
import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.schemas.settings import (
    PasswordChange,
    PreferencesUpdate,
    ProfileUpdate,
    SettingsResponse,
)
from app.services.credits import apply_refill, next_refill_at


router = APIRouter(prefix="/settings", tags=["settings"])

ALLOWED_OUTPUT = {"sow", "prd", "both"}
ALLOWED_TONE = {"formal", "conversational"}
ALLOWED_FORMAT = {"pdf", "markdown"}
DISPLAY_NAME_RE = re.compile(r"^[A-Za-z0-9 .'-]+$")


def _settings_payload(user) -> dict:
    return {
        "display_name": user.display_name or user.name,
        "email": user.email,
        "company_name": user.company_name,
        "role": user.role,
        "industry": user.industry,
        "default_output": user.default_output,
        "preferred_tone": user.preferred_tone,
        "export_format": user.export_format,
        "plan": user.plan,
        "credits_balance": user.credits_balance,
        "credits_max": user.credits_max,
        "last_refill_at": user.last_refill_at,
        "oauth_connected": bool(user.google_id or not user.hashed_password),
        "next_refill_at": next_refill_at(user),
    }


@router.get("", response_model=SettingsResponse)
async def get_settings(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    apply_refill(user, db)
    return _settings_payload(user)


@router.patch("/profile")
async def update_profile(
    data: ProfileUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    values = data.dict(exclude_none=True)
    display_name = values.get("display_name")
    if display_name and not DISPLAY_NAME_RE.match(display_name):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Display name can only contain letters, numbers, spaces, apostrophes, periods, and hyphens",
        )

    for field, value in values.items():
        setattr(user, field, value.strip() if isinstance(value, str) else value)

    if "display_name" in values:
        user.name = values["display_name"].strip()

    db.commit()
    db.refresh(user)
    return {"message": "Profile updated", "settings": _settings_payload(user)}


@router.patch("/preferences")
async def update_preferences(
    data: PreferencesUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    values = data.dict(exclude_none=True)
    if "default_output" in values and values["default_output"] not in ALLOWED_OUTPUT:
        raise HTTPException(status_code=422, detail="Invalid output type")
    if "preferred_tone" in values and values["preferred_tone"] not in ALLOWED_TONE:
        raise HTTPException(status_code=422, detail="Invalid tone")
    if "export_format" in values and values["export_format"] not in ALLOWED_FORMAT:
        raise HTTPException(status_code=422, detail="Invalid export format")

    for field, value in values.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return {"message": "Preferences updated", "settings": _settings_payload(user)}


@router.patch("/password")
async def change_password(
    data: PasswordChange,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.google_id or not user.hashed_password:
        raise HTTPException(status_code=400, detail="OAuth users cannot set a password")
    if not any(char.isdigit() for char in data.new_password):
        raise HTTPException(status_code=422, detail="New password must include at least one number")

    raise HTTPException(
        status_code=501,
        detail="Password login is not enabled for this Clariva build",
    )


@router.delete("/account")
async def delete_account(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    db.commit()
    return {"message": "Account deleted"}
