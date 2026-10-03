"""Shared FastAPI dependencies."""

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token
from app.database import get_db
from app.exceptions import ForbiddenError, UnauthorizedError
from app.models.user import User, UserRole

__all__ = ["get_db", "get_current_user", "require_admin"]

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate the access JWT and load the active user (401 on any problem)."""
    if credentials is None:
        raise UnauthorizedError("Not authenticated")
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Not authenticated")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Allow only admins (403 otherwise)."""
    if user.role != UserRole.admin:
        raise ForbiddenError("Access denied")
    return user
