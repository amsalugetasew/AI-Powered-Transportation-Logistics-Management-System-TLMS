from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from tracking.models import VehicleLocation
from fleet.models import Vehicle, Driver, VehicleAssignmentHistory
from django.db.models import Count, Avg, Max, Min, Q, F
from django.db.models.functions import TruncDate
from datetime import timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class OsmAndTrackingView(APIView):
    """
    Endpoint to receive GPS data from Traccar Client (OsmAnd protocol).
    Traccar Client is a free mobile app available on iOS and Android.
    Example: /api/tracking/osmand/?id=123456789012345&lat=9.03&lon=38.74&speed=40&heading=90
    """
    authentication_classes = [] # Mobile app might not have auth headers
    permission_classes = []

    def get(self, request):
        imei = request.query_params.get('id')
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        speed_knots = request.query_params.get('speed', 0.0)
        heading = request.query_params.get('heading', 0)

        if not all([imei, lat, lon]):
            return Response("Missing parameters", status=400)

        try:
            vehicle = Vehicle.objects.get(device_imei=imei)
        except Vehicle.DoesNotExist:
            logger.warning(f"OsmAnd: Unrecognized IMEI {imei}")
            return Response("Unrecognized IMEI", status=404)

        # Traccar sends speed in knots. Convert to km/h (1 knot = 1.852 km/h)
        speed_kmh = float(speed_knots) * 1.852

        loc = VehicleLocation.objects.create(
            vehicle=vehicle,
            latitude=Decimal(lat),
            longitude=Decimal(lon),
            speed=Decimal(speed_kmh),
            heading=int(float(heading)),
            timestamp=timezone.now()
        )

        # Broadcast via WebSockets
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'live_tracking',
                {
                    'type': 'vehicle_location_update',
                    'data': {
                        'vehicle_id': vehicle.id,
                        'license_plate': vehicle.license_plate,
                        'lat': float(loc.latitude),
                        'lng': float(loc.longitude),
                        'speed': round(float(loc.speed), 1),
                        'heading': loc.heading,
                        'timestamp': loc.timestamp.isoformat()
                    }
                }
            )

        return Response("OK")


# ---------------------------------------------------------------------------
# Analytics API Views
# ---------------------------------------------------------------------------

