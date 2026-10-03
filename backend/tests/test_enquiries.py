"""Tests for the customer enquiry endpoints."""

from collections.abc import Callable, Iterator
from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.limiter import limiter
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User

URL = "/api/v1/enquiries"


@pytest.fixture(autouse=True)
def _reset_rate_limit() -> Iterator[None]:
    """The limiter is in-memory and global; clear it so tests do not affect each other."""
    limiter.reset()
    yield
    limiter.reset()


def _payload(**overrides: Any) -> dict[str, Any]:
    start = date.today() + timedelta(days=10)
    data: dict[str, Any] = {
        "start_date": start.isoformat(),
        "end_date": (start + timedelta(days=3)).isoformat(),
        "pickup_location": "Chennai",
        "drop_location": "Madurai",
        "travel_routes": "Chennai - Trichy - Madurai",
        "adults_count": 2,
        "kids_count": 1,
        "vehicle_preference": "SUV",
        "others": "Need child seat",
    }
    data.update(overrides)
    return data


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


MakeUser = Callable[..., User]


def test_create_enquiry_success_and_persisted(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
) -> None:
    user = make_user(mobile="9876543210")
    headers = login_headers("9876543210")

    response = client.post(URL, json=_payload(pickup_location="  Chennai  "), headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "new"
    assert body["pickup_location"] == "Chennai"
    assert body["adults_count"] == 2
    assert body["kids_count"] == 1
    assert body["user_id"] == user.id

    db.expire_all()
    row = db.scalars(select(Enquiry).where(Enquiry.id == body["id"])).one()
    assert row.user_id == user.id
    assert row.status == EnquiryStatus.new
    assert row.travel_routes == "Chennai - Trichy - Madurai"


def test_create_enquiry_without_optional_others(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")
    data = _payload()
    del data["others"]

    response = client.post(URL, json=data, headers=headers)

    assert response.status_code == 201
    assert response.json()["others"] is None


def test_create_enquiry_requires_auth(client: TestClient) -> None:
    response = client.post(URL, json=_payload())
    assert response.status_code == 401


def test_list_requires_auth(client: TestClient) -> None:
    assert client.get(URL).status_code == 401
    assert client.get(f"{URL}/1").status_code == 401


def test_create_enquiry_rejects_past_start_date(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")
    yesterday = date.today() - timedelta(days=1)

    response = client.post(
        URL,
        json=_payload(start_date=yesterday.isoformat(), end_date=date.today().isoformat()),
        headers=headers,
    )

    assert response.status_code == 422


def test_create_enquiry_rejects_end_before_start(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")
    start = date.today() + timedelta(days=10)

    response = client.post(
        URL,
        json=_payload(
            start_date=start.isoformat(), end_date=(start - timedelta(days=1)).isoformat()
        ),
        headers=headers,
    )

    assert response.status_code == 422


def test_create_enquiry_allows_same_day_trip(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")
    start = date.today() + timedelta(days=5)

    response = client.post(
        URL,
        json=_payload(start_date=start.isoformat(), end_date=start.isoformat()),
        headers=headers,
    )

    assert response.status_code == 201


@pytest.mark.parametrize(
    "overrides",
    [
        {"adults_count": 0, "kids_count": 0},
        {"adults_count": -1},
        {"kids_count": -1},
        {"adults_count": 101},
        {"kids_count": 101},
        {"pickup_location": "   "},
        {"drop_location": ""},
        {"travel_routes": "x" * 2001},
        {"vehicle_preference": "v" * 101},
        {"others": "o" * 2001},
    ],
)
def test_create_enquiry_validation_failures(
    client: TestClient,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
    overrides: dict[str, Any],
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")

    response = client.post(URL, json=_payload(**overrides), headers=headers)

    assert response.status_code == 422


def test_create_enquiry_rejects_user_id_and_status_in_body(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
) -> None:
    make_user(mobile="9876543210")
    other = make_user(mobile="9123456780")
    headers = login_headers("9876543210")

    response = client.post(URL, json=_payload(user_id=other.id), headers=headers)
    assert response.status_code == 422

    response = client.post(URL, json=_payload(status="confirmed"), headers=headers)
    assert response.status_code == 422

    assert db.scalars(select(Enquiry)).all() == []


def test_list_returns_only_own_enquiries_newest_first(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
) -> None:
    user_a = make_user(mobile="9876543210")
    user_b = make_user(mobile="9123456780")
    first = _insert_enquiry(db, user_a, pickup_location="First")
    second = _insert_enquiry(db, user_a, pickup_location="Second")
    _insert_enquiry(db, user_b, pickup_location="Other")

    response = client.get(URL, headers=login_headers("9876543210"))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["page_size"] == 10
    assert [item["id"] for item in body["items"]] == [second.id, first.id]
    assert all(item["user_id"] == user_a.id for item in body["items"])


def test_list_pagination(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
) -> None:
    user = make_user(mobile="9876543210")
    ids = [_insert_enquiry(db, user, pickup_location=f"P{i}").id for i in range(5)]
    headers = login_headers("9876543210")

    page1 = client.get(URL, params={"page": 1, "page_size": 2}, headers=headers).json()
    page3 = client.get(URL, params={"page": 3, "page_size": 2}, headers=headers).json()

    assert page1["total"] == 5
    assert [item["id"] for item in page1["items"]] == [ids[4], ids[3]]
    assert [item["id"] for item in page3["items"]] == [ids[0]]


@pytest.mark.parametrize(
    "params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}, {"page": "abc"}]
)
def test_list_rejects_bad_pagination(
    client: TestClient,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
    params: dict[str, Any],
) -> None:
    make_user(mobile="9876543210")

    response = client.get(URL, params=params, headers=login_headers("9876543210"))

    assert response.status_code == 422


def test_get_own_enquiry(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
) -> None:
    user = make_user(mobile="9876543210")
    enquiry = _insert_enquiry(db, user)

    response = client.get(f"{URL}/{enquiry.id}", headers=login_headers("9876543210"))

    assert response.status_code == 200
    assert response.json()["id"] == enquiry.id


def test_other_users_enquiry_is_404_same_as_missing(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
) -> None:
    user_a = make_user(mobile="9876543210")
    make_user(mobile="9123456780")
    enquiry = _insert_enquiry(db, user_a)
    headers_b = login_headers("9123456780")

    foreign = client.get(f"{URL}/{enquiry.id}", headers=headers_b)
    missing = client.get(f"{URL}/999999", headers=headers_b)

    assert foreign.status_code == 404
    assert missing.status_code == 404
    assert foreign.json() == missing.json()


def test_history_visible_after_fresh_login(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    make_user(mobile="9876543210")
    created = client.post(URL, json=_payload(), headers=login_headers("9876543210"))
    assert created.status_code == 201

    fresh_headers = login_headers("9876543210")
    response = client.get(URL, headers=fresh_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == created.json()["id"]
