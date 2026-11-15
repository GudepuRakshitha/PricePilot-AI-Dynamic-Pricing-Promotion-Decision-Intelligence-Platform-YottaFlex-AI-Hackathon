# PricePilot AI — Hackathon Demonstration Script
# 5-7 minute demonstration of the Dynamic Pricing & Promotion Decision Intelligence Platform

## Demo Title: "Real-Time Dynamic Pricing Intelligence with Explainable AI"

---

## 1. Problem Statement (1 minute)

**Business Challenge:**
- Retailers and e-commerce platforms face constant price pressure from competitors
- Manual price optimization is time-consuming and inconsistent
- Promotions need careful stacking to avoid margin erosion
- Inventory levels need to be balanced with pricing decisions
- Compliance with margin constraints requires constant monitoring

**PricePilot AI Solves:**
- Automated price optimization with floor/ceiling constraints
- Promotional eligibility and stacking validation
- Competitor price intelligence with staleness warnings
- Inventory-aware pricing decisions
- Full explainability — every price change is traceable

---

## 2. Solution Overview (1 minute)

**Architecture:**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + Pydantic + Alembic + PostgreSQL 18
- **Data**: Deterministic synthetic data (seed 20261022)
- **Pricing Engine**: Rule-based with floor, ceiling, margin constraints
- **RBAC**: Three roles — Analyst, Manager, Admin

**Key Features Demonstrated:**
1. Login with role-based access
2. Dashboard KPIs from real database records
3. Pricing simulation with floor/ceiling validation
4. Decision center — approve/block pricing decisions
5. Exception tracking for edge cases
6. Competitor price monitoring
7. Promotion management with stacking rules
8. Analytics and audit logging

---

## 3. Live Demonstration (3-4 minutes)

### Step 1: Login (30 seconds)

```
URL: http://localhost:5173
Credentials: analyst@pricepilot.ai / Analyst@12345
```

*Navigates to dashboard — KPIs load from actual PostgreSQL data*

---

### Step 2: Dashboard — KPIs from DB (45 seconds)

**Key Performance Indicators displayed (all from actual DB records):**

- **Revenue**: ₹4,559,719.97 — computed from `SELECT SUM(revenue) FROM customer_orders`
- **Gross Profit**: ₹1,141,887.85 — computed from order profitability
- **Average Margin**: 25.04% — from approved pricing decisions
- **Inventory Value**: ₹66,017,814.13 — from inventory snapshots × cost history
- **Active Promotions**: 14 — from promotions table
- **Open Exceptions**: 3 — from exceptions table with resolution_status='OPEN'
- **Competitor Deviations**: 40 — stale observations FLAGGED with warnings

*Point out that all metrics are from actual PostgreSQL records, not fabricated*

---

### Step 3: Products Page — 100 SKU Catalog (45 seconds)

- Browse product catalog with filtering and search
- SKUs: SKU-000001 through SKU-000100
- Categories: Electronics, Home & Kitchen, Fitness, etc.
- Real product data generated with seed 20261022
- Demonstrate sort and search functionality

---

### Step 4: Cost Management (45 seconds)

- View cost history per SKU
- Cost ID format: `COST-SKU-000001-202601` (YYYYMM format)
- Demonstrate cost record creation with admin role
- Show how cost changes propagate to price floor calculations

---

### Step 5: Pricing Simulator (60 seconds)

**Demonstrate the pricing engine with real data:**

1. Select SKU-000001 from the product list
2. Open the Pricing Simulator
3. The engine computes:
   - **Cost basis**: from cost_history table
   - **Price floor**: `max(cost × (1 + min_margin), ...)` 
   - **Price ceiling**: `min(cost × (1 + max_margin), ...)`
   - **Recommended price**: based on demand level and signals

4. **Scenario**: Demand = HIGH, Stock = 50
   - Engine recommends price with full explainability
   - Shows: "Floor: ₹1200, Ceiling: ₹2400, Recommended: ₹1450"
   - Margin calculation: `((1450 - 1000) / 1450) × 100 = 31.03%`

5. **Constraint validation**:
   - Price below floor → BLOCKED with PRICE_BELOW_FLOOR exception
   - Price above ceiling → BLOCKED with margin violation
   - All decisions require margin >= MIN_PROFIT_MARGIN_PCT (25.04%)

*Key message: The pricing engine is deterministic and rule-based, not "black box AI"*

---

### Step 6: Decision Center — Approve/Block (60 seconds)

**Demonstrate the decision approval workflow:**

1. Navigate to Decision Center
2. View pending decisions (20 total: 19 approved/5 blocked/1 flagged)
3. **Approve a decision**: 
   - Recommended price meets all constraints
   - Margin >= MIN_PROFIT_MARGIN_PCT
   - Status changes from PROPOSED → APPROVED
   - PriceHistory record created automatically

4. **Block a decision**:
   - Set price below floor (e.g., ₹800 when floor is ₹1200)
   - Decision status: BLOCKED
   - Exception auto-created: PRICE_BELOW_FLOOR
   - PriceHistory NOT written — blocked decisions remain proposals

5. **Show decision detail**:
   - Decision ID, SKU, recommended price, reason
   - Approval timestamp (if approved)
   - Associated exception (if blocked)
   - Full audit trail

*Key message: Only APPROVED decisions write to PriceHistory; blocked decisions stay as proposals with exceptions*

---

### Step 7: Exceptions — Edge Case Tracking (45 seconds)

**Five required edge cases displayed:**

1. **PRICE_BELOW_FLOOR** — 3 open exceptions (price set below floor)
2. **PROMOTION_STACK_VIOLATION** — 2 exceptions (stacking would exceed max discount)
3. **STALE_COMPETITOR_OBSERVATION** — 40 deviations flagged; signal excluded but not hard-blocked
4. **INCORRECT_MARGIN_CALCULATION** — margin recalculated and validated
5. **MISSING_PRICE_CHANGE_REASON** — all price changes require documented reason

*View exception details, severity, resolution status, and remediation actions*

---

### Step 8: Competitor Intelligence (45 seconds)

- View competitor price deviations per SKU
- Stale observations marked with ⚠️ FLAGGED warning
- Stale observations: signal excluded from pricing engine, but does NOT block decision
- Fresh competitor data (within COMPETITOR_FRESHNESS_DAYS = 7 days) used in pricing
- Demonstrate toggle to show stale vs. fresh observations

---

### Step 9: Promotions Management (45 seconds)

- List 50 active promotions (seed data)
- Create new promotion with discount rules
- Stacking validation: `stacking_allowed` and `max_discount_percent` enforcement
- Promotion eligibility: applicable_categories, applicable_brands
- Demonstrate promotion overlap check — ensure no stack violations

---

### Step 10: Analytics & Audit (45 seconds)

**Analytics page:**
- Revenue trends over time (from customer_orders)
- Margin analysis by product category
- Top-performing products by gross profit
- Inventory risk assessment
- Validation report from analytics API

**Audit page:**
- Immutable action log of all system changes
- Filter by entity type, actor, action, timestamp
- Show audit facets (most active entities, action distribution)
- Demonstrate that every API call, decision, and price change is logged
- Key: audit_log entity_type, action, actor, old_value, new_value

---

### Step 11: Settings — Admin Configuration (45 seconds)

- System settings with MIN_PROFIT_MARGIN_PCT = 25.04%
- MAX_PROFIT_MARGIN_PCT = 60.0%
- COMPETITOR_FRESHNESS_DAYS = 7
- Demand multipliers: HIGH=1.08, MEDIUM=1.0, LOW=0.95
- User role management
- Demonstrate that manager role can approve/block; admin has full access

---

## 4. Technical Highlights (30 seconds)

**Pricing Engine Formulas:**
```
Floor = max(Cost × (1 + MIN_PROFIT_MARGIN_PCT), Cost × (1 + Signal Buffer))
Ceiling = min(Cost × (1 + MAX_PROFIT_MARGIN_PCT), Competitor × (1 + Buffer))
Actual Margin = ((Price - Cost) / Price) × 100
```

**Key Design Decisions:**
- ✅ Deterministic seed 20261022 — reproducible results
- ✅ Floor/ceiling with full explainability — no black box
- ✅ Stale competitor = FLAGGED warning, signal excluded (not hard-blocked)
- ✅ Only APPROVED decisions write PriceHistory
- ✅ Alembic migrations as schema source of truth
- ✅ RBAC: ADMIN/PRICING_MANAGER for writes; user admin requires ADMIN
- ✅ Full test coverage: 5/5 Pytest business rule tests pass, 24/24 data-validation checks

**Architecture:**
- Frontend ↔ Backend via /api/v1 proxy
- PostgreSQL 18 as source of truth for all KPIs
- Docker Compose for deployment
- Swagger/OpenAPI documentation at /api/docs

---

## 5. Closing (15 seconds)

**Value Proposition:**
- PricePilot AI reduces price optimization time from days to minutes
- Full explainability — every price change is traceable and justifiable
- Real database-driven KPIs, no fabricated metrics
- Deterministic seed 20261022 ensures reproducibility
- Enterprise-ready with PostgreSQL, Alembic migrations, RBAC, and full audit trail

**Contact & Repository:**
- GitHub: https://github.com/GudepuRakshitha/PricePilot-AI-Dynamic-Pricing-Promotion-Decision-Intelligence-Platform-YottaFlex-AI-Hackathon.git
- Backend: http://localhost:8000/docs (Swagger)
- Frontend: http://localhost:5173
- Demo credentials: analyst@pricepilot.ai / Analyst@12345, manager@pricepilot.ai / Manager@12345, admin@pricepilot.ai / Admin@12345

---
*Demonstration complete — thank you for exploring PricePilot AI!*