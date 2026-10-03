"""Admin router (read-only in the MVP)."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_admin
from app.models.enquiry import EnquiryStatus
from app.models.user import User
from app.schemas.admin import AdminEnquiryListOut, AdminEnquiryOut
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/enquiries", response_model=AdminEnquiryListOut)
async def list_all_enquiries(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: EnquiryStatus | None = Query(None),
    search: str | None = Query(None, max_length=100),
    start_date_from: date | None = Query(None),
    start_date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminEnquiryListOut:
    """List all enquiries with customer details (admin only)."""
    cleaned_search = search.strip() if search else None
    items, total = admin_service.list_enquiries(
        db,
        page=page,
        page_size=page_size,
        status=status,
        search=cleaned_search or None,
        start_date_from=start_date_from,
        start_date_to=start_date_to,
    )
    return AdminEnquiryListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/enquiries/{enquiry_id}", response_model=AdminEnquiryOut)
async def get_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminEnquiryOut:
    """Return one enquiry with customer details (admin only)."""
    return admin_service.get_enquiry(db, enquiry_id)
