from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DriverViewSet, VehicleViewSet, VehicleDocumentViewSet
from .analytics_views import (
    DriverBehaviorAnalyticsViewSet,
    FuelCostAnalyticsViewSet,
    MaintenanceCostAnalyticsViewSet,
    VehicleUtilizationAnalyticsViewSet
)
from .info_reports_views import (
    DriverInfoReportsViewSet,
    VehicleInfoReportsViewSet
)
from .compliance_views import (
    LicenseTrackingViewSet,
    AuditTrailViewSet,
    MaintenanceScheduleViewSet,
    AlertViewSet
)

router = DefaultRouter()
router.register(r'drivers', DriverViewSet)
router.register(r'vehicles', VehicleViewSet)
router.register(r'documents', VehicleDocumentViewSet)

# Analytics endpoints
router.register(r'analytics/driver-behavior', DriverBehaviorAnalyticsViewSet, basename='driver-behavior')
router.register(r'analytics/fuel-cost', FuelCostAnalyticsViewSet, basename='fuel-cost')
router.register(r'analytics/maintenance', MaintenanceCostAnalyticsViewSet, basename='maintenance')
router.register(r'analytics/utilization', VehicleUtilizationAnalyticsViewSet, basename='utilization')

# Info Reports endpoints
router.register(r'reports/drivers', DriverInfoReportsViewSet, basename='driver-reports')
router.register(r'reports/vehicles', VehicleInfoReportsViewSet, basename='vehicle-reports')

# Compliance endpoints
router.register(r'compliance/licenses', LicenseTrackingViewSet, basename='license-tracking')
router.register(r'compliance/audit', AuditTrailViewSet, basename='audit-trail')
router.register(r'compliance/maintenance-schedules', MaintenanceScheduleViewSet, basename='maintenance-schedule')
router.register(r'compliance/alerts', AlertViewSet, basename='alerts')

urlpatterns = [
    path('', include(router.urls)),
]
