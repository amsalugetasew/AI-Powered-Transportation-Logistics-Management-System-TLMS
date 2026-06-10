from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Count, Q, F, Max, Min
from django.db.models.functions import TruncDate, TruncMonth
from datetime import datetime, timedelta
from django.utils import timezone
from .models import Driver, Vehicle, VehicleAssignmentHistory
from .analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord, VehicleUtilization
from .serializers import DriverSerializer, VehicleSerializer


class DriverInfoReportsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Driver Information Reports
    Provides detailed driver profiles with performance metrics
    """
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def detailed_list(self, request):
        """Get detailed list of all drivers with metrics"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        drivers = Driver.objects.all()  # Get ALL drivers, not just active
        driver_reports = []
        
        for driver in drivers:
            # Behavior metrics
            behavior_logs = DriverBehaviorLog.objects.filter(
                driver=driver,
                timestamp__gte=start_date
            )
            total_logs = behavior_logs.count()
            incidents = behavior_logs.exclude(behavior_type='NORMAL').count()
            
            # Fuel metrics
            fuel_records = FuelRecord.objects.filter(
                driver=driver,
                filled_at__gte=start_date
            )
            total_fuel_cost = fuel_records.aggregate(total=Sum('cost'))['total'] or 0
            total_fuel_quantity = fuel_records.aggregate(total=Sum('quantity'))['total'] or 0
            
            # Utilization metrics
            utilization_records = VehicleUtilization.objects.filter(
                driver=driver,
                date__gte=start_date.date()
            )
            total_distance = utilization_records.aggregate(total=Sum('distance_traveled'))['total'] or 0
            total_trips = utilization_records.aggregate(total=Sum('number_of_trips'))['total'] or 0
            avg_utilization = utilization_records.aggregate(avg=Avg('utilization_percentage'))['avg'] or 0
            
            # Current assignment
            current_vehicle = None
            if driver.assigned_vehicles.exists():
                current_vehicle = driver.assigned_vehicles.first().license_plate
            
            # Safety score calculation
            safety_score = 100
            if total_logs > 0:
                incident_rate = (incidents / total_logs) * 100
                safety_score = max(100 - incident_rate, 0)
            
            # Assignment history count
            assignment_count = VehicleAssignmentHistory.objects.filter(driver=driver).count()
            
            driver_reports.append({
                'id': driver.id,
                'employee_id': driver.employee_id,
                'name': f"{driver.first_name} {driver.last_name}",
                'phone': driver.phone_number,
                'license_number': driver.license_number,
                'license_expiry': driver.license_expiry_date,
                'organization': driver.organization.name if driver.organization else 'N/A',
                'current_vehicle': current_vehicle or 'Unassigned',
                'is_active': driver.is_active,
                'created_at': driver.created_at,
                # Performance metrics (will be 0 if no analytics data)
                'total_behavior_logs': total_logs,
                'total_incidents': incidents,
                'safety_score': round(safety_score, 2),
                'total_fuel_cost': float(total_fuel_cost),
                'total_fuel_quantity': float(total_fuel_quantity),
                'total_distance': float(total_distance),
                'total_trips': total_trips,
                'avg_utilization': float(avg_utilization),
                'assignment_count': assignment_count,
            })
        
        return Response(driver_reports)
    
    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get detailed profile for a specific driver"""
        driver = self.get_object()
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Behavior trends
        behavior_trends = DriverBehaviorLog.objects.filter(
            driver=driver,
            timestamp__gte=start_date
        ).annotate(
            date=TruncDate('timestamp')
        ).values('date', 'behavior_type').annotate(
            count=Count('id')
        ).order_by('date')
        
        # Fuel consumption trends
        fuel_trends = FuelRecord.objects.filter(
            driver=driver,
            filled_at__gte=start_date
        ).annotate(
            date=TruncDate('filled_at')
        ).values('date').annotate(
            total_cost=Sum('cost'),
            total_quantity=Sum('quantity')
        ).order_by('date')
        
        # Vehicle assignment history
        assignments = VehicleAssignmentHistory.objects.filter(
            driver=driver
        ).select_related('vehicle').order_by('-start_date')[:10].values(
            'vehicle__license_plate',
            'vehicle__make',
            'vehicle__model',
            'start_date',
            'end_date'
        )
        
        # Daily utilization
        daily_utilization = VehicleUtilization.objects.filter(
            driver=driver,
            date__gte=start_date.date()
        ).values('date').annotate(
            distance=Sum('distance_traveled'),
            trips=Sum('number_of_trips'),
            utilization=Avg('utilization_percentage')
        ).order_by('date')
        
        return Response({
            'driver_info': {
                'id': driver.id,
                'employee_id': driver.employee_id,
                'name': f"{driver.first_name} {driver.last_name}",
                'phone': driver.phone_number,
                'license_number': driver.license_number,
                'license_expiry': driver.license_expiry_date,
                'organization': driver.organization.name if driver.organization else 'N/A',
            },
            'behavior_trends': list(behavior_trends),
            'fuel_trends': list(fuel_trends),
            'assignments': list(assignments),
            'daily_utilization': list(daily_utilization),
        })


class VehicleInfoReportsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Vehicle Information Reports
    Provides detailed vehicle profiles with performance metrics
    """
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def detailed_list(self, request):
        """Get detailed list of all vehicles with metrics"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        vehicles = Vehicle.objects.all()
        vehicle_reports = []
        
        for vehicle in vehicles:
            # Behavior incidents
            behavior_logs = DriverBehaviorLog.objects.filter(
                vehicle=vehicle,
                timestamp__gte=start_date
            )
            incidents = behavior_logs.exclude(behavior_type='NORMAL').count()
            
            # Fuel metrics
            fuel_records = FuelRecord.objects.filter(
                vehicle=vehicle,
                filled_at__gte=start_date
            )
            total_fuel_cost = fuel_records.aggregate(total=Sum('cost'))['total'] or 0
            total_fuel_quantity = fuel_records.aggregate(total=Sum('quantity'))['total'] or 0
            refills_count = fuel_records.count()
            
            # Calculate fuel efficiency
            avg_efficiency = 0
            if refills_count >= 2:
                records = list(fuel_records.order_by('filled_at'))  # Convert to list
                efficiencies = []
                for i in range(1, len(records)):
                    prev = records[i-1]
                    curr = records[i]
                    distance = float(curr.odometer_reading - prev.odometer_reading)
                    fuel = float(prev.quantity)
                    if distance > 0 and fuel > 0:
                        efficiencies.append(distance / fuel)
                if efficiencies:
                    avg_efficiency = sum(efficiencies) / len(efficiencies)
            
            # Maintenance metrics
            maintenance_records = MaintenanceRecord.objects.filter(
                vehicle=vehicle,
                scheduled_date__gte=start_date
            )
            total_maintenance_cost = maintenance_records.aggregate(
                total=Sum(F('labor_cost') + F('parts_cost'))
            )['total'] or 0
            maintenance_count = maintenance_records.count()
            pending_maintenance = maintenance_records.filter(
                status='SCHEDULED'
            ).count()
            
            # Utilization metrics
            utilization_records = VehicleUtilization.objects.filter(
                vehicle=vehicle,
                date__gte=start_date.date()
            )
            total_distance = utilization_records.aggregate(total=Sum('distance_traveled'))['total'] or 0
            total_engine_hours = utilization_records.aggregate(total=Sum('engine_hours'))['total'] or 0
            total_idle_hours = utilization_records.aggregate(total=Sum('idle_hours'))['total'] or 0
            avg_utilization = utilization_records.aggregate(avg=Avg('utilization_percentage'))['avg'] or 0
            days_used = utilization_records.count()
            
            # Current driver
            current_driver = None
            if vehicle.current_driver:
                current_driver = f"{vehicle.current_driver.first_name} {vehicle.current_driver.last_name}"
            
            # Idle percentage
            idle_percentage = 0
            if total_engine_hours > 0:
                idle_percentage = (float(total_idle_hours) / float(total_engine_hours)) * 100
            
            vehicle_reports.append({
                'id': vehicle.id,
                'license_plate': vehicle.license_plate,
                'vin': vehicle.vin,
                'make': vehicle.make,
                'model': vehicle.model,
                'year': vehicle.year,
                'capacity': float(vehicle.capacity) if vehicle.capacity else 0,
                'status': vehicle.status,
                'is_immobilized': vehicle.is_immobilized,
                'current_driver': current_driver or 'Unassigned',
                'organization': vehicle.organization.name if vehicle.organization else 'N/A',
                'device_imei': vehicle.device_imei or 'N/A',
                'created_at': vehicle.created_at,
                # Performance metrics
                'total_incidents': incidents,
                'total_fuel_cost': float(total_fuel_cost),
                'total_fuel_quantity': float(total_fuel_quantity),
                'refills_count': refills_count,
                'avg_fuel_efficiency': round(avg_efficiency, 2),
                'total_maintenance_cost': float(total_maintenance_cost),
                'maintenance_count': maintenance_count,
                'pending_maintenance': pending_maintenance,
                'total_distance': float(total_distance),
                'total_engine_hours': float(total_engine_hours),
                'total_idle_hours': float(total_idle_hours),
                'idle_percentage': round(idle_percentage, 2),
                'avg_utilization': float(avg_utilization),
                'days_used': days_used,
            })
        
        return Response(vehicle_reports)
    
    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get detailed profile for a specific vehicle"""
        vehicle = self.get_object()
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Fuel consumption trends
        fuel_trends = FuelRecord.objects.filter(
            vehicle=vehicle,
            filled_at__gte=start_date
        ).annotate(
            date=TruncDate('filled_at')
        ).values('date').annotate(
            total_cost=Sum('cost'),
            total_quantity=Sum('quantity')
        ).order_by('date')
        
        # Maintenance history
        maintenance_history = MaintenanceRecord.objects.filter(
            vehicle=vehicle
        ).order_by('-scheduled_date')[:10].values(
            'maintenance_type',
            'status',
            'cost',
            'labor_cost',
            'parts_cost',
            'scheduled_date',
            'completed_date',
            'description'
        )
        
        # Daily utilization
        daily_utilization = VehicleUtilization.objects.filter(
            vehicle=vehicle,
            date__gte=start_date.date()
        ).values('date').annotate(
            distance=Sum('distance_traveled'),
            engine_hours=Sum('engine_hours'),
            idle_hours=Sum('idle_hours'),
            utilization=Avg('utilization_percentage')
        ).order_by('date')
        
        # Assignment history
        assignments = VehicleAssignmentHistory.objects.filter(
            vehicle=vehicle
        ).select_related('driver').order_by('-start_date')[:10].values(
            'driver__first_name',
            'driver__last_name',
            'driver__employee_id',
            'start_date',
            'end_date'
        )
        
        # Behavior incidents by type
        behavior_incidents = DriverBehaviorLog.objects.filter(
            vehicle=vehicle,
            timestamp__gte=start_date
        ).values('behavior_type').annotate(
            count=Count('id'),
            avg_severity=Avg('severity')
        ).order_by('-count')
        
        return Response({
            'vehicle_info': {
                'id': vehicle.id,
                'license_plate': vehicle.license_plate,
                'vin': vehicle.vin,
                'make': vehicle.make,
                'model': vehicle.model,
                'year': vehicle.year,
                'capacity': float(vehicle.capacity) if vehicle.capacity else 0,
                'status': vehicle.status,
                'current_driver': f"{vehicle.current_driver.first_name} {vehicle.current_driver.last_name}" if vehicle.current_driver else 'Unassigned',
            },
            'fuel_trends': list(fuel_trends),
            'maintenance_history': list(maintenance_history),
            'daily_utilization': list(daily_utilization),
            'assignments': list(assignments),
            'behavior_incidents': list(behavior_incidents),
        })
