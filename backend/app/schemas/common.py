"""Shared API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    error: str
    code: str
    message: str
    details: Optional[dict[str, Any]] = None


class AuditLogResponse(BaseModel):
    """Audit log entry."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_type: str
    entity_id: str
    action: str
    actor: str
    details: dict[str, Any]
    created_at: datetime


class AuditListResponse(BaseModel):
    """Paginated audit log list."""

    items: list[AuditLogResponse]
    total: int
    skip: int = 0
    limit: int = 100


class HealthResponse(BaseModel):
    """Service health payload."""

    status: str
    environment: str
    database: str
    version: str


class MessageResponse(BaseModel):
    """Generic action response."""

    message: str
    entity_id: Optional[str] = None


class UserResponse(BaseModel):
    """Application user."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserCreateRequest(BaseModel):
    """Create an application user."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    role: str = Field(default="ANALYST", pattern="^(ADMIN|PRICING_MANAGER|ANALYST)$")


class UserListResponse(BaseModel):
    """User list envelope."""

    items: list[UserResponse]
    total: int


class StatusCounts(BaseModel):
    """Generic status distribution payload."""

    counts: dict[str, int] = {}
