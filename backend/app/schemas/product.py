"""Product schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    sku: str = Field(min_length=3, max_length=32)
    name: str = Field(min_length=2, max_length=255)
    category: str = Field(min_length=2, max_length=128)
    brand: str = Field(min_length=2, max_length=128)
    lifecycle_state: str = Field(default="ACTIVE", pattern="^(ACTIVE|RETIRED|PLANNED)$")
    description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    category: Optional[str] = None
    brand: Optional[str] = None
    lifecycle_state: Optional[str] = Field(default=None, pattern="^(ACTIVE|RETIRED|PLANNED)$")
    description: Optional[str] = None


class ProductResponse(BaseModel):
    sku: str
    name: str
    category: str
    brand: str
    lifecycle_state: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    skip: int = 0
    limit: int = 100


class ProductFacets(BaseModel):
    categories: list[str]
    brands: list[str]


class ProductOverviewResponse(BaseModel):
    """Cross-domain snapshot for the product detail drawer."""

    product: ProductResponse
    current_cost: Optional[float] = None
    current_price: Optional[float] = None
    price_floor: Optional[float] = None
    price_ceiling: Optional[float] = None
    margin_pct: Optional[float] = None
    inventory: Optional[dict] = None
    latest_competitor: Optional[dict] = None
    active_promotions: list[dict] = []
    recent_price_history: list[dict] = []
    recent_decisions: list[dict] = []
