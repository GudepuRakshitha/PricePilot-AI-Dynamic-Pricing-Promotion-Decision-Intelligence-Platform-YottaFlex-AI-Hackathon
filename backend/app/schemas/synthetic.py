"""Synthetic data generation and data validation schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class SyntheticGenerationResponse(BaseModel):
    """Synthetic dataset generation summary."""

    mode: str
    seed: int
    skus_generated: int
    days_of_history: int
    promotions_generated: int
    cost_records: int
    price_records: int
    competitor_observations: int
    inventory_snapshots: int
    promotions_created: int
    decisions_created: int
    exceptions_created: int
    orders_created: int
    checksum: str
    deterministic: bool


class SourceManifestEntry(BaseModel):
    """Source manifest entry."""

    source_type: str
    record_id: str
    payload: dict[str, Any] = {}


class SourceManifest(BaseModel):
    """Source manifest for reproducibility."""

    generator_version: str = "1.0.0"
    seed: int = 20261022
    generated_at: str
    sources: list[SourceManifestEntry] = []


class ValidationIssue(BaseModel):
    """Data validation issue."""

    check: str
    passed: bool
    details: str


class ValidationSummary(BaseModel):
    """Data validation summary."""

    dataset_mode: str
    checks: list[ValidationIssue]
    passed: bool
    total_checks: int
    failed_checks: int
