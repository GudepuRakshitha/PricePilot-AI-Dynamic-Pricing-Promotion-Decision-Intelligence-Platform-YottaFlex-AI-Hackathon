import json, requests

def test_analytics_role(role_name, email, password):
    """Test analytics endpoints for a given role."""
    print(f"\n=== {role_name} ===")
    
    r = requests.post('http://localhost:8000/api/v1/auth/login', json={'email': email, 'password': password})
    if r.status_code != 200:
        print(f"  Login failed: {r.status_code}")
        return
    
    token = r.json()['access_token']
    headers = {'Authorization': 'Bearer ' + token}
    
    endpoints = [
        ('/api/v1/analytics/summary', 'summary'),
        ('/api/v1/analytics/categories', 'categories'),
        ('/api/v1/analytics/top-products?limit=6', 'top-products'),
        ('/api/v1/analytics/inventory-risk', 'inventory-risk'),
        ('/api/v1/analytics/validation', 'validation'),
    ]
    
    for ep, name in endpoints:
        r = requests.get('http://localhost:8000' + ep, headers=headers)
        status = r.status_code
        has_data = False
        if status == 200:
            try:
                d = r.json()
                has_data = True
                # Print key fields
                print(f"    {name}: status={status}, period={d.get('period')}, dashboard_total={d.get('dashboard', {}).get('total_products')}", end='')
                if 'revenue_trends' in d:
                    print(f", trends_len={len(d.get('revenue_trends', []))}", end='')
                if 'kpis' in d:
                    print(f", kpis={d.get('kpis')}", end='')
                print()
            except Exception as e:
                print(f"    {name}: status={status}, error={e}", end='')
                print()
        else:
            print(f"    {name}: status={status}")
    
    # Also test without /api/v1 prefix
    print(f"  Without /api/v1 prefix:")
    for ep, name in [
        ('/analytics/summary', 'summary'),
        ('/analytics/categories', 'categories'),
    ]:
        r = requests.get('http://localhost:8000' + ep, headers=headers)
        print(f"    {name}: status={r.status_code}")


# Test all three roles
test_analytics_role("Analyst", "analyst@pricepilot.ai", "Analyst@12345")
test_analytics_role("Manager", "manager@pricepilot.ai", "Manager@12345")
test_analytics_role("Admin", "admin@pricepilot.ai", "Admin@12345")