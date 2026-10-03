"""CustomerProfile model. Mobile and email live on User, not here."""
from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, Text
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


class AccountType(str, enum.Enum):
    """Customer account kinds.

    Not a SQLAlchemy column type: stored as a plain string in
    ``CustomerProfile.account_type`` and validated by the schemas / a CHECK constraint.
    """

    personal = "personal"
    organization = "organization"


class CustomerProfile(Base, TimestampMixin):
    __tablename__ = "customer_profiles"
    __table_args__ = (
        CheckConstraint(
            "account_type IN ('personal', 'organization')",
            name="account_type_valid",
        ),
        CheckConstraint(
            "(account_type = 'organization' AND organization_name IS NOT NULL "
            "AND length(trim(organization_name)) > 0) "
            "OR (account_type = 'personal' AND organization_name IS NULL)",
            name="organization_name_matches_type",
        ),
    )

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
    # 'personal' | 'organization' (AccountType values), plain string, not a PG enum.
    account_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=AccountType.personal.value,
        server_default=AccountType.personal.value,
    )
    organization_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="profile")
