"""CustomerProfile model. Mobile and email live on User, not here."""
from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class CommunicationMedium(str, enum.Enum):
    """Allowed communication media.

    Not a SQLAlchemy column type: values are stored as plain strings in
    ``CustomerProfile.communication_mediums`` and validated by the schemas.
    """

    whatsapp = "whatsapp"
    sms = "sms"
    email = "email"


class CustomerProfile(Base, TimestampMixin):
    __tablename__ = "customer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    # Stored as a native PostgreSQL ARRAY(VARCHAR(50)) of language names.
    spoken_languages: Mapped[list[str]] = mapped_column(ARRAY(String(50)), nullable=False)
    # Native PostgreSQL ARRAY(VARCHAR(20)); values are CommunicationMedium values.
    communication_mediums: Mapped[list[str]] = mapped_column(ARRAY(String(20)), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="profile")