class DashboardStatsView(APIView):
    """
    GET /api/tracking/dashboard-stats/
    Returns high-level fleet & tracking KPIs for the dashboard.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        now = timezone.now()
        ten_minutes_ago = now - timedelta(minutes=10)

        total_vehicles = Vehicle.objects.count()
        active_vehicles = Vehicle.objects.filter(status='ACTIVE').count()
        inactive_vehicles = Vehicle.objects.filter(status='INACTIVE').count()
        maintenance_vehicles = Vehicle.objects.filter(status='MAINTENANCE').count()

        total_drivers = Driver.objects.count()
        active_drivers = Driver.objects.filter(is_active=True).count()
        inactive_drivers = Driver.objects.filter(is_active=False).count()

        unassigned_vehicles = Vehicle.objects.filter(current_driver__isnull=True).count()
        tracked_vehicles = Vehicle.objects.filter(device_imei__isnull=False).exclude(device_imei='').count()

        # Vehicles that have at least one location record in the last 10 minutes
        online_vehicles = (
            VehicleLocation.objects
            .filter(timestamp__gte=ten_minutes_ago)
            .values('vehicle')
            .distinct()
            .count()
        )

        total_trips = VehicleAssignmentHistory.objects.count()
        speeding_events = VehicleLocation.objects.filter(speed__gt=80).count()

        return Response({
            'total_vehicles': total_vehicles,
            'active_vehicles': active_vehicles,
            'inactive_vehicles': inactive_vehicles,
            'maintenance_vehicles': maintenance_vehicles,
            'total_drivers': total_drivers,
            'active_drivers': active_drivers,
            'inactive_drivers': inactive_drivers,
            'unassigned_vehicles': unassigned_vehicles,
            'tracked_vehicles': tracked_vehicles,
            'online_vehicles': online_vehicles,
            'total_trips': total_trips,
            'speeding_events': speeding_events,
        })


class VehicleStatusDistributionView(APIView):
    """
    GET /api/tracking/vehicle-status-distribution/
    Returns [{status, count}, …] for pie chart data.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        distribution = (
            Vehicle.objects
            .values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        return Response(list(distribution))


class DriverBehaviourView(APIView):
    """
    GET /api/tracking/driver-behaviour/
    Returns behaviour metrics for every driver who has assignment history.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        # Get drivers that have at least one assignment
        drivers_with_assignments = Driver.objects.filter(
            assignment_history__isnull=False
        ).distinct()

        results = []
        for driver in drivers_with_assignments:
            # Vehicles this driver was assigned to
            vehicle_ids = (
                VehicleAssignmentHistory.objects
                .filter(driver=driver)
                .values_list('vehicle_id', flat=True)
                .distinct()
            )

            locations = VehicleLocation.objects.filter(vehicle_id__in=vehicle_ids)
            total_locations = locations.count()
            speeding_events = locations.filter(speed__gt=80).count()

            agg = locations.aggregate(avg_speed=Avg('speed'), max_speed=Max('speed'))
            avg_speed = round(float(agg['avg_speed']), 2) if agg['avg_speed'] is not None else 0.0
            max_speed = round(float(agg['max_speed']), 2) if agg['max_speed'] is not None else 0.0

            # Harsh braking: consecutive locations where speed drops > 30 km/h
            harsh_braking_events = 0
            if total_locations > 1:
                ordered_locations = list(
                    locations.order_by('timestamp').values_list('speed', flat=True)
                )
                for i in range(1, len(ordered_locations)):
                    speed_drop = float(ordered_locations[i - 1]) - float(ordered_locations[i])
                    if speed_drop > 30:
                        harsh_braking_events += 1

            # Score: 100 minus penalties, capped at 0
            score = max(100 - (speeding_events * 2), 0)

            results.append({
                'driver_id': driver.id,
                'employee_id': driver.employee_id,
                'name': f"{driver.first_name} {driver.last_name}",
                'total_locations': total_locations,
                'speeding_events': speeding_events,
                'harsh_braking_events': harsh_braking_events,
                'avg_speed': avg_speed,
                'max_speed': max_speed,
                'score': score,
            })

        return Response(results)


class SpeedHistoryView(APIView):
    """
    GET /api/tracking/speed-history/?vehicle_id=X
    Returns the last 50 location records for a given vehicle.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        vehicle_id = request.query_params.get('vehicle_id')
        if not vehicle_id:
            return Response({'error': 'vehicle_id query parameter is required.'}, status=400)

        locations = (
            VehicleLocation.objects
            .filter(vehicle_id=vehicle_id)
            .order_by('-timestamp')[:50]
        )

        data = [
            {
                'timestamp': loc.timestamp.isoformat(),
                'speed': round(float(loc.speed), 2),
                'lat': float(loc.latitude),
                'lng': float(loc.longitude),
            }
            for loc in locations
        ]

        # Return in chronological order (oldest first)
        data.reverse()
        return Response(data)


class FleetActivityView(APIView):
    """
    GET /api/tracking/fleet-activity/
    Groups VehicleLocation by day for the last 7 days.
    Returns [{date, location_count}, …] for a bar chart.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)

        activity = (
            VehicleLocation.objects
            .filter(timestamp__gte=seven_days_ago)
            .annotate(date=TruncDate('timestamp'))
            .values('date')
            .annotate(location_count=Count('id'))
            .order_by('date')
        )

        data = [
            {
                'date': entry['date'].isoformat(),
                'location_count': entry['location_count'],
            }
            for entry in activity
        ]

        return Response(data)


class ReportsView(APIView):
    """
    GET /api/tracking/reports/?report_type=fleet_summary|driver_performance|vehicle_utilization
    Returns report data based on the requested type.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        report_type = request.query_params.get('report_type', 'fleet_summary')

        # Determine response format (json, csv, pdf)
        fmt = request.query_params.get('format', 'json').lower()
        if fmt not in ('json', 'csv', 'pdf'):
            return Response({'error': f"Unsupported format '{fmt}'. Choose json, csv, or pdf."}, status=400)
        if fmt == 'json':
            return self._fleet_summary()
        # CSV response
        if fmt == 'csv':
            # Build CSV rows similar to fleet_summary data
            import csv
            from django.http import HttpResponse
            # Reuse fleet summary logic to get data list
            data_resp = self._fleet_summary()
            data = data_resp.data if hasattr(data_resp, 'data') else []
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="fleet_summary.csv"'
            writer = csv.writer(response)
            # Header
            writer.writerow([
                'vehicle_id', 'license_plate', 'make', 'model', 'status',
                'driver', 'last_lat', 'last_lng', 'last_speed', 'last_timestamp', 'total_distance'
            ])
            for row in data:
                last = row.get('last_location') or {}
                writer.writerow([
                    row.get('vehicle_id'), row.get('license_plate'), row.get('make'), row.get('model'), row.get('status'),
                    row.get('driver'), last.get('lat'), last.get('lng'), last.get('speed'), last.get('timestamp'), row.get('total_distance')
                ])
            return response
        # PDF response using WeasyPrint
        if fmt == 'pdf':
            from django.template.loader import render_to_string
            from weasyprint import HTML
            data_resp = self._fleet_summary()
            data = data_resp.data if hasattr(data_resp, 'data') else []
            html_string = render_to_string('reports/fleet_summary.html', {'vehicles': data})
            pdf = HTML(string=html_string).write_pdf()
            from django.http import HttpResponse
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = 'inline; filename="fleet_summary.pdf"'
            return response
        # Fallback (should never reach)
        return Response({'error': 'Unhandled format.'}, status=500)

    # ------------------------------------------------------------------
    # fleet_summary
    # ------------------------------------------------------------------
    def _fleet_summary(self):
        vehicles = Vehicle.objects.select_related('current_driver').all()
        data = []
        for v in vehicles:
            last_loc = (
                VehicleLocation.objects
                .filter(vehicle=v)
                .order_by('-timestamp')
                .first()
            )
            total_distance_proxy = VehicleLocation.objects.filter(vehicle=v).count()

            data.append({
                'vehicle_id': v.id,
                'license_plate': v.license_plate,
                'make': v.make,
                'model': v.model,
                'status': v.status,
                'driver': (
                    f"{v.current_driver.first_name} {v.current_driver.last_name}"
                    if v.current_driver else None
                ),
                'last_location': {
                    'lat': float(last_loc.latitude),
                    'lng': float(last_loc.longitude),
                    'speed': round(float(last_loc.speed), 2),
                    'timestamp': last_loc.timestamp.isoformat(),
                } if last_loc else None,
                'total_distance': total_distance_proxy,
            })

        return Response(data)

    # ------------------------------------------------------------------
    # driver_performance  (reuses DriverBehaviourView logic)
    # ------------------------------------------------------------------
    def _driver_performance(self):
        view = DriverBehaviourView()
        from rest_framework.request import Request
        from django.http import HttpRequest
        dummy = Request(HttpRequest())
        response = view.get(dummy)
        return Response(response.data)

    # ------------------------------------------------------------------
    # vehicle_utilization
    # ------------------------------------------------------------------
    def _vehicle_utilization(self):
        vehicles = Vehicle.objects.all()
        data = []
        for v in vehicles:
            locs = VehicleLocation.objects.filter(vehicle=v)
            loc_count = locs.count()
            agg = locs.aggregate(
                first_timestamp=Min('timestamp'),
                last_timestamp=Max('timestamp'),
            )
            data.append({
                'vehicle_id': v.id,
                'license_plate': v.license_plate,
                'make': v.make,
                'model': v.model,
                'location_count': loc_count,
                'first_location_timestamp': (
                    agg['first_timestamp'].isoformat()
                    if agg['first_timestamp'] else None
                ),
                'last_location_timestamp': (
                    agg['last_timestamp'].isoformat()
                    if agg['last_timestamp'] else None
                ),
            })

        return Response(data)



# ---------------------------------------------------------------------------
# Live Tracking API Endpoints
# ---------------------------------------------------------------------------

class LatestLocationsView(APIView):
    """
    GET /api/tracking/vehicles/latest/
    Returns the latest location for all vehicles with GPS devices.
    """
    def get(self, request):
        # Get all vehicles with device_imei
        vehicles = Vehicle.objects.filter(
            device_imei__isnull=False
        ).exclude(device_imei='')
        
        data = []
        for vehicle in vehicles:
            latest_location = (
                VehicleLocation.objects
                .filter(vehicle=vehicle)
                .order_by('-timestamp')
                .first()
            )
            
            if latest_location:
                # Check if vehicle is online (updated in last 10 minutes)
                ten_minutes_ago = timezone.now() - timedelta(minutes=10)
                is_online = latest_location.timestamp >= ten_minutes_ago
                
                data.append({
                    'vehicle_id': vehicle.id,
                    'license_plate': vehicle.license_plate,
                    'make': vehicle.make,
                    'model': vehicle.model,
                    'status': vehicle.status,
                    'driver': (
                        f"{vehicle.current_driver.first_name} {vehicle.current_driver.last_name}"
                        if vehicle.current_driver else None
                    ),
                    'driver_id': vehicle.current_driver.id if vehicle.current_driver else None,
                    'lat': float(latest_location.latitude),
                    'lng': float(latest_location.longitude),
                    'speed': round(float(latest_location.speed), 2),
                    'heading': latest_location.heading,
                    'timestamp': latest_location.timestamp.isoformat(),
                    'is_online': is_online,
                })
        
        return Response(data)


class VehicleLocationHistoryView(APIView):
    """
    GET /api/tracking/vehicles/<id>/history/?start=&end=&limit=
    Returns location history for a specific vehicle.
    """
    def get(self, request, vehicle_id):
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({'error': 'Vehicle not found'}, status=404)
        
        # Parse query parameters
        start_date = request.query_params.get('start')
        end_date = request.query_params.get('end')
        limit = request.query_params.get('limit', 100)
        
        try:
            limit = int(limit)
            if limit > 1000:
                limit = 1000  # Cap at 1000 records
        except ValueError:
            limit = 100
        
        # Build query
        locations = VehicleLocation.objects.filter(vehicle=vehicle)
        
        if start_date:
            try:
                from django.utils.dateparse import parse_datetime
                start_dt = parse_datetime(start_date)
                if start_dt:
                    locations = locations.filter(timestamp__gte=start_dt)
            except:
                pass
        
        if end_date:
            try:
                from django.utils.dateparse import parse_datetime
                end_dt = parse_datetime(end_date)
                if end_dt:
                    locations = locations.filter(timestamp__lte=end_dt)
            except:
                pass
        
        locations = locations.order_by('-timestamp')[:limit]
        
        data = [
            {
                'lat': float(loc.latitude),
                'lng': float(loc.longitude),
                'speed': round(float(loc.speed), 2),
                'heading': loc.heading,
                'timestamp': loc.timestamp.isoformat(),
            }
            for loc in locations
        ]
        
        # Return in chronological order (oldest first)
        data.reverse()
        
        return Response({
            'vehicle_id': vehicle.id,
            'license_plate': vehicle.license_plate,
            'total_points': len(data),
            'locations': data,
        })


class VehicleRouteView(APIView):
    """
    GET /api/tracking/vehicles/<id>/route/?start_time=&end_time=
    Returns route (simplified path) for a specific vehicle between two timestamps.
    """
    def get(self, request, vehicle_id):
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({'error': 'Vehicle not found'}, status=404)
        
        # Parse time parameters
        start_time = request.query_params.get('start_time')
        end_time = request.query_params.get('end_time')
        
        if not start_time or not end_time:
            return Response({
                'error': 'Both start_time and end_time parameters are required'
            }, status=400)
        
        try:
            from django.utils.dateparse import parse_datetime
            start_dt = parse_datetime(start_time)
            end_dt = parse_datetime(end_time)
            
            if not start_dt or not end_dt:
                return Response({'error': 'Invalid datetime format'}, status=400)
        except:
            return Response({'error': 'Invalid datetime format'}, status=400)
        
        # Get locations in time range
        locations = (
            VehicleLocation.objects
            .filter(
                vehicle=vehicle,
                timestamp__gte=start_dt,
                timestamp__lte=end_dt
            )
            .order_by('timestamp')
        )
        
        if not locations.exists():
            return Response({
                'vehicle_id': vehicle.id,
                'license_plate': vehicle.license_plate,
                'route': [],
                'total_distance': 0,
                'total_points': 0,
            })
        
        # Calculate total distance
        total_distance = 0
        route_points = []
        prev_loc = None
        
        for loc in locations:
            route_points.append({
                'lat': float(loc.latitude),
                'lng': float(loc.longitude),
                'speed': round(float(loc.speed), 2),
                'heading': loc.heading,
                'timestamp': loc.timestamp.isoformat(),
            })
            
            if prev_loc:
                distance = prev_loc.distance_to(loc)
                total_distance += distance
            
            prev_loc = loc
        
        return Response({
            'vehicle_id': vehicle.id,
            'license_plate': vehicle.license_plate,
            'driver': (
                f"{vehicle.current_driver.first_name} {vehicle.current_driver.last_name}"
                if vehicle.current_driver else None
            ),
            'start_time': start_time,
            'end_time': end_time,
            'total_distance': round(total_distance, 2),  # in km
            'total_points': len(route_points),
            'route': route_points,
        })


class RecentActivitiesView(APIView):
    """
    GET /api/tracking/recent-activities/?limit=10
    Returns recent activities from audit trail
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        from fleet.compliance_models import AuditTrail
        limit = int(request.query_params.get('limit', 10))
        
        activities = (
            AuditTrail.objects
            .select_related('user')
            .order_by('-timestamp')[:limit]
        )
        
        data = []
        for activity in activities:
            # Determine icon and color based on action type
            icon_map = {
                'CREATE': '✓',
                'UPDATE': '📝',
                'DELETE': '🗑️',
                'ASSIGN': '👤',
                'ALERT': '⚠',
                'MAINTENANCE': '🔧',
            }
            
            color_map = {
                'CREATE': 'green',
                'UPDATE': 'blue',
                'DELETE': 'red',
                'ASSIGN': 'blue',
                'ALERT': 'amber',
                'MAINTENANCE': 'orange',
            }
            
            # Calculate time ago
            from django.utils import timezone
            time_diff = timezone.now() - activity.timestamp
            if time_diff.seconds < 60:
                time_ago = f"{time_diff.seconds} sec ago"
            elif time_diff.seconds < 3600:
                time_ago = f"{time_diff.seconds // 60} min ago"
            elif time_diff.days == 0:
                time_ago = f"{time_diff.seconds // 3600} hour ago"
            else:
                time_ago = f"{time_diff.days} day ago"
            
            # Extract vehicle/driver info from entity_name if available
            vehicle = None
            driver = None
            if activity.entity_type == 'VEHICLE':
                vehicle = activity.entity_name
            elif activity.entity_type == 'DRIVER':
                driver = activity.entity_name
            
            data.append({
                'id': activity.id,
                'type': activity.action_type.lower(),
                'message': activity.description or f"{activity.action_type} action",
                'vehicle': vehicle or 'N/A',
                'driver': driver,
                'user': f"{activity.user.first_name} {activity.user.last_name}" if activity.user else activity.username or 'System',
                'time': time_ago,
                'timestamp': activity.timestamp.isoformat(),
                'icon': icon_map.get(activity.action_type, '📌'),
                'color': color_map.get(activity.action_type, 'gray'),
            })
        
        return Response(data)
