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


def test_enquiry_no_is_per_user_sequence(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
) -> None:
    user_a = make_user(mobile="9876543210")
    make_user(mobile="9123456780")
    _insert_enquiry(db, user_a)
    _insert_enquiry(db, user_a)
    headers_a = login_headers("9876543210")
    headers_b = login_headers("9123456780")

    third = client.post(URL, json=_payload(), headers=headers_a)
    first_b = client.post(URL, json=_payload(), headers=headers_b)
    second_b = client.post(URL, json=_payload(), headers=headers_b)

    assert third.status_code == 201
    assert third.json()["enquiry_no"] == 3
    assert third.json()["id"] == 3
    assert first_b.json()["enquiry_no"] == 1
    assert first_b.json()["id"] == 4
    assert second_b.json()["enquiry_no"] == 2


def test_first_and_second_enquiry_numbers_on_create(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")

    first = client.post(URL, json=_payload(), headers=headers).json()
    second = client.post(URL, json=_payload(), headers=headers).json()

    assert first["enquiry_no"] == 1
    assert second["enquiry_no"] == 2


def test_enquiry_no_list_and_detail_agree_and_ids_stay_global(
    client: TestClient,
    db: Session,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
) -> None:
    user_a = make_user(mobile="9876543210")
    user_b = make_user(mobile="9123456780")
    _insert_enquiry(db, user_a)
    b1 = _insert_enquiry(db, user_b)
    _insert_enquiry(db, user_a)
    b2 = _insert_enquiry(db, user_b)
    headers_b = login_headers("9123456780")

    body = client.get(URL, headers=headers_b).json()

    assert [(i["id"], i["enquiry_no"]) for i in body["items"]] == [(b2.id, 2), (b1.id, 1)]
    for item in body["items"]:
        detail = client.get(f"{URL}/{item['id']}", headers=headers_b).json()
        assert detail["id"] == item["id"]
        assert detail["enquiry_no"] == item["enquiry_no"]
    assert b1.id != 1 and b2.id != 2

    page2 = client.get(URL, params={"page": 2, "page_size": 1}, headers=headers_b).json()
    assert [(i["id"], i["enquiry_no"]) for i in page2["items"]] == [(b1.id, 1)]


# ---------- organization enquiries with passengers ----------


def _person(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "name": "  Ravi   Kumar ",
        "mobile": "98765 00001",
        "gender": "male",
        "spoken_languages": ["English", " Tamil ", "English"],
        "communication_mediums": ["sms", "whatsapp", "sms"],
    }
    data.update(overrides)
    return data


def _org_payload(**overrides: Any) -> dict[str, Any]:
    data = _payload(passengers=[_person()])
    del data["adults_count"]
    del data["kids_count"]
    data.update(overrides)
    return data


def _org_headers(
    make_user: MakeUser, login_headers: Callable[..., dict[str, str]], mobile: str = "9111111111"
) -> dict[str, str]:
    make_user(mobile=mobile, account_type="organization", organization_name="Acme Travels")
    return login_headers(mobile)


def test_org_enquiry_with_one_passenger(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    headers = _org_headers(make_user, login_headers)

    response = client.post(URL, json=_org_payload(), headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["adults_count"] == 1
    assert body["kids_count"] == 0
    assert body["additional_travellers_count"] == 0
    assert len(body["passengers"]) == 1
    passenger = body["passengers"][0]
    assert passenger["position"] == 1
    assert passenger["name"] == "Ravi Kumar"
    assert passenger["mobile"] == "9876500001"
    assert passenger["gender"] == "male"
    assert passenger["spoken_languages"] == ["English", "Tamil"]
    assert passenger["communication_mediums"] == ["sms", "whatsapp"]


def test_org_enquiry_with_several_passengers_and_additional(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    headers = _org_headers(make_user, login_headers)
    people = [
        _person(name="Zed", mobile="9000000003"),
        _person(name="Amy", mobile="9000000001", gender="female"),
        _person(name="Moe", mobile="9000000002", gender="other"),
    ]

    created = client.post(
        URL,
        json=_org_payload(passengers=people, additional_travellers_count=4),
        headers=headers,
    )

    assert created.status_code == 201
    body = created.json()
    assert body["adults_count"] == 7
    assert body["kids_count"] == 0
    assert body["additional_travellers_count"] == 4
    assert [p["name"] for p in body["passengers"]] == ["Zed", "Amy", "Moe"]
    assert [p["position"] for p in body["passengers"]] == [1, 2, 3]
    detail = client.get(f"{URL}/{body['id']}", headers=headers).json()
    assert [p["name"] for p in detail["passengers"]] == ["Zed", "Amy", "Moe"]
    listed = client.get(URL, headers=headers).json()["items"][0]
    assert [p["name"] for p in listed["passengers"]] == ["Zed", "Amy", "Moe"]
    assert listed["additional_travellers_count"] == 4


def test_org_enquiry_accepts_exactly_100_travellers(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    headers = _org_headers(make_user, login_headers)
    response = client.post(
        URL, json=_org_payload(additional_travellers_count=99), headers=headers
    )
    assert response.status_code == 201
    assert response.json()["adults_count"] == 100


@pytest.mark.parametrize(
    "overrides",
    [
        {"passengers": None},
        {"passengers": []},
        {"adults_count": 2},
        {"kids_count": 1},
        {"additional_travellers_count": 100},
        {"additional_travellers_count": 101},
        {"additional_travellers_count": -1},
        {"passengers": [_person(mobile=f"90000{i:05d}") for i in range(51)]},
        {"passengers": [_person(mobile="123")]},
        {"passengers": [_person(spoken_languages=[])]},
        {"passengers": [_person(communication_mediums=[])]},
        {"passengers": [_person(gender="unknown")]},
        {"passengers": [_person(name="   ")]},
        {"passengers": [_person(extra="x")]},
    ],
)
def test_org_enquiry_validation_failures(
    client: TestClient,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
    overrides: dict[str, Any],
) -> None:
    headers = _org_headers(make_user, login_headers)

    response = client.post(URL, json=_org_payload(**overrides), headers=headers)

    assert response.status_code == 422


def test_org_enquiry_without_passengers_key_is_422(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    headers = _org_headers(make_user, login_headers)
    data = _org_payload()
    del data["passengers"]
    assert client.post(URL, json=data, headers=headers).status_code == 422


def test_org_total_over_100_is_422(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    headers = _org_headers(make_user, login_headers)
    people = [_person(mobile=f"90000{i:05d}") for i in range(2)]
    response = client.post(
        URL,
        json=_org_payload(passengers=people, additional_travellers_count=99),
        headers=headers,
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "overrides",
    [{"passengers": [_person()]}, {"additional_travellers_count": 2}],
)
def test_personal_enquiry_rejects_passengers_and_additional(
    client: TestClient,
    make_user: MakeUser,
    login_headers: Callable[..., dict[str, str]],
    overrides: dict[str, Any],
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")

    response = client.post(URL, json=_payload(**overrides), headers=headers)

    assert response.status_code == 422


def test_personal_enquiry_requires_adults_count(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")
    data = _payload()
    del data["adults_count"]
    assert client.post(URL, json=data, headers=headers).status_code == 422


def test_personal_enquiry_has_empty_passengers(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    make_user(mobile="9876543210")
    headers = login_headers("9876543210")

    created = client.post(URL, json=_payload(), headers=headers).json()
    detail = client.get(f"{URL}/{created['id']}", headers=headers).json()

    assert created["passengers"] == []
    assert created["additional_travellers_count"] == 0
    assert detail["passengers"] == []
    assert detail["adults_count"] == 2
    assert detail["kids_count"] == 1


def test_org_passengers_visible_to_owner_only(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    headers = _org_headers(make_user, login_headers)
    make_user(mobile="9123456780")
    other = login_headers("9123456780")
    created = client.post(URL, json=_org_payload(), headers=headers).json()

    assert client.get(f"{URL}/{created['id']}", headers=headers).json()["passengers"]
    assert client.get(f"{URL}/{created['id']}", headers=other).status_code == 404
    assert client.get(URL, headers=other).json()["items"] == []


def test_org_enquiry_numbers_stay_per_user(
    client: TestClient, make_user: MakeUser, login_headers: Callable[..., dict[str, str]]
) -> None:
    headers = _org_headers(make_user, login_headers)
    first = client.post(URL, json=_org_payload(), headers=headers).json()
    second = client.post(URL, json=_org_payload(), headers=headers).json()
    assert (first["enquiry_no"], second["enquiry_no"]) == (1, 2)
