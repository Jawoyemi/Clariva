from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user_or_guest
from app.database import get_db
from app.services.credits import credit_balance_payload


router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance")
async def get_credit_balance(
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    return credit_balance_payload(owner, db)
