"""Application exceptions mapped to HTTP responses in main.py."""


class AppError(Exception):
    """Base application error."""

    status_code: int = 500
    code: str = "APP_ERROR"
    default_message: str = "An unexpected error occurred"

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    default_message = "Resource not found"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    default_message = "Resource already exists"


class UnauthorizedError(AppError):
    """Generic message on purpose: never reveal which credential was wrong."""

    status_code = 401
    code = "UNAUTHORIZED"
    default_message = "Invalid credentials"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"
    default_message = "Access denied"


class ValidationAppError(AppError):
    status_code = 400
    code = "VALIDATION_ERROR"
    default_message = "Invalid request"
