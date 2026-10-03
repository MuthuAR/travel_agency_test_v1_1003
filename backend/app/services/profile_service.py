"""Profile business logic."""

import logging

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.exceptions import ConflictError, NotFoundError, UnprocessableError
from app.models import AccountType
from app.models.customer_profile import CustomerProfile
from app.models.user import User
from app.schemas.profile import ProfileOut, ProfileUpdate, check_person_fields

logger = logging.getLogger(__name__)

CONFLICT_MESSAGE = "Account already exists"


def build_profile_out(user: User, profile: CustomerProfile) -> ProfileOut:
    """Merge User contact fields into the profile response."""
    return ProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        gender=profile.gender,
        spoken_languages=list(profile.spoken_languages),
        communication_mediums=list(profile.communication_mediums),
        address=profile.address,
        account_type=AccountType(profile.account_type).value,
        organization_name=profile.organization_name,
        mobile=user.mobile,
        email=user.email,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _load_profile(db: Session, user: User) -> CustomerProfile:
    profile = db.execute(
        select(CustomerProfile).where(CustomerProfile.user_id == user.id)
    ).scalar_one_or_none()
    if profile is None:
        raise NotFoundError("Profile not found")
    return profile


def get_profile(db: Session, user: User) -> ProfileOut:
    """Return the profile of the given user."""
    return build_profile_out(user, _load_profile(db, user))


def update_profile(db: Session, user: User, data: ProfileUpdate) -> ProfileOut:
    """Update profile and contact details in one transaction."""
    profile = _load_profile(db, user)

    is_organization = AccountType(profile.account_type) == AccountType.organization
    if is_organization and data.organization_name is None:
        raise UnprocessableError("organization_name is required for organization accounts")
    if not is_organization and data.organization_name is not None:
        raise UnprocessableError("organization_name is only allowed for organization accounts")

    error = check_person_fields(
        is_organization, data.gender, data.spoken_languages, data.communication_mediums
    )
    if error is not None:
        raise UnprocessableError(error)

    conditions = [User.mobile == data.mobile]
    if data.email is not None:
        conditions.append(User.email == data.email)
    clash = db.execute(
        select(User.id).where(or_(*conditions), User.id != user.id).limit(1)
    ).first()
    if clash is not None:
        raise ConflictError(CONFLICT_MESSAGE)

    user.mobile = data.mobile
    user.email = data.email
    profile.name = data.name
    profile.gender = None if is_organization else data.gender
    profile.spoken_languages = [] if is_organization else list(data.spoken_languages or [])
    profile.communication_mediums = (
        [] if is_organization else list(data.communication_mediums or [])
    )
    profile.address = data.address
    profile.organization_name = data.organization_name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.info("Profile update rejected: uniqueness conflict")
        raise ConflictError(CONFLICT_MESSAGE) from None
    db.refresh(user)
    db.refresh(profile)
    return build_profile_out(user, profile)
