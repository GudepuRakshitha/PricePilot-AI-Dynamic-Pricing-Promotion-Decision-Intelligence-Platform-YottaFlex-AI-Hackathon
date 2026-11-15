import json, requests
r = requests.get('http://localhost:8000/openapi.json')
d = r.json()
paths = list(d.get('paths', {}).keys())
print('Paths count:', len(paths))
for p in paths[:30]:
    print(' ', p)