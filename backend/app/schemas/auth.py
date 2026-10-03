"""Auth schemas."""

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_validator,
    model_validator,
)

from app.auth.session_policy import idle_timeout_minutes_for_role
from app.models.user import UserRole
from app.schemas.profile import AccountTypeValue, ContactMixin, ProfileBase, ProfileOut
from app.utils.validators import validate_password_strength


class RegisterRequest(ProfileBase, ContactMixin):
    """Body of POST /auth/register."""

    password: str
    account_type: AccountTypeValue = "personal"

    @model_validator(mode="after")
    def _check_organization_name(self) -> "RegisterRequest":
        if self.account_type == "organization" and self.organization_name is None:
            raise ValueError("organization_name is required for organization accounts")
        if self.account_type == "personal" and self.organization_name is not None:
            raise ValueError("organization_name is only allowed for organization accounts")
        return self

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

    @computed_field  # type: ignore[prop-decorator]
    @property
    def idle_timeout_minutes(self) -> int | None:
        """Idle timeout for customers; null for admins."""
        return idle_timeout_minutes_for_role(self.role)


class RegisterResponse(UserOut):
    """User plus profile, returned by /auth/register."""

    profile: ProfileOut | None
