"""Shared pytest fixtures. Tests need a PostgreSQL database (ARRAY and native enum columns)."""

import os

# Environment must be set BEFORE the app (and therefore app.config) is imported.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production-use")
os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "AdminPassw0rd1")
os.environ.setdefault(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/travel_booking_test"
)

from collections.abc import Callable, Generator  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.auth.security import hash_password  # noqa: E402
from app.database import SessionLocal, engine  # noqa: E402
from app.limiter import limiter  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    Base,
    CommunicationMedium,
    CustomerProfile,
    User,
    UserRole,
)

limiter.enabled = False

DEFAULT_PASSWORD = "Passw0rd1"


@pytest.fixture(scope="session", autouse=True)
def _create_tables() -> Generator[None, None, None]:
    """Create all tables once per test session."""
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def _clean_database(_create_tables: None) -> Generator[None, None, None]:
    """Truncate every table before each test."""
    table_names = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
    with engine.begin() as connection:
        connection.execute(
            text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE")  # noqa: S608
        )
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI test client."""
    limiter.enabled = False
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """A database session for arranging and inspecting data."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def make_user(db: Session) -> Callable[..., User]:
    """Factory that inserts a user (and, by default, a profile) and returns the User row."""

    def _make_user(
        mobile: str = "9876543210",
        email: str | None = None,
        password: str = DEFAULT_PASSWORD,
        role: str = "customer",
        with_profile: bool = True,
    ) -> User:
        user = User(
            mobile=mobile,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole(role),
            is_active=True,
        )
        if with_profile:
            user.profile = CustomerProfile(
                name="Test User",
                gender="other",
                spoken_languages=["English"],
                communication_medium=CommunicationMedium.sms,
                address="12 Test Street, Test City",
            )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _make_user


@pytest.fixture
def login_headers(client: TestClient) -> Callable[..., dict[str, str]]:
    """Factory that logs in through the API and returns Authorization headers."""

    def _login_headers(identifier: str, password: str = DEFAULT_PASSWORD) -> dict[str, str]:
        response = client.post(
            "/api/v1/auth/login", json={"identifier": identifier, "password": password}
        )
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _login_headers
