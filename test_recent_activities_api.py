"""
Test the recent activities API endpoint
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tlms_backend.settings')
django.setup()

from tracking.views import RecentActivitiesView
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from rest_framework.request import Request

print("Testing Recent Activities API...")

try:
    User = get_user_model()
    user = User.objects.first()
    
    factory = APIRequestFactory()
    django_request = factory.get('/api/tracking/recent-activities/?limit=10')
    
    # Wrap in DRF Request
    request = Request(django_request)
    force_authenticate(request, user=user)
    
    view = RecentActivitiesView()
    response = view.get(request)
    
    print("\n✅ SUCCESS!")
    print(f"Response status: {response.status_code}")
    print(f"Number of activities: {len(response.data)}")
    
    if response.data:
        print(f"\nFirst activity:")
        first = response.data[0]
        print(f"  Type: {first.get('type')}")
        print(f"  Message: {first.get('message')}")
        print(f"  User: {first.get('user')}")
        print(f"  Time: {first.get('time')}")
    else:
        print("\nNo activities found in audit trail")
    
except Exception as e:
    print(f"\n❌ ERROR: {type(e).__name__}")
    print(f"Message: {str(e)}")
    
    import traceback
    print("\nFull traceback:")
    traceback.print_exc()
