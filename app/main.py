import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.config import settings
from app.database import Base, engine
from app.routers import auth, documents, export, token, chat, settings as settings_router, credits

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Clariva API",
    description="Clariva API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IS_PRODUCTION = os.environ.get("PRODUCTION", "false").lower() == "true"

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    https_only=IS_PRODUCTION,
    same_site="lax"
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(export.router)
app.include_router(token.router)
app.include_router(chat.router)
app.include_router(settings_router.router)
app.include_router(credits.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
