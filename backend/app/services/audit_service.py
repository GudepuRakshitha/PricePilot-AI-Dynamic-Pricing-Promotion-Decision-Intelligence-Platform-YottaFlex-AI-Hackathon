"""Audit logging service."""

from __future__ import annotations

from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.audit_order import AuditLog


def write_audit(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str = "system",
    details: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        details=details or {},
    )
    db.add(entry)
    db.flush()
    return entry


def list_audit_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    *,
    entity_type: str | None = None,
    action: str | None = None,
    actor: str | None = None,
    search: str | None = None,
) -> tuple[list[AuditLog], int]:
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if actor:
        query = query.filter(AuditLog.actor == actor)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(AuditLog.entity_id.ilike(term), AuditLog.action.ilike(term)))
    query = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    total = query.count()
    return query.offset(skip).limit(limit).all(), total


def facets(db: Session) -> dict[str, list[str]]:
    entity_types = [row[0] for row in db.query(AuditLog.entity_type).distinct().order_by(AuditLog.entity_type).all()]
    actions = [row[0] for row in db.query(AuditLog.action).distinct().order_by(AuditLog.action).all()]
    actors = [row[0] for row in db.query(AuditLog.actor).distinct().order_by(AuditLog.actor).all()]
    return {"entity_types": entity_types, "actions": actions, "actors": actors}
