"""EnquiryPassenger model: an individually described traveller on an enquiry."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.enquiry import Enquiry


class EnquiryPassenger(Base, TimestampMixin):
    __tablename__ = "enquiry_passengers"
    __table_args__ = (
        UniqueConstraint(
            "enquiry_id", "position", name="uq_enquiry_passengers_enquiry_id_position"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    enquiry_id: Mapped[int] = mapped_column(
        ForeignKey("enquiries.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # 1-based order within the enquiry.
    position: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    spoken_languages: Mapped[list[str]] = mapped_column(ARRAY(String(50)), nullable=False)
    communication_mediums: Mapped[list[str]] = mapped_column(ARRAY(String(20)), nullable=False)

    enquiry: Mapped[Enquiry] = relationship("Enquiry", back_populates="passengers")
