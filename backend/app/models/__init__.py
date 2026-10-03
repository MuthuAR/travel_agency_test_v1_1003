"""Model package: importing it registers every table on Base.metadata."""
from app.models.base import Base, TimestampMixin
from app.models.customer_profile import AccountType, CommunicationMedium, CustomerProfile
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.enquiry_passenger import EnquiryPassenger
from app.models.enquiry_status_history import EnquiryStatusHistory
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "UserRole",
    "RefreshToken",
    "CustomerProfile",
    "CommunicationMedium",
    "AccountType",
    "Enquiry",
    "EnquiryStatus",
    "EnquiryPassenger",
    "EnquiryStatusHistory",
]
