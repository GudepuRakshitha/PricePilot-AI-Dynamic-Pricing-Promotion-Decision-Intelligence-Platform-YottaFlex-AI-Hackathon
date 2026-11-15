"""Generate and export the deterministic PricePilot AI dataset.

Usage:
    python scripts/generate_dataset.py --mode starter
    python scripts/generate_dataset.py --mode full --reset
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import Base, SessionLocal, engine
from app.models import __all__  # noqa: F401
from app.services import data_export_service, data_validation_service, seed_service


def reset_tables() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate deterministic PricePilot AI dataset")
    parser.add_argument("--mode", choices=["starter", "full"], default="starter")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate all tables first")
    parser.add_argument("--output", default=str(ROOT.parent / "dataset" / "generated"))
    args = parser.parse_args()

    if args.reset:
        reset_tables()
    else:
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_service.seed_users(db)
        summary = seed_service.seed_demo_data(db, mode=args.mode)
        output_dir = Path(args.output) / args.mode
        files = data_export_service.export_dataset(db, output_dir, args.mode, summary)
        validation = data_validation_service.validate_dataset(db)
        print(json.dumps({"summary": summary, "validation": validation, "files": files}, indent=2, default=str))
        return 0 if validation["passed"] else 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
