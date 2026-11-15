import sys
sys.path.insert(0, r'C:\CandidateWorkspace\backend')

from app.services.synthetic_data_service import generate_and_persist
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from app.models.base import Base

engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

result = generate_and_persist(db, mode='full')

print('Full dataset generated:')
print(f'  SKUs: {result["skus_generated"]}')
print(f'  Days: {result["days_of_history"]}')
print(f'  Promos: {result["promotions_generated"]}')
print(f'  Costs: {result["cost_records"]}')
print(f'  Prices: {result["price_records"]}')
print(f'  Orders: {result["orders_created"]}')
print(f'  Decisions: {result["decisions_created"]}')
print(f'  Competitor observations: {result["competitor_observations"]}')
print(f'  Inventory snapshots: {result["inventory_snapshots"]}')

db.close()