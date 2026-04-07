from pydantic import BaseModel

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class GuestTokenResponse(BaseModel):
    temp_token: str
    token_type: str = "bearer"
    expires_in_minutes: int = 30