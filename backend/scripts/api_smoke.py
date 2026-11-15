"""End-to-end API smoke test against the configured database."""

from __future__ import annotations

import sys

from fastapi.testclient import TestClient

from app.main import app

FAILURES: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status} {label}{(' - ' + detail) if detail else ''}")
    if not condition:
        FAILURES.append(label)


with TestClient(app) as client:
    r = client.get("/health")
    check("health", r.status_code == 200 and r.json()["status"] == "ok")

    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@pricepilot.ai", "password": "Admin@12345"},
    )
    check("login", r.status_code == 200, f"HTTP {r.status_code}")
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/v1/auth/me", headers=headers)
    check("me", r.status_code == 200 and r.json()["role"] == "ADMIN")

    r = client.get("/api/v1/products?limit=3", headers=headers)
    check("products", r.status_code == 200 and r.json()["total"] > 0)
    sku = r.json()["items"][0]["sku"]

    r = client.get(f"/api/v1/products/{sku}", headers=headers)
    check("product_detail", r.status_code == 200)

    r = client.get(f"/api/v1/products/{sku}/overview", headers=headers)
    check("product_overview", r.status_code == 200 and "product" in r.json())

    r = client.get("/api/v1/products/facets", headers=headers)
    check("product_facets", r.status_code == 200 and len(r.json()["categories"]) > 0)

    r = client.get("/api/v1/costs?limit=2", headers=headers)
    check("costs", r.status_code == 200 and r.json()["total"] > 0)

    r = client.get(f"/api/v1/inventory?sku={sku}", headers=headers)
    check("inventory", r.status_code == 200 and r.json()["total"] > 0)

    r = client.get(f"/api/v1/competitors?sku={sku}", headers=headers)
    check("competitors", r.status_code == 200 and isinstance(r.json()["items"], list))

    r = client.get("/api/v1/competitors/positions?limit=5", headers=headers)
    check("competitor_positions", r.status_code == 200 and "items" in r.json())

    r = client.get("/api/v1/promotions?limit=5", headers=headers)
    check("promotions", r.status_code == 200 and "counts" in r.json())

    r = client.get("/api/v1/decisions?limit=5", headers=headers)
    check("decisions", r.status_code == 200 and "counts" in r.json())

    r = client.get("/api/v1/decisions/summary", headers=headers)
    check("decision_summary", r.status_code == 200 and "total" in r.json())

    r = client.get("/api/v1/exceptions?limit=5", headers=headers)
    check("exceptions", r.status_code == 200 and "counts" in r.json())

    r = client.get("/api/v1/exceptions/summary", headers=headers)
    check("exception_summary", r.status_code == 200 and "total" in r.json())

    r = client.get("/api/v1/analytics/summary", headers=headers)
    check("analytics_summary", r.status_code == 200 and "dashboard" in r.json())
    print("   dashboard:", r.json()["dashboard"])

    for path in ("categories", "top-products", "inventory-risk", "validation", "orders"):
        r = client.get(f"/api/v1/analytics/{path}", headers=headers)
        check(f"analytics_{path}", r.status_code == 200)

    r = client.post(
        "/api/v1/pricing/simulate",
        json={
            "sku": sku,
            "scenarios": [
                {"demand_level": "HIGH", "available_stock": 5, "competitor_price": 1800}
            ],
        },
        headers=headers,
    )
    check("pricing_simulate", r.status_code == 200 and len(r.json()["scenarios"]) >= 2)
    print(
        "   baseline:",
        r.json()["scenarios"][0]["final_price"],
        r.json()["scenarios"][0]["status"],
    )

    r = client.get("/api/v1/audit?limit=5", headers=headers)
    check("audit", r.status_code == 200 and "items" in r.json())

    r = client.get("/api/v1/audit/facets", headers=headers)
    check("audit_facets", r.status_code == 200 and "entity_types" in r.json())

    r = client.get("/api/v1/system/settings", headers=headers)
    check("system_settings", r.status_code == 200 and "pricing_rules" in r.json())

    r = client.get("/api/v1/system/database", headers=headers)
    check("system_database", r.status_code == 200 and r.json()["status"] == "connected")

    r = client.get("/api/v1/synthetic/validation", headers=headers)
    check("synthetic_validation", r.status_code == 200 and r.json()["passed"] is True)

    r = client.get("/api/v1/users", headers=headers)
    check("users_admin", r.status_code == 200)

    r = client.get("/openapi.json")
    check("openapi", r.status_code == 200 and len(r.json()["paths"]) >= 40)

    # Negative checks: unauthenticated and invalid payload handling.
    r = client.get("/api/v1/products")
    check("auth_required", r.status_code == 401)

    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@pricepilot.ai", "password": "wrong-password"},
    )
    check("invalid_login_rejected", r.status_code == 401)

    r = client.get("/api/v1/products", headers={**headers, "Authorization": "Bearer invalid"})
    check("invalid_token_rejected", r.status_code == 401)

print()
if FAILURES:
    print(f"FAILED ({len(FAILURES)}):", ", ".join(FAILURES))
    sys.exit(1)
print("ALL CHECKS PASSED")
