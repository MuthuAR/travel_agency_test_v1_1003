"""Customer enquiries router."""

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.limiter import limiter
from app.models.enquiry import Enquiry
from app.models.user import User
from app.schemas.enquiry import EnquiryCreate, EnquiryListOut, EnquiryOut
from app.services import enquiry_service

router = APIRouter(prefix="/enquiries", tags=["enquiries"])


def _to_out(enquiry: Enquiry, enquiry_no: int) -> EnquiryOut:
    out = EnquiryOut.model_validate(enquiry)
    out.enquiry_no = enquiry_no
    return out


@router.post("", response_model=EnquiryOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_enquiry(
    request: Request,
    payload: EnquiryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EnquiryOut:
    """Create an enquiry for the authenticated user."""
    enquiry = enquiry_service.create_enquiry(db, current_user, payload)
    enquiry_no = enquiry_service.get_enquiry_no(db, current_user.id, enquiry.id)
    return _to_out(enquiry, enquiry_no)


@router.get("", response_model=EnquiryListOut)
async def list_my_enquiries(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EnquiryListOut:
    """List the caller's own enquiries, newest first."""
    items, total = enquiry_service.list_user_enquiries(db, current_user.id, page, page_size)
    return EnquiryListOut(
        items=[_to_out(item, number) for item, number in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{enquiry_id}", response_model=EnquiryOut)
async def get_my_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EnquiryOut:
    """Return one of the caller's own enquiries (404 otherwise)."""
    enquiry = enquiry_service.get_user_enquiry(db, current_user.id, enquiry_id)
    enquiry_no = enquiry_service.get_enquiry_no(db, current_user.id, enquiry.id)
    return _to_out(enquiry, enquiry_no)
