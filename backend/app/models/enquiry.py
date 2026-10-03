"""Enquiry model."""
from __future__ import annotations

import enum
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.enquiry_passenger import EnquiryPassenger
    from app.models.enquiry_status_history import EnquiryStatusHistory
    from app.models.user import User


class EnquiryStatus(str, enum.Enum):
    new = "new"
    ack = "ack"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class Enquiry(Base, TimestampMixin):
    __tablename__ = "enquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    pickup_location: Mapped[str] = mapped_column(String(255), nullable=False)
    drop_location: Mapped[str] = mapped_column(String(255), nullable=False)
    travel_routes: Mapped[str] = mapped_column(Text, nullable=False)
    adults_count: Mapped[int] = mapped_column(Integer, nullable=False)
    kids_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    # Extra travellers given by count only (no individual details).
    additional_travellers_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    vehicle_preference: Mapped[str] = mapped_column(String(100), nullable=False)
    others: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[EnquiryStatus] = mapped_column(
        Enum(
            EnquiryStatus,
            name="enquirystatus",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=EnquiryStatus.new,
        server_default=EnquiryStatus.new.value,
        index=True,
        nullable=False,
    )

    user: Mapped[User] = relationship("User", back_populates="enquiries")
    passengers: Mapped[list[EnquiryPassenger]] = relationship(
        "EnquiryPassenger",
        back_populates="enquiry",
        cascade="all, delete-orphan",
        order_by="EnquiryPassenger.position",
    )
    status_history: Mapped[list[EnquiryStatusHistory]] = relationship(
        "EnquiryStatusHistory",
        back_populates="enquiry",
        cascade="all, delete-orphan",
        order_by="(EnquiryStatusHistory.changed_at, EnquiryStatusHistory.id)",
    )

    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="end_date_gte_start_date"),
        CheckConstraint("adults_count >= 0", name="adults_count_non_negative"),
        CheckConstraint("kids_count >= 0", name="kids_count_non_negative"),
        CheckConstraint("adults_count + kids_count >= 1", name="min_one_traveller"),
        CheckConstraint(
            "additional_travellers_count >= 0", name="additional_travellers_nonneg"
        ),
        Index("ix_enquiries_user_id_created_at", "user_id", "created_at"),
    )
