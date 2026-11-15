"""Synthetic data generation API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.schemas.synthetic import SyntheticGenerationResponse, ValidationSummary
from app.services import data_validation_service, synthetic_data_service

router = APIRouter(prefix="/synthetic", tags=["Synthetic Data"])


@router.post("/generate", response_model=SyntheticGenerationResponse)
def generate(
    mode: str = Query("starter", pattern="^(starter|full)$"),
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN")),
) -> SyntheticGenerationResponse:
    """Generate the deterministic dataset. Destructive: replaces stored rows."""
    raise HTTPException(
        status_code=409,
        detail=(
            "Dataset regeneration is disabled through the HTTP API to protect existing "
            "records. Use backend/scripts/generate_dataset.py from the CLI."
        ),
    )


@router.get("/validation", response_model=ValidationSummary)
def validation(
    db: Session = Depends(get_db), user=Depends(get_current_user)
) -> ValidationSummary:
    report = data_validation_service.validate_dataset(db)
    return ValidationSummary(
        dataset_mode=report.get("dataset_mode", "connected"),
        checks=report.get("checks", []),
        passed=bool(report.get("passed", False)),
        total_checks=int(report.get("total_checks", 0)),
        failed_checks=int(report.get("failed_checks", 0)),
    )
