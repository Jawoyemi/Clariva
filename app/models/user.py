from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    google_id = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    role = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    default_output = Column(String, nullable=False, default="both")
    preferred_tone = Column(String, nullable=False, default="formal")
    export_format = Column(String, nullable=False, default="docx")
    plan = Column(String, nullable=False, default="free")
    credits_balance = Column(Integer, nullable=False, default=30)
    credits_max = Column(Integer, nullable=False, default=30)
    last_refill_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
