"""
Test if Driver Info and Vehicle Info Reports APIs are working
Run: python manage.py shell < test_info_reports_api.py
"""

print("=" * 80)
print("TESTING INFO REPORTS APIs")
print("=" * 80)

from fleet.models import Driver, Vehicle
from django.test.client import RequestFactory
from fleet.info_reports_views import DriverInfoReportsViewSet, VehicleInfoReportsViewSet
from django.contrib.auth.models import AnonymousUser

# Create a fake request
factory = RequestFactory()

print("\n1. CHECKING DRIVERS:")
print("-" * 80)

drivers_count = Driver.objects.count()
print(f"   Total Drivers in Database: {drivers_count}")

if drivers_count > 0:
    print("\n   Testing Driver Info Reports API...")
    try:
        # Create fake request
        request = factory.get('/api/fleet/reports/drivers/detailed_list/?days=30')
        request.user = AnonymousUser()
        
        # Call the viewset
        viewset = DriverInfoReportsViewSet()
        viewset.request = request
        response = viewset.detailed_list(request)
        
        print(f"   ✅ API Response Status: {response.status_code}")
        print(f"   ✅ Number of Drivers Returned: {len(response.data)}")
        
        if len(response.data) > 0:
            print("\n   Sample Driver Data:")
            driver = response.data[0]
            print(f"      Name: {driver['name']}")
            print(f"      Employee ID: {driver['employee_id']}")
            print(f"      Status: {'Active' if driver['is_active'] else 'Inactive'}")
            print(f"      Current Vehicle: {driver['current_vehicle']}")
            print(f"      Safety Score: {driver['safety_score']}")
            print(f"      Total Distance: {driver['total_distance']} km")
            print(f"      Total Trips: {driver['total_trips']}")
    except Exception as e:
        print(f"   ❌ API Error: {str(e)}")
else:
    print("   ⚠️  No drivers found. Add drivers first!")

print("\n2. CHECKING VEHICLES:")
print("-" * 80)

vehicles_count = Vehicle.objects.count()
print(f"   Total Vehicles in Database: {vehicles_count}")

if vehicles_count > 0:
    print("\n   Testing Vehicle Info Reports API...")
    try:
        # Create fake request
        request = factory.get('/api/fleet/reports/vehicles/detailed_list/?days=30')
        request.user = AnonymousUser()
        
        # Call the viewset
        viewset = VehicleInfoReportsViewSet()
        viewset.request = request
        response = viewset.detailed_list(request)
        
        print(f"   ✅ API Response Status: {response.status_code}")
        print(f"   ✅ Number of Vehicles Returned: {len(response.data)}")
        
        if len(response.data) > 0:
            print("\n   Sample Vehicle Data:")
            vehicle = response.data[0]
            print(f"      License Plate: {vehicle['license_plate']}")
            print(f"      Make/Model: {vehicle['make']} {vehicle['model']}")
            print(f"      Year: {vehicle['year']}")
            print(f"      Status: {vehicle['status']}")
            print(f"      Current Driver: {vehicle['current_driver']}")
            print(f"      Total Distance: {vehicle['total_distance']} km")
            print(f"      Avg Utilization: {vehicle['avg_utilization']}%")
    except Exception as e:
        print(f"   ❌ API Error: {str(e)}")
else:
    print("   ⚠️  No vehicles found. Add vehicles first!")

print("\n" + "=" * 80)
print("CONCLUSION:")
print("=" * 80)

if drivers_count > 0 and vehicles_count > 0:
    print("""
✅ You have drivers and vehicles!

The Driver Info Reports and Vehicle Info Reports should now show:
- Basic information (name, license, status, assignment)
- Performance metrics (will be 0 if no analytics data recorded yet)

If you still see "No data available" in the frontend:
1. Make sure backend is running: python manage.py runserver 0.0.0.0:8000
2. Make sure frontend is running: npm run dev (in tlms_frontend folder)
3. Check browser console (F12) for API errors
4. Try accessing directly: http://localhost:8000/api/fleet/reports/drivers/detailed_list/

Note: Charts will show "No data" if analytics metrics are all zero.
To see meaningful charts, generate sample analytics data:
    python manage.py shell < generate_sample_analytics_data.py
""")
else:
    print("""
⚠️  You need to add drivers and/or vehicles first!

Go to:
- http://localhost:8000/admin (Django Admin)
- Or use the Drivers/Vehicles pages in the frontend

Once you have drivers and vehicles, they will appear in:
- Driver Info Reports
- Vehicle Info Reports
""")

print("=" * 80)
