"""Password hashing using bcrypt directly."""

import logging

import bcrypt

logger = logging.getLogger(__name__)

BCRYPT_MAX_BYTES = 72


def _to_bytes(password: str) -> bytes:
    """Encode and truncate to bcrypt's 72-byte limit explicitly (newer bcrypt raises instead)."""
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    """Return a salted bcrypt hash of the password."""
    return bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Check a password against a bcrypt hash; malformed hashes verify as False."""
    try:
        return bcrypt.checkpw(_to_bytes(plain), hashed.encode("utf-8"))
    except ValueError:
        logger.warning("Password verification failed: malformed hash")
        return False
