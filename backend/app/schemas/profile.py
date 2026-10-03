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


class ProfileBase(BaseModel):
    """Fields stored on CustomerProfile, shared by register and profile update."""

    # No model-wide whitespace stripping: it would also strip passwords.
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    gender: Gender
    spoken_languages: list[Language] = Field(min_length=1, max_length=10)
    communication_mediums: list[CommunicationMediumValue] = Field(min_length=1, max_length=3)
    address: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=500)]


    @field_validator("communication_mediums")
    @classmethod
    def _dedupe_mediums(
        cls, value: list[CommunicationMediumValue]
    ) -> list[CommunicationMediumValue]:
        """Drop duplicates while preserving the order given."""
        return list(dict.fromkeys(value))


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
    gender: str
    spoken_languages: list[str]
    communication_mediums: list[str]
    address: str
    mobile: str
    email: str | None
    created_at: datetime
    updated_at: datetime
