"""Pricing engine, simulation and decision API routes."""

from __future__ import annotations

import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core import security
from app.core.config import settings
from app.models.cost_history import CostHistory
from app.models.inventory import InventorySnapshot
from app.models.price_history import PriceHistory
from app.models.product import Product
from app.models.user import User
from app.schemas.exception import ExceptionCreate
from app.schemas.pricing import DecisionCreateRequest, PricingDecisionResponse, SimulationRequest, SimulationResponse, SimulationScenario
from app.services import competitor_service, decision_service, exception_service, pricing_engine, promotion_service

router = APIRouter(prefix="/pricing", tags=["Pricing Engine"])


def _latest_cost(db: Session, sku: str) -> float:
    record = db.query(CostHistory).filter(CostHistory.sku == sku).order_by(CostHistory.effective_date.desc()).first()
    return float(record.cost_amount) if record else 1000.0


def _latest_price(db: Session, sku: str) -> float:
    record = db.query(PriceHistory).filter(PriceHistory.sku == sku).order_by(PriceHistory.effective_date.desc()).first()
    return float(record.selling_price) if record else 1200.0


def _latest_inventory(db: Session, sku: str):
    return (
        db.query(InventorySnapshot)
        .filter(InventorySnapshot.sku == sku)
        .order_by(InventorySnapshot.snapshot_date.desc())
        .first()
    )


