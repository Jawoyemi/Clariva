from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class GuestSessionCreate(BaseModel):
    pass

class GuestSessionResponse(BaseModel):
    id: UUID
    temp_token: str
    expires_at: datetime
    converted: bool

    class Config:
        from_attributes = True