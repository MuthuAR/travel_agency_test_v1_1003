"""Tests for PATCH /api/v1/admin/enquiries/{id}/status and the status history."""

from collections.abc import Callable, Iterator
from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EnquiryStatusHistory
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User
from app.services import status_hooks
from app.services.status_hooks import StatusChange, register_status_hook

ADMIN_URL = "/api/v1/admin/enquiries"
MY_URL = "/api/v1/enquiries"

MakeUser = Callable[..., User]
LoginHeaders = Callable[..., dict[str, str]]


def _insert_enquiry(
    db: Session, user: User, status: EnquiryStatus = EnquiryStatus.new
) -> Enquiry:
    start = date.today() + timedelta(days=10)
    enquiry = Enquiry(
        user_id=user.id,
        start_date=start,
        end_date=start + timedelta(days=2),
        pickup_location="Coimbatore",
        drop_location="Ooty",
        travel_routes="Coimbatore - Ooty",
        adults_count=2,
        kids_count=0,
        vehicle_preference="Sedan",
        others=None,
        status=status,
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry


def _admin(make_user: MakeUser, login_headers: LoginHeaders) -> tuple[User, dict[str, str]]:
    admin = make_user(
        mobile="9000000001", email="staff@example.com", role="admin", with_profile=False
    )
    return admin, login_headers("9000000001")


def _patch(
    client: TestClient, enquiry_id: int, status: str, headers: dict[str, str]
) -> Any:
    return client.patch(
        f"{ADMIN_URL}/{enquiry_id}/status", json={"status": status}, headers=headers
    )


def _history_rows(db: Session, enquiry_id: int) -> list[EnquiryStatusHistory]:
    db.expire_all()
    stmt = (
        select(EnquiryStatusHistory)
        .where(EnquiryStatusHistory.enquiry_id == enquiry_id)
        .order_by(EnquiryStatusHistory.id)
    )
    return list(db.scalars(stmt).all())


@pytest.fixture
def clean_hooks() -> Iterator[None]:
    """Restore the global hook registry after a test."""
    yield
    status_hooks._hooks.clear()


@pytest.mark.parametrize("target", ["ack", "confirmed", "cancelled", "completed"])
def test_admin_can_set_each_status(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: LoginHeaders,
    target: str,
) -> None:
    admin, headers = _admin(make_user, login_headers)
    customer = make_user(mobile="9876543210")
    enquiry = _insert_enquiry(db, customer)

    response = _patch(client, enquiry.id, target, headers)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == target
    assert body["id"] == enquiry.id
    assert body["enquiry_no"] == 1
    assert body["customer"]["user_id"] == customer.id
    assert body["passengers"] == []
    rows = _history_rows(db, enquiry.id)
    assert len(rows) == 1
    assert (rows[0].from_status, rows[0].to_status) == ("new", target)
    assert rows[0].changed_by_user_id == admin.id
    assert [h["to_status"] for h in body["status_history"]] == [target]
    assert body["status_history"][0]["changed_by_email"] == "staff@example.com"


def test_customer_sees_new_status_immediately(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    _, admin_headers = _admin(make_user, login_headers)
    customer = make_user(mobile="9876543210")
    enquiry = _insert_enquiry(db, customer)
    customer_headers = login_headers("9876543210")

    assert _patch(client, enquiry.id, "confirmed", admin_headers).status_code == 200

    one = client.get(f"{MY_URL}/{enquiry.id}", headers=customer_headers).json()
    listed = client.get(MY_URL, headers=customer_headers).json()
    assert one["status"] == "confirmed"
    assert listed["items"][0]["status"] == "confirmed"


def test_setting_new_is_rejected(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    _, headers = _admin(make_user, login_headers)
    enquiry = _insert_enquiry(db, make_user(mobile="9876543210"), EnquiryStatus.ack)

    response = _patch(client, enquiry.id, "new", headers)

    assert response.status_code == 422
    assert _history_rows(db, enquiry.id) == []


@pytest.mark.parametrize("bad", ["contacted", "closed", "bogus", ""])
def test_unknown_status_value_is_422(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders, bad: str
) -> None:
    _, headers = _admin(make_user, login_headers)
    enquiry = _insert_enquiry(db, make_user(mobile="9876543210"))

    assert _patch(client, enquiry.id, bad, headers).status_code == 422


def test_extra_body_fields_are_rejected(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    _, headers = _admin(make_user, login_headers)
    enquiry = _insert_enquiry(db, make_user(mobile="9876543210"))

    response = client.patch(
        f"{ADMIN_URL}/{enquiry.id}/status",
        json={"status": "ack", "user_id": 5},
        headers=headers,
    )

    assert response.status_code == 422


def test_same_status_is_noop_without_history(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    _, headers = _admin(make_user, login_headers)
    enquiry = _insert_enquiry(db, make_user(mobile="9876543210"), EnquiryStatus.confirmed)

    response = _patch(client, enquiry.id, "confirmed", headers)

    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
    assert response.json()["status_history"] == []
    assert _history_rows(db, enquiry.id) == []


def test_unknown_enquiry_is_404(
    client: TestClient, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    _, headers = _admin(make_user, login_headers)

    assert _patch(client, 999999, "ack", headers).status_code == 404


def test_customer_is_forbidden_and_anonymous_unauthorized(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    customer = make_user(mobile="9876543210")
    enquiry = _insert_enquiry(db, customer)
    headers = login_headers("9876543210")

    assert _patch(client, enquiry.id, "ack", headers).status_code == 403
    anonymous = client.patch(f"{ADMIN_URL}/{enquiry.id}/status", json={"status": "ack"})
    assert anonymous.status_code == 401
    db.expire_all()
    assert db.get(Enquiry, enquiry.id).status == EnquiryStatus.new  # type: ignore[union-attr]


def test_statuses_can_move_in_any_order_except_back_to_new(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    _, headers = _admin(make_user, login_headers)
    enquiry = _insert_enquiry(db, make_user(mobile="9876543210"))
    path = ["cancelled", "ack", "completed", "confirmed", "cancelled"]

    for target in path:
        assert _patch(client, enquiry.id, target, headers).status_code == 200

    rows = _history_rows(db, enquiry.id)
    assert [(r.from_status, r.to_status) for r in rows] == [
        ("new", "cancelled"),
        ("cancelled", "ack"),
        ("ack", "completed"),
        ("completed", "confirmed"),
        ("confirmed", "cancelled"),
    ]


def test_admin_detail_has_ordered_history_and_list_has_none(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    _, headers = _admin(make_user, login_headers)
    enquiry = _insert_enquiry(db, make_user(mobile="9876543210"))
    for target in ("ack", "confirmed", "completed"):
        assert _patch(client, enquiry.id, target, headers).status_code == 200

    detail = client.get(f"{ADMIN_URL}/{enquiry.id}", headers=headers).json()
    listing = client.get(ADMIN_URL, headers=headers).json()

    history = detail["status_history"]
    assert [(h["from_status"], h["to_status"]) for h in history] == [
        ("new", "ack"),
        ("ack", "confirmed"),
        ("confirmed", "completed"),
    ]
    assert all(h["changed_by_email"] == "staff@example.com" for h in history)
    assert all({"id", "changed_at"} <= set(h) for h in history)
    assert listing["items"][0]["status_history"] is None


def test_history_email_is_null_when_staff_user_deleted(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    admin, headers = _admin(make_user, login_headers)
    second_admin = make_user(
        mobile="9000000002", email="other@example.com", role="admin", with_profile=False
    )
    second_headers = login_headers("9000000002")
    enquiry = _insert_enquiry(db, make_user(mobile="9876543210"))
    assert _patch(client, enquiry.id, "ack", second_headers).status_code == 200
    assert _patch(client, enquiry.id, "confirmed", headers).status_code == 200
    db.expire_all()
    db.delete(db.get(User, second_admin.id))
    db.commit()

    detail = client.get(f"{ADMIN_URL}/{enquiry.id}", headers=headers).json()

    assert [h["changed_by_email"] for h in detail["status_history"]] == [
        None,
        "staff@example.com",
    ]
    assert admin.id != second_admin.id


def test_admin_list_filter_accepts_new_statuses(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    _, headers = _admin(make_user, login_headers)
    customer = make_user(mobile="9876543210")
    acked = _insert_enquiry(db, customer, EnquiryStatus.ack)
    _insert_enquiry(db, customer, EnquiryStatus.completed)

    body = client.get(ADMIN_URL, params={"status": "ack"}, headers=headers).json()

    assert [i["id"] for i in body["items"]] == [acked.id]


def test_hook_called_once_with_change_and_not_for_noop(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: LoginHeaders,
    clean_hooks: None,
) -> None:
    admin, headers = _admin(make_user, login_headers)
    customer = make_user(mobile="9876543210")
    enquiry = _insert_enquiry(db, customer)
    calls: list[StatusChange] = []
    other_calls: list[StatusChange] = []
    register_status_hook(EnquiryStatus.confirmed, calls.append)
    register_status_hook(EnquiryStatus.cancelled, other_calls.append)

    assert _patch(client, enquiry.id, "confirmed", headers).status_code == 200
    assert _patch(client, enquiry.id, "confirmed", headers).status_code == 200

    assert calls == [
        StatusChange(
            enquiry_id=enquiry.id,
            user_id=customer.id,
            old_status=EnquiryStatus.new,
            new_status=EnquiryStatus.confirmed,
            changed_by_user_id=admin.id,
        )
    ]
    assert other_calls == []


def test_failing_hook_does_not_fail_the_request(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: LoginHeaders,
    clean_hooks: None,
) -> None:
    _, headers = _admin(make_user, login_headers)
    enquiry = _insert_enquiry(db, make_user(mobile="9876543210"))
    ran: list[int] = []

    def broken(change: StatusChange) -> None:
        ran.append(change.enquiry_id)
        raise RuntimeError("boom")

    register_status_hook(EnquiryStatus.ack, broken)

    response = _patch(client, enquiry.id, "ack", headers)

    assert response.status_code == 200
    assert response.json()["status"] == "ack"
    assert ran == [enquiry.id]
    assert len(_history_rows(db, enquiry.id)) == 1
