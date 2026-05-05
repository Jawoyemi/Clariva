from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.models.session import GuestSession


def get_token(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        token = request.cookies.get("guest_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    return token


def get_current_user(
    request: Request,
    db = Depends(get_db)
):
    token = get_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    payload = verify_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        )

    user = db.query(User).filter(User.id == payload.get("sub")).first()

    if not user or not user.is_active or user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    return user


def get_guest_session(
    request: Request,
    db = Depends(get_db)
):
    token = get_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    payload = verify_token(token)

    if not payload or payload.get("type") != "guest":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired guest session"
        )

    session = db.query(GuestSession).filter(
        GuestSession.temp_token == token,
        GuestSession.converted == False
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Guest session not found or already converted"
        )

    return session


def get_current_user_or_guest(
    request: Request,
    db = Depends(get_db)
):
    token = get_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    if payload.get("type") == "access":
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user or not user.is_active or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        return {"type": "user", "data": user}

    if payload.get("type") == "guest":
        session = db.query(GuestSession).filter(
            GuestSession.temp_token == token,
            GuestSession.converted == False
        ).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session not found or already converted"
            )
        return {"type": "guest", "data": session}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token type"
    )
