from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .compliance_models import LicenseTracking, AuditTrail, MaintenanceSchedule, Alert
from .compliance_serializers import (
    LicenseTrackingSerializer,
    AuditTrailSerializer,
    MaintenanceScheduleSerializer,
    AlertSerializer
)


class LicenseTrackingViewSet(viewsets.ModelViewSet):
    """ViewSet for License Tracking"""
    queryset = LicenseTracking.objects.all()
    serializer_class = LicenseTrackingSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get licenses expiring in the next 30 days"""
        licenses = LicenseTracking.objects.filter(
            status='EXPIRING_SOON'
        ).order_by('expiry_date')
        serializer = self.get_serializer(licenses, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired licenses"""
        licenses = LicenseTracking.objects.filter(
            status='EXPIRED'
        ).order_by('expiry_date')
        serializer = self.get_serializer(licenses, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        """Renew a license"""
        old_license = self.get_object()
        
        new_issue_date_str = request.data.get('issue_date')
        new_expiry_date_str = request.data.get('expiry_date')
        new_issuing_authority = request.data.get('issuing_authority', old_license.issuing_authority)
        
        if not new_issue_date_str or not new_expiry_date_str:
            return Response(
                {'detail': 'issue_date and expiry_date are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from datetime import date as date_type
        try:
            new_issue_date = date_type.fromisoformat(new_issue_date_str)
            new_expiry_date = date_type.fromisoformat(new_expiry_date_str)
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new license with updated dates
        new_license = LicenseTracking.objects.create(
            license_type=old_license.license_type,
            license_number=old_license.license_number,
            driver=old_license.driver,
            vehicle=old_license.vehicle,
            issue_date=new_issue_date,
            expiry_date=new_expiry_date,
            issuing_authority=new_issuing_authority,
            notes=old_license.notes,
            document_file=old_license.document_file,
            created_by=request.user
        )
        
        # Mark old license as renewed — use update() to bypass the model's
        # save() which would auto-overwrite the status based on expiry_date
        LicenseTracking.objects.filter(pk=old_license.pk).update(
            status='RENEWED',
            renewal_date=timezone.now().date(),
            renewed_license=new_license,
        )
        
        # Sync dates back to the Driver model if this is a driver license
        if old_license.driver and old_license.license_type == 'DRIVER':
            driver = old_license.driver
            driver.license_issue_date = new_issue_date
            driver.license_expiry_date = new_expiry_date
            driver.issuing_authority = new_issuing_authority
            # Use update() to avoid Driver.save() re-triggering LicenseTracking sync
            from .models import Driver
            Driver.objects.filter(pk=driver.pk).update(
                license_issue_date=new_issue_date,
                license_expiry_date=new_expiry_date,
                issuing_authority=new_issuing_authority,
            )
        
        serializer = self.get_serializer(new_license)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get license tracking summary"""
        summary = {
            'total': LicenseTracking.objects.count(),
            'valid': LicenseTracking.objects.filter(status='VALID').count(),
            'expiring_soon': LicenseTracking.objects.filter(status='EXPIRING_SOON').count(),
            'expired': LicenseTracking.objects.filter(status='EXPIRED').count(),
            'by_type': list(LicenseTracking.objects.values('license_type').annotate(count=Count('id')))
        }
        return Response(summary)


class AuditTrailViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Audit Trail (read-only)"""
    queryset = AuditTrail.objects.all()
    serializer_class = AuditTrailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = AuditTrail.objects.all()
        
        # Filter by entity type and ID
        entity_type = self.request.query_params.get('entity_type')
        entity_id = self.request.query_params.get('entity_id')
        if entity_type and entity_id:
            queryset = queryset.filter(entity_type=entity_type, entity_id=entity_id)
        
        # Filter by user
        username = self.request.query_params.get('username')
        if username:
            queryset = queryset.filter(username=username)
        
        # Filter by action type
        action_type = self.request.query_params.get('action_type')
        if action_type:
            queryset = queryset.filter(action_type=action_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent audit entries (last 100)"""
        recent_logs = AuditTrail.objects.all()[:100]
        serializer = self.get_serializer(recent_logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get audit summary"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        logs = AuditTrail.objects.filter(timestamp__gte=start_date)
        
        summary = {
            'total_actions': logs.count(),
            'by_action_type': list(logs.values('action_type').annotate(count=Count('id'))),
            'by_entity_type': list(logs.values('entity_type').annotate(count=Count('id'))),
            'top_users': list(logs.values('username').annotate(count=Count('id')).order_by('-count')[:10])
        }
        return Response(summary)


class MaintenanceScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet for Maintenance Schedule"""
    queryset = MaintenanceSchedule.objects.all()
    serializer_class = MaintenanceScheduleSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create maintenance schedule and update vehicle status"""
        maintenance = serializer.save(created_by=self.request.user)
        
        # Set vehicle status to MAINTENANCE
        vehicle = maintenance.vehicle
        vehicle.status = 'MAINTENANCE'
        vehicle.save()
        
        return maintenance
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming scheduled maintenance (next 30 days)"""
        end_date = timezone.now() + timedelta(days=30)
        schedules = MaintenanceSchedule.objects.filter(
            status='SCHEDULED',
            scheduled_date__lte=end_date
        ).order_by('scheduled_date')
        serializer = self.get_serializer(schedules, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue maintenance"""
        schedules = MaintenanceSchedule.objects.filter(
            Q(status='SCHEDULED') | Q(status='OVERDUE'),
            scheduled_date__lt=timezone.now()
        ).order_by('scheduled_date')
        serializer = self.get_serializer(schedules, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark maintenance as completed"""
        schedule = self.get_object()
        
        schedule.status = 'COMPLETED'
        schedule.completed_date = timezone.now()
        schedule.completed_by = request.user
        schedule.actual_cost = request.data.get('actual_cost', schedule.estimated_cost)
        schedule.completed_mileage = request.data.get('completed_mileage')
        schedule.notes = request.data.get('notes', schedule.notes)
        schedule.save()
        
        # Set vehicle status back to ACTIVE
        vehicle = schedule.vehicle
        vehicle.status = 'ACTIVE'
        vehicle.save()
        
        # Create MaintenanceRecord
        from .analytics_models import MaintenanceRecord
        MaintenanceRecord.objects.create(
            vehicle=schedule.vehicle,
            maintenance_type='ROUTINE' if schedule.schedule_type == 'TIME_BASED' else 'OTHER',
            status='COMPLETED',
            description=schedule.description,
            cost=schedule.actual_cost,
            labor_cost=request.data.get('labor_cost', 0),
            parts_cost=request.data.get('parts_cost', 0),
            odometer_reading=schedule.completed_mileage,
            service_provider=schedule.assigned_to,
            scheduled_date=schedule.scheduled_date,
            completed_date=schedule.completed_date,
            notes=schedule.notes
        )
        
        # If recurring, create next schedule
        if schedule.is_recurring:
            if schedule.recurrence_interval_days:
                next_date = schedule.scheduled_date + timedelta(days=schedule.recurrence_interval_days)
                MaintenanceSchedule.objects.create(
                    vehicle=schedule.vehicle,
                    schedule_type=schedule.schedule_type,
                    maintenance_type=schedule.maintenance_type,
                    description=schedule.description,
                    scheduled_date=next_date,
                    scheduled_mileage=schedule.scheduled_mileage + (schedule.recurrence_interval_miles or 0) if schedule.scheduled_mileage else None,
                    is_recurring=True,
                    recurrence_interval_days=schedule.recurrence_interval_days,
                    recurrence_interval_miles=schedule.recurrence_interval_miles,
                    priority=schedule.priority,
                    assigned_to=schedule.assigned_to,
                    estimated_cost=schedule.estimated_cost,
                    created_by=request.user
                )
        
        serializer = self.get_serializer(schedule)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule maintenance"""
        schedule = self.get_object()
        schedule.scheduled_date = request.data.get('scheduled_date')
        schedule.notes = request.data.get('notes', schedule.notes)
        schedule.save()
        
        serializer = self.get_serializer(schedule)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get maintenance schedule summary"""
        summary = {
            'total': MaintenanceSchedule.objects.count(),
            'scheduled': MaintenanceSchedule.objects.filter(status='SCHEDULED').count(),
            'in_progress': MaintenanceSchedule.objects.filter(status='IN_PROGRESS').count(),
            'completed': MaintenanceSchedule.objects.filter(status='COMPLETED').count(),
            'overdue': MaintenanceSchedule.objects.filter(
                Q(status='SCHEDULED') | Q(status='OVERDUE'),
                scheduled_date__lt=timezone.now()
            ).count(),
            'by_priority': list(MaintenanceSchedule.objects.values('priority').annotate(count=Count('id')))
        }
        return Response(summary)


class AlertViewSet(viewsets.ModelViewSet):
    """ViewSet for Alerts"""
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Alert.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter by alert type
        alert_type = self.request.query_params.get('alert_type')
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active alerts"""
        alerts = Alert.objects.filter(status='ACTIVE').order_by('-severity', '-created_at')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def critical(self, request):
        """Get critical alerts"""
        alerts = Alert.objects.filter(
            severity='CRITICAL',
            status__in=['ACTIVE', 'ACKNOWLEDGED']
        ).order_by('-created_at')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge an alert"""
        alert = self.get_object()
        alert.acknowledge(request.user)
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve an alert"""
        alert = self.get_object()
        notes = request.data.get('resolution_notes', '')
        alert.resolve(request.user, notes)
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Dismiss an alert"""
        alert = self.get_object()
        alert.status = 'DISMISSED'
        alert.save()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get alert dashboard summary"""
        summary = {
            'total_active': Alert.objects.filter(status='ACTIVE').count(),
            'critical': Alert.objects.filter(severity='CRITICAL', status__in=['ACTIVE', 'ACKNOWLEDGED']).count(),
            'warning': Alert.objects.filter(severity='WARNING', status__in=['ACTIVE', 'ACKNOWLEDGED']).count(),
            'info': Alert.objects.filter(severity='INFO', status='ACTIVE').count(),
            'by_type': list(Alert.objects.filter(status__in=['ACTIVE', 'ACKNOWLEDGED']).values('alert_type').annotate(count=Count('id'))),
            'recent_alerts': AlertSerializer(
                Alert.objects.filter(status__in=['ACTIVE', 'ACKNOWLEDGED']).order_by('-created_at')[:10],
                many=True
            ).data
        }
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def notifications(self, request):
        """Get comprehensive notification alerts: critical, warnings, violations, fuel, maintenance, etc."""
        from datetime import date as date_type
        from django.db.models import Count, Avg
        from fleet.analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord
        from fleet.models import Vehicle, Driver
        
        # Get critical and warning alerts
        alerts = Alert.objects.filter(
            status__in=['ACTIVE', 'ACKNOWLEDGED'],
            severity__in=['CRITICAL', 'WARNING']
        ).order_by('-severity', '-created_at')
        
        # 1. LICENSES EXPIRING WITHIN 7 DAYS
        seven_days_later = date_type.today() + timedelta(days=7)
        expiring_licenses = LicenseTracking.objects.filter(
            status='EXPIRING_SOON',
            expiry_date__lte=seven_days_later
        ).select_related('driver', 'vehicle')
        
        license_alerts = []
        for license in expiring_licenses:
            days_left = (license.expiry_date - date_type.today()).days
            entity_name = str(license.driver) if license.driver else str(license.vehicle)
            
            # Check if alert already exists
            existing_alert = alerts.filter(
                license=license,
                alert_type='LICENSE_EXPIRY'
            ).first()
            
            if not existing_alert:
                license_alerts.append({
                    'id': f'license_{license.id}',
                    'alert_type': 'LICENSE_EXPIRY',
                    'severity': 'WARNING' if days_left > 3 else 'CRITICAL',
                    'severity_display': 'Warning' if days_left > 3 else 'Critical',
                    'status': 'ACTIVE',
                    'title': f'{license.get_license_type_display()} Expiring Soon',
                    'message': f'{entity_name} - {license.get_license_type_display()} expires in {days_left} days',
                    'driver': license.driver.id if license.driver else None,
                    'driver_name': str(license.driver) if license.driver else None,
                    'vehicle': license.vehicle.id if license.vehicle else None,
                    'vehicle_plate': license.vehicle.license_plate if license.vehicle else None,
                    'created_at': license.updated_at.isoformat(),
                    'action_required': True,
                })
        
        # 2. MAINTENANCE OVERDUE
        overdue_maintenance = MaintenanceSchedule.objects.filter(
            Q(status='SCHEDULED') | Q(status='OVERDUE'),
            scheduled_date__lt=timezone.now()
        ).select_related('vehicle')
        
        maintenance_alerts = []
        for maintenance in overdue_maintenance:
            existing_alert = alerts.filter(
                maintenance=maintenance,
                alert_type='MAINTENANCE_OVERDUE'
            ).first()
            
            if not existing_alert:
                days_overdue = (timezone.now().date() - maintenance.scheduled_date.date()).days
                maintenance_alerts.append({
                    'id': f'maintenance_{maintenance.id}',
                    'alert_type': 'MAINTENANCE_OVERDUE',
                    'severity': 'WARNING' if days_overdue < 7 else 'CRITICAL',
                    'severity_display': 'Warning' if days_overdue < 7 else 'Critical',
                    'status': 'ACTIVE',
                    'title': 'Maintenance Overdue',
                    'message': f'{maintenance.vehicle.license_plate} - {maintenance.maintenance_type} is {days_overdue} days overdue',
                    'vehicle': maintenance.vehicle.id,
                    'vehicle_plate': maintenance.vehicle.license_plate,
                    'driver': None,
                    'driver_name': None,
                    'created_at': maintenance.updated_at.isoformat(),
                    'action_required': True,
                })
        
        # 3. VEHICLES IN MAINTENANCE STATUS (need attention)
        vehicles_in_maintenance = Vehicle.objects.filter(status='MAINTENANCE')
        
        vehicle_maintenance_alerts = []
        for vehicle in vehicles_in_maintenance:
            vehicle_maintenance_alerts.append({
                'id': f'vehicle_maintenance_{vehicle.id}',
                'alert_type': 'VEHICLE_INACTIVE',
                'severity': 'WARNING',
                'severity_display': 'Warning',
                'status': 'ACTIVE',
                'title': 'Vehicle Needs Maintenance',
                'message': f'{vehicle.license_plate} - {vehicle.make} {vehicle.model} is currently in maintenance',
                'vehicle': vehicle.id,
                'vehicle_plate': vehicle.license_plate,
                'driver': None,
                'driver_name': None,
                'created_at': vehicle.updated_at.isoformat(),
                'action_required': True,
            })
        
        # 4. DRIVER VIOLATIONS (recent behavior issues - last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        driver_violations = DriverBehaviorLog.objects.filter(
            timestamp__gte=seven_days_ago,
            behavior_type__in=['HARSH_BRAKE', 'HARSH_ACCEL', 'OVERSPEED', 'SHARP_TURN']
        ).values('driver').annotate(
            violation_count=Count('id')
        ).filter(violation_count__gte=3)  # 3+ violations in 7 days
        
        violation_alerts = []
        for violation in driver_violations:
            try:
                driver = Driver.objects.get(id=violation['driver'])
                violation_count = violation['violation_count']
                
                # Get most recent violation details
                recent_violations = DriverBehaviorLog.objects.filter(
                    driver=driver,
                    timestamp__gte=seven_days_ago,
                    behavior_type__in=['HARSH_BRAKE', 'HARSH_ACCEL', 'OVERSPEED', 'SHARP_TURN']
                ).order_by('-timestamp')[:3]
                
                violation_types = ', '.join([v.get_behavior_type_display() for v in recent_violations])
                
                violation_alerts.append({
                    'id': f'violation_{driver.id}',
                    'alert_type': 'BEHAVIOR_ISSUE',
                    'severity': 'CRITICAL' if violation_count >= 5 else 'WARNING',
                    'severity_display': 'Critical' if violation_count >= 5 else 'Warning',
                    'status': 'ACTIVE',
                    'title': 'Driver Behavior Violation',
                    'message': f'{driver.first_name} {driver.last_name} - {violation_count} violations in last 7 days ({violation_types})',
                    'driver': driver.id,
                    'driver_name': f'{driver.first_name} {driver.last_name}',
                    'vehicle': None,
                    'vehicle_plate': None,
                    'created_at': recent_violations[0].timestamp.isoformat() if recent_violations else timezone.now().isoformat(),
                    'action_required': True,
                })
            except:
                pass
        
        # 5. FUEL CONSUMPTION ALERTS (high consumption - above average by 30%+)
        # Get average fuel efficiency for each vehicle over last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        fuel_alerts = []
        vehicles_with_fuel = FuelRecord.objects.filter(
            filled_at__gte=thirty_days_ago
        ).values('vehicle').distinct()
        
        for v in vehicles_with_fuel:
            try:
                vehicle = Vehicle.objects.get(id=v['vehicle'])
                
                # Get recent fuel records for this vehicle
                recent_fuels = FuelRecord.objects.filter(
                    vehicle=vehicle,
                    filled_at__gte=thirty_days_ago
                ).order_by('-filled_at')
                
                # Calculate average efficiency
                efficiencies = [f.efficiency for f in recent_fuels if f.efficiency]
                
                if len(efficiencies) >= 3:  # Need at least 3 records
                    avg_efficiency = sum(efficiencies) / len(efficiencies)
                    latest_efficiency = efficiencies[0]
                    
                    # Alert if latest efficiency is 30% worse than average
                    if latest_efficiency < avg_efficiency * 0.7:
                        fuel_alerts.append({
                            'id': f'fuel_{vehicle.id}',
                            'alert_type': 'COST_THRESHOLD',
                            'severity': 'WARNING',
                            'severity_display': 'Warning',
                            'status': 'ACTIVE',
                            'title': 'High Fuel Consumption',
                            'message': f'{vehicle.license_plate} - Fuel efficiency dropped: {latest_efficiency:.2f} km/L (avg: {avg_efficiency:.2f} km/L)',
                            'vehicle': vehicle.id,
                            'vehicle_plate': vehicle.license_plate,
                            'driver': vehicle.current_driver.id if vehicle.current_driver else None,
                            'driver_name': str(vehicle.current_driver) if vehicle.current_driver else None,
                            'created_at': recent_fuels[0].filled_at.isoformat(),
                            'action_required': True,
                        })
            except:
                pass
        
        # 6. MAINTENANCE DUE SOON (next 7 days)
        upcoming_maintenance = MaintenanceSchedule.objects.filter(
            status='SCHEDULED',
            scheduled_date__gte=timezone.now(),
            scheduled_date__lte=timezone.now() + timedelta(days=7)
        ).select_related('vehicle')
        
        upcoming_alerts = []
        for maintenance in upcoming_maintenance:
            days_until = (maintenance.scheduled_date.date() - date_type.today()).days
            upcoming_alerts.append({
                'id': f'upcoming_{maintenance.id}',
                'alert_type': 'MAINTENANCE_DUE',
                'severity': 'INFO',
                'severity_display': 'Info',
                'status': 'ACTIVE',
                'title': 'Maintenance Due Soon',
                'message': f'{maintenance.vehicle.license_plate} - {maintenance.maintenance_type} scheduled in {days_until} days',
                'vehicle': maintenance.vehicle.id,
                'vehicle_plate': maintenance.vehicle.license_plate,
                'driver': None,
                'driver_name': None,
                'created_at': maintenance.created_at.isoformat(),
                'action_required': False,
            })
        
        # Serialize existing alerts
        serialized_alerts = AlertSerializer(alerts, many=True).data
        
        # Combine all alerts
        all_alerts = (
            list(serialized_alerts) + 
            license_alerts + 
            maintenance_alerts + 
            vehicle_maintenance_alerts +
            violation_alerts + 
            fuel_alerts +
            upcoming_alerts
        )
        
        # Sort by severity (CRITICAL first) and created_at
        def sort_key(alert):
            severity_order = {'CRITICAL': 0, 'WARNING': 1, 'INFO': 2}
            return (severity_order.get(alert['severity'], 3), alert.get('created_at', ''))
        
        all_alerts.sort(key=sort_key, reverse=True)
        
        return Response(all_alerts)
