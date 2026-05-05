from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Any


class ChatSessionCreate(BaseModel):
    title: str | None = None


class ChatMessageCreate(BaseModel):
    role: str = Field(pattern="^(user|assistant|error)$")
    content: str = Field(min_length=1)
    metadata: dict[str, Any] | None = None


class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    metadata: dict[str, Any] | None = None
    created_at: datetime


class ChatSessionResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime | None = None


class ChatSessionDetail(ChatSessionResponse):
    messages: list[ChatMessageResponse] = []
