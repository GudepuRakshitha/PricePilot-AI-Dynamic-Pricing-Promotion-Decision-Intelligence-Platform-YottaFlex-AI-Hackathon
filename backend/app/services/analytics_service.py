"""Analytics and reporting service."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.services import evaluation_service


def compute_dashboard_metrics(db: Session) -> dict[str, Any]:
    """Collect executive dashboard KPI values from actual stored records."""
    from app.models import exception, inventory, order, price_history, product, promotion

    total_products = db.query(product.Product).count()
    active_promotions = db.query(promotion.Promotion).filter(promotion.Promotion.status == "ACTIVE").count()
    decisions = db.query(price_history.PricingDecision).all()
    decisions_approved = sum(1 for d in decisions if d.status == "APPROVED")
    decisions_blocked = sum(1 for d in decisions if d.status == "BLOCKED")
    open_exceptions = db.query(exception.ExceptionRecord).filter(
        exception.ExceptionRecord.resolution_status == "OPEN"
    ).count()

    metrics = evaluation_service.compute_all_metrics(db)
    business = metrics.get("business") or {}

    inventory_value = 0.0
    latest_costs: dict[str, float] = {}
    from app.models.cost_history import CostHistory

    for cost in db.query(CostHistory).order_by(CostHistory.effective_date.asc()).all():
        latest_costs[cost.sku] = float(cost.cost_amount or 0.0)
    latest_snapshots: dict[str, object] = {}
    for snap in (
        db.query(inventory.InventorySnapshot)
        .order_by(inventory.InventorySnapshot.snapshot_date.asc())
        .all()
    ):
        latest_snapshots[snap.sku] = snap
    for snap in latest_snapshots.values():
        cost = latest_costs.get(snap.sku, 0.0)
        inventory_value += max(int(snap.quantity_available) - int(snap.reserved_quantity), 0) * cost

    # Competitor price deviations: fresh observations deviating > threshold from current price.
    from app.models.competitor import CompetitorObservation
    from app.services.competitor_service import is_observation_stale

    latest_prices: dict[str, float] = {}
    for price in db.query(price_history.PriceHistory).order_by(price_history.PriceHistory.effective_date.asc()).all():
        latest_prices[price.sku] = float(price.selling_price)
    deviations = 0
    for obs in db.query(CompetitorObservation).all():
        if obs.is_stale or is_observation_stale(obs.observed_at):
            continue
        our_price = latest_prices.get(obs.sku)
        if not our_price or not obs.observed_price:
            continue
        deviation = abs(our_price - float(obs.observed_price)) / float(obs.observed_price) * 100.0
        if deviation > 10.0:
            deviations += 1

    return {
        "total_products": total_products,
        "active_promotions": active_promotions,
        "pricing_decisions": len(decisions),
        "decisions_approved": decisions_approved,
        "decisions_blocked": decisions_blocked,
        "average_profit_margin": float(business.get("gross_margin_pct") or 0.0),
        "revenue": float(business.get("revenue") or 0.0),
        "gross_profit": float(business.get("gross_profit") or 0.0),
        "inventory_value": round(inventory_value, 2),
        "competitor_price_deviations": deviations,
        "open_exceptions": open_exceptions,
        "units_sold": int(business.get("units_sold") or 0),
        "total_orders": int(business.get("total_orders") or 0),
    }


def compute_revenue_trends(db: Session, days: int = 30) -> list[dict[str, Any]]:
    """Revenue, profit and demand trend series derived from stored orders."""
    from app.models import order

    day = func.date(order.CustomerOrder.order_date).label("day")
    rows = (
        db.query(
            day,
            func.sum(order.CustomerOrder.revenue).label("revenue"),
            func.sum(order.CustomerOrder.cost).label("cost"),
            func.count(order.CustomerOrder.order_id).label("orders"),
            func.sum(order.CustomerOrder.quantity).label("units"),
        )
        .group_by(day)
        .order_by(day.asc())
        .all()
    )
    trends = []
    for row in rows:
        revenue = float(row.revenue or 0.0)
        cost = float(row.cost or 0.0)
        gross_profit = revenue - cost
        units = int(row.units or 0)
        trends.append(
            {
                "date": row.day,
                "revenue": round(revenue, 2),
                "gross_profit": round(gross_profit, 2),
                "gross_margin_pct": round((gross_profit / revenue * 100.0) if revenue else 0.0, 4),
                "orders": int(row.orders or 0),
                "units_sold": units,
                "avg_selling_price": round(revenue / units, 2) if units else 0.0,
            }
        )
    return trends[-days:]


def compute_analytics_summary(db: Session, period: str = "30d") -> dict[str, Any]:
    """Full analytics summary for the executive dashboards."""
    from app.core import metrics as metrics_module
    from app.models.system_metric import SystemMetric

    dashboard = compute_dashboard_metrics(db)
    trends = compute_revenue_trends(db, 30)
    engine_metrics = evaluation_service.compute_engine_metrics(db)
    data_quality = evaluation_service.compute_data_quality_metrics(db)

    generation_metric = (
        db.query(SystemMetric)
        .filter(SystemMetric.metric_name == "dataset_generation_time_seconds")
        .order_by(SystemMetric.recorded_at.desc())
        .first()
    )
    simulation_metric = (
        db.query(SystemMetric)
        .filter(SystemMetric.metric_name == "pricing_simulation_execution_time_ms")
        .order_by(SystemMetric.recorded_at.desc())
        .first()
    )
    test_metric = (
        db.query(SystemMetric)
        .filter(SystemMetric.metric_name == "test_pass_rate")
        .order_by(SystemMetric.recorded_at.desc())
        .first()
    )
    live = metrics_module.snapshot()
    system = {
        "api_response_time_p50_ms": live["api_response_time_p50_ms"],
        "api_response_time_p95_ms": live["api_response_time_p95_ms"],
        "dataset_generation_time_seconds": float(generation_metric.metric_value) if generation_metric else 0.0,
        "pricing_simulation_execution_time_ms": float(simulation_metric.metric_value) if simulation_metric else 0.0,
        "api_error_rate": live["api_error_rate"],
        "test_pass_rate": float(test_metric.metric_value) if test_metric else 0.0,
    }
    return {
        "period": period,
        "generated_at": datetime.now(),
        "dashboard": dashboard,
        "revenue_trends": trends,
        "profit_trends": trends,
        "engine": engine_metrics,
        "data_quality": data_quality,
        "system": system,
        "kpis": {
            "gross_margin_pct": dashboard["average_profit_margin"],
            "units_sold": dashboard["units_sold"],
            "total_orders": dashboard["total_orders"],
            "request_samples": live["request_count"],
        },
    }


def category_performance(db: Session) -> list[dict[str, Any]]:
    """Revenue, profit, units and margin aggregated by product category."""
    from app.models import order, product

    rows = (
        db.query(
            product.Product.category.label("category"),
            func.sum(order.CustomerOrder.revenue).label("revenue"),
            func.sum(order.CustomerOrder.cost).label("cost"),
            func.sum(order.CustomerOrder.quantity).label("units"),
            func.count(order.CustomerOrder.order_id).label("orders"),
        )
        .join(product.Product, product.Product.sku == order.CustomerOrder.sku)
        .group_by(product.Product.category)
        .order_by(func.sum(order.CustomerOrder.revenue).desc())
        .all()
    )
    result = []
    for row in rows:
        revenue = float(row.revenue or 0.0)
        cost = float(row.cost or 0.0)
        gross_profit = revenue - cost
        result.append(
            {
                "category": row.category,
                "revenue": round(revenue, 2),
                "gross_profit": round(gross_profit, 2),
                "gross_margin_pct": round((gross_profit / revenue * 100.0) if revenue else 0.0, 4),
                "units_sold": int(row.units or 0),
                "orders": int(row.orders or 0),
            }
        )
    return result


def top_products(db: Session, limit: int = 10) -> list[dict[str, Any]]:
    """Best performing SKUs by revenue from stored orders."""
    from app.models import order, product

    rows = (
        db.query(
            order.CustomerOrder.sku.label("sku"),
            product.Product.name.label("name"),
            product.Product.category.label("category"),
            func.sum(order.CustomerOrder.revenue).label("revenue"),
            func.sum(order.CustomerOrder.cost).label("cost"),
            func.sum(order.CustomerOrder.quantity).label("units"),
        )
        .join(product.Product, product.Product.sku == order.CustomerOrder.sku)
        .group_by(order.CustomerOrder.sku, product.Product.name, product.Product.category)
        .order_by(func.sum(order.CustomerOrder.revenue).desc())
        .limit(limit)
        .all()
    )
    result = []
    for row in rows:
        revenue = float(row.revenue or 0.0)
        cost = float(row.cost or 0.0)
        result.append(
            {
                "sku": row.sku,
                "name": row.name,
                "category": row.category,
                "revenue": round(revenue, 2),
                "gross_profit": round(revenue - cost, 2),
                "gross_margin_pct": round(((revenue - cost) / revenue * 100.0) if revenue else 0.0, 4),
                "units_sold": int(row.units or 0),
            }
        )
    return result


def inventory_risk(db: Session) -> dict[str, Any]:
    """Latest-per-SKU inventory risk posture and valuation."""
    from app.services import cost_service, inventory_service

    latest = inventory_service.latest_snapshot_map(db)
    costs = cost_service.current_cost_map(db)
    total_units = 0
    total_value = 0.0
    stockouts = 0
    overstock = 0
    at_risk: list[dict[str, Any]] = []
    for sku, snap in latest.items():
        available = int(snap["quantity_available"])
        reserved = int(snap["reserved_quantity"])
        reorder = int(snap["reorder_point"])
        cost = costs.get(sku, 0.0)
        total_units += available
        total_value += max(available - reserved, 0) * cost
        if bool(snap["stockout_risk"]) or available <= reorder:
            stockouts += 1
            at_risk.append(
                {
                    "sku": sku,
                    "reason": "BELOW_REORDER_POINT",
                    "quantity_available": available,
                    "reorder_point": reorder,
                }
            )
        elif reorder and available > reorder * 3:
            overstock += 1
            at_risk.append(
                {
                    "sku": sku,
                    "reason": "OVERSTOCK",
                    "quantity_available": available,
                    "reorder_point": reorder,
                }
            )
    at_risk.sort(key=lambda row: row["quantity_available"])
    return {
        "skus_tracked": len(latest),
        "total_units_available": total_units,
        "inventory_value": round(total_value, 2),
        "below_reorder_count": stockouts,
        "overstock_count": overstock,
        "at_risk": at_risk[:20],
    }


def validation_report(db: Session) -> dict[str, Any]:
    """Live data-quality validation run against the connected database."""
    from app.services.data_validation_service import validate_dataset

    return validate_dataset(db)


def order_samples(db: Session, limit: int = 20) -> list[dict[str, Any]]:
    """Most recent orders for drill-down tables (historical records only)."""
    from app.models import order

    rows = (
        db.query(order.CustomerOrder)
        .order_by(order.CustomerOrder.order_date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "order_id": row.order_id,
            "sku": row.sku,
            "quantity": row.quantity,
            "unit_price": float(row.unit_price),
            "discount_amount": float(row.discount_amount),
            "revenue": float(row.revenue),
            "cost": float(row.cost),
            "order_date": row.order_date,
        }
        for row in rows
    ]
