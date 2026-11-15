"""Exception schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ExceptionCreate(BaseModel):
    """Exception creation payload for injected or detected issues."""

    decision_id: str | None = None
    issue_type: str = Field(pattern="^(PRICE_BELOW_FLOOR|PROMOTION_STACK_VIOLATION|STALE_COMPETITOR_OBSERVATION|INCORRECT_MARGIN_CALCULATION|MISSING_PRICE_CHANGE_REASON|OTHER)$")
    severity: str = Field(default="MEDIUM", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    sku: str = Field(min_length=3, max_length=32)
    description: str = Field(min_length=10, max_length=1024)
    expected_behavior: str = Field(min_length=5, max_length=1024)
    actual_behavior: str = Field(min_length=5, max_length=1024)
    resolution_status: str = Field(default="OPEN", pattern="^(OPEN|ACKNOWLEDGED|RESOLVED)$")


class ExceptionResponse(BaseModel):
    """Exception record."""

    exception_id: str
    decision_id: str | None
    issue_type: str
    severity: str
    sku: str
    description: str
    expected_behavior: str
    actual_behavior: str
    resolution_status: str
    detected_at: datetime
    resolved_at: datetime | None
    resolved_by: str | None
    resolution_notes: str | None


class ExceptionListResponse(BaseModel):
    """Paginated exception list."""

    items: list[ExceptionResponse]
    total: int
    skip: int = 0
    limit: int = 50
    counts: dict[str, int] = {}


class ExceptionResolveRequest(BaseModel):
    """Resolve or acknowledge an exception with documented notes."""

    resolution_status: str = Field(pattern="^(ACKNOWLEDGED|RESOLVED|DISMISSED)$")
    resolution_notes: str = Field(min_length=5, max_length=1024)
    resolved_by: str | None = None
