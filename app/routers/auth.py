from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from datetime import datetime, timedelta
from app.database import get_db
from app.core.auth import oauth
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_guest_token,
    verify_token
)
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.session import GuestSession
from app.schemas.auth import TokenResponse, RefreshTokenRequest, GuestTokenResponse
from app.config import settings
from app.services.email import send_welcome_email
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
import uuid

from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me")
async def get_me(request: Request, db = Depends(get_db)):
    access_token = request.cookies.get("access_token")
    if access_token:
        from app.core.security import verify_token
        payload = verify_token(access_token)
        if payload and payload.get("type") == "access":
            user = db.query(User).filter(User.id == payload.get("sub")).first()
            if user:
                return {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.display_name or user.name,
                    "avatar": user.avatar,
                    "is_guest": False,
                    "plan": user.plan,
                    "credits_balance": user.credits_balance,
                    "credits_max": user.credits_max,
                    "default_output": user.default_output,
                    "preferred_tone": user.preferred_tone,
                }

    guest_token = request.cookies.get("guest_token")
    if guest_token:
        from app.core.security import verify_token
        payload = verify_token(guest_token)
        if payload and payload.get("type") == "guest":
            session = db.query(GuestSession).filter(
                GuestSession.temp_token == guest_token,
                GuestSession.converted == False
            ).first()
            if session:
                return {
                    "id": str(session.id),
                    "email": None,
                    "name": "Guest",
                    "avatar": None,
                    "is_guest": True,
                    "plan": "guest",
                    "credits_balance": session.credits_balance,
                    "credits_max": session.credits_max,
                }

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

@router.get("/login")
async def login(request: Request):
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def callback(request: Request, background_tasks: BackgroundTasks, db = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with Google"
        )

    user_info = token.get("userinfo")

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve user information from Google"
        )

    email = user_info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is missing"
        )
    email = email.strip().lower()

    display_name = user_info.get("name") or email.split("@")[0]

    user = db.query(User).filter(func.lower(User.email) == email).first()

    created_new_user = False
    if not user:
        user = User(
            email=email,
            name=display_name,
            display_name=display_name,
            google_id=user_info.get("sub"),
            avatar=user_info.get("picture")
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
            created_new_user = True
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(func.lower(User.email) == email).first()

    if created_new_user:
        background_tasks.add_task(send_welcome_email, email=user.email, name=user.name)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_refresh_token)
    db.commit()

    response = RedirectResponse(url="http://localhost:5173/dashboard")
    response.set_cookie(
        key="access_token", 
        value=access_token, 
        httponly=True, 
        samesite="lax",
        secure=False 
    )
    response.set_cookie(
        key="refresh_token", 
        value=refresh_token, 
        httponly=True, 
        samesite="lax",
        secure=False
    )
    
    return response


@router.post("/refresh")
async def refresh_token(body = Depends(RefreshTokenRequest), db = Depends(get_db)):
    payload = verify_token(body.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == body.refresh_token,
        RefreshToken.revoked == False
    ).first()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked"
        )

    if db_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )

    db_token.revoked = True
    db.commit()

    user = db.query(User).filter(User.id == payload.get("sub")).first()

    if not user or not user.is_active or user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    new_access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    new_db_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_db_token)
    db.commit()

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )


@router.post("/guest")
async def create_guest_session(db = Depends(get_db)):
    session_id = str(uuid.uuid4())
    temp_token = create_guest_token(session_id)
    expires_at = datetime.utcnow() + timedelta(minutes=30)

    guest_session = GuestSession(
        id=session_id,
        temp_token=temp_token,
        expires_at=expires_at
    )
    db.add(guest_session)
    db.commit()

    response = RedirectResponse(url="http://localhost:5173/dashboard", status_code=302)
    response.set_cookie(
        key="guest_token",
        value=temp_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=1800  # 30 minutes
    )
    return response


@router.post("/logout")
async def logout(request: Request, db = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token:
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token
        ).first()
        if db_token:
            db_token.revoked = True
            db.commit()

    response = RedirectResponse(url="http://localhost:5173/", status_code=302)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    response.delete_cookie("guest_token")
    return response
