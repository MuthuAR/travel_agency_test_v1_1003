"""Customer-only session timeouts (idle timeout, sliding refresh, hard session cap)."""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import hash_refresh_token
from app.config import CUSTOMER_REFRESH_GRACE_MINUTES, settings
from app.models import RefreshToken, User

API = "/api/v1/auth"
CUSTOMER_MOBILE = "9111111111"
ADMIN_MOBILE = "9222222222"


def _login(client: TestClient, identifier: str) -> dict[str, Any]:
    response = client.post(f"{API}/login", json={"identifier": identifier, "password": "Passw0rd1"})
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def _claims(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def _stored(db: Session, raw_token: str) -> RefreshToken:
    db.expire_all()
    return db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token))
    ).scalar_one()


def _customer(make_user: Callable[..., User]) -> User:
    return make_user(mobile=CUSTOMER_MOBILE, email="cust@example.com")


def _admin(make_user: Callable[..., User]) -> User:
    return make_user(
        mobile=ADMIN_MOBILE, email="adm@example.com", role="admin", with_profile=False
    )


def test_customer_access_token_uses_idle_timeout(
    client: TestClient, make_user: Callable[..., User]
) -> None:
    _customer(make_user)
    claims = _claims(_login(client, "cust@example.com")["access_token"])
    assert claims["exp"] - claims["iat"] == settings.CUSTOMER_IDLE_TIMEOUT_MINUTES * 60


def test_admin_access_token_keeps_standard_lifetime(
    client: TestClient, make_user: Callable[..., User]
) -> None:
    _admin(make_user)
    claims = _claims(_login(client, "adm@example.com")["access_token"])
    assert claims["exp"] - claims["iat"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def test_customer_refresh_token_expiry(
    client: TestClient, db: Session, make_user: Callable[..., User]
) -> None:
    _customer(make_user)
    tokens = _login(client, "cust@example.com")
    record = _stored(db, tokens["refresh_token"])
    expected = timedelta(minutes=settings.CUSTOMER_IDLE_TIMEOUT_MINUTES) + timedelta(
        minutes=CUSTOMER_REFRESH_GRACE_MINUTES
    )
    actual = record.expires_at - record.created_at
    assert abs(actual - expected) < timedelta(seconds=30)


def test_admin_refresh_token_expiry(
    client: TestClient, db: Session, make_user: Callable[..., User]
) -> None:
    _admin(make_user)
    tokens = _login(client, "adm@example.com")
    record = _stored(db, tokens["refresh_token"])
    actual = record.expires_at - record.created_at
    assert abs(actual - timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)) < timedelta(seconds=30)


def test_rotation_preserves_session_started_at(
    client: TestClient, db: Session, make_user: Callable[..., User]
) -> None:
    _customer(make_user)
    first = _login(client, "cust@example.com")
    old = _stored(db, first["refresh_token"])
    started = datetime.now(UTC) - timedelta(hours=1)
    old.session_started_at = started
    db.commit()

    response = client.post(f"{API}/refresh", json={"refresh_token": first["refresh_token"]})
    assert response.status_code == 200
    new = _stored(db, response.json()["refresh_token"])
    assert new.session_started_at == started


def test_customer_refresh_after_session_cap_is_rejected(
    client: TestClient, db: Session, make_user: Callable[..., User]
) -> None:
    _customer(make_user)
    tokens = _login(client, "cust@example.com")
    record = _stored(db, tokens["refresh_token"])
    record.session_started_at = datetime.now(UTC) - timedelta(
        hours=settings.CUSTOMER_SESSION_MAX_HOURS + 1
    )
    db.commit()

    response = client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 401
    assert _stored(db, tokens["refresh_token"]).revoked is True


def test_admin_refresh_is_never_capped(
    client: TestClient, db: Session, make_user: Callable[..., User]
) -> None:
    _admin(make_user)
    tokens = _login(client, "adm@example.com")
    record = _stored(db, tokens["refresh_token"])
    record.session_started_at = datetime.now(UTC) - timedelta(
        hours=settings.CUSTOMER_SESSION_MAX_HOURS + 1
    )
    db.commit()

    response = client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 200


def test_me_reports_idle_timeout(client: TestClient, make_user: Callable[..., User]) -> None:
    _customer(make_user)
    _admin(make_user)
    for identifier, expected in (
        ("cust@example.com", settings.CUSTOMER_IDLE_TIMEOUT_MINUTES),
        ("adm@example.com", None),
    ):
        token = _login(client, identifier)["access_token"]
        response = client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["idle_timeout_minutes"] == expected
