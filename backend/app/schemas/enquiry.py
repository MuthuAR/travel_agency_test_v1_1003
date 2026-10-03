"""Enquiry schemas."""

from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enquiry import EnquiryStatus
from app.schemas.profile import CommunicationMediumValue, Gender, Language
from app.utils.validators import normalize_mobile


class PassengerIn(BaseModel):
    """One employee/traveller listed on an organization enquiry."""

    model_config = ConfigDict(extra="forbid")

    name: str
    mobile: str
    gender: Gender
    spoken_languages: list[Language] = Field(min_length=1, max_length=10)
    communication_mediums: list[CommunicationMediumValue] = Field(min_length=1, max_length=3)

    @field_validator("name")
    @classmethod
    def _clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not 1 <= len(cleaned) <= 100:
            raise ValueError("name must be 1 to 100 characters")
        return cleaned

    @field_validator("mobile")
    @classmethod
    def _normalize_mobile(cls, value: str) -> str:
        return normalize_mobile(value)

    @field_validator("spoken_languages", "communication_mediums")
    @classmethod
    def _dedupe(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))


class PassengerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    name: str
    mobile: str
    gender: str
    spoken_languages: list[str]
    communication_mediums: list[str]


class EnquiryCreate(BaseModel):
    """Body for creating an enquiry. user_id and status are never accepted from the client."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    start_date: date
    end_date: date
    pickup_location: str = Field(min_length=1, max_length=255)
    drop_location: str = Field(min_length=1, max_length=255)
    travel_routes: str = Field(min_length=1, max_length=2000)
    # Personal: adults_count required. Organization: omitted; totals derive from passengers.
    adults_count: int | None = Field(default=None, ge=0, le=100)
    kids_count: int = Field(default=0, ge=0, le=100)
    vehicle_preference: str = Field(min_length=1, max_length=100)
    others: str | None = Field(default=None, max_length=2000)
    passengers: list[PassengerIn] | None = None
    additional_travellers_count: int = Field(default=0, ge=0, le=100)

    @model_validator(mode="after")
    def validate_business_rules(self) -> Self:
        if self.start_date < date.today():
            raise ValueError("start_date must not be in the past")
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if not self.others:
            self.others = None
        return self


class EnquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # 1-based position among the owner's enquiries (ordered by id); None where not computed.
    enquiry_no: int | None = None
    user_id: int
    start_date: date
    end_date: date
    pickup_location: str
    drop_location: str
    travel_routes: str
    adults_count: int
    kids_count: int
    additional_travellers_count: int = 0
    passengers: list[PassengerOut] = Field(default_factory=list)
    vehicle_preference: str
    others: str | None
    status: EnquiryStatus
    created_at: datetime
    updated_at: datetime


class EnquiryListOut(BaseModel):
    items: list[EnquiryOut]
    total: int
    page: int
    page_size: int
