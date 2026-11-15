"""Inventory schemas."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class InventoryCreate(BaseModel):
    sku: str = Field(min_length=3, max_length=32)
    snapshot_date: date
    quantity_available: int = Field(ge=0)
    reserved_quantity: int = Field(default=0, ge=0)
    reorder_point: int = Field(default=0, ge=0)


class InventoryResponse(BaseModel):
    snapshot_id: str
    sku: str
    snapshot_date: date
    quantity_available: int
    reserved_quantity: int
    reorder_point: int
    stockout_risk: bool
    created_at: datetime
    updated_at: datetime


class InventoryListResponse(BaseModel):
    items: list[InventoryResponse]
    total: int
    latest_by_sku: dict[str, dict] = {}
