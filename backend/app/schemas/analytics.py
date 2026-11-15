"""Analytics and reporting schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class DashboardMetrics(BaseModel):
    """Executive dashboard KPI bundle."""

    total_products: int
    active_promotions: int
    pricing_decisions: int
    decisions_approved: int
    decisions_blocked: int
    average_profit_margin: float
    revenue: float
    gross_profit: float
    inventory_value: float
    competitor_price_deviations: int
    open_exceptions: int


class TrendPoint(BaseModel):
    """Time series point."""

    date: date
    revenue: float
    gross_profit: float
    gross_margin_pct: float
    orders: int
    avg_selling_price: float


class EngineMetrics(BaseModel):
    """Pricing engine health metrics."""

    price_floor_violation_rate: float
    price_ceiling_violation_rate: float
    minimum_margin_violation_rate: float
    promotion_rule_violation_rate: float
    decision_acceptance_rate: float
    decision_explanation_coverage: float
    stale_competitor_data_detection_rate: float


class DataQualityMetrics(BaseModel):
    """Data quality metrics."""

    primary_key_uniqueness: float
    foreign_key_integrity: float
    duplicate_record_rate: float
    missing_required_field_rate: float
    arithmetic_reconciliation_accuracy: float
    lifecycle_validation_rate: float
    reproducibility_checksum_match: float


class SystemMetrics(BaseModel):
    """System performance metrics."""

    api_response_time_p50_ms: float
    api_response_time_p95_ms: float
    dataset_generation_time_seconds: float
    pricing_simulation_execution_time_ms: float
    api_error_rate: float
    test_pass_rate: float


class AnalyticsSummaryResponse(BaseModel):
    """Aggregated analytics response."""

    period: str = "30d"
    generated_at: datetime
    dashboard: DashboardMetrics
    revenue_trends: list[TrendPoint]
    profit_trends: list[TrendPoint]
    engine: EngineMetrics
    data_quality: DataQualityMetrics
    system: SystemMetrics
    kpis: dict[str, Any] = {}
