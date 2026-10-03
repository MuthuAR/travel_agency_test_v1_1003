"""Tests for GET/PUT /profile."""

from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CustomerProfile, User

URL = "/api/v1/profile"


def update_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Updated Name",
        "gender": "male",
        "spoken_languages": ["Hindi", "English"],
        "communication_mediums": ["email"],
        "address": "99 New Road, Mumbai",
        "mobile": "9876543210",
        "email": "updated@example.com",
    }
    payload.update(overrides)
    return payload


def test_get_profile(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    response = client.get(URL, headers=login_headers("p@example.com"))
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Test User"
    assert body["gender"] == "other"
    assert body["spoken_languages"] == ["English"]
    assert body["communication_mediums"] == ["whatsapp"]
    assert body["address"] == "12 Test Street, Test City"
    assert body["mobile"] == "9876543210"
    assert body["email"] == "p@example.com"


def test_get_profile_requires_auth(client: TestClient) -> None:
    assert client.get(URL).status_code == 401


def test_get_profile_missing_profile(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(email="noprofile@example.com", with_profile=False)
    response = client.get(URL, headers=login_headers("noprofile@example.com"))
    assert response.status_code == 404


def test_update_profile(
    client: TestClient,
    db: Session,
    make_user: Callable[..., User],
    login_headers: Any,
) -> None:
    user = make_user(mobile="9876543210", email="p@example.com")
    user_id = user.id
    headers = login_headers("p@example.com")
    response = client.put(
        URL, headers=headers, json=update_payload(mobile="+91 98765-00000", email="NEW@Example.com")
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Updated Name"
    assert body["gender"] == "male"
    assert body["spoken_languages"] == ["Hindi", "English"]
    assert body["communication_mediums"] == ["email"]
    assert body["address"] == "99 New Road, Mumbai"
    assert body["mobile"] == "+919876500000"
    assert body["email"] == "new@example.com"

    db.expire_all()
    stored_user = db.get(User, user_id)
    assert stored_user is not None
    assert stored_user.mobile == "+919876500000"
    assert stored_user.email == "new@example.com"
    stored_profile = stored_user.profile
    assert isinstance(stored_profile, CustomerProfile)
    assert stored_profile.name == "Updated Name"

    # The change is visible through GET (log in again with the new email).
    again = client.get(URL, headers=login_headers("new@example.com"))
    assert again.status_code == 200
    assert again.json()["name"] == "Updated Name"


def test_update_profile_without_email(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    headers = login_headers("p@example.com")
    payload = update_payload()
    del payload["email"]
    response = client.put(URL, headers=headers, json=payload)
    assert response.status_code == 200
    assert response.json()["email"] is None


def test_update_profile_keeping_own_contact_details(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    headers = login_headers("p@example.com")
    response = client.put(URL, headers=headers, json=update_payload(email="p@example.com"))
    assert response.status_code == 200


def test_update_profile_mobile_conflict(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    make_user(mobile="9111111111", email="other@example.com")
    headers = login_headers("p@example.com")
    response = client.put(URL, headers=headers, json=update_payload(mobile="9111111111"))
    assert response.status_code == 409
    assert response.json()["detail"] == "Account already exists"


def test_update_profile_email_conflict(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    make_user(mobile="9111111111", email="other@example.com")
    headers = login_headers("p@example.com")
    response = client.put(URL, headers=headers, json=update_payload(email="other@example.com"))
    assert response.status_code == 409
    assert response.json()["detail"] == "Account already exists"


def test_update_profile_validation(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    headers = login_headers("p@example.com")
    for payload in (
        update_payload(mobile="123"),
        update_payload(email="bad"),
        update_payload(name=""),
        update_payload(spoken_languages=[]),
        update_payload(address="abc"),
        update_payload(role="admin"),
    ):
        assert client.put(URL, headers=headers, json=payload).status_code == 422, payload


def test_update_profile_requires_auth(client: TestClient) -> None:
    assert client.put(URL, json=update_payload()).status_code == 401


def test_update_profile_with_several_mediums(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    headers = login_headers("p@example.com")
    response = client.put(
        URL, headers=headers, json=update_payload(communication_mediums=["sms", "email"])
    )
    assert response.status_code == 200
    assert response.json()["communication_mediums"] == ["sms", "email"]
    assert client.get(URL, headers=headers).json()["communication_mediums"] == ["sms", "email"]


def test_update_profile_collapses_duplicate_mediums(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    headers = login_headers("p@example.com")
    response = client.put(
        URL,
        headers=headers,
        json=update_payload(communication_mediums=["email", "whatsapp", "email"]),
    )
    assert response.status_code == 200
    assert response.json()["communication_mediums"] == ["email", "whatsapp"]


def test_update_profile_rejects_bad_mediums(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    headers = login_headers("p@example.com")
    for value in ([], ["pigeon"], ["email", "carrier"], "email"):
        response = client.put(
            URL, headers=headers, json=update_payload(communication_mediums=value)
        )
        assert response.status_code == 422, value


def test_profile_shows_account_type(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    make_user(
        mobile="9123456780",
        email="o@example.com",
        account_type="organization",
        organization_name="Acme Travels",
    )
    personal = client.get(URL, headers=login_headers("p@example.com")).json()
    org = client.get(URL, headers=login_headers("o@example.com")).json()
    assert personal["account_type"] == "personal"
    assert personal["organization_name"] is None
    assert org["account_type"] == "organization"
    assert org["organization_name"] == "Acme Travels"


def test_organization_can_rename(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(
        mobile="9876543210",
        email="o@example.com",
        account_type="organization",
        organization_name="Acme Travels",
    )
    response = client.put(
        URL,
        json=update_payload(organization_name="  Globex   Tours "),
        headers=login_headers("o@example.com"),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["organization_name"] == "Globex Tours"
    assert body["account_type"] == "organization"


def test_account_type_not_editable(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(
        mobile="9876543210",
        email="o@example.com",
        account_type="organization",
        organization_name="Acme Travels",
    )
    response = client.put(
        URL,
        json=update_payload(account_type="personal", organization_name="Acme Travels"),
        headers=login_headers("o@example.com"),
    )
    assert response.status_code == 422


def test_organization_rejects_blank_or_missing_name(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(
        mobile="9876543210",
        email="o@example.com",
        account_type="organization",
        organization_name="Acme Travels",
    )
    headers = login_headers("o@example.com")
    blank = client.put(URL, json=update_payload(organization_name="   "), headers=headers)
    null = client.put(URL, json=update_payload(organization_name=None), headers=headers)
    missing = client.put(URL, json=update_payload(), headers=headers)
    assert blank.status_code == 422
    assert null.status_code == 422
    assert missing.status_code == 422
    assert client.get(URL, headers=headers).json()["organization_name"] == "Acme Travels"


def test_personal_cannot_set_organization_name(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9876543210", email="p@example.com")
    headers = login_headers("p@example.com")
    response = client.put(URL, json=update_payload(organization_name="Acme"), headers=headers)
    assert response.status_code == 422
    blank = client.put(URL, json=update_payload(organization_name=" "), headers=headers)
    assert blank.status_code == 200
    assert blank.json()["organization_name"] is None
