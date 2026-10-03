"""Access-token (JWT) and refresh-token helpers."""

import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.config import settings
from app.exceptions import UnauthorizedError

logger = logging.getLogger(__name__)

ACCESS_TOKEN_TYPE = "access"


def create_access_token(user_id: int, role: str) -> str:
    """Create a signed access JWT (sub is the user id as a string)."""
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> int:
    """Validate an access JWT and return the user id; raise UnauthorizedError otherwise."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
    except jwt.PyJWTError:
        raise UnauthorizedError("Not authenticated") from None
    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise UnauthorizedError("Not authenticated")
    try:
        return int(payload["sub"])
    except (TypeError, ValueError):
        raise UnauthorizedError("Not authenticated") from None


def generate_refresh_token() -> str:
    """Create an opaque, URL-safe refresh token."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """SHA-256 hex digest; only this is stored in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    """Expiry timestamp for a newly issued refresh token."""
    return datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