@router.post("/simulate", response_model=SimulationResponse)
def simulate(payload: SimulationRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SimulationResponse:
    started = time.perf_counter()
    product = db.query(Product).filter_by(sku=payload.sku).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {payload.sku} not found")

    cost = float(payload.cost if payload.cost is not None else _latest_cost(db, payload.sku))
    current_price = float(payload.base_price if payload.base_price is not None else _latest_price(db, payload.sku))
    min_margin_pct = float(payload.min_margin_pct or settings.MIN_PROFIT_MARGIN_PCT)
    floor = pricing_engine.compute_price_floor(cost, min_margin_pct)
    ceiling = pricing_engine.compute_price_ceiling(cost, 60.0)

    latest_obs = competitor_service.get_latest_observation(db, payload.sku)
    competitor_price = None
    competitor_observed_at = None
    competitor_is_stale = False
    if latest_obs:
        competitor_price = float(latest_obs.observed_price)
        competitor_observed_at = latest_obs.observed_at
        competitor_is_stale = latest_obs.is_stale or competitor_service.is_observation_stale(latest_obs.observed_at)

    promotion = promotion_service.get_promotion(db, payload.promotion_id) if payload.promotion_id else None
    latest_inv = _latest_inventory(db, payload.sku)
    stock = int(latest_inv.quantity_available) if latest_inv else 100
    reserved = int(latest_inv.reserved_quantity) if latest_inv else 0
    reorder = int(latest_inv.reorder_point) if latest_inv else 20

    def run_engine(demand_level: str, available_stock: int, comp_price, comp_stale: bool, promo):
        return pricing_engine.evaluate_pricing(
            sku=payload.sku,
            cost=cost,
            current_price=current_price,
            min_margin_pct=min_margin_pct,
            max_margin_pct=60.0,
            demand_level=demand_level,
            available_stock=available_stock,
            reserved_quantity=reserved,
            reorder_point=reorder,
            competitor_price=comp_price,
            competitor_observed_at=competitor_observed_at,
            competitor_is_stale=comp_stale,
            promotion=promo,
            price_floor=floor,
            price_ceiling=ceiling,
        )

    scenarios: list[SimulationScenario] = []
    baseline = run_engine("STABLE", stock, competitor_price, competitor_is_stale, promotion)
    scenarios.append(_to_scenario("BASELINE", "STABLE", stock, competitor_price, payload.promotion_id, baseline))

    for idx, override in enumerate((payload.scenarios or [])[:3], start=1):
        demand = override.get("demand_level", "STABLE")
        scen_stock = int(override.get("available_stock") or stock)
        comp_price = override.get("competitor_price", competitor_price)
        scen_engine = run_engine(demand, scen_stock, comp_price, competitor_is_stale, promotion)
        scenarios.append(_to_scenario(f"SCENARIO_{idx}", demand, scen_stock, comp_price, payload.promotion_id, scen_engine))

    elapsed_ms = (time.perf_counter() - started) * 1000.0
    from app.services.evaluation_service import record_system_metric

    record_system_metric(db, "pricing_simulation_execution_time_ms", elapsed_ms, source="SIMULATION")
    db.commit()

    recommended = next((s for s in scenarios if s.status == "APPROVED"), scenarios[0])
    return SimulationResponse(
        sku=payload.sku,
        base_price=current_price,
        cost=cost,
        scenarios=scenarios,
        recommended_scenario_id=recommended.scenario_id,
    )


def _to_scenario(
    scenario_id: str,
    demand_level: str,
    available_stock: int,
    competitor_price: float | None,
    promotion_id: str | None,
    engine_result,
) -> SimulationScenario:
    final_price = engine_result.recommended_price if engine_result.status == "APPROVED" else engine_result.current_price
    discount_percent = engine_result.applied_discount
    expected_margin = engine_result.expected_margin
    estimated_units = max(int(available_stock * 0.25), 5)
    estimated_revenue = round(final_price * estimated_units, 2)
    estimated_gross_profit = round((final_price - engine_result.cost) * estimated_units, 2)
    return SimulationScenario(
        scenario_id=scenario_id,
        name="Baseline" if scenario_id == "BASELINE" else scenario_id.replace("_", " ").title(),
        demand_level=demand_level,
        available_stock=available_stock,
        competitor_price=competitor_price,
        promotion_id=promotion_id,
        candidate_price=round(final_price * (1 - discount_percent / 100.0), 2),
        final_price=final_price,
        discount_percent=discount_percent,
        expected_margin=expected_margin,
        estimated_revenue=estimated_revenue,
        estimated_gross_profit=estimated_gross_profit,
        constraints=[
            {"rule_code": c.rule_code, "passed": c.passed, "detail": c.detail, "severity": c.severity}
            for c in engine_result.constraints
        ],
        explanation=engine_result.reason or "No adjustment required",
        status=engine_result.status,
    )


@router.post("/decisions", response_model=PricingDecisionResponse)
def create_decision(payload: DecisionCreateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PricingDecisionResponse:
    """Persist a pricing decision with margin validation and traceability."""
    product = db.query(Product).filter_by(sku=payload.sku).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {payload.sku} not found")

    cost = _latest_cost(db, payload.sku)
    previous_price = _latest_price(db, payload.sku)
    floor = pricing_engine.compute_price_floor(cost, settings.MIN_PROFIT_MARGIN_PCT)
    final_price = round(payload.recommended_price * (1 - payload.applied_discount / 100.0), 2)
    expected_margin = pricing_engine.compute_actual_margin(cost, final_price)

    status_value = payload.status
    exception_issue = None
    if final_price < floor:
        status_value = "BLOCKED"
        exception_issue = "PRICE_BELOW_FLOOR"
    elif expected_margin < settings.MIN_PROFIT_MARGIN_PCT:
        status_value = "BLOCKED"
        exception_issue = "INCORRECT_MARGIN_CALCULATION"

    decision = decision_service.create_decision(
        db,
        sku=payload.sku,
        recommended_price=final_price,
        applied_discount=payload.applied_discount,
        expected_margin=expected_margin,
        cost_basis=cost,
        status=status_value,
        reason=payload.reason,
        created_by=user.email,
        demand_signal={"demand_level": "STABLE", "source": "user_saved"},
        inventory_signal={"available_stock": 0},
        competitor_signal={},
        applicable_rules={
            "min_margin_pct": 20.0,
            "price_floor": floor,
            "previous_price": previous_price,
            "requested_price": payload.recommended_price,
        },
    )

    if exception_issue:
        exception = exception_service.create_exception(
            db,
            ExceptionCreate(
                decision_id=decision.decision_id,
                issue_type=exception_issue,
                severity="HIGH",
                sku=payload.sku,
                description="Saved decision violated a pricing constraint",
                expected_behavior="Block decisions that breach the price floor or minimum margin",
                actual_behavior="Decision was blocked and an exception recorded",
            ),
        )
        decision.exception_id = exception.exception_id
        db.flush()

    security.write_audit(
        db,
        entity_type="pricing_decision",
        entity_id=decision.decision_id,
        action="DECISION_SAVED",
        actor=user.email,
        details={"sku": payload.sku, "final_price": final_price, "status": status_value},
    )
    db.commit()
    db.refresh(decision)
    return _to_response(decision)


def _to_response(d) -> PricingDecisionResponse:
    return PricingDecisionResponse(
        decision_id=d.decision_id,
        sku=d.sku,
        previous_price=float(d.previous_price),
        recommended_price=float(d.recommended_price),
        applied_discount=float(d.applied_discount),
        cost_basis=float(d.cost_basis),
        expected_margin=float(d.expected_margin),
        competitor_reference=d.competitor_reference,
        inventory_signal=d.inventory_signal or {},
        demand_signal=d.demand_signal or {},
        applicable_rules=d.applicable_rules or {},
        status=d.status,
        reason=d.reason,
        exception_id=d.exception_id,
        created_by=d.created_by,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )
