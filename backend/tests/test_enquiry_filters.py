"""Tests for the customer filters on GET /api/v1/enquiries (business-local calendar, IST)."""

from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User

URL = "/api/v1/enquiries"

MakeUser = Callable[..., User]
LoginHeaders = Callable[..., dict[str, str]]


def _utc(year: int, month: int, day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=UTC)


def _insert(
    db: Session,
    user: User,
    created_at: datetime,
    status: EnquiryStatus = EnquiryStatus.new,
) -> Enquiry:
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
        "status": status,
        "created_at": created_at,
    }
    enquiry = Enquiry(**values)
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@pytest.fixture
def dataset(
    db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> dict[str, Any]:
    """Alice's enquiries (e1..e4, ids ascending) plus one of Bob's."""
    alice = make_user(mobile="9876543210")
    bob = make_user(mobile="9123456780")
    e1 = _insert(db, alice, _utc(2025, 10, 3, 18, 0))  # IST Oct 3 23:30
    e2 = _insert(db, alice, _utc(2025, 10, 3, 19, 0), EnquiryStatus.ack)  # IST Oct 4 00:30
    e3 = _insert(db, alice, _utc(2025, 11, 15, 10, 0), EnquiryStatus.confirmed)
    e4 = _insert(db, alice, _utc(2024, 10, 20, 10, 0))
    other = _insert(db, bob, _utc(2025, 10, 4, 10, 0))
    return {
        "headers": login_headers("9876543210"),
        "e1": e1,
        "e2": e2,
        "e3": e3,
        "e4": e4,
        "other": other,
    }


def _ids(body: dict[str, Any]) -> list[int]:
    return [item["id"] for item in body["items"]]


def test_filter_by_status(client: TestClient, dataset: dict[str, Any]) -> None:
    body = client.get(URL, params={"status": "new"}, headers=dataset["headers"]).json()

    assert _ids(body) == [dataset["e1"].id, dataset["e4"].id]
    assert body["total"] == 2


def test_filter_by_year(client: TestClient, dataset: dict[str, Any]) -> None:
    body = client.get(URL, params={"year": 2025}, headers=dataset["headers"]).json()

    assert _ids(body) == [dataset["e3"].id, dataset["e2"].id, dataset["e1"].id]
    assert body["total"] == 3


def test_filter_by_month_in_any_year(client: TestClient, dataset: dict[str, Any]) -> None:
    body = client.get(URL, params={"month": 10}, headers=dataset["headers"]).json()

    assert _ids(body) == [dataset["e2"].id, dataset["e1"].id, dataset["e4"].id]
    assert body["total"] == 3


def test_filter_by_year_and_month(client: TestClient, dataset: dict[str, Any]) -> None:
    body = client.get(URL, params={"year": 2025, "month": 10}, headers=dataset["headers"]).json()

    assert _ids(body) == [dataset["e2"].id, dataset["e1"].id]


def test_filter_by_exact_date_uses_local_calendar(
    client: TestClient, dataset: dict[str, Any]
) -> None:
    oct_3 = client.get(URL, params={"date": "2025-10-03"}, headers=dataset["headers"]).json()
    oct_4 = client.get(URL, params={"date": "2025-10-04"}, headers=dataset["headers"]).json()

    # 18:00 UTC is 23:30 IST on Oct 3; 19:00 UTC is 00:30 IST on Oct 4.
    assert _ids(oct_3) == [dataset["e1"].id]
    assert _ids(oct_4) == [dataset["e2"].id]


def test_date_overrides_year_and_month(client: TestClient, dataset: dict[str, Any]) -> None:
    body = client.get(
        URL, params={"date": "2025-10-04", "year": 2024, "month": 11}, headers=dataset["headers"]
    ).json()

    assert _ids(body) == [dataset["e2"].id]
    assert body["total"] == 1


def test_status_combines_with_year(client: TestClient, dataset: dict[str, Any]) -> None:
    body = client.get(URL, params={"status": "new", "year": 2025}, headers=dataset["headers"])

    assert _ids(body.json()) == [dataset["e1"].id]


def test_year_boundary_follows_local_calendar(
    client: TestClient, db: Session, make_user: MakeUser, login_headers: LoginHeaders
) -> None:
    user = make_user(mobile="9876543210")
    new_year = _insert(db, user, _utc(2025, 12, 31, 19, 0))  # IST 2026-01-01 00:30
    old_year = _insert(db, user, _utc(2025, 12, 31, 18, 0))  # IST 2025-12-31 23:30
    headers = login_headers("9876543210")

    in_2026 = client.get(URL, params={"year": 2026}, headers=headers).json()
    in_2025 = client.get(URL, params={"year": 2025}, headers=headers).json()
    january = client.get(URL, params={"month": 1}, headers=headers).json()

    assert _ids(in_2026) == [new_year.id]
    assert _ids(in_2025) == [old_year.id]
    assert _ids(january) == [new_year.id]


def test_enquiry_no_is_based_on_full_history_when_filtered(
    client: TestClient, dataset: dict[str, Any]
) -> None:
    body = client.get(URL, params={"year": 2024}, headers=dataset["headers"]).json()

    assert [(i["id"], i["enquiry_no"]) for i in body["items"]] == [(dataset["e4"].id, 4)]
    confirmed = client.get(URL, params={"status": "confirmed"}, headers=dataset["headers"])
    assert [i["enquiry_no"] for i in confirmed.json()["items"]] == [3]


def test_total_and_pagination_match_filtered_set(
    client: TestClient, dataset: dict[str, Any]
) -> None:
    params = {"year": 2025, "page_size": 2}
    first = client.get(URL, params={**params, "page": 1}, headers=dataset["headers"]).json()
    second = client.get(URL, params={**params, "page": 2}, headers=dataset["headers"]).json()

    assert first["total"] == 3
    assert second["total"] == 3
    assert _ids(first) == [dataset["e3"].id, dataset["e2"].id]
    assert _ids(second) == [dataset["e1"].id]
    assert second["page"] == 2
    assert second["page_size"] == 2


def test_other_users_rows_never_leak(client: TestClient, dataset: dict[str, Any]) -> None:
    unfiltered = client.get(URL, headers=dataset["headers"]).json()
    filtered = client.get(
        URL, params={"date": "2025-10-04", "status": "new"}, headers=dataset["headers"]
    ).json()

    assert dataset["other"].id not in _ids(unfiltered)
    assert unfiltered["total"] == 4
    assert filtered["items"] == []
    assert filtered["total"] == 0


def test_no_filters_returns_everything(client: TestClient, dataset: dict[str, Any]) -> None:
    body = client.get(URL, headers=dataset["headers"]).json()

    assert body["total"] == 4


@pytest.mark.parametrize(
    "params",
    [
        {"year": 1999},
        {"year": 2101},
        {"month": 0},
        {"month": 13},
        {"date": "not-a-date"},
        {"date": "2025-13-45"},
        {"status": "bogus"},
        {"status": "contacted"},
    ],
)
def test_invalid_filter_values_are_422(
    client: TestClient, dataset: dict[str, Any], params: dict[str, Any]
) -> None:
    response = client.get(URL, params=params, headers=dataset["headers"])

    assert response.status_code == 422
