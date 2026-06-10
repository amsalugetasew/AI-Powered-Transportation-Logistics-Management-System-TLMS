from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Count, Q, F
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from datetime import datetime, timedelta
from django.utils import timezone
from .analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord, VehicleUtilization
from .analytics_serializers import (
    DriverBehaviorLogSerializer,
    FuelRecordSerializer,
    MaintenanceRecordSerializer,
    VehicleUtilizationSerializer
)


class DriverBehaviorAnalyticsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Driver Behavior Analytics
    Provides endpoints for behavior tracking and analysis
    """
    queryset = DriverBehaviorLog.objects.all()
    serializer_class = DriverBehaviorLogSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get driver behavior summary with statistics"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Overall behavior statistics
        behaviors = DriverBehaviorLog.objects.filter(timestamp__gte=start_date)
        
        # Count by behavior type
        behavior_counts = behaviors.values('behavior_type').annotate(
            count=Count('id'),
            avg_severity=Avg('severity')
        ).order_by('-count')
        
        # Top offending drivers
        top_drivers = behaviors.exclude(behavior_type='NORMAL').values(
            'driver__id',
            'driver__first_name',
            'driver__last_name'
        ).annotate(
            total_incidents=Count('id'),
            avg_severity=Avg('severity')
        ).order_by('-total_incidents')[:10]
        
        # Behavior trends over time (daily)
        daily_trends = behaviors.annotate(
            date=TruncDate('timestamp')
        ).values('date', 'behavior_type').annotate(
            count=Count('id')
        ).order_by('date')
        
        # Best performing drivers (most normal behavior)
        best_drivers = DriverBehaviorLog.objects.filter(
            timestamp__gte=start_date,
            behavior_type='NORMAL'
        ).values(
            'driver__id',
            'driver__first_name',
            'driver__last_name'
        ).annotate(
            normal_count=Count('id')
        ).order_by('-normal_count')[:10]
        
        return Response({
            'period_days': days,
            'total_logs': behaviors.count(),
            'behavior_counts': list(behavior_counts),
            'top_offenders': list(top_drivers),
            'best_drivers': list(best_drivers),
            'daily_trends': list(daily_trends),
        })
    
    @action(detail=False, methods=['get'])
    def driver_score(self, request):
        """Calculate driver safety scores"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        from .models import Driver
        drivers = Driver.objects.filter(is_active=True)
        
        driver_scores = []
        for driver in drivers:
            logs = DriverBehaviorLog.objects.filter(
                driver=driver,
                timestamp__gte=start_date
            )
            
            total_logs = logs.count()
            if total_logs == 0:
                continue
            
            # Calculate incidents by type
            incidents = logs.exclude(behavior_type='NORMAL').aggregate(
                harsh_brake=Count('id', filter=Q(behavior_type='HARSH_BRAKE')),
                harsh_accel=Count('id', filter=Q(behavior_type='HARSH_ACCEL')),
                overspeed=Count('id', filter=Q(behavior_type='OVERSPEED')),
                idle=Count('id', filter=Q(behavior_type='IDLE')),
                sharp_turn=Count('id', filter=Q(behavior_type='SHARP_TURN')),
                avg_severity=Avg('severity', filter=~Q(behavior_type='NORMAL'))
            )
            
            # Calculate score (100 - penalties)
            total_incidents = sum([
                incidents['harsh_brake'] or 0,
                incidents['harsh_accel'] or 0,
                incidents['overspeed'] or 0,
                incidents['idle'] or 0,
                incidents['sharp_turn'] or 0,
            ])
            
            # Score calculation: Start at 100, deduct based on incidents
            incident_penalty = min((total_incidents / total_logs) * 50, 50)
            severity_penalty = ((incidents['avg_severity'] or 0) / 10) * 30
            score = max(100 - incident_penalty - severity_penalty, 0)
            
            driver_scores.append({
                'driver_id': driver.id,
                'driver_name': f"{driver.first_name} {driver.last_name}",
                'score': round(score, 2),
                'total_logs': total_logs,
                'total_incidents': total_incidents,
                'incidents': incidents,
            })
        
        # Sort by score descending
        driver_scores.sort(key=lambda x: x['score'], reverse=True)
        
        return Response(driver_scores)


class FuelCostAnalyticsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Fuel and Cost Analytics
    Provides endpoints for fuel consumption and cost analysis
    """
    queryset = FuelRecord.objects.all()
    serializer_class = FuelRecordSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get fuel cost summary and statistics"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        records = FuelRecord.objects.filter(filled_at__gte=start_date)
        
        # Overall statistics
        totals = records.aggregate(
            total_cost=Sum('cost'),
            total_quantity=Sum('quantity'),
            avg_price=Avg('price_per_unit'),
            total_records=Count('id')
        )
        
        # Cost by vehicle
        vehicle_costs = records.values(
            'vehicle__id',
            'vehicle__license_plate',
            'vehicle__make',
            'vehicle__model'
        ).annotate(
            total_cost=Sum('cost'),
            total_quantity=Sum('quantity'),
            avg_efficiency=Avg('quantity')
        ).order_by('-total_cost')
        
        # Cost by fuel type
        fuel_type_costs = records.values('fuel_type').annotate(
            total_cost=Sum('cost'),
            total_quantity=Sum('quantity'),
            avg_price=Avg('price_per_unit')
        ).order_by('-total_cost')
        
        # Daily/Monthly trends
        daily_trends = records.annotate(
            date=TruncDate('filled_at')
        ).values('date').annotate(
            total_cost=Sum('cost'),
            total_quantity=Sum('quantity'),
            records_count=Count('id')
        ).order_by('date')
        
        monthly_trends = records.annotate(
            month=TruncMonth('filled_at')
        ).values('month').annotate(
            total_cost=Sum('cost'),
            total_quantity=Sum('quantity')
        ).order_by('month')
        
        # Top 10 most expensive refills
        top_expenses = records.order_by('-cost')[:10].values(
            'vehicle__license_plate',
            'cost',
            'quantity',
            'filled_at',
            'station_name'
        )
        
        return Response({
            'period_days': days,
            'totals': totals,
            'vehicle_costs': list(vehicle_costs),
            'fuel_type_costs': list(fuel_type_costs),
            'daily_trends': list(daily_trends),
            'monthly_trends': list(monthly_trends),
            'top_expenses': list(top_expenses),
        })
    
    @action(detail=False, methods=['get'])
    def efficiency_report(self, request):
        """Get fuel efficiency report by vehicle"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        from .models import Vehicle
        vehicles = Vehicle.objects.filter(status='ACTIVE')
        
        efficiency_data = []
        for vehicle in vehicles:
            records = FuelRecord.objects.filter(
                vehicle=vehicle,
                filled_at__gte=start_date
            ).order_by('filled_at')
            
            if records.count() < 2:
                continue
            
            # Calculate efficiency between consecutive records
            efficiencies = []
            for i in range(1, len(records)):
                prev_record = records[i-1]
                curr_record = records[i]
                
                distance = float(curr_record.odometer_reading - prev_record.odometer_reading)
                fuel_used = float(prev_record.quantity)
                
                if distance > 0 and fuel_used > 0:
                    efficiency = distance / fuel_used
                    efficiencies.append(efficiency)
            
            if efficiencies:
                efficiency_data.append({
                    'vehicle_id': vehicle.id,
                    'vehicle_plate': vehicle.license_plate,
                    'vehicle_info': f"{vehicle.make} {vehicle.model}",
                    'avg_efficiency': round(sum(efficiencies) / len(efficiencies), 2),
                    'min_efficiency': round(min(efficiencies), 2),
                    'max_efficiency': round(max(efficiencies), 2),
                    'total_refills': records.count(),
                })
        
        # Sort by average efficiency descending
        efficiency_data.sort(key=lambda x: x['avg_efficiency'], reverse=True)
        
        return Response(efficiency_data)


class MaintenanceCostAnalyticsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Maintenance Cost Analytics
    Provides endpoints for maintenance tracking and cost analysis
    """
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get maintenance cost summary and statistics"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        records = MaintenanceRecord.objects.filter(scheduled_date__gte=start_date)
        
        # Overall statistics
        totals = records.aggregate(
            total_cost=Sum(F('labor_cost') + F('parts_cost')),
            total_labor=Sum('labor_cost'),
            total_parts=Sum('parts_cost'),
            total_records=Count('id'),
            completed=Count('id', filter=Q(status='COMPLETED')),
            in_progress=Count('id', filter=Q(status='IN_PROGRESS')),
            scheduled=Count('id', filter=Q(status='SCHEDULED')),
        )
        
        # Cost by vehicle
        vehicle_costs = records.values(
            'vehicle__id',
            'vehicle__license_plate',
            'vehicle__make',
            'vehicle__model'
        ).annotate(
            total_cost=Sum(F('labor_cost') + F('parts_cost')),
            maintenance_count=Count('id'),
            avg_cost=Avg(F('labor_cost') + F('parts_cost'))
        ).order_by('-total_cost')
        
        # Cost by maintenance type
        type_costs = records.values('maintenance_type').annotate(
            total_cost=Sum(F('labor_cost') + F('parts_cost')),
            count=Count('id'),
            avg_cost=Avg(F('labor_cost') + F('parts_cost'))
        ).order_by('-total_cost')
        
        # Monthly trends
        monthly_trends = records.annotate(
            month=TruncMonth('scheduled_date')
        ).values('month').annotate(
            total_cost=Sum(F('labor_cost') + F('parts_cost')),
            count=Count('id')
        ).order_by('month')
        
        # Upcoming maintenance
        upcoming = MaintenanceRecord.objects.filter(
            scheduled_date__gte=timezone.now(),
            status='SCHEDULED'
        ).order_by('scheduled_date')[:10].values(
            'vehicle__license_plate',
            'maintenance_type',
            'scheduled_date',
            'description'
        )
        
        # Most expensive maintenance
        top_expenses = records.annotate(
            total=F('labor_cost') + F('parts_cost')
        ).order_by('-total')[:10].values(
            'vehicle__license_plate',
            'maintenance_type',
            'total',
            'scheduled_date',
            'description'
        )
        
        return Response({
            'period_days': days,
            'totals': totals,
            'vehicle_costs': list(vehicle_costs),
            'type_costs': list(type_costs),
            'monthly_trends': list(monthly_trends),
            'upcoming_maintenance': list(upcoming),
            'top_expenses': list(top_expenses),
        })
    
    @action(detail=False, methods=['get'])
    def vehicle_health_score(self, request):
        """Calculate vehicle health scores based on maintenance history"""
        from .models import Vehicle
        vehicles = Vehicle.objects.filter(status='ACTIVE')
        
        health_scores = []
        for vehicle in vehicles:
            # Get maintenance records for the last year
            one_year_ago = timezone.now() - timedelta(days=365)
            records = MaintenanceRecord.objects.filter(
                vehicle=vehicle,
                scheduled_date__gte=one_year_ago
            )
            
            total_records = records.count()
            if total_records == 0:
                continue
            
            # Calculate metrics
            completed = records.filter(status='COMPLETED').count()
            overdue = records.filter(
                status='SCHEDULED',
                scheduled_date__lt=timezone.now()
            ).count()
            
            total_cost = records.aggregate(
                total=Sum(F('labor_cost') + F('parts_cost'))
            )['total'] or 0
            
            # Score calculation (100 - penalties)
            completion_rate = (completed / total_records) * 100 if total_records > 0 else 100
            overdue_penalty = overdue * 5  # 5 points per overdue
            cost_penalty = min((float(total_cost) / 10000) * 10, 20)  # Higher costs = more issues
            
            score = max(completion_rate - overdue_penalty - cost_penalty, 0)
            
            health_scores.append({
                'vehicle_id': vehicle.id,
                'vehicle_plate': vehicle.license_plate,
                'vehicle_info': f"{vehicle.make} {vehicle.model}",
                'health_score': round(score, 2),
                'total_maintenance': total_records,
                'completed': completed,
                'overdue': overdue,
                'total_cost': float(total_cost),
            })
        
        # Sort by health score ascending (worst first)
        health_scores.sort(key=lambda x: x['health_score'])
        
        return Response(health_scores)


class VehicleUtilizationAnalyticsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Vehicle Utilization Analytics
    Provides endpoints for utilization tracking and analysis
    """
    queryset = VehicleUtilization.objects.all()
    serializer_class = VehicleUtilizationSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get vehicle utilization summary and statistics"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        records = VehicleUtilization.objects.filter(date__gte=start_date)
        
        # Overall statistics
        totals = records.aggregate(
            total_distance=Sum('distance_traveled'),
            total_engine_hours=Sum('engine_hours'),
            total_idle_hours=Sum('idle_hours'),
            avg_utilization=Avg('utilization_percentage'),
            total_trips=Sum('number_of_trips'),
        )
        
        # Handle None values from empty aggregations
        totals = {
            'total_distance': totals['total_distance'] or 0,
            'total_engine_hours': totals['total_engine_hours'] or 0,
            'total_idle_hours': totals['total_idle_hours'] or 0,
            'avg_utilization': totals['avg_utilization'] or 0,
            'total_trips': totals['total_trips'] or 0,
        }
        
        # Utilization by vehicle
        vehicle_utilization = records.values(
            'vehicle__id',
            'vehicle__license_plate',
            'vehicle__make',
            'vehicle__model'
        ).annotate(
            avg_utilization=Avg('utilization_percentage'),
            total_distance=Sum('distance_traveled'),
            total_engine_hours=Sum('engine_hours'),
            total_idle_hours=Sum('idle_hours'),
            days_used=Count('id')
        ).order_by('-avg_utilization')
        
        # Daily trends
        daily_trends = records.values('date').annotate(
            avg_utilization=Avg('utilization_percentage'),
            total_distance=Sum('distance_traveled'),
            total_engine_hours=Sum('engine_hours'),
            active_vehicles=Count('vehicle', distinct=True)
        ).order_by('date')
        
        # Under-utilized vehicles (< 30%)
        underutilized = records.values(
            'vehicle__id',
            'vehicle__license_plate'
        ).annotate(
            avg_utilization=Avg('utilization_percentage')
        ).filter(avg_utilization__lt=30).order_by('avg_utilization')
        
        # Over-utilized vehicles (> 80%)
        overutilized = records.values(
            'vehicle__id',
            'vehicle__license_plate'
        ).annotate(
            avg_utilization=Avg('utilization_percentage')
        ).filter(avg_utilization__gt=80).order_by('-avg_utilization')
        
        # Idle time analysis
        from django.db.models import FloatField
        from django.db.models.functions import Cast
        
        idle_analysis = records.values(
            'vehicle__license_plate'
        ).annotate(
            total_idle=Sum('idle_hours'),
            total_engine=Sum('engine_hours')
        ).annotate(
            idle_percentage=Cast(F('total_idle'), FloatField()) * 100.0 / Cast(F('total_engine'), FloatField())
        ).order_by('-idle_percentage')[:10]
        
        return Response({
            'period_days': days,
            'totals': totals,
            'vehicle_utilization': list(vehicle_utilization),
            'daily_trends': list(daily_trends),
            'underutilized_vehicles': list(underutilized),
            'overutilized_vehicles': list(overutilized),
            'high_idle_vehicles': list(idle_analysis),
        })
    
    @action(detail=False, methods=['get'])
    def fleet_efficiency(self, request):
        """Get fleet-wide efficiency metrics"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        from .models import Vehicle
        
        total_vehicles = Vehicle.objects.filter(status='ACTIVE').count()
        
        # Vehicles with utilization data
        utilized_vehicles = VehicleUtilization.objects.filter(
            date__gte=start_date
        ).values('vehicle').distinct().count()
        
        # Calculate overall fleet metrics
        fleet_data = VehicleUtilization.objects.filter(
            date__gte=start_date
        ).aggregate(
            avg_utilization=Avg('utilization_percentage'),
            total_distance=Sum('distance_traveled'),
            total_trips=Sum('number_of_trips'),
            avg_speed=Avg('average_speed'),
        )
        
        # Calculate idle vs productive time
        time_data = VehicleUtilization.objects.filter(
            date__gte=start_date
        ).aggregate(
            total_engine_hours=Sum('engine_hours'),
            total_idle_hours=Sum('idle_hours'),
            total_moving_hours=Sum('moving_hours'),
        )
        
        idle_percentage = 0
        if time_data['total_engine_hours']:
            idle_percentage = (float(time_data['total_idle_hours'] or 0) / 
                             float(time_data['total_engine_hours'])) * 100
        
        return Response({
            'period_days': days,
            'total_vehicles': total_vehicles,
            'utilized_vehicles': utilized_vehicles,
            'utilization_rate': round((utilized_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0, 2),
            'fleet_metrics': fleet_data,
            'time_breakdown': {
                'total_engine_hours': time_data['total_engine_hours'],
                'idle_hours': time_data['total_idle_hours'],
                'moving_hours': time_data['total_moving_hours'],
                'idle_percentage': round(idle_percentage, 2),
            }
        })
