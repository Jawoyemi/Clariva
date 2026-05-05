from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.credit import CreditTransaction
from app.models.session import GuestSession
from app.models.user import User


REFILL_RATES = {
    "free": {"amount": 10, "interval_hours": 6},
    "pro": {"amount": 25, "interval_hours": 3},
}

PLAN_MAX_CREDITS = {
    "guest": 10,
    "free": 30,
    "pro": 100,
}

GENERATION_COSTS = {
    "sow": 5,
    "prd": 5,
    "both": 8,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(value: datetime | None) -> datetime:
    if value is None:
        return _now()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def get_plan(owner_or_user) -> str:
    if isinstance(owner_or_user, dict):
        if owner_or_user["type"] == "guest":
            return "guest"
        owner_or_user = owner_or_user["data"]
    return getattr(owner_or_user, "plan", "free") or "free"


def apply_refill(account, db: Session) -> None:
    plan = get_plan(account)
    if plan == "guest":
        return

    rate = REFILL_RATES.get(plan)
    if not rate:
        return

    if not getattr(account, "last_refill_at", None):
        account.last_refill_at = _now()
        db.commit()
        return

    account.credits_max = PLAN_MAX_CREDITS.get(plan, account.credits_max)
    last_refill_at = _ensure_aware(account.last_refill_at)
    elapsed_hours = (_now() - last_refill_at).total_seconds() / 3600
    periods = int(elapsed_hours / rate["interval_hours"])

    if periods <= 0:
        return

    credits_to_add = periods * rate["amount"]
    before = account.credits_balance
    account.credits_balance = min(account.credits_balance + credits_to_add, account.credits_max)
    account.last_refill_at = last_refill_at + timedelta(hours=periods * rate["interval_hours"])

    if account.credits_balance > before:
        db.add(
            _transaction_for_account(
                account,
                amount=account.credits_balance - before,
                transaction_type="refill",
                description="Auto-refill",
            )
        )
    db.commit()


def next_refill_at(account) -> datetime | None:
    plan = get_plan(account)
    rate = REFILL_RATES.get(plan)
    if not rate:
        return None
    if account.credits_balance >= account.credits_max:
        return None
    return _ensure_aware(account.last_refill_at) + timedelta(hours=rate["interval_hours"])


def _transaction_for_account(account, *, amount: int, transaction_type: str, description: str) -> CreditTransaction:
    if isinstance(account, User):
        return CreditTransaction(
            user_id=account.id,
            amount=amount,
            type=transaction_type,
            description=description,
        )
    if isinstance(account, GuestSession):
        return CreditTransaction(
            guest_session_id=account.id,
            amount=amount,
            type=transaction_type,
            description=description,
        )
    raise TypeError("Unsupported credit account")


def account_from_owner(owner):
    return owner["data"]


def charge_credits(owner, db: Session, *, cost: int, description: str):
    account = account_from_owner(owner)
    apply_refill(account, db)

    if account.credits_balance < cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "insufficient_credits",
                "balance": account.credits_balance,
                "required": cost,
                "next_refill_at": next_refill_at(account).isoformat() if next_refill_at(account) else None,
            },
        )

    account.credits_balance -= cost
    db.add(
        _transaction_for_account(
            account,
            amount=-cost,
            transaction_type="deduction",
            description=description,
        )
    )
    db.commit()
    db.refresh(account)
    return account


def refund_credits(owner, db: Session, *, amount: int, reason: str):
    account = account_from_owner(owner)
    account.credits_balance = min(account.credits_balance + amount, account.credits_max)
    db.add(
        _transaction_for_account(
            account,
            amount=amount,
            transaction_type="refund",
            description=reason,
        )
    )
    db.commit()
    db.refresh(account)
    return account


def credit_balance_payload(owner, db: Session) -> dict:
    account = account_from_owner(owner)
    apply_refill(account, db)
    return {
        "plan": get_plan(owner),
        "credits_balance": account.credits_balance,
        "credits_max": account.credits_max,
        "last_refill_at": account.last_refill_at,
        "next_refill_at": next_refill_at(account),
    }
