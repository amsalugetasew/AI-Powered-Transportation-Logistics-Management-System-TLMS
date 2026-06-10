"""
Test the utilization summary API endpoint
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tlms_backend.settings')
django.setup()

from fleet.analytics_views import VehicleUtilizationAnalyticsViewSet
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from rest_framework.request import Request

print("Testing Utilization Summary API...")

try:
    User = get_user_model()
    user = User.objects.first()
    
    factory = APIRequestFactory()
    django_request = factory.get('/api/fleet/analytics/utilization/summary/?days=30')
    
    # Wrap in DRF Request
    request = Request(django_request)
    force_authenticate(request, user=user)
    
    viewset = VehicleUtilizationAnalyticsViewSet()
    viewset.action = 'summary'
    viewset.request = request
    viewset.format_kwarg = None
    
    response = viewset.summary(request)
    print("\n✅ SUCCESS!")
    print(f"Response status: {response.status_code}")
    print(f"Response data keys: {list(response.data.keys())}")
    print(f"\nData summary:")
    print(f"  Period days: {response.data.get('period_days')}")
    print(f"  Totals: {response.data.get('totals')}")
    
except Exception as e:
    print(f"\n❌ ERROR: {type(e).__name__}")
    print(f"Message: {str(e)}")
    
    import traceback
    print("\nFull traceback:")
    traceback.print_exc()
