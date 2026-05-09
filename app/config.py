from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str 
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str


    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM_EMAIL: str
    EMAIL_FROM_NAME: str = "Clariva"

    GROQ_API_KEY: str

    # Document storage
    DOC_STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_DIR: str = "storage"
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: Optional[str] = None
    R2_PUBLIC_BASE_URL: Optional[str] = None
    RATE_LIMIT_ENABLED: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
