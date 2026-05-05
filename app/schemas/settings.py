from datetime import datetime
from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    company_name: str | None = Field(default=None, max_length=100)
    role: str | None = Field(default=None, max_length=60)
    industry: str | None = Field(default=None, max_length=60)


class PreferencesUpdate(BaseModel):
    default_output: str | None = None
    preferred_tone: str | None = None
    export_format: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class SettingsResponse(BaseModel):
    display_name: str | None
    email: str
    company_name: str | None
    role: str | None
    industry: str | None
    default_output: str
    preferred_tone: str
    export_format: str
    plan: str
    credits_balance: int
    credits_max: int
    last_refill_at: datetime
    oauth_connected: bool
    next_refill_at: datetime | None = None

    class Config:
        from_attributes = True
