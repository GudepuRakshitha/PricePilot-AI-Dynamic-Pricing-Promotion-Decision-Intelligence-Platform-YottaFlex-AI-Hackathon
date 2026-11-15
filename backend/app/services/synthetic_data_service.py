"""Deterministic synthetic data generator."""

from __future__ import annotations

import hashlib
import json
import random
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import insert as sql_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import order, price_history, product, promotion
from app.models.cost_history import CostHistory as _CostHistory
from app.models.inventory import InventorySnapshot as _InventorySnapshot
from app.models.competitor import CompetitorObservation as _CompetitorObservation
from app.services import decision_service, exception_service

GENERATOR_SEED = 20261022
GENERATOR_VERSION = "1.0.0"

CATEGORIES = [
    "Electronics",
    "Home & Kitchen",
    "Fitness",
    "Beauty",
    "Sports",
    "Toys",
    "Apparel",
    "Grocery",
]
BRANDS = ["Nova", "Vertex", "Pulse", "Atlas", "Zenith", "Orbit"]

GENERATED_AT = datetime(2026, 1, 31, 12, 0, 0)


def _checksum(records: list[dict[str, Any]]) -> str:
    canonical = json.dumps(records, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _analysis_date() -> date:
    """Business analysis date used for lifecycle and freshness decisions."""
    try:
        return date.fromisoformat(settings.AS_OF_DATE)
    except (ValueError, TypeError):
        return date.today()


def _sku_number(sku: str) -> int:
    return int(sku.split("-")[-1])


def _build_records(mode: str) -> dict[str, Any]:
    """Build the complete deterministic synthetic dataset record set."""
    rng = random.Random(GENERATOR_SEED)
    if mode == "full":
        sku_count, days, promo_count = 5000, 180, 2000
        start_date, end_date = date(2026, 1, 1), date(2026, 6, 28)
    elif mode == "starter":
        sku_count, days, promo_count = 100, 30, 50
        start_date, end_date = date(2026, 1, 1), date(2026, 1, 30)
    else:
        raise ValueError(f"Unknown dataset mode: {mode}")

    day_dates = [start_date + timedelta(days=i) for i in range(days)]
    products: list[dict] = []
    costs: list[dict] = []
    prices: list[dict] = []
    inventories: list[dict] = []
    observations: list[dict] = []
    promotions: list[dict] = []
    orders: list[dict] = []
    decisions: list[dict] = []
    exceptions: list[dict] = []
    baseline_prices: dict[str, float] = {}

    for i in range(1, sku_count + 1):
        sku = f"SKU-{i:06d}"
        category = CATEGORIES[(i - 1) % len(CATEGORIES)]
        brand = BRANDS[(i - 1) % len(BRANDS)]
        products.append(
            {
                "sku": sku,
                "name": f"{brand} {category} {i:03d}",
                "category": category,
                "brand": brand,
                "lifecycle_state": "RETIRED" if i % 97 == 0 else "ACTIVE",
                "description": f"Generated synthetic product {sku}",
            }
        )
        base_cost = round(rng.uniform(120, 4200) * (1 + (i % 5) * 0.25), 2)
        costs.append(
            {
                "cost_id": f"COST-{sku}-{start_date.strftime('%Y%m')}",
                "sku": sku,
                "effective_date": start_date,
                "cost_amount": base_cost,
                "source": "BASELINE",
                "change_reason": None,
            }
        )
        if i % 6 == 0:
            later = start_date + timedelta(days=days // 2)
            costs.append(
                {
                    "cost_id": f"COST-{sku}-{later.strftime('%Y%m')}-R2",
                    "sku": sku,
                    "effective_date": later,
                    "cost_amount": round(base_cost * rng.uniform(0.8, 1.1), 2),
                    "source": "MARKUP_CHANGE",
                    "change_reason": "Cost review",
                }
            )
        floor = base_cost / (1 - 0.25)
        price = round(floor * rng.uniform(0.95, 1.1), 2)
        baseline_prices[sku] = price
        prices.append(
            {
                "price_id": f"PRC-{sku}-{start_date.strftime('%Y%m%d')}",
                "sku": sku,
                "effective_date": start_date,
                "selling_price": price,
                "source": "BASELINE",
                "change_reason": None,
                "decision_id": None,
            }
        )
        if i % 9 == 0:
            change_date = start_date + timedelta(days=3 + (i % max(days - 3, 1)))
            prices.append(
                {
                    "price_id": f"PRC-{sku}-{change_date.strftime('%Y%m%d')}",
                    "sku": sku,
                    "effective_date": change_date,
                    "selling_price": round(price * rng.uniform(0.9, 1.15), 2),
                    "source": "MANUAL",
                    "change_reason": f"Manual repricing cycle {i}",
                    "decision_id": None,
                }
            )
        for d in day_dates:
            inventories.append(
                {
                    "snapshot_id": f"INV-{sku}-{d.strftime('%Y%m%d')}",
                    "sku": sku,
                    "snapshot_date": d,
                    "quantity_available": max(int(rng.uniform(0, 400) + rng.uniform(-40, 40)), 0),
                    "reserved_quantity": int(rng.uniform(0, 5)),
                    "reorder_point": int(rng.uniform(20, 80)),
                    "stockout_risk": False,
                }
            )
        for k in range(1 + (i % 3)):
            # Most observations are recent (within the 7-day freshness window);
            # roughly one in seven is intentionally stale for exception handling.
            if (i + k) % 7 == 0:
                age_days = int(rng.randrange(9, 35))
            else:
                age_days = int(rng.randrange(0, 6))
            obs_date = end_date - timedelta(days=age_days)
            obs_at = datetime.combine(obs_date, datetime.min.time()) + timedelta(
                hours=int(rng.randrange(8, 20)), minutes=int(rng.randrange(60))
            )
            competitor_name = BRANDS[(i + k) % len(BRANDS)]
            observations.append(
                {
                    "observation_id": f"OBS-{sku}-{obs_date.strftime('%Y%m%d%H%M')}{k:02d}",
                    "sku": sku,
                    "competitor": competitor_name,
                    "competitor_sku": f"{competitor_name}-{i:03d}",
                    "observed_price": round(baseline_prices[sku] * rng.uniform(0.88, 1.15), 2),
                    "observed_at": obs_at,
                    "source": "SCRAPING",
                    "is_stale": age_days > settings.COMPETITOR_FRESHNESS_DAYS,
                    "stale_reason": (
                        f"Observation older than {settings.COMPETITOR_FRESHNESS_DAYS}-day freshness window"
                        if age_days > settings.COMPETITOR_FRESHNESS_DAYS
                        else None
                    ),
                }
            )

    analysis_day = _analysis_date()
    promotion_rows: list[dict] = []
    for seq in range(1, promo_count + 1):
        # Windows straddle the analysis date so the platform has ACTIVE,
        # SCHEDULED and EXPIRED promotions at the same time.
        promo_start = start_date + timedelta(days=int(rng.randrange(-15, days + 12)))
        promo_end = promo_start + timedelta(days=int(rng.randrange(5, 31)))
        if promo_end < analysis_day:
            promo_status = "EXPIRED"
        elif promo_start > analysis_day:
            promo_status = "SCHEDULED"
        else:
            promo_status = "ACTIVE"
        promotion_rows.append(
            {
                "promotion_id": f"PROMO-2026-{seq:06d}",
                "name": f"Promo {seq}",
                "code": f"PROMO{seq}",
                "discount_type": "PERCENTAGE" if seq % 2 else "FIXED_AMOUNT",
                "discount_value": round(rng.uniform(5, 25), 2) if seq % 2 else round(rng.uniform(20, 60), 2),
                "min_purchase_value": round(rng.uniform(0, 150), 2),
                "applicable_categories": [CATEGORIES[(seq - 1) % len(CATEGORIES)]],
                "applicable_brands": [BRANDS[(seq - 1) % len(BRANDS)]],
                "coupon_exclusions": [f"CPN-{seq % 17 + 1:03d}"] if seq % 4 == 0 else [],
                "stacking_allowed": seq % 3 != 0,
                "max_discount_percent": 60.0,
                "start_date": promo_start,
                "end_date": promo_end,
                "status": promo_status,
            }
        )

    order_seq = 1
    for p in products:
        base_cost = next(c["cost_amount"] for c in costs if c["sku"] == p["sku"])
        for d in day_dates:
            if rng.random() < 0.12:
                qty = int(rng.randrange(1, 6))
                price = baseline_prices[p["sku"]]
                discount = round(price * rng.uniform(0, 0.25), 2) if rng.random() < 0.2 else 0.0
                orders.append(
                    {
                        "order_id": f"ORD-2026-{order_seq:06d}",
                        "sku": p["sku"],
                        "quantity": qty,
                        "unit_price": price,
                        "discount_amount": discount,
                        "revenue": round((price - discount) * qty, 2),
                        "cost": round(base_cost * qty, 2),
                        "order_date": datetime.combine(d, datetime.min.time())
                        + timedelta(hours=int(rng.randrange(8, 22)), minutes=int(rng.randrange(60))),
                    }
                )
                order_seq += 1

    decision_seq = 0
    for i, p in enumerate(products, start=1):
        if i % 5 != 0:
            continue
        decision_seq += 1
        price = baseline_prices[p["sku"]]
        cost = next(c["cost_amount"] for c in costs if c["sku"] == p["sku"])
        if i % 17 == 0:
            recommended = round(price * 0.72, 2)
            status = "BLOCKED"
            reason = "Proposed discount would breach the minimum margin floor"
        else:
            recommended = round(price * (1.02 if i % 2 == 0 else 0.98), 2)
            status = "APPROVED"
            reason = "Demand and inventory signals support a controlled price adjustment"
        margin = round((recommended - cost) / recommended * 100.0, 4)
        decisions.append(
            {
                "decision_id": f"DEC-2026-{decision_seq:06d}",
                "sku": p["sku"],
                "previous_price": price,
                "recommended_price": recommended,
                "applied_discount": 0.0,
                "cost_basis": cost,
                "expected_margin": margin,
                "competitor_reference": None,
                "inventory_signal": {"available_stock": int(rng.uniform(0, 300)), "stockout_risk": False},
                "demand_signal": {"demand_level": "HIGH" if i % 2 == 0 else "LOW"},
                "applicable_rules": {"min_margin_pct": 20.0, "price_floor": round(cost / 0.8, 2)},
                "status": status,
                "reason": reason,
                "exception_id": None,
                "created_by": "pricing-engine",
            }
        )

    return {
        "mode": mode,
        "seed": GENERATOR_SEED,
        "version": GENERATOR_VERSION,
        "generated_at": GENERATED_AT,
        "start_date": start_date,
        "end_date": end_date,
        "products": products,
        "costs": costs,
        "prices": prices,
        "inventories": inventories,
        "observations": observations,
        "promotions": promotion_rows,
        "orders": orders,
        "decisions": decisions,
    }


def _persist_all(db: Session, records: dict[str, Any]) -> None:
    """Persist record groups parent-first to satisfy foreign keys.

    Rows are inserted in chunks via SQLAlchemy executemany so the dataset scales
    to the full 5,000-SKU configuration without exceeding PostgreSQL's
    parameter limit.
    """
    generated_at = records["generated_at"]
    chunk_size = 1000

    def insert_chunks(table, rows: list[dict[str, Any]]) -> None:
        for start in range(0, len(rows), chunk_size):
            db.execute(sql_insert(table), rows[start : start + chunk_size])

    insert_chunks(
        product.Product.__table__,
        [
            {
                "sku": p["sku"],
                "name": p["name"],
                "category": p["category"],
                "brand": p["brand"],
                "lifecycle_state": p["lifecycle_state"],
                "description": p["description"],
                "created_at": generated_at,
                "updated_at": generated_at,
            }
            for p in records["products"]
        ],
    )
    insert_chunks(
        _CostHistory.__table__,
        [
            {
                "cost_id": c["cost_id"],
                "sku": c["sku"],
                "effective_date": c["effective_date"],
                "cost_amount": c["cost_amount"],
                "source": c["source"],
                "change_reason": c["change_reason"],
                "created_at": generated_at,
                "updated_at": generated_at,
            }
            for c in records["costs"]
        ],
    )
    insert_chunks(
        price_history.PriceHistory.__table__,
        [
            {
                "price_id": p["price_id"],
                "sku": p["sku"],
                "effective_date": p["effective_date"],
                "selling_price": p["selling_price"],
                "source": p["source"],
                "change_reason": p["change_reason"],
                "decision_id": p["decision_id"],
                "created_at": generated_at,
                "updated_at": generated_at,
            }
            for p in records["prices"]
        ],
    )
    insert_chunks(
        _InventorySnapshot.__table__,
        [
            {
                "snapshot_id": i["snapshot_id"],
                "sku": i["sku"],
                "snapshot_date": i["snapshot_date"],
                "quantity_available": i["quantity_available"],
                "reserved_quantity": i["reserved_quantity"],
                "reorder_point": i["reorder_point"],
                "stockout_risk": i["stockout_risk"],
                "created_at": generated_at,
                "updated_at": generated_at,
            }
            for i in records["inventories"]
        ],
    )
    insert_chunks(
        _CompetitorObservation.__table__,
        [
            {
                "observation_id": o["observation_id"],
                "sku": o["sku"],
                "competitor": o["competitor"],
                "competitor_sku": o["competitor_sku"],
                "observed_price": o["observed_price"],
                "observed_at": o["observed_at"],
                "source": o["source"],
                "is_stale": o["is_stale"],
                "stale_reason": o["stale_reason"],
                "created_at": generated_at,
                "updated_at": generated_at,
            }
            for o in records["observations"]
        ],
    )
    insert_chunks(
        promotion.Promotion.__table__,
        [
            {
                "promotion_id": pr["promotion_id"],
                "name": pr["name"],
                "code": pr["code"],
                "discount_type": pr["discount_type"],
                "discount_value": pr["discount_value"],
                "min_purchase_value": pr["min_purchase_value"],
                "applicable_categories": pr["applicable_categories"],
                "applicable_brands": pr["applicable_brands"],
                "coupon_exclusions": pr["coupon_exclusions"],
                "stacking_allowed": pr["stacking_allowed"],
                "max_discount_percent": pr["max_discount_percent"],
                "start_date": pr["start_date"],
                "end_date": pr["end_date"],
                "status": pr["status"],
                "created_at": generated_at,
                "updated_at": generated_at,
            }
            for pr in records["promotions"]
        ],
    )
    insert_chunks(
        order.CustomerOrder.__table__,
        [
            {
                "order_id": o["order_id"],
                "sku": o["sku"],
                "quantity": o["quantity"],
                "unit_price": o["unit_price"],
                "discount_amount": o["discount_amount"],
                "revenue": o["revenue"],
                "cost": o["cost"],
                "order_date": o["order_date"],
                "created_at": generated_at,
                "updated_at": generated_at,
            }
            for o in records["orders"]
        ],
    )
    if records.get("decisions"):
        insert_chunks(
            price_history.PricingDecision.__table__,
            [
                {
                    "decision_id": d["decision_id"],
                    "sku": d["sku"],
                    "previous_price": d["previous_price"],
                    "recommended_price": d["recommended_price"],
                    "applied_discount": d["applied_discount"],
                    "cost_basis": d["cost_basis"],
                    "expected_margin": d["expected_margin"],
                    "competitor_reference": d["competitor_reference"],
                    "inventory_signal": d["inventory_signal"],
                    "demand_signal": d["demand_signal"],
                    "applicable_rules": d["applicable_rules"],
                    "status": d["status"],
                    "reason": d["reason"],
                    "exception_id": d["exception_id"],
                    "created_by": d["created_by"],
                    "created_at": generated_at,
                    "updated_at": generated_at,
                }
                for d in records["decisions"]
            ],
        )
    db.commit()


def generate_and_persist(db: Session, mode: str = "starter") -> dict[str, Any]:
    """Generate the deterministic dataset, persist it and return a summary."""
    records = _build_records(mode)
    _persist_all(db, records)
    checksum = _checksum(
        [
            {"type": "products", "rows": records["products"]},
            {"type": "costs", "rows": records["costs"]},
            {"type": "prices", "rows": records["prices"]},
            {"type": "inventories", "rows": records["inventories"]},
            {"type": "observations", "rows": records["observations"]},
            {"type": "promotions", "rows": records["promotions"]},
            {"type": "orders", "rows": records["orders"]},
            {"type": "decisions", "rows": records.get("decisions", [])},
        ]
    )
    return {
        "mode": mode,
        "seed": GENERATOR_SEED,
        "version": GENERATOR_VERSION,
        "generated_at": records["generated_at"].isoformat(),
        "start_date": records["start_date"].isoformat(),
        "end_date": records["end_date"].isoformat(),
        "skus_generated": len(records["products"]),
        "days_of_history": (records["end_date"] - records["start_date"]).days + 1,
        "promotions_generated": len(records["promotions"]),
        "cost_records": len(records["costs"]),
        "price_records": len(records["prices"]),
        "competitor_observations": len(records["observations"]),
        "inventory_snapshots": len(records["inventories"]),
        "orders_created": len(records["orders"]),
        "decisions_created": len(records.get("decisions", [])),
        "checksum": checksum,
        "deterministic": True,
    }
