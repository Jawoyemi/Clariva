from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.models.session import GuestSession

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials = Depends(bearer_scheme),
    db = Depends(get_db)
):
    token = credentials.credentials
    payload = verify_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        )

    user = db.query(User).filter(User.id == payload.get("sub")).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    return user

def get_guest_session(
    credentials = Depends(bearer_scheme),
    db = Depends(get_db)
):
    token = credentials.credentials
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
    credentials = Depends(bearer_scheme),
    db = Depends(get_db)
):
    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    if payload.get("type") == "access":
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user or not user.is_active:
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