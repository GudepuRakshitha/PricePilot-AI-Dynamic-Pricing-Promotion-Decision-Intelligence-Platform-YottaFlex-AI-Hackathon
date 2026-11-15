import sys
sys.path.insert(0, r'C:\CandidateWorkspace\backend')

# Test importing the models
from app.models import product, price_history, cost_history, inventory, competitor, promotion
from app.models.order import CustomerOrder
from app.models import pricing_decision

print("All imports successful!")
print("Product:", product.Product)
print("CustomerOrder:", CustomerOrder)
print("PricingDecision:", pricing_decision.PricingDecision)