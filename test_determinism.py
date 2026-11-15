import sys
sys.path.insert(0, r'C:\CandidateWorkspace\backend')

from app.services.synthetic_data_service import generate_and_persist
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from app.models.base import Base

def generate_full():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    result = generate_and_persist(db, mode='full')
    db.close()
    return result

# Generate twice with same seed
result1 = generate_full()
result2 = generate_full()

print('Determinism check:')
print(f'  Run 1 - SKUs: {result1["skus_generated"]}, Days: {result1["days_of_history"]}, Promos: {result1["promotions_generated"]}')
print(f'  Run 2 - SKUs: {result2["skus_generated"]}, Days: {result2["days_of_history"]}, Promos: {result2["promotions_generated"]}')
print(f'  SKUs match: {result1["skus_generated"] == result2["skus_generated"]}')
print(f'  Promos match: {result1["promotions_generated"] == result2["promotions_generated"]}')
print(f'  Days match: {result1["days_of_history"] == result2["days_of_history"]}')
print(f'  All match: {result1 == result2}')