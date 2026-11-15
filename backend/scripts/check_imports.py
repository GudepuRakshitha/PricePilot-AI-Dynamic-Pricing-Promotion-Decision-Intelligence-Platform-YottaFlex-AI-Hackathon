"""Smoke check: import the application and build the schema."""

from app.core.database import Base, engine
from app.main import app  # noqa: F401
from app.models import __all__  # noqa: F401

Base.metadata.create_all(bind=engine)
print("IMPORT_OK")
print("TABLES:", sorted(Base.metadata.tables.keys()))
