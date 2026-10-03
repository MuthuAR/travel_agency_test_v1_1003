"""Admin (read-only) enquiry queries."""

import logging
from datetime import date

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.orm import Session, contains_eager

from app.exceptions import NotFoundError
from app.models.customer_profile import CustomerProfile
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User
from app.schemas.admin import AdminEnquiryOut, CustomerOut
from app.schemas.enquiry import EnquiryOut
from app.services.enquiry_service import get_enquiry_no

logger = logging.getLogger(__name__)

_LIKE_ESCAPE = "\\"


def _escape_like(term: str) -> str:
    """Escape LIKE wildcards so user input is matched literally."""
    return (
        term.replace(_LIKE_ESCAPE, _LIKE_ESCAPE * 2)
        .replace("%", _LIKE_ESCAPE + "%")
        .replace("_", _LIKE_ESCAPE + "_")
    )


def to_admin_out(enquiry: Enquiry, enquiry_no: int) -> AdminEnquiryOut:
    """Map an enquiry (with user and profile loaded) to the admin view."""
    base = EnquiryOut.model_validate(enquiry).model_dump()
    base["enquiry_no"] = enquiry_no
    user = enquiry.user
    profile = user.profile
    customer: CustomerOut | None = None
    if profile is not None:
        customer = CustomerOut(
            id=profile.id,
            user_id=user.id,
            name=profile.name,
            gender=profile.gender,
            spoken_languages=list(profile.spoken_languages),
            communication_mediums=list(profile.communication_mediums),
            address=profile.address,
            mobile=user.mobile,
            email=user.email,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
    return AdminEnquiryOut(**base, customer=customer)


def list_enquiries(
    db: Session,
    page: int,
    page_size: int,
    status: EnquiryStatus | None = None,
    search: str | None = None,
    start_date_from: date | None = None,
    start_date_to: date | None = None,
) -> tuple[list[AdminEnquiryOut], int]:
    """Return one filtered page of all enquiries (newest first) and the total count."""
    # Rank over each customer's entire history, before any filtering or pagination.
    ranked = select(
        Enquiry.id.label("id"),
        func.row_number()
        .over(partition_by=Enquiry.user_id, order_by=Enquiry.id)
        .label("enquiry_no"),
    ).subquery()

    conditions: list[ColumnElement[bool]] = []
    if status is not None:
        conditions.append(Enquiry.status == status)
    if start_date_from is not None:
        conditions.append(Enquiry.start_date >= start_date_from)
    if start_date_to is not None:
        conditions.append(Enquiry.start_date <= start_date_to)
    if search:
        pattern = f"%{_escape_like(search)}%"
        conditions.append(
            or_(
                CustomerProfile.name.ilike(pattern, escape=_LIKE_ESCAPE),
                User.mobile.ilike(pattern, escape=_LIKE_ESCAPE),
                User.email.ilike(pattern, escape=_LIKE_ESCAPE),
            )
        )

    count_stmt = (
        select(func.count(Enquiry.id))
        .select_from(Enquiry)
        .join(User, Enquiry.user_id == User.id)
        .outerjoin(CustomerProfile, CustomerProfile.user_id == User.id)
        .where(*conditions)
    )
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Enquiry, ranked.c.enquiry_no)
        .join(ranked, ranked.c.id == Enquiry.id)
        .join(User, Enquiry.user_id == User.id)
        .outerjoin(CustomerProfile, CustomerProfile.user_id == User.id)
        .options(contains_eager(Enquiry.user).contains_eager(User.profile))
        .where(*conditions)
        .order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = db.execute(stmt).all()
    return [to_admin_out(row[0], int(row[1])) for row in rows], total


def get_enquiry(db: Session, enquiry_id: int) -> AdminEnquiryOut:
    """Return one enquiry with customer details; 404 if missing."""
    stmt = (
        select(Enquiry)
        .join(User, Enquiry.user_id == User.id)
        .outerjoin(CustomerProfile, CustomerProfile.user_id == User.id)
        .options(contains_eager(Enquiry.user).contains_eager(User.profile))
        .where(Enquiry.id == enquiry_id)
    )
    enquiry = db.scalars(stmt).first()
    if enquiry is None:
        raise NotFoundError("Enquiry not found")
    enquiry_no = get_enquiry_no(db, enquiry.user_id, enquiry.id)
    return to_admin_out(enquiry, enquiry_no)
