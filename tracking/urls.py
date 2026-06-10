from django.urls import path
from .views import (
    OsmAndTrackingView,
    DashboardStatsView,
    VehicleStatusDistributionView,
    DriverBehaviourView,
    SpeedHistoryView,
    FleetActivityView,
    ReportsView,
    LatestLocationsView,
    VehicleLocationHistoryView,
    VehicleRouteView,
    RecentActivitiesView,
)

urlpatterns = [
    # GPS Data Ingestion
    path('osmand/', OsmAndTrackingView.as_view(), name='osmand-tracking'),
    
    # Live Tracking
    path('vehicles/latest/', LatestLocationsView.as_view(), name='latest-locations'),
    path('vehicles/<int:vehicle_id>/history/', VehicleLocationHistoryView.as_view(), name='vehicle-history'),
    path('vehicles/<int:vehicle_id>/route/', VehicleRouteView.as_view(), name='vehicle-route'),
    
    # Analytics
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('vehicle-status-distribution/', VehicleStatusDistributionView.as_view(), name='vehicle-status-distribution'),
    path('driver-behaviour/', DriverBehaviourView.as_view(), name='driver-behaviour'),
    path('speed-history/', SpeedHistoryView.as_view(), name='speed-history'),
    path('fleet-activity/', FleetActivityView.as_view(), name='fleet-activity'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('recent-activities/', RecentActivitiesView.as_view(), name='recent-activities'),
]

