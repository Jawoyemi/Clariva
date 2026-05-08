from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
import enum

class DocumentType(enum.Enum):
    SOW = "SOW"
    PRD = "PRD"

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    guest_session_id = Column(UUID(as_uuid=True), ForeignKey("guest_sessions.id"), nullable=True)
    type = Column(Enum(DocumentType), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    pdf_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="documents")
    guest_session = relationship("GuestSession", backref="documents")

    @property
    def docx_path(self):
        return self.pdf_path

    @docx_path.setter
    def docx_path(self, value):
        self.pdf_path = value
