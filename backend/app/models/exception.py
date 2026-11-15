"""Exception and decision traceability models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow


class ExceptionRecord(Base):
    """Raised or flagged pricing exception with expected vs actual behaviour."""

    __tablename__ = "exceptions"

    exception_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    decision_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("pricing_decisions.decision_id", ondelete="SET NULL"), nullable=True
    )
    issue_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="MEDIUM")
    sku: Mapped[str] = mapped_column(
        String(32), ForeignKey("products.sku", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(1024), nullable=False)
    expected_behavior: Mapped[str] = mapped_column(String(1024), nullable=False)
    actual_behavior: Mapped[str] = mapped_column(String(1024), nullable=False)
    resolution_status: Mapped[str] = mapped_column(String(32), nullable=False, default="OPEN")
    detected_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')", name="ck_exceptions_severity"
        ),
        CheckConstraint(
            "resolution_status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')",
            name="ck_exceptions_resolution_status",
        ),
        Index("ix_exceptions_status_issue", "resolution_status", "issue_type"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ExceptionRecord {self.exception_id}>"
