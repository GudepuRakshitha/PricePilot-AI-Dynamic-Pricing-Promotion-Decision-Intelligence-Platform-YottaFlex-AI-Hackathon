"""Competitor observation schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CompetitorObservationCreate(BaseModel):
    sku: str = Field(min_length=3, max_length=32)
    competitor: str = Field(min_length=2, max_length=128)
    competitor_sku: Optional[str] = None
    observed_price: float = Field(gt=0, le=10**9)
    observed_at: datetime
    source: str = Field(default="SCRAPING", pattern="^(SCRAPING|API|MANUAL)$")


class CompetitorObservationResponse(BaseModel):
    observation_id: str
    sku: str
    competitor: str
    competitor_sku: Optional[str] = None
    observed_price: float
    observed_at: datetime
    source: str
    is_stale: bool = False
    stale_reason: Optional[str] = None


class CompetitorListResponse(BaseModel):
    items: list[CompetitorObservationResponse]
    total: int
    skip: int = 0
    limit: int = 100
    competitors: list[str] = []


class CompetitorPosition(BaseModel):
    sku: str
    competitor: str
    observed_price: float
    observed_at: datetime
    our_price: Optional[float] = None
    deviation_pct: Optional[float] = None
    is_stale: bool
    stale_reason: Optional[str] = None
    position: str


class CompetitorPositionResponse(BaseModel):
    items: list[CompetitorPosition]
    total: int
