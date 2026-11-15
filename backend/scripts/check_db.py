"""Verify PostgreSQL connectivity and print schema status."""

from __future__ import annotations

from sqlalchemy import inspect, text

from app.core.config import settings
from app.core.database import engine


def masked(url: str) -> str:
    if "@" not in url:
        return url
    prefix, rest = url.split("@", 1)
    scheme, creds = prefix.split("://", 1)
    user = creds.split(":", 1)[0]
    return f"{scheme}://{user}:***@{rest}"


def main() -> None:
    print("DATABASE_URL:", masked(settings.DATABASE_URL))
    with engine.connect() as conn:
        version = conn.execute(text("select version()")).scalar_one()
        db = conn.execute(text("select current_database()")).scalar_one()
        user = conn.execute(text("select current_user")).scalar_one()
        print("CONNECTED:", db, "as", user)
        print("VERSION:", version[:60])
    tables = inspect(engine).get_table_names()
    print("TABLES:", tables if tables else "(none)")


if __name__ == "__main__":
    main()
