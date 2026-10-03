"""Enquiry schemas."""

from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enquiry import EnquiryStatus


class EnquiryCreate(BaseModel):
    """Body for creating an enquiry. user_id and status are never accepted from the client."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    start_date: date
    end_date: date
    pickup_location: str = Field(min_length=1, max_length=255)
    drop_location: str = Field(min_length=1, max_length=255)
    travel_routes: str = Field(min_length=1, max_length=2000)
    adults_count: int = Field(ge=0, le=100)
    kids_count: int = Field(ge=0, le=100)
    vehicle_preference: str = Field(min_length=1, max_length=100)
    others: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_business_rules(self) -> Self:
        if self.start_date < date.today():
            raise ValueError("start_date must not be in the past")
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if self.adults_count + self.kids_count < 1:
            raise ValueError("at least one traveller (adult or kid) is required")
        if not self.others:
            self.others = None
        return self


class EnquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    start_date: date
    end_date: date
    pickup_location: str
    drop_location: str
    travel_routes: str
    adults_count: int
    kids_count: int
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
