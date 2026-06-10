import os
import django
import sys
import urllib.request
import json

sys.path.append('d:/AI Project/AI-Powered-Transportation-Logistics-Management-System-TLMS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tlms_backend.settings')
django.setup()

from fleet.models import Driver, Vehicle
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import User

# Get token
user = User.objects.first()
token = str(RefreshToken.for_user(user).access_token)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

def make_request(method, url, data=None):
    req = urllib.request.Request(url, method=method, headers=headers)
    if data:
        req.data = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

# Setup test data
d = Driver.objects.first()
v = Vehicle.objects.first()

if not d or not v:
    print("Need at least one driver and vehicle in DB")
    sys.exit(1)

print(f"Testing with Driver: {d.id} and Vehicle: {v.id}")

# Assign driver to vehicle
v.current_driver = d
v.status = 'ACTIVE'
v.save()
d.is_active = True
d.save()

# Check endpoint
_, data = make_request('GET', f'http://localhost:8000/api/fleet/drivers/{d.id}/')
print("Before PATCH Driver:", data.get('assigned_vehicle_plate'))

# PATCH Driver
status, data = make_request('PATCH', f'http://localhost:8000/api/fleet/drivers/{d.id}/', {'is_active': False})
print("PATCH Driver Response:", status, data.get('is_active'), data.get('assigned_vehicle_plate'))

# Check Vehicle endpoint
status, data = make_request('GET', f'http://localhost:8000/api/fleet/vehicles/{v.id}/')
print("After Driver PATCH, Vehicle state:", data.get('current_driver'))

# Re-assign
v.current_driver = d
v.status = 'ACTIVE'
v.save()
d.is_active = True
d.save()

# Check Vehicle endpoint
_, data = make_request('GET', f'http://localhost:8000/api/fleet/vehicles/{v.id}/')
print("Before PATCH Vehicle:", data.get('status'), data.get('current_driver'))

# PATCH Vehicle
status, data = make_request('PATCH', f'http://localhost:8000/api/fleet/vehicles/{v.id}/', {'status': 'INACTIVE'})
print("PATCH Vehicle Response:", status, data.get('status'), data.get('current_driver'))
