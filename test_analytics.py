import requests

# Test all analytics endpoints
r = requests.post('http://localhost:8000/api/v1/auth/login', json={'email': 'analyst@pricepilot.ai', 'password': 'Analyst@12345'})
token = r.json()['access_token']
headers = {'Authorization': 'Bearer ' + token}

endpoints = [
    '/analytics/summary',
    '/analytics/categories',
    '/analytics/top-products?limit=6',
    '/analytics/inventory-risk',
    '/analytics/validation',
]

for ep in endpoints:
    r = requests.get('http://localhost:8000' + ep, headers=headers)
    print(ep, ': status=' + str(r.status_code), end='')
    if r.status_code == 200:
        try:
            d = r.json()
            keys = list(d.keys())[:10]
            print(' keys=' + str(keys), end='')
            if 'kpis' in d:
                print(' kpis=' + str(d['kpis']), end='')
            if 'dashboard' in d:
                print(' dashboard_keys=' + str(list(d['dashboard'].keys())), end='')
        except:
            pass
    print()