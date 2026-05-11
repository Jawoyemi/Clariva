from pydantic import BaseModel, EmailStr
from typing import Optional

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

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyRequest(BaseModel):
    code: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class UpdatePasswordRequest(BaseModel):
    old_password: Optional[str] = None
    new_password: str