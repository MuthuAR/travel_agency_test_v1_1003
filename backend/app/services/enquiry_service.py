"""Enquiry business logic for customers."""

import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.exceptions import NotFoundError
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User
from app.schemas.enquiry import EnquiryCreate

logger = logging.getLogger(__name__)


def create_enquiry(db: Session, user: User, data: EnquiryCreate) -> Enquiry:
    """Create an enquiry owned by `user`; status always starts as `new`."""
    enquiry = Enquiry(
        user_id=user.id,
        start_date=data.start_date,
        end_date=data.end_date,
        pickup_location=data.pickup_location,
        drop_location=data.drop_location,
        travel_routes=data.travel_routes,
        adults_count=data.adults_count,
        kids_count=data.kids_count,
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


def list_user_enquiries(
    db: Session, user_id: int, page: int, page_size: int
) -> tuple[list[tuple[Enquiry, int]], int]:
    """Return one page of (enquiry, enquiry_no) pairs, newest first, and the total count."""
    total = db.scalar(select(func.count(Enquiry.id)).where(Enquiry.user_id == user_id)) or 0
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
        .order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [(row[0], int(row[1])) for row in db.execute(stmt).all()]
    return items, total


def get_user_enquiry(db: Session, user_id: int, enquiry_id: int) -> Enquiry:
    """Return the user's own enquiry; missing and foreign enquiries yield the same 404."""
    stmt = select(Enquiry).where(Enquiry.id == enquiry_id, Enquiry.user_id == user_id)
    enquiry = db.scalars(stmt).first()
    if enquiry is None:
        raise NotFoundError("Enquiry not found")
    return enquiry
