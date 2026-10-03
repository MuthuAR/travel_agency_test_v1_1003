"""Enquiry business logic for customers."""

import logging
from datetime import date, datetime, timedelta

from sqlalchemy import ColumnElement, Date, DateTime, cast, extract, func, select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.exceptions import NotFoundError, UnprocessableError
from app.models import AccountType, EnquiryPassenger
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User
from app.schemas.enquiry import EnquiryCreate

logger = logging.getLogger(__name__)

MAX_TRAVELLERS = 100
MAX_PASSENGERS = 50


def _is_organization(user: User) -> bool:
    profile = user.profile
    return profile is not None and AccountType(profile.account_type) == AccountType.organization


def _resolve_traveller_counts(user: User, data: EnquiryCreate) -> tuple[int, int, int]:
    """Validate per-account-type traveller rules; return (adults, kids, additional)."""
    passengers = data.passengers or []
    if _is_organization(user):
        if not 1 <= len(passengers) <= MAX_PASSENGERS:
            raise UnprocessableError(
                f"passengers must list 1 to {MAX_PASSENGERS} people for organization accounts"
            )
        if data.adults_count is not None or data.kids_count != 0:
            raise UnprocessableError(
                "adults_count and kids_count are derived for organization accounts"
            )
        total = len(passengers) + data.additional_travellers_count
        if total > MAX_TRAVELLERS:
            raise UnprocessableError(f"total travellers must not exceed {MAX_TRAVELLERS}")
        return total, 0, data.additional_travellers_count
    if passengers or data.additional_travellers_count != 0:
        raise UnprocessableError(
            "passengers and additional_travellers_count are only for organization accounts"
        )
    if data.adults_count is None:
        raise UnprocessableError("adults_count is required")
    if data.adults_count + data.kids_count < 1:
        raise UnprocessableError("at least one traveller (adult or kid) is required")
    return data.adults_count, data.kids_count, 0


def create_enquiry(db: Session, user: User, data: EnquiryCreate) -> Enquiry:
    """Create an enquiry owned by `user`; status always starts as `new`."""
    adults, kids, additional = _resolve_traveller_counts(user, data)
    enquiry = Enquiry(
        user_id=user.id,
        start_date=data.start_date,
        end_date=data.end_date,
        pickup_location=data.pickup_location,
        drop_location=data.drop_location,
        travel_routes=data.travel_routes,
        adults_count=adults,
        kids_count=kids,
        additional_travellers_count=additional,
        passengers=[
            EnquiryPassenger(
                position=index,
                name=person.name,
                mobile=person.mobile,
                gender=person.gender,
                spoken_languages=list(person.spoken_languages),
                communication_mediums=list(person.communication_mediums),
            )
            for index, person in enumerate(data.passengers or [], start=1)
        ],
        vehicle_preference=data.vehicle_preference,
        others=data.others,
        status=EnquiryStatus.new,
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    logger.info("Enquiry %s created by user %s", enquiry.id, user.id)
    return enquiry


def get_enquiry_no(db: Session, user_id: int, enquiry_id: int) -> int:
    """Return the 1-based position of an enquiry among the user's enquiries (by id)."""
    return (
        db.scalar(
            select(func.count(Enquiry.id)).where(
                Enquiry.user_id == user_id, Enquiry.id <= enquiry_id
            )
        )
        or 0
    )


def _local_created_at() -> ColumnElement[datetime]:
    """created_at shifted to the business-local wall clock (naive timestamp)."""
    utc_naive = func.timezone("UTC", Enquiry.created_at, type_=DateTime())
    return utc_naive + timedelta(minutes=settings.DISPLAY_TZ_OFFSET_MINUTES)


def _submission_filters(
    status: EnquiryStatus | None,
    year: int | None,
    month: int | None,
    on_date: date | None,
) -> list[ColumnElement[bool]]:
    """WHERE conditions; `on_date` wins over year/month."""
    conditions: list[ColumnElement[bool]] = []
    if status is not None:
        conditions.append(Enquiry.status == status)
    if on_date is not None:
        conditions.append(cast(_local_created_at(), Date) == on_date)
    else:
        if year is not None:
            conditions.append(extract("year", _local_created_at()) == year)
        if month is not None:
            conditions.append(extract("month", _local_created_at()) == month)
    return conditions


def list_user_enquiries(
    db: Session,
    user_id: int,
    page: int,
    page_size: int,
    status: EnquiryStatus | None = None,
    year: int | None = None,
    month: int | None = None,
    on_date: date | None = None,
) -> tuple[list[tuple[Enquiry, int]], int]:
    """Return one filtered page of (enquiry, enquiry_no) pairs, newest first, and the total.

    enquiry_no is ranked over the user's full history; filters apply afterwards.
    """
    conditions = _submission_filters(status, year, month, on_date)
    total = (
        db.scalar(select(func.count(Enquiry.id)).where(Enquiry.user_id == user_id, *conditions))
        or 0
    )
    ranked = (
        select(
            Enquiry.id.label("id"),
            func.row_number()
            .over(partition_by=Enquiry.user_id, order_by=Enquiry.id)
            .label("enquiry_no"),
        )
        .where(Enquiry.user_id == user_id)
        .subquery()
    )
    stmt = (
        select(Enquiry, ranked.c.enquiry_no)
        .join(ranked, ranked.c.id == Enquiry.id)
        .where(*conditions)
        .options(selectinload(Enquiry.passengers))
        .order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [(row[0], int(row[1])) for row in db.execute(stmt).all()]
    return items, total


def get_user_enquiry(db: Session, user_id: int, enquiry_id: int) -> Enquiry:
    """Return the user's own enquiry; missing and foreign enquiries yield the same 404."""
    stmt = (
        select(Enquiry)
        .where(Enquiry.id == enquiry_id, Enquiry.user_id == user_id)
        .options(selectinload(Enquiry.passengers))
    )
    enquiry = db.scalars(stmt).first()
    if enquiry is None:
        raise NotFoundError("Enquiry not found")
    return enquiry
