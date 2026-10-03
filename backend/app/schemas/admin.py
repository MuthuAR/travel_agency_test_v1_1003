"""Admin schemas (read-only enquiry views)."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.enquiry import EnquiryOut


class CustomerOut(BaseModel):
    """Customer details shown to admins. Mobile/email come from the User row."""

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


class AdminEnquiryOut(EnquiryOut):
    customer: CustomerOut | None


class AdminEnquiryListOut(BaseModel):
    items: list[AdminEnquiryOut]
    total: int
    page: int
    page_size: int
