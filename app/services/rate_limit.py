from collections import deque
from threading import Lock
from time import time

from fastapi import HTTPException, Request, status

from app.config import settings


_WINDOWS: dict[str, tuple[int, int]] = {
    "auth_guest": (5, 60),
    "auth_refresh": (10, 60),
    "auth_login": (10, 300),
    "chat_general": (20, 60),
    "chat_generation": (12, 300),
    "chat_history_write": (60, 60),
    "document_compile": (5, 600),
    "document_revise": (8, 600),
    "document_planning": (15, 600),
}

_BUCKETS: dict[str, deque[float]] = {}
_LOCK = Lock()


def _resolve_identifier(request: Request) -> str:
    access_token = request.cookies.get("access_token")
    if access_token:
        return f"access:{access_token[-24:]}"

    guest_token = request.cookies.get("guest_token")
    if guest_token:
        return f"guest:{guest_token[-24:]}"

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return f"ip:{forwarded_for.split(',')[0].strip()}"

    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"


def enforce_limit(request: Request, scope: str) -> None:
    if not settings.RATE_LIMIT_ENABLED:
        return

    limit = _WINDOWS.get(scope)
    if not limit:
        return

    max_requests, window_seconds = limit
    identifier = _resolve_identifier(request)
    key = f"{scope}:{identifier}"
    now = time()

    with _LOCK:
        bucket = _BUCKETS.setdefault(key, deque())
        cutoff = now - window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= max_requests:
            retry_after = max(1, int(window_seconds - (now - bucket[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limited",
                    "scope": scope,
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)
