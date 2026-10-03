"""Reusable input validators and normalisers."""

import re

MOBILE_PATTERN = re.compile(r"^\+?[0-9]{10,15}$")
MOBILE_STRIP_PATTERN = re.compile(r"[\s\-()]")

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72


def normalize_mobile(value: str) -> str:
    """Strip spaces, dashes and parentheses; raise ValueError if not a valid number."""
    cleaned = MOBILE_STRIP_PATTERN.sub("", value)
    if not MOBILE_PATTERN.fullmatch(cleaned):
        raise ValueError("Mobile number must be 10 to 15 digits, optionally starting with +")
    return cleaned


def normalize_optional_email(value: object) -> object:
    """Trim and lowercase an email; blank strings become None. Other types pass through."""
    if isinstance(value, str):
        stripped = value.strip().lower()
        return stripped or None
    return value


def validate_password_strength(value: str) -> str:
    """Require 8-72 bytes with at least one letter and one digit."""
    if len(value.encode("utf-8")) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
    if len(value.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError(f"Password must be at most {PASSWORD_MAX_BYTES} bytes")
    if not any(ch.isalpha() for ch in value) or not any(ch.isdigit() for ch in value):
        raise ValueError("Password must contain at least one letter and one digit")
    return value
