"""Exception detection, resolution and workflow service."""

from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.base import utcnow
from app.models.exception import ExceptionRecord
from app.schemas.exception import ExceptionCreate


def _next_exception_id(db: Session) -> str:
    sequences: list[int] = []
    for (value,) in db.query(ExceptionRecord.exception_id).all():
        try:
            suffix = int(str(value).rsplit("-", 1)[-1])
        except (ValueError, IndexError):
            continue
        if suffix < 900000:
            sequences.append(suffix)
    return f"EXC-2026-{(max(sequences) + 1) if sequences else 1:06d}"


def create_exception(db: Session, payload: ExceptionCreate) -> ExceptionRecord:
    exception = ExceptionRecord(
        exception_id=_next_exception_id(db),
        decision_id=payload.decision_id,
        issue_type=payload.issue_type,
        severity=payload.severity,
        sku=payload.sku,
        description=payload.description,
        expected_behavior=payload.expected_behavior,
        actual_behavior=payload.actual_behavior,
        resolution_status=payload.resolution_status,
    )
    db.add(exception)
    db.flush()
    return exception


def list_exceptions(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    *,
    status: str | None = None,
    severity: str | None = None,
    issue_type: str | None = None,
    sku: str | None = None,
    search: str | None = None,
) -> tuple[list[ExceptionRecord], int]:
    query = db.query(ExceptionRecord)
    if status:
        query = query.filter(ExceptionRecord.resolution_status == status)
    if severity:
        query = query.filter(ExceptionRecord.severity == severity)
    if issue_type:
        query = query.filter(ExceptionRecord.issue_type == issue_type)
    if sku:
        query = query.filter(ExceptionRecord.sku == sku)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ExceptionRecord.exception_id.ilike(term),
                ExceptionRecord.sku.ilike(term),
                ExceptionRecord.description.ilike(term),
            )
        )
    query = query.order_by(ExceptionRecord.detected_at.desc())
    total = query.count()
    return query.offset(skip).limit(limit).all(), total


def get_exception(db: Session, exception_id: str) -> ExceptionRecord:
    exception = db.query(ExceptionRecord).filter_by(exception_id=exception_id).first()
    if not exception:
        raise NotFoundError(f"Exception {exception_id} not found")
    return exception


def resolve_exception(
    db: Session,
    exception_id: str,
    *,
    resolution_status: str,
    resolved_by: str,
    resolution_notes: str,
) -> ExceptionRecord:
    exception = get_exception(db, exception_id)
    exception.resolution_status = resolution_status
    exception.resolved_by = resolved_by
    exception.resolution_notes = resolution_notes
    exception.resolved_at = utcnow() if resolution_status in {"RESOLVED", "DISMISSED"} else None
    db.add(exception)
    db.flush()
    return exception


def summary(db: Session) -> dict[str, int]:
    counts = {"OPEN": 0, "ACKNOWLEDGED": 0, "RESOLVED": 0, "DISMISSED": 0}
    rows = (
        db.query(ExceptionRecord.resolution_status, func.count(ExceptionRecord.exception_id))
        .group_by(ExceptionRecord.resolution_status)
        .all()
    )
    for status_value, count in rows:
        counts[status_value] = int(count)
    counts["total"] = sum(counts.values())
    return counts
