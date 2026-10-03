"""Application settings loaded from environment variables."""

from typing import Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

MIN_SECRET_KEY_LENGTH = 32


class Settings(BaseSettings):
    """Runtime configuration. DATABASE_URL and SECRET_KEY must come from the environment."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "production"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:5173"
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    ADMIN_MOBILE: str = "0000000000"

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Force the psycopg2 driver for plain postgresql:// or postgres:// URLs."""
        if value.startswith("postgresql://"):
            return "postgresql+psycopg2://" + value[len("postgresql://") :]
        if value.startswith("postgres://"):
            return "postgresql+psycopg2://" + value[len("postgres://") :]
        return value

    @model_validator(mode="after")
    def validate_secret_key(self) -> Self:
        """Reject weak secrets outside the test environment."""
        if self.ENVIRONMENT != "test" and len(self.SECRET_KEY) < MIN_SECRET_KEY_LENGTH:
            raise ValueError(f"SECRET_KEY must be at least {MIN_SECRET_KEY_LENGTH} characters")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS_ORIGINS parsed into a list; wildcard entries are dropped."""
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        return [o for o in origins if o != "*"]


settings = Settings()  # type: ignore[call-arg]
