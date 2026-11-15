"""Promotion schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class PromotionCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    code: str = Field(min_length=3, max_length=64)
    discount_type: str = Field(default="PERCENTAGE", pattern="^(PERCENTAGE|FIXED_AMOUNT)$")
    discount_value: float = Field(gt=0, le=90)
    min_purchase_value: float = Field(default=0, ge=0)
    applicable_categories: list[str] = Field(default_factory=list)
    applicable_brands: list[str] = Field(default_factory=list)
    coupon_exclusions: list[str] = Field(default_factory=list)
    stacking_allowed: bool = True
    max_discount_percent: float = Field(default=90, le=100)
    start_date: date
    end_date: date
    status: str = Field(default="SCHEDULED", pattern="^(ACTIVE|INACTIVE|SCHEDULED|EXPIRED)$")


class PromotionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_purchase_value: Optional[float] = None
    applicable_categories: Optional[list[str]] = None
    applicable_brands: Optional[list[str]] = None
    coupon_exclusions: Optional[list[str]] = None
    stacking_allowed: Optional[bool] = None
    max_discount_percent: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


class PromotionResponse(BaseModel):
    promotion_id: str
    name: str
    code: str
    discount_type: str
    discount_value: float
    min_purchase_value: float
    applicable_categories: list[str]
    applicable_brands: list[str]
    coupon_exclusions: list[str]
    stacking_allowed: bool
    max_discount_percent: float
    start_date: date
    end_date: date
    status: str
    created_at: datetime
    updated_at: datetime


class PromotionEligibilityRequest(BaseModel):
    """Promotion eligibility check request."""

    sku: str = Field(min_length=3, max_length=32)
    promotion_id: str
    quantity: int = Field(default=1, ge=1)
    customer_total_value: float = Field(default=0, ge=0)


class PromotionEligibilityResponse(BaseModel):
    """Promotion eligibility and computed discount."""

    promotion_id: str
    sku: str
    eligible: bool
    reason: str
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    final_price: float = 0.0
    min_purchase_value: float = 0.0
    stacking_conflicts: list[str] = []


class PromotionListResponse(BaseModel):
    """Paginated promotion list."""

    items: list[PromotionResponse]
    total: int
    skip: int = 0
    limit: int = 50
    counts: dict[str, int] = {}
