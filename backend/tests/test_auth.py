"""Tests for the auth endpoints and dependencies."""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import hash_refresh_token
from app.config import settings
from app.dependencies import require_admin
from app.main import app
from app.models import CustomerProfile, RefreshToken, User

API = "/api/v1/auth"


@app.get("/__test__/admin-only")
async def _admin_only(user: User = Depends(require_admin)) -> dict[str, bool]:
    return {"ok": True}


def register_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "mobile": "9876543210",
        "email": "Jane@Example.com",
        "password": "Passw0rd1",
        "name": "Jane Doe",
        "gender": "female",
        "spoken_languages": ["English", "Tamil"],
        "communication_mediums": ["whatsapp"],
        "address": "12 Main Street, Chennai",
    }
    payload.update(overrides)
    return payload


def login(client: TestClient, identifier: str, password: str = "Passw0rd1") -> dict[str, Any]:
    response = client.post(f"{API}/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


# ---------- register ----------


def test_register_success(client: TestClient, db: Session) -> None:
    response = client.post(f"{API}/register", json=register_payload(mobile="98765 43210"))
    assert response.status_code == 201
    body = response.json()
    assert body["mobile"] == "9876543210"
    assert body["email"] == "jane@example.com"
    assert body["role"] == "customer"
    assert body["is_active"] is True
    assert "access_token" not in body
    assert "hashed_password" not in body
    assert body["profile"]["name"] == "Jane Doe"
    assert body["profile"]["spoken_languages"] == ["English", "Tamil"]
    assert body["profile"]["communication_mediums"] == ["whatsapp"]
    assert body["profile"]["mobile"] == "9876543210"

    user = db.execute(select(User).where(User.mobile == "9876543210")).scalar_one()
    assert user.hashed_password != "Passw0rd1"
    profile = db.execute(
        select(CustomerProfile).where(CustomerProfile.user_id == user.id)
    ).scalar_one()
    assert profile.gender == "female"


def test_register_without_email(client: TestClient) -> None:
    payload = register_payload()
    del payload["email"]
    response = client.post(f"{API}/register", json=payload)
    assert response.status_code == 201
    assert response.json()["email"] is None


def test_register_duplicate_mobile(client: TestClient) -> None:
    assert client.post(f"{API}/register", json=register_payload()).status_code == 201
    response = client.post(f"{API}/register", json=register_payload(email="other@example.com"))
    assert response.status_code == 409
    assert response.json()["detail"] == "Account already exists"


def test_register_duplicate_email(client: TestClient) -> None:
    assert client.post(f"{API}/register", json=register_payload()).status_code == 201
    response = client.post(f"{API}/register", json=register_payload(mobile="9123456789"))
    assert response.status_code == 409
    assert response.json()["detail"] == "Account already exists"


def test_register_duplicate_email_is_case_insensitive(client: TestClient) -> None:
    assert client.post(f"{API}/register", json=register_payload()).status_code == 201
    response = client.post(
        f"{API}/register", json=register_payload(mobile="9123456789", email="JANE@EXAMPLE.COM")
    )
    assert response.status_code == 409


def test_register_validation_errors(client: TestClient) -> None:
    bad_payloads = [
        register_payload(mobile="12345"),
        register_payload(mobile="abcdefghij"),
        register_payload(email="not-an-email"),
        register_payload(password="short1"),
        register_payload(password="allletters"),
        register_payload(password="12345678"),
        register_payload(password="a1" * 40),
        register_payload(name=""),
        register_payload(name="x" * 101),
        register_payload(address="abc"),
        register_payload(gender="unknown"),
        register_payload(communication_mediums=["pigeon"]),
        register_payload(communication_mediums=[]),
        register_payload(communication_mediums="email"),
        register_payload(communication_mediums=["sms", "email", "whatsapp", "sms"]),
        register_payload(spoken_languages=[]),
        register_payload(spoken_languages=["x" * 51]),
        register_payload(spoken_languages=["English"] * 11),
        register_payload(role="admin"),
    ]
    for payload in bad_payloads:
        response = client.post(f"{API}/register", json=payload)
        assert response.status_code == 422, payload


# ---------- login ----------


def test_login_by_email_and_mobile(client: TestClient) -> None:
    client.post(f"{API}/register", json=register_payload())
    by_email = login(client, "jane@example.com")
    by_email_upper = login(client, "JANE@example.com")
    by_mobile = login(client, "98765-43210")
    for body in (by_email, by_email_upper, by_mobile):
        assert body["token_type"] == "bearer"
        assert body["access_token"]
        assert body["refresh_token"]


def test_login_failures_are_identical(client: TestClient) -> None:
    client.post(f"{API}/register", json=register_payload())
    wrong_password = client.post(
        f"{API}/login", json={"identifier": "jane@example.com", "password": "Wrong1234"}
    )
    unknown_user = client.post(
        f"{API}/login", json={"identifier": "nobody@example.com", "password": "Passw0rd1"}
    )
    unknown_mobile = client.post(
        f"{API}/login", json={"identifier": "9000000000", "password": "Passw0rd1"}
    )
    assert wrong_password.status_code == 401
    assert unknown_user.status_code == 401
    assert unknown_mobile.status_code == 401
    assert wrong_password.json() == unknown_user.json() == unknown_mobile.json()
    assert wrong_password.json()["detail"] == "Invalid credentials"


def test_login_inactive_user(
    client: TestClient, db: Session, make_user: Callable[..., User]
) -> None:
    user = make_user(email="inactive@example.com")
    user.is_active = False
    db.commit()
    response = client.post(
        f"{API}/login", json={"identifier": "inactive@example.com", "password": "Passw0rd1"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_access_token_claims(client: TestClient) -> None:
    client.post(f"{API}/register", json=register_payload())
    tokens = login(client, "jane@example.com")
    claims = jwt.decode(
        tokens["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
    )
    assert claims["type"] == "access"
    assert claims["role"] == "customer"
    assert claims["sub"].isdigit()
    assert "exp" in claims
    assert "iat" in claims


def test_refresh_token_stored_hashed(client: TestClient, db: Session) -> None:
    client.post(f"{API}/register", json=register_payload())
    tokens = login(client, "jane@example.com")
    stored = db.execute(select(RefreshToken)).scalar_one()
    assert stored.token_hash == hash_refresh_token(tokens["refresh_token"])
    assert stored.token_hash != tokens["refresh_token"]


# ---------- refresh ----------


def test_refresh_rotation(client: TestClient) -> None:
    client.post(f"{API}/register", json=register_payload())
    first = login(client, "jane@example.com")
    response = client.post(f"{API}/refresh", json={"refresh_token": first["refresh_token"]})
    assert response.status_code == 200
    second = response.json()
    assert second["refresh_token"] != first["refresh_token"]
    assert second["token_type"] == "bearer"

    # The old token is revoked and cannot be reused.
    reuse = client.post(f"{API}/refresh", json={"refresh_token": first["refresh_token"]})
    assert reuse.status_code == 401

    # The new token works.
    again = client.post(f"{API}/refresh", json={"refresh_token": second["refresh_token"]})
    assert again.status_code == 200


def test_refresh_unknown_token(client: TestClient) -> None:
    response = client.post(f"{API}/refresh", json={"refresh_token": "does-not-exist"})
    assert response.status_code == 401


def test_refresh_expired_token(client: TestClient, db: Session) -> None:
    client.post(f"{API}/register", json=register_payload())
    tokens = login(client, "jane@example.com")
    stored = db.execute(select(RefreshToken)).scalar_one()
    stored.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.commit()
    response = client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 401


def test_refresh_rejects_access_token(client: TestClient) -> None:
    client.post(f"{API}/register", json=register_payload())
    tokens = login(client, "jane@example.com")
    response = client.post(f"{API}/refresh", json={"refresh_token": tokens["access_token"]})
    assert response.status_code == 401


# ---------- logout ----------


def test_logout_revokes_token(client: TestClient) -> None:
    client.post(f"{API}/register", json=register_payload())
    tokens = login(client, "jane@example.com")
    response = client.post(f"{API}/logout", json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 204
    assert response.content == b""
    refreshed = client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refreshed.status_code == 401


def test_logout_is_idempotent(client: TestClient) -> None:
    client.post(f"{API}/register", json=register_payload())
    tokens = login(client, "jane@example.com")
    for _ in range(2):
        response = client.post(f"{API}/logout", json={"refresh_token": tokens["refresh_token"]})
        assert response.status_code == 204
    unknown = client.post(f"{API}/logout", json={"refresh_token": "never-existed"})
    assert unknown.status_code == 204


# ---------- me / protected ----------


def test_me(client: TestClient, make_user: Callable[..., User], login_headers: Any) -> None:
    make_user(mobile="9111111111", email="me@example.com")
    response = client.get(f"{API}/me", headers=login_headers("me@example.com"))
    assert response.status_code == 200
    body = response.json()
    assert body["mobile"] == "9111111111"
    assert body["email"] == "me@example.com"
    assert body["role"] == "customer"
    assert body["is_active"] is True
    assert "hashed_password" not in body


def test_protected_endpoints_without_token(client: TestClient) -> None:
    assert client.get(f"{API}/me").status_code == 401
    assert client.get("/api/v1/profile").status_code == 401
    assert client.put("/api/v1/profile", json={}).status_code == 401


def test_invalid_token_rejected(client: TestClient) -> None:
    response = client.get(f"{API}/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert response.status_code == 401


def test_expired_token_rejected(client: TestClient, make_user: Callable[..., User]) -> None:
    user = make_user()
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(user.id),
            "role": "customer",
            "type": "access",
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    response = client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_non_access_token_type_rejected(
    client: TestClient, make_user: Callable[..., User]
) -> None:
    user = make_user()
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(user.id),
            "role": "customer",
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    response = client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_token_for_inactive_user_rejected(
    client: TestClient, db: Session, make_user: Callable[..., User], login_headers: Any
) -> None:
    user = make_user(email="gone@example.com")
    headers = login_headers("gone@example.com")
    user.is_active = False
    db.commit()
    assert client.get(f"{API}/me", headers=headers).status_code == 401


# ---------- require_admin ----------


def test_require_admin_forbids_customer(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(mobile="9222222222", email="cust@example.com")
    response = client.get("/__test__/admin-only", headers=login_headers("cust@example.com"))
    assert response.status_code == 403


def test_require_admin_allows_admin(
    client: TestClient, make_user: Callable[..., User], login_headers: Any
) -> None:
    make_user(
        mobile="9333333333",
        email="boss@example.com",
        role="admin",
        with_profile=False,
    )
    response = client.get("/__test__/admin-only", headers=login_headers("boss@example.com"))
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_require_admin_without_token(client: TestClient) -> None:
    assert client.get("/__test__/admin-only").status_code == 401


def test_register_with_several_mediums_dedupes_in_order(client: TestClient, db: Session) -> None:
    response = client.post(
        f"{API}/register",
        json=register_payload(communication_mediums=["email", "sms", "email", "whatsapp"]),
    )
    assert response.status_code == 201
    assert response.json()["profile"]["communication_mediums"] == ["email", "sms", "whatsapp"]

    profile = db.execute(select(CustomerProfile)).scalar_one()
    assert list(profile.communication_mediums) == ["email", "sms", "whatsapp"]


def test_register_collapses_duplicate_mediums(client: TestClient) -> None:
    response = client.post(
        f"{API}/register", json=register_payload(communication_mediums=["sms", "sms"])
    )
    assert response.status_code == 201
    assert response.json()["profile"]["communication_mediums"] == ["sms"]


def test_register_rejects_empty_or_old_medium_field(client: TestClient) -> None:
    empty = client.post(f"{API}/register", json=register_payload(communication_mediums=[]))
    assert empty.status_code == 422
    payload = register_payload()
    payload["communication_medium"] = payload.pop("communication_mediums")[0]
    assert client.post(f"{API}/register", json=payload).status_code == 422
