"""Authentication business logic."""

import logging
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.jwt import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    refresh_token_expiry,
)
from app.auth.security import hash_password, verify_password
from app.auth.session_policy import session_max_age
from app.exceptions import ConflictError, UnauthorizedError
from app.models.customer_profile import CustomerProfile
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest, RegisterResponse, TokenResponse
from app.services.profile_service import build_profile_out
from app.utils.validators import normalize_mobile

logger = logging.getLogger(__name__)

CONFLICT_MESSAGE = "Account already exists"
INVALID_REFRESH_MESSAGE = "Invalid or expired refresh token"

# Verified against when the user does not exist, so timing does not reveal account existence.
_DUMMY_HASH = hash_password("dummy-password-for-timing-1")


def register_user(db: Session, data: RegisterRequest) -> RegisterResponse:
    """Create a customer User and CustomerProfile in one transaction."""
    conditions = [User.mobile == data.mobile]
    if data.email is not None:
        conditions.append(User.email == data.email)
    existing = db.execute(select(User.id).where(or_(*conditions)).limit(1)).first()
    if existing is not None:
        raise ConflictError(CONFLICT_MESSAGE)

    user = User(
        mobile=data.mobile,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.customer,
        is_active=True,
    )
    profile = CustomerProfile(
        name=data.name,
        gender=data.gender,
        spoken_languages=list(data.spoken_languages),
        communication_mediums=list(data.communication_mediums),
        address=data.address,
    )
    user.profile = profile
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.info("Registration rejected: uniqueness conflict")
        raise ConflictError(CONFLICT_MESSAGE) from None
    db.refresh(user)
    db.refresh(profile)
    logger.info("User registered: id=%s", user.id)
    return RegisterResponse(
        id=user.id,
        mobile=user.mobile,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        profile=build_profile_out(user, profile),
    )


def _find_user_by_identifier(db: Session, identifier: str) -> User | None:
    value = identifier.strip()
    if "@" in value:
        return db.execute(select(User).where(User.email == value.lower())).scalar_one_or_none()
    try:
        mobile = normalize_mobile(value)
    except ValueError:
        return None
    return db.execute(select(User).where(User.mobile == mobile)).scalar_one_or_none()


def authenticate(db: Session, identifier: str, password: str) -> User:
    """Return the active user for valid credentials; always raise a generic 401 otherwise."""
    user = _find_user_by_identifier(db, identifier)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        raise UnauthorizedError("Invalid credentials")
    if not verify_password(password, user.hashed_password) or not user.is_active:
        raise UnauthorizedError("Invalid credentials")
    return user


def issue_tokens(
    db: Session, user: User, session_started_at: datetime | None = None
) -> TokenResponse:
    """Create an access JWT and a stored (hashed) refresh token.

    session_started_at is None for a fresh login (the session starts now); rotation passes the
    original value so the hard session cap cannot be extended by refreshing.
    """
    raw_refresh = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_refresh),
            expires_at=refresh_token_expiry(user.role.value),
            session_started_at=session_started_at or datetime.now(UTC),
        )
    )
    db.commit()
    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=raw_refresh,
    )


def login(db: Session, identifier: str, password: str) -> TokenResponse:
    """Authenticate and issue tokens."""
    user = authenticate(db, identifier, password)
    return issue_tokens(db, user)


def rotate_refresh_token(db: Session, raw_token: str) -> TokenResponse:
    """Revoke the presented refresh token and issue a fresh pair."""
    record = db.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_refresh_token(raw_token))
        .with_for_update()
    ).scalar_one_or_none()
    if record is None or record.revoked or record.expires_at <= datetime.now(UTC):
        db.rollback()
        raise UnauthorizedError(INVALID_REFRESH_MESSAGE)
    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        db.rollback()
        raise UnauthorizedError(INVALID_REFRESH_MESSAGE)
    max_age = session_max_age(user.role.value)
    if max_age is not None and datetime.now(UTC) - record.session_started_at > max_age:
        record.revoked = True
        db.commit()
        logger.info("Refresh rejected: customer session exceeded maximum age")
        raise UnauthorizedError(INVALID_REFRESH_MESSAGE)
    record.revoked = True
    db.flush()
    return issue_tokens(db, user, session_started_at=record.session_started_at)


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    """Revoke a refresh token; silently does nothing if it is unknown."""
    record = db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token))
    ).scalar_one_or_none()
    if record is not None and not record.revoked:
        record.revoked = True
        db.commit()
