"""Inventory snapshot API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import MANAGER_ROLES, get_current_user, get_db, require_roles
from app.core import security
from app.models.inventory import InventorySnapshot
from app.models.user import User
from app.schemas.inventory import InventoryCreate, InventoryListResponse, InventoryResponse
from app.services import inventory_service

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])


@router.get("", response_model=InventoryListResponse)
def list_snapshots(
    sku: str | None = None,
    search: str | None = Query(None, max_length=128),
    stockout_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InventoryListResponse:
    items, total, latest_by_sku = inventory_service.list_snapshots(
        db, sku=sku, skip=skip, limit=limit, search=search, stockout_only=stockout_only
    )
    return InventoryListResponse(
        items=[_to_response(i) for i in items],
        total=total,
        latest_by_sku=latest_by_sku,
    )


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_snapshot(
    payload: InventoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES)),
) -> InventoryResponse:
    snapshot = inventory_service.create_snapshot(db, payload)
    security.write_audit(
        db,
        entity_type="inventory_snapshot",
        entity_id=snapshot.snapshot_id,
        action="INVENTORY_SNAPSHOT_RECORDED",
        actor=user.email,
        details={"sku": payload.sku, "quantity_available": payload.quantity_available},
    )
    db.commit()
    db.refresh(snapshot)
    return _to_response(snapshot)


def _to_response(i: InventorySnapshot) -> InventoryResponse:
    return InventoryResponse(
        snapshot_id=i.snapshot_id,
        sku=i.sku,
        snapshot_date=i.snapshot_date,
        quantity_available=i.quantity_available,
        reserved_quantity=i.reserved_quantity,
        reorder_point=i.reorder_point,
        stockout_risk=i.stockout_risk,
        created_at=i.created_at,
        updated_at=i.updated_at,
    )
