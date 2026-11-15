"""Dataset export service: CSV, JSON, SQL, ground truth and manifests."""

from __future__ import annotations

import csv
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy.orm import Session

from app.models.competitor import CompetitorObservation
from app.models.cost_history import CostHistory
from app.models.exception import ExceptionRecord
from app.models.inventory import InventorySnapshot
from app.models.order import CustomerOrder
from app.models.price_history import PriceHistory, PricingDecision
from app.models.product import Product
from app.models.promotion import Promotion
from app.services import data_validation_service, synthetic_data_service

EXPORT_TABLES = [
    ("products", Product),
    ("cost_history", CostHistory),
    ("price_history", PriceHistory),
    ("competitor_observations", CompetitorObservation),
    ("inventory_snapshots", InventorySnapshot),
    ("promotions", Promotion),
    ("pricing_decisions", PricingDecision),
    ("exceptions", ExceptionRecord),
    ("customer_orders", CustomerOrder),
]


def _serialize(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    return value


def _row_dict(obj: Any) -> dict[str, Any]:
    return {column.name: _serialize(getattr(obj, column.name, None)) for column in obj.__table__.columns}


def _sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def export_dataset(db: Session, output_dir: Path, mode: str, summary: dict[str, Any]) -> dict[str, str]:
    """Export stored dataset to CSV/JSON/SQL plus manifest and validation report."""
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_dir = output_dir / "csv"
    json_dir = output_dir / "json"
    sql_dir = output_dir / "sql"
    csv_dir.mkdir(exist_ok=True)
    json_dir.mkdir(exist_ok=True)
    sql_dir.mkdir(exist_ok=True)

    files: dict[str, str] = {}
    table_rows: dict[str, list[dict[str, Any]]] = {}

    for table_name, model in EXPORT_TABLES:
        rows = [_row_dict(obj) for obj in db.query(model).all()]
        table_rows[table_name] = rows

        csv_path = csv_dir / f"{table_name}.csv"
        if rows:
            with csv_path.open("w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)
        files[f"csv/{table_name}.csv"] = str(csv_path)

        json_path = json_dir / f"{table_name}.json"
        json_path.write_text(json.dumps(rows, indent=2, default=str), encoding="utf-8")
        files[f"json/{table_name}.json"] = str(json_path)

    # SQL seed data.
    sql_lines = ["-- PricePilot AI deterministic seed data", f"-- Generated: {datetime.utcnow().isoformat()}Z", ""]
    for table_name, rows in table_rows.items():
        if not rows:
            continue
        columns = list(rows[0].keys())
        column_sql = ", ".join(columns)
        sql_lines.append(f"-- {table_name} ({len(rows)} rows)")
        for row in rows:
            values_sql = ", ".join(_sql_literal(row[c]) for c in columns)
            sql_lines.append(f"INSERT INTO {table_name} ({column_sql}) VALUES ({values_sql});")
        sql_lines.append("")
    sql_path = sql_dir / "seed_data.sql"
    sql_path.write_text("\n".join(sql_lines), encoding="utf-8")
    files["sql/seed_data.sql"] = str(sql_path)

    # Ground truth dataset (labels only, never engine inputs).
    gt_path = output_dir / "ground_truth.csv"
    ground_truth = []
    for exc in db.query(ExceptionRecord).all():
        ground_truth.append(
            {
                "exception_id": exc.exception_id,
                "sku": exc.sku,
                "issue_type": exc.issue_type,
                "severity": exc.severity,
                "expected_status": "BLOCKED" if exc.issue_type != "MISSING_PRICE_CHANGE_REASON" else "FLAGGED",
                "resolution_status": exc.resolution_status,
                "decision_id": exc.decision_id or "",
                "label_source": "injected_edge_case",
            }
        )
    if ground_truth:
        with gt_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(ground_truth[0].keys()))
            writer.writeheader()
            writer.writerows(ground_truth)
    files["ground_truth.csv"] = str(gt_path)

    # Source manifest.
    manifest = {
        "generator_version": synthetic_data_service.GENERATOR_VERSION,
        "seed": synthetic_data_service.GENERATOR_SEED,
        "dataset_mode": mode,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "checksum": summary.get("checksum"),
        "record_counts": {
            "products": len(table_rows.get("products", [])),
            "cost_history": len(table_rows.get("cost_history", [])),
            "price_history": len(table_rows.get("price_history", [])),
            "competitor_observations": len(table_rows.get("competitor_observations", [])),
            "inventory_snapshots": len(table_rows.get("inventory_snapshots", [])),
            "promotions": len(table_rows.get("promotions", [])),
            "pricing_decisions": len(table_rows.get("pricing_decisions", [])),
            "exceptions": len(table_rows.get("exceptions", [])),
            "customer_orders": len(table_rows.get("customer_orders", [])),
        },
        "sources": [
            {"source_type": "synthetic", "record_id": f"SKU-{i:06d}", "note": "deterministic generator"}
            for i in range(1, 101)
        ],
        "files": list(files.keys()),
    }
    manifest_path = output_dir / "source_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    files["source_manifest.json"] = str(manifest_path)

    # Validation summary.
    validation = data_validation_service.validate_dataset(db)
    validation["dataset_mode"] = mode
    validation_path = output_dir / "validation_summary.json"
    validation_path.write_text(json.dumps(validation, indent=2), encoding="utf-8")
    files["validation_summary.json"] = str(validation_path)

    return files
