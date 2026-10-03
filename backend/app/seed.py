"""Seed the admin user. Run: python -m app.seed (idempotent)."""
import logging
import os

from sqlalchemy import select

from app.auth.security import hash_password
from app.config import settings
from app.database import SessionLocal
from app.models import User, UserRole

logger = logging.getLogger(__name__)

DEFAULT_ADMIN_MOBILE = "0000000000"


def seed_admin() -> None:
    mobile = os.environ.get("ADMIN_MOBILE", DEFAULT_ADMIN_MOBILE)
    with SessionLocal() as db:
        existing = db.execute(
            select(User.id).where(User.role == UserRole.admin).limit(1)
        ).scalar_one_or_none()
        if existing is not None:
            logger.info("Admin user already exists; skipping seed.")
            return
        admin = User(
            mobile=mobile,
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        logger.info("Admin user created with email %s.", settings.ADMIN_EMAIL)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    seed_admin()
