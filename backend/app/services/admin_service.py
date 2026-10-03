"""Admin (read-only) enquiry queries."""

import logging
from datetime import date

from sqlalchemy import ColumnElement, exists, func, or_, select
from sqlalchemy.orm import Session, contains_eager, selectinload

from app.exceptions import NotFoundError
from app.models import AccountType, EnquiryPassenger, EnquiryStatusHistory
from app.models.customer_profile import CustomerProfile
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User
from app.schemas.admin import AdminEnquiryOut, CustomerOut, StatusHistoryOut
from app.schemas.enquiry import EnquiryOut
from app.services.enquiry_service import get_enquiry_no
from app.services.status_hooks import StatusChange, fire_status_hooks

logger = logging.getLogger(__name__)

_LIKE_ESCAPE = "\\"


def _escape_like(term: str) -> str:
    """Escape LIKE wildcards so user input is matched literally."""
    return (
        term.replace(_LIKE_ESCAPE, _LIKE_ESCAPE * 2)
        .replace("%", _LIKE_ESCAPE + "%")
        .replace("_", _LIKE_ESCAPE + "_")
    )


def _history_out(enquiry: Enquiry) -> list[StatusHistoryOut]:
    """Status history rows, oldest first (changed_by must be loaded)."""
    rows = sorted(enquiry.status_history, key=lambda row: (row.changed_at, row.id))
    return [
        StatusHistoryOut(
            id=row.id,
            from_status=row.from_status,
            to_status=row.to_status,
            changed_at=row.changed_at,
            changed_by_email=row.changed_by.email if row.changed_by is not None else None,
        )
        for row in rows
    ]


def to_admin_out(
    enquiry: Enquiry, enquiry_no: int, include_history: bool = False
) -> AdminEnquiryOut:
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
            account_type=AccountType(profile.account_type).value,
            organization_name=profile.organization_name,
            mobile=user.mobile,
            email=user.email,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
    history = _history_out(enquiry) if include_history else None
    return AdminEnquiryOut(**base, customer=customer, status_history=history)


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
                CustomerProfile.organization_name.ilike(pattern, escape=_LIKE_ESCAPE),
                User.mobile.ilike(pattern, escape=_LIKE_ESCAPE),
                User.email.ilike(pattern, escape=_LIKE_ESCAPE),
                exists().where(
                    EnquiryPassenger.enquiry_id == Enquiry.id,
                    or_(
                        EnquiryPassenger.name.ilike(pattern, escape=_LIKE_ESCAPE),
                        EnquiryPassenger.mobile.ilike(pattern, escape=_LIKE_ESCAPE),
                    ),
                ),
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
        .options(
            contains_eager(Enquiry.user).contains_eager(User.profile),
            selectinload(Enquiry.passengers),
        )
        .where(*conditions)
        .order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = db.execute(stmt).all()
    return [to_admin_out(row[0], int(row[1])) for row in rows], total


def _load_enquiry(db: Session, enquiry_id: int) -> Enquiry | None:
    """Load one enquiry with customer, passengers and status history (with staff users)."""
    stmt = (
        select(Enquiry)
        .join(User, Enquiry.user_id == User.id)
        .outerjoin(CustomerProfile, CustomerProfile.user_id == User.id)
        .options(
            contains_eager(Enquiry.user).contains_eager(User.profile),
            selectinload(Enquiry.passengers),
            selectinload(Enquiry.status_history).selectinload(EnquiryStatusHistory.changed_by),
        )
        .where(Enquiry.id == enquiry_id)
        .execution_options(populate_existing=True)
    )
    return db.scalars(stmt).first()


def get_enquiry(db: Session, enquiry_id: int) -> AdminEnquiryOut:
    """Return one enquiry with customer details and status history; 404 if missing."""
    enquiry = _load_enquiry(db, enquiry_id)
    if enquiry is None:
        raise NotFoundError("Enquiry not found")
    enquiry_no = get_enquiry_no(db, enquiry.user_id, enquiry.id)
    return to_admin_out(enquiry, enquiry_no, include_history=True)


def update_enquiry_status(
    db: Session, enquiry_id: int, new_status: EnquiryStatus, admin: User
) -> AdminEnquiryOut:
    """Set an enquiry status (admin). Same status is a no-op without a history row."""
    enquiry = db.get(Enquiry, enquiry_id)
    if enquiry is None:
        raise NotFoundError("Enquiry not found")
    old_status = EnquiryStatus(enquiry.status)
    change: StatusChange | None = None
    if old_status != new_status:
        change = StatusChange(
            enquiry_id=enquiry.id,
            user_id=enquiry.user_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=admin.id,
        )
        enquiry.status = new_status
        db.add(
            EnquiryStatusHistory(
                enquiry_id=enquiry.id,
                from_status=old_status.value,
                to_status=new_status.value,
                changed_by_user_id=admin.id,
            )
        )
        db.commit()
        logger.info(
            "Enquiry %s status %s -> %s by admin %s",
            enquiry_id,
            old_status.value,
            new_status.value,
            admin.id,
        )
    result = get_enquiry(db, enquiry_id)
    if change is not None:
        fire_status_hooks(change)
    return result
