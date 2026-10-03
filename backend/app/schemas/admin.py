"""Admin schemas (enquiry views and status updates)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enquiry import EnquiryStatus
from app.schemas.enquiry import EnquiryOut


class CustomerOut(BaseModel):
    """Customer details shown to admins. Mobile/email come from the User row."""

    id: int
    user_id: int
    name: str
    gender: str | None
    spoken_languages: list[str]
    communication_mediums: list[str]
    address: str
    account_type: str
    organization_name: str | None
    mobile: str
    email: str | None
    created_at: datetime
    updated_at: datetime


class StatusHistoryOut(BaseModel):
    id: int
    from_status: str
    to_status: str
    changed_at: datetime
    # Email of the staff user; None if that user was deleted (or has no email).
    changed_by_email: str | None


class AdminEnquiryOut(EnquiryOut):
    customer: CustomerOut | None
    # Oldest first. Populated on detail and status-update responses; None in the list.
    status_history: list[StatusHistoryOut] | None = None


class StatusUpdateIn(BaseModel):
    """Body for changing an enquiry's status. An enquiry never returns to `new`."""

    model_config = ConfigDict(extra="forbid")

    status: EnquiryStatus

    @field_validator("status")
    @classmethod
    def _not_new(cls, value: EnquiryStatus) -> EnquiryStatus:
        if value == EnquiryStatus.new:
            raise ValueError("status cannot be set back to new")
        return value


class AdminEnquiryListOut(BaseModel):
    items: list[AdminEnquiryOut]
    total: int
    page: int
    page_size: int
