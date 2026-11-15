"""Pricing engine and decision schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class PricingInputs(BaseModel):
    """Inputs consumed by the deterministic pricing engine."""

    sku: str = Field(min_length=3, max_length=32)
    demand_level: str = Field(default="STABLE", pattern="^(HIGH|MEDIUM|LOW|STABLE)$")
    available_stock: int = Field(default=0, ge=0)
    competitor_price: Optional[float] = Field(default=None, gt=0)
    competitor_observed_at: Optional[datetime] = None
    promotion_id: Optional[str] = None
    min_margin_pct: float = Field(default=20.0, ge=0, le=90)
    price_floor: Optional[float] = Field(default=None, gt=0)
    price_ceiling: Optional[float] = Field(default=None, gt=0)
    current_price: Optional[float] = Field(default=None, gt=0)
    cost: Optional[float] = Field(default=None, gt=0)


class ConstraintCheck(BaseModel):
    """Individual constraint evaluation result."""

    rule_code: str
    passed: bool
    detail: str
    severity: str = "HIGH"


class PricingDecisionResponse(BaseModel):
    """Full explainable pricing decision payload."""

    decision_id: str
    sku: str
    previous_price: float
    recommended_price: float
    applied_discount: float
    cost_basis: float
    expected_margin: float
    competitor_reference: Optional[str] = None
    inventory_signal: dict[str, Any] = {}
    demand_signal: dict[str, Any] = {}
    applicable_rules: dict[str, Any] = {}
    status: str
    reason: Optional[str] = None
    exception_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DecisionCreateRequest(BaseModel):
    """Request to persist a pricing decision."""

    sku: str = Field(min_length=3, max_length=32)
    recommended_price: float = Field(gt=0)
    applied_discount: float = Field(default=0.0, ge=0, le=90)
    demand_level: str = Field(default="STABLE", pattern="^(HIGH|MEDIUM|LOW|STABLE)$")
    reason: str = Field(min_length=10, max_length=1024)
    status: str = Field(default="APPROVED", pattern="^(APPROVED|BLOCKED|PENDING|FLAGGED)$")
    created_by: Optional[str] = None


class DecisionListResponse(BaseModel):
    """Paginated decision list."""

    items: list[PricingDecisionResponse]
    total: int
    skip: int = 0
    limit: int = 50
    counts: dict[str, int] = {}


class SimulationScenario(BaseModel):
    """Alternative pricing scenario within a simulation."""

    scenario_id: str
    name: str
    demand_level: str
    available_stock: int
    competitor_price: Optional[float]
    promotion_id: Optional[str]
    candidate_price: float
    final_price: float
    discount_percent: float
    expected_margin: float
    estimated_revenue: float
    estimated_gross_profit: float
    constraints: list[ConstraintCheck]
    explanation: str
    status: str


class SimulationRequest(BaseModel):
    """Pricing simulation request."""

    sku: str = Field(min_length=3, max_length=32)
    base_price: Optional[float] = None
    cost: Optional[float] = None
    min_margin_pct: float = Field(default=20.0, ge=0, le=90)
    promotion_id: Optional[str] = None
    scenarios: Optional[list[dict]] = None


class SimulationResponse(BaseModel):
    """Pricing simulation response."""

    sku: str
    base_price: float
    cost: float
    scenarios: list[SimulationScenario]
    recommended_scenario_id: Optional[str] = None


class PriceHistoryResponse(BaseModel):
    """Historical selling price record."""

    price_id: str
    sku: str
    effective_date: date
    selling_price: float
    source: str
    change_reason: Optional[str] = None
    decision_id: Optional[str] = None
    created_at: datetime
