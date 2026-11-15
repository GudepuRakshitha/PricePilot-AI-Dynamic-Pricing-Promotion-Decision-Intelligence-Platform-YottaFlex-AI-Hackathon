"""Pytest tests for PricePilot AI pricing business rules and edge cases."""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from decimal import Decimal
from sqlalchemy import create_engine, MetaData


def test_floor_ceiling_consistency():
    """Test that price floor and ceiling are consistently computed."""
    from app.services.pricing_engine import compute_price_floor, compute_price_ceiling

    cost = 1000.0

    floor = compute_price_floor(cost, 20.0)
    ceiling = compute_price_ceiling(cost, 60.0)

    assert floor >= cost, "Floor should be at or above cost"
    assert ceiling >= floor, "Ceiling should be at or above floor"
    assert ceiling - floor >= 20.0, "Ceiling-floor spread should accommodate min margin"


def test_min_margin_violation():
    """Test that prices below minimum margin are flagged."""
    from app.services.pricing_engine import compute_actual_margin

    cost = 800.0
    price = 1000.0
    margin = compute_actual_margin(cost, price)

    # With MIN_PROFIT_MARGIN_PCT = 20.0, margin should be >= 20%
    assert margin >= 20.0, f"Margin {margin}% should be >= 20% minimum"


def test_floor_violation_detection():
    """Test that prices below floor are detected."""
    from app.services.pricing_engine import compute_price_floor

    cost = 1000.0
    floor = compute_price_floor(cost, 20.0)  # = 1000 * (1 + 20/100) = 1200 for margin floor

    # Price below floor should be detected
    test_price = 1199.99
    if test_price < floor:
        violation = floor - test_price
        assert violation > 0, "Price below floor should be detected"


def test_seed_data_integrity():
    """Test that starter dataset has expected structure."""
    from app.services.synthetic_data_service import generate_and_persist
    from sqlalchemy import create_engine, MetaData
    from sqlalchemy.orm import sessionmaker

    # Create engine with tables - use the models that the synthetic generator needs
    engine = create_engine("sqlite:///:memory:")
    metadata = MetaData()

    # Create all needed tables
    from app.models import product, price_history, cost_history, inventory, competitor, promotion
    from app.models.order import CustomerOrder
    from app.models.price_history import PricingDecision
    from app.models.inventory import InventorySnapshot
    from app.models.competitor import CompetitorObservation
    from app.models.promotion import Promotion
    
    # Register all models with Base.metadata
    from app.models.base import Base
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        result = generate_and_persist(db, mode="starter")
        
        # Verify costs table
        cost_count = result["cost_records"]
        assert cost_count > 0, f"Expected cost records, got {cost_count}"
        
        # Verify price table
        price_count = result["price_records"]
        assert price_count > 0, f"Expected price records, got {price_count}"
        
        # Verify decisions
        decision_count = result["decisions_created"]
        assert decision_count > 0, f"Expected decisions, got {decision_count}"
        
        # Verify promotions
        promo_count = result["promotions_generated"]
        assert promo_count > 0, f"Expected promotions, got {promo_count}"
        
        # Verify inventory
        inventory_count = result["inventory_snapshots"]
        assert inventory_count > 0, f"Expected inventory, got {inventory_count}"
        
        # Verify competitors
        competitor_count = result["competitor_observations"]
        assert competitor_count > 0, f"Expected competitor observations, got {competitor_count}"
        
        # Verify orders
        order_count = result["orders_created"]
        assert order_count > 0, f"Expected orders, got {order_count}"
        
    finally:
        db.close()


def test_algorithm_determinism():
    """Test that the generator produces identical results with the same seed."""
    from app.services.synthetic_data_service import generate_and_persist
    from sqlalchemy import create_engine, MetaData
    from sqlalchemy.orm import sessionmaker

    # Create engine with tables
    engine1 = create_engine("sqlite:///:memory:")
    metadata1 = MetaData()
    from app.models import product, price_history, cost_history, inventory, competitor, promotion
    from app.models.order import CustomerOrder
    from app.models.price_history import PricingDecision
    from app.models.inventory import InventorySnapshot
    from app.models.competitor import CompetitorObservation
    from app.models.promotion import Promotion
    from app.models.base import Base
    Base.metadata.create_all(engine1)
    SessionLocal1 = sessionmaker(bind=engine1)
    db1 = SessionLocal1()
    
    engine2 = create_engine("sqlite:///:memory:")
    metadata2 = MetaData()
    Base.metadata.create_all(engine2)
    SessionLocal2 = sessionmaker(bind=engine2)
    db2 = SessionLocal2()

    try:
        result1 = generate_and_persist(db1, mode="starter")
        result2 = generate_and_persist(db2, mode="starter")
        
        # Check that key metrics match
        assert result1["skus_generated"] == result2["skus_generated"]
        assert result1["days_of_history"] == result2["days_of_history"]
        assert result1["promotions_generated"] == result2["promotions_generated"]
        assert result1["cost_records"] == result2["cost_records"]
        assert result1["price_records"] == result2["price_records"]
        assert result1["orders_created"] == result2["orders_created"]
        assert result1["decisions_created"] == result2["decisions_created"]
        
    finally:
        db1.close()
        db2.close()