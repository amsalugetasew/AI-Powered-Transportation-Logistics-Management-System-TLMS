"""
Debug API Issue - Check if backend can return data
Run: python manage.py shell < debug_api_issue.py
"""

print("=" * 80)
print("DEBUGGING API ISSUE")
print("=" * 80)

# Step 1: Check if we have data
from fleet.models import Driver, Vehicle

drivers_count = Driver.objects.count()
vehicles_count = Vehicle.objects.count()

print(f"\n1. DATABASE CHECK:")
print(f"   Drivers:  {drivers_count}")
print(f"   Vehicles: {vehicles_count}")

if drivers_count == 0 or vehicles_count == 0:
    print("\n   ❌ You need to add drivers and vehicles first!")
    print("   The API will return empty arrays if no data exists.")
    exit()

# Step 2: Test the ViewSet directly
print(f"\n2. TESTING API VIEWSET:")

try:
    from fleet.info_reports_views import VehicleInfoReportsViewSet, DriverInfoReportsViewSet
    from rest_framework.test import APIRequestFactory
    from django.contrib.auth.models import User
    
    factory = APIRequestFactory()
    
    # Test Vehicle Info API
    print("\n   Testing Vehicle Info API...")
    request = factory.get('/api/fleet/reports/vehicles/detailed_list/?days=30')
    
    # Create or get a user for the request
    try:
        user = User.objects.first()
        if not user:
            user = User.objects.create_user('testuser', 'test@test.com', 'testpass')
    except:
        pass
    
    request.user = user
    
    viewset = VehicleInfoReportsViewSet()
    viewset.format_kwarg = None
    viewset.request = request
    
    response = viewset.detailed_list(request)
    
    print(f"   Response Status: {response.status_code}")
    print(f"   Number of Vehicles: {len(response.data)}")
    
    if len(response.data) > 0:
        print(f"\n   ✅ API IS WORKING!")
        print(f"   Sample vehicle:")
        v = response.data[0]
        print(f"      License: {v['license_plate']}")
        print(f"      Make/Model: {v['make']} {v['model']}")
        print(f"      Status: {v['status']}")
    else:
        print(f"\n   ⚠️  API returns empty array even though vehicles exist")
        
except Exception as e:
    print(f"   ❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

# Step 3: Check URL configuration
print(f"\n3. CHECKING URL CONFIGURATION:")

try:
    from django.urls import resolve
    from django.urls.exceptions import Resolver404
    
    try:
        match = resolve('/api/fleet/reports/vehicles/detailed_list/')
        print(f"   ✅ URL is registered")
        print(f"   View: {match.func}")
    except Resolver404:
        print(f"   ❌ URL not found!")
        print(f"   Make sure fleet/urls.py includes:")
        print(f"   router.register(r'reports/vehicles', VehicleInfoReportsViewSet, basename='vehicle-reports')")
        
except Exception as e:
    print(f"   Error checking URLs: {str(e)}")

# Step 4: Provide curl command for manual testing
print(f"\n4. MANUAL API TEST:")
print(f"   If backend is running on http://localhost:8000, open this URL in browser:")
print(f"   http://localhost:8000/api/fleet/reports/vehicles/detailed_list/?days=30")
print(f"\n   Or use curl:")
print(f"   curl http://localhost:8000/api/fleet/reports/vehicles/detailed_list/?days=30")

print("\n" + "=" * 80)
print("NEXT STEPS:")
print("=" * 80)
print("""
1. Make sure backend is running:
   python manage.py runserver 0.0.0.0:8000

2. Test the API URL in your browser:
   http://localhost:8000/api/fleet/reports/vehicles/detailed_list/

   You should see JSON data like:
   [{"id": 1, "license_plate": "ABC-123", ...}]

3. If you see JSON data in browser but NOT in frontend:
   - Open browser console (F12)
   - Go to Network tab
   - Refresh the reporting page
   - Look for the API call
   - Check if it's failing (red) or succeeding (green)
   - Click on it to see the error

4. Common Issues:
   - Backend not running → Start it
   - CORS error → Check settings.py CORS configuration
   - Authentication error → Check if API requires login
   - Wrong URL → Check api.js baseURL configuration
""")
print("=" * 80)
