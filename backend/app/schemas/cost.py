"""Cost history schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class CostCreate(BaseModel):
    sku: str = Field(min_length=3, max_length=32)
    effective_date: date
    cost_amount: float = Field(gt=0, le=10**9)
    source: str = Field(default="MANUAL", pattern="^(BASELINE|MANUAL|MARKUP_CHANGE)$")
    change_reason: Optional[str] = None


class CostResponse(BaseModel):
    cost_id: str
    sku: str
    effective_date: date
    cost_amount: float
    source: str
    change_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CostListResponse(BaseModel):
    items: list[CostResponse]
    total: int
    current_cost_by_sku: dict[str, float] = {}
