"""Shared application exceptions with stable error codes."""

from __future__ import annotations


class PricePilotError(Exception):
    """Base application error."""

    def __init__(self, message: str, error_code: str = "INTERNAL_ERROR", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code


class ValidationError(PricePilotError):
    def __init__(self, message: str, error_code: str = "VALIDATION_ERROR", status_code: int = 422):
        super().__init__(message, error_code, status_code)


class NotFoundError(PricePilotError):
    def __init__(self, message: str, error_code: str = "NOT_FOUND", status_code: int = 404):
        super().__init__(message, error_code, status_code)


class ConflictError(PricePilotError):
    def __init__(self, message: str, error_code: str = "CONFLICT", status_code: int = 409):
        super().__init__(message, error_code, status_code)


class PricingBlockedError(PricePilotError):
    """Raised when a pricing decision violates a hard business rule."""

    def __init__(
        self,
        message: str,
        error_code: str = "PRICING_BLOCKED",
        status_code: int = 422,
    ):
        super().__init__(message, error_code, status_code)
