from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid
from datetime import datetime, timezone

class GuestSession(Base):
    __tablename__ = "guest_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    temp_token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    converted = Column(Boolean, default=False)
    credits_balance = Column(Integer, nullable=False, default=10)
    credits_max = Column(Integer, nullable=False, default=10)
    last_refill_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
