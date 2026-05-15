from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.document import DocumentType

class DocumentCreate(BaseModel):
    type: DocumentType
    title: str
    content: str

class DocumentResponse(BaseModel):
    id: UUID
    type: DocumentType
    title: str
    content: str
    chat_session_id: UUID | None = None
    prd_content: str | None = None
    sow_content: str | None = None
    docx_path: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
