import os
import django
import sys

sys.path.append('d:/AI Project/AI-Powered-Transportation-Logistics-Management-System-TLMS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tlms_backend.settings')
django.setup()

from fleet.models import Driver, Vehicle
from fleet.serializers import DriverSerializer, VehicleSerializer
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()

# Create a driver and vehicle if they don't exist
d, _ = Driver.objects.get_or_create(employee_id='T001', defaults={'first_name': 'Test', 'last_name': 'Driver', 'license_number': 'L001', 'license_expiry_date': '2030-01-01', 'is_active': True})
v, _ = Vehicle.objects.get_or_create(license_plate='P001', defaults={'vin': 'V001', 'make': 'Test', 'model': 'Car', 'year': 2022, 'status': 'ACTIVE', 'current_driver': d})

# Ensure v is assigned to d
v.current_driver = d
v.status = 'ACTIVE'
v.save()
d.is_active = True
d.save()

print(f"Before Deactivate Driver: Driver is_active={d.is_active}, Vehicle current_driver={v.current_driver}")

# Test Deactivate Driver
request = factory.patch('/', {'is_active': False}, format='json')
serializer = DriverSerializer(d, data={'is_active': False}, partial=True)
if serializer.is_valid():
    serializer.update(d, serializer.validated_data)
else:
    print("Serializer errors:", serializer.errors)

d.refresh_from_db()
v.refresh_from_db()

print(f"After Deactivate Driver: Driver is_active={d.is_active}, Vehicle current_driver={v.current_driver}")

# Reset
v.current_driver = d
v.status = 'ACTIVE'
v.save()
d.is_active = True
d.save()

print(f"Before Deactivate Vehicle: Vehicle status={v.status}, Vehicle current_driver={v.current_driver}")

# Test Deactivate Vehicle
request = factory.patch('/', {'status': 'INACTIVE'}, format='json')
serializer = VehicleSerializer(v, data={'status': 'INACTIVE'}, partial=True)
if serializer.is_valid():
    serializer.update(v, serializer.validated_data)
else:
    print("Serializer errors:", serializer.errors)

d.refresh_from_db()
v.refresh_from_db()

print(f"After Deactivate Vehicle: Vehicle status={v.status}, Vehicle current_driver={v.current_driver}")
