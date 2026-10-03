"""Single source of truth for role-based session timeouts (customers only; admins unchanged)."""

from datetime import timedelta

from app.config import CUSTOMER_REFRESH_GRACE_MINUTES, settings

ADMIN_ROLE = "admin"


def _role_value(role: object) -> str:
    """Accept a UserRole enum member or a plain string."""
    return str(getattr(role, "value", role))


def is_customer_role(role: object) -> bool:
    """True for every role except admin (customers are subject to session timeouts)."""
    return _role_value(role) != ADMIN_ROLE


def idle_timeout_minutes_for_role(role: object) -> int | None:
    """Idle timeout in minutes for customers; None for admins (no idle timeout)."""
    if is_customer_role(role):
        return settings.CUSTOMER_IDLE_TIMEOUT_MINUTES
    return None


def access_token_lifetime(role: object) -> timedelta:
    """Access token lifetime: the idle timeout for customers, the standard value for admins."""
    idle = idle_timeout_minutes_for_role(role)
    if idle is not None:
        return timedelta(minutes=idle)
    return timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)


def refresh_token_lifetime(role: object) -> timedelta:
    """Refresh token lifetime: idle timeout plus grace for customers, days for admins."""
    idle = idle_timeout_minutes_for_role(role)
    if idle is not None:
        return timedelta(minutes=idle + CUSTOMER_REFRESH_GRACE_MINUTES)
    return timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)


def session_max_age(role: object) -> timedelta | None:
    """Hard maximum session age for customers; None (uncapped) for admins."""
    if is_customer_role(role):
        return timedelta(hours=settings.CUSTOMER_SESSION_MAX_HOURS)
    return None
