"""Profile schemas."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)

from app.utils.validators import normalize_mobile, normalize_optional_email

Gender = Literal["male", "female", "other"]
CommunicationMediumValue = Literal["whatsapp", "sms", "email"]
Language = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


AccountTypeValue = Literal["personal", "organization"]

ORG_NAME_MIN = 2
ORG_NAME_MAX = 200


def normalize_organization_name(value: object) -> object:
    """Trim and collapse whitespace; blank becomes None. Length is checked when present."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("organization_name must be a string")
    cleaned = " ".join(value.split())
    if not cleaned:
        return None
    if not ORG_NAME_MIN <= len(cleaned) <= ORG_NAME_MAX:
        raise ValueError(
            f"organization_name must be {ORG_NAME_MIN} to {ORG_NAME_MAX} characters"
        )
    return cleaned


class ProfileBase(BaseModel):
    """Fields stored on CustomerProfile, shared by register and profile update."""

    # No model-wide whitespace stripping: it would also strip passwords.
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    # Required for personal accounts, forbidden for organization accounts; the per-type
    # rules live in RegisterRequest (sign-up) and profile_service (PUT /profile).
    gender: Gender | None = None
    spoken_languages: list[Language] | None = Field(default=None, max_length=10)
    communication_mediums: list[CommunicationMediumValue] | None = Field(
        default=None, max_length=3
    )
    address: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=500)]
    organization_name: str | None = None

    @field_validator("organization_name", mode="before")
    @classmethod
    def _normalize_organization_name(cls, value: object) -> object:
        return normalize_organization_name(value)

    @field_validator("communication_mediums")
    @classmethod
    def _dedupe_mediums(
        cls, value: list[CommunicationMediumValue] | None
    ) -> list[CommunicationMediumValue] | None:
        """Drop duplicates while preserving the order given."""
        if value is None:
            return None
        return list(dict.fromkeys(value))


def check_person_fields(
    is_organization: bool,
    gender: str | None,
    spoken_languages: list[str] | None,
    communication_mediums: list[str] | None,
) -> str | None:
    """Return an error message if gender/languages/mediums break the per-type rules."""
    if is_organization:
        if gender is not None or spoken_languages or communication_mediums:
            return (
                "gender, spoken_languages and communication_mediums "
                "are not allowed for organization accounts"
            )
        return None
    if gender is None:
        return "gender is required for personal accounts"
    if not spoken_languages:
        return "spoken_languages must have at least 1 item for personal accounts"
    if not communication_mediums:
        return "communication_mediums must have 1 to 3 items for personal accounts"
    return None


class ContactMixin(BaseModel):
    """Mobile and email, which live on the User row."""

    mobile: str
    email: EmailStr | None = None

    @field_validator("mobile")
    @classmethod
    def _normalize_mobile(cls, value: str) -> str:
        return normalize_mobile(value)

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: object) -> object:
        return normalize_optional_email(value)


class ProfileUpdate(ProfileBase, ContactMixin):
    """Body of PUT /profile."""


class ProfileOut(BaseModel):
    """Profile as returned by the API (mobile/email merged in from User)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    gender: str | None
    spoken_languages: list[str]
    communication_mediums: list[str]
    address: str
    account_type: AccountTypeValue
    organization_name: str | None
    mobile: str
    email: str | None
    created_at: datetime
    updated_at: datetime
