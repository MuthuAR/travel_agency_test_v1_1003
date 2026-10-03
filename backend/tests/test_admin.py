"""Tests for the read-only admin enquiry endpoints."""

from collections.abc import Callable
from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User

LIST_URL = "/api/v1/admin/enquiries"

MakeUser = Callable[..., User]
LoginHeaders = Callable[..., dict[str, str]]


def _insert_enquiry(db: Session, user: User, **overrides: Any) -> Enquiry:
    start = date.today() + timedelta(days=10)
    values: dict[str, Any] = {
        "user_id": user.id,
        "start_date": start,
        "end_date": start + timedelta(days=2),
        "pickup_location": "Coimbatore",
        "drop_location": "Ooty",
        "travel_routes": "Coimbatore - Ooty",
        "adults_count": 2,
        "kids_count": 0,
        "vehicle_preference": "Sedan",
        "others": None,
        "status": EnquiryStatus.new,
    }
    values.update(overrides)
    enquiry = Enquiry(**values)
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry


def _admin_headers(make_user: MakeUser, login_headers: LoginHeaders) -> dict[str, str]:
    make_user(mobile="9000000001", role="admin", with_profile=False)
    return login_headers("9000000001")


def test_admin_lists_all_enquiries_with_customer_details(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)
    alice = make_user(mobile="9876543210", email="alice@example.com")
    bob = make_user(mobile="9123456780")
    first = _insert_enquiry(db, alice)
    second = _insert_enquiry(db, bob)

    response = client.get(LIST_URL, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["page_size"] == 10
    assert [item["id"] for item in body["items"]] == [second.id, first.id]
    by_id = {item["id"]: item for item in body["items"]}
    customer = by_id[first.id]["customer"]
    assert customer["user_id"] == alice.id
    assert customer["mobile"] == "9876543210"
    assert customer["email"] == "alice@example.com"
    assert customer["name"] == alice.profile.name
    for key in ("gender", "spoken_languages", "communication_medium", "address"):
        assert key in customer
    assert by_id[second.id]["customer"]["mobile"] == "9123456780"


def test_admin_pagination(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)
    user = make_user(mobile="9876543210")
    ids = [_insert_enquiry(db, user, pickup_location=f"P{i}").id for i in range(5)]

    body = client.get(LIST_URL, params={"page": 2, "page_size": 2}, headers=headers).json()

    assert body["total"] == 5
    assert body["page"] == 2
    assert body["page_size"] == 2
    assert [item["id"] for item in body["items"]] == [ids[2], ids[1]]


def test_admin_filter_by_status(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)
    user = make_user(mobile="9876543210")
    _insert_enquiry(db, user)
    confirmed = _insert_enquiry(db, user, status=EnquiryStatus.confirmed)

    body = client.get(LIST_URL, params={"status": "confirmed"}, headers=headers).json()

    assert body["total"] == 1
    assert body["items"][0]["id"] == confirmed.id
    assert body["items"][0]["status"] == "confirmed"


def test_admin_rejects_unknown_status_filter(
    client: TestClient, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)

    response = client.get(LIST_URL, params={"status": "bogus"}, headers=headers)

    assert response.status_code == 422


def test_admin_filter_by_start_date_range(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)
    user = make_user(mobile="9876543210")
    today = date.today()
    early = _insert_enquiry(
        db, user, start_date=today + timedelta(days=2), end_date=today + timedelta(days=3)
    )
    mid = _insert_enquiry(
        db, user, start_date=today + timedelta(days=20), end_date=today + timedelta(days=21)
    )
    late = _insert_enquiry(
        db, user, start_date=today + timedelta(days=40), end_date=today + timedelta(days=41)
    )

    only_mid = client.get(
        LIST_URL,
        params={
            "start_date_from": (today + timedelta(days=10)).isoformat(),
            "start_date_to": (today + timedelta(days=30)).isoformat(),
        },
        headers=headers,
    ).json()
    from_only = client.get(
        LIST_URL,
        params={"start_date_from": (today + timedelta(days=20)).isoformat()},
        headers=headers,
    ).json()
    to_only = client.get(
        LIST_URL,
        params={"start_date_to": (today + timedelta(days=20)).isoformat()},
        headers=headers,
    ).json()

    assert [item["id"] for item in only_mid["items"]] == [mid.id]
    assert {item["id"] for item in from_only["items"]} == {mid.id, late.id}
    assert {item["id"] for item in to_only["items"]} == {early.id, mid.id}


def test_admin_search_by_mobile_email_and_name_case_insensitive(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)
    alice = make_user(mobile="9876543210", email="Alice.Search@example.com")
    bob = make_user(mobile="9123456780", email="bob@example.com")
    alice_enquiry = _insert_enquiry(db, alice)
    bob_enquiry = _insert_enquiry(db, bob)

    by_mobile = client.get(LIST_URL, params={"search": "987654"}, headers=headers).json()
    by_email = client.get(LIST_URL, params={"search": "ALICE.SEARCH"}, headers=headers).json()
    by_name = client.get(
        LIST_URL, params={"search": alice.profile.name.upper()}, headers=headers
    ).json()

    assert [item["id"] for item in by_mobile["items"]] == [alice_enquiry.id]
    assert [item["id"] for item in by_email["items"]] == [alice_enquiry.id]
    assert alice_enquiry.id in {item["id"] for item in by_name["items"]}
    assert by_mobile["total"] == 1
    assert bob_enquiry.id not in {item["id"] for item in by_mobile["items"]}


def test_admin_search_escapes_like_wildcards(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)
    user = make_user(mobile="9876543210", email="alice@example.com")
    _insert_enquiry(db, user)

    percent = client.get(LIST_URL, params={"search": "%"}, headers=headers).json()
    underscore = client.get(LIST_URL, params={"search": "_"}, headers=headers).json()

    assert percent["total"] == 0
    assert underscore["total"] == 0


def test_admin_get_single_enquiry(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)
    user = make_user(mobile="9876543210")
    enquiry = _insert_enquiry(db, user)

    response = client.get(f"{LIST_URL}/{enquiry.id}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == enquiry.id
    assert body["customer"]["user_id"] == user.id
    assert body["customer"]["mobile"] == "9876543210"


def test_admin_get_missing_enquiry_is_404(
    client: TestClient, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    headers = _admin_headers(make_user, login_headers)

    assert client.get(f"{LIST_URL}/999999", headers=headers).status_code == 404


def test_customer_is_forbidden_from_admin(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    user = make_user(mobile="9876543210")
    enquiry = _insert_enquiry(db, user)
    headers = login_headers("9876543210")

    assert client.get(LIST_URL, headers=headers).status_code == 403
    assert client.get(f"{LIST_URL}/{enquiry.id}", headers=headers).status_code == 403


def test_anonymous_is_unauthorized_for_admin(client: TestClient) -> None:
    assert client.get(LIST_URL).status_code == 401
    assert client.get(f"{LIST_URL}/1").status_code == 401


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
def test_admin_has_no_write_endpoints(
    client: TestClient, make_user: MakeUser, login_headers: LoginHeaders, method: str
) -> None:
    headers = _admin_headers(make_user, login_headers)

    response = getattr(client, method)(LIST_URL, headers=headers)

    assert response.status_code in (404, 405)
