"""Auth schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.user import UserRole
from app.schemas.profile import ContactMixin, ProfileBase, ProfileOut
from app.utils.validators import validate_password_strength


class RegisterRequest(ProfileBase, ContactMixin):
    """Body of POST /auth/register."""

    password: str

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    """Body of POST /auth/login. Identifier is an email (contains @) or a mobile number."""

    model_config = ConfigDict(extra="forbid")

    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=256)


class RefreshRequest(BaseModel):
    """Body of POST /auth/refresh and /auth/logout."""

    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=1, max_length=512)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    """Current user, as returned by /auth/me."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    mobile: str
    email: str | None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class RegisterResponse(UserOut):
    """User plus profile, returned by /auth/register."""

    profile: ProfileOut | None
