"""
Management command to generate alerts for licenses, maintenance, and driver behavior
Run this command periodically (e.g., daily) via cron job or scheduled task
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta, date as date_type
from fleet.compliance_models import LicenseTracking, MaintenanceSchedule, Alert
from fleet.analytics_models import DriverBehaviorLog, FuelRecord
from fleet.models import Vehicle, Driver


class Command(BaseCommand):
    help = 'Generate system alerts for licenses, maintenance, and driver behavior'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-license',
            action='store_true',
            help='Skip license expiry alerts',
        )
        parser.add_argument(
            '--skip-maintenance',
            action='store_true',
            help='Skip maintenance alerts',
        )
        parser.add_argument(
            '--skip-behavior',
            action='store_true',
            help='Skip driver behavior alerts',
        )
        parser.add_argument(
            '--skip-fuel',
            action='store_true',
            help='Skip fuel consumption alerts',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting alert generation...'))
        
        total_created = 0
        
        # 1. Generate License Expiry Alerts
        if not options['skip_license']:
            count = self.generate_license_alerts()
            total_created += count
            self.stdout.write(f'  ✓ Created {count} license alerts')
        
        # 2. Generate Maintenance Alerts
        if not options['skip_maintenance']:
            count = self.generate_maintenance_alerts()
            total_created += count
            self.stdout.write(f'  ✓ Created {count} maintenance alerts')
        
        # 3. Generate Driver Behavior Alerts
        if not options['skip_behavior']:
            count = self.generate_behavior_alerts()
            total_created += count
            self.stdout.write(f'  ✓ Created {count} behavior alerts')
        
        # 4. Generate Fuel Consumption Alerts
        if not options['skip_fuel']:
            count = self.generate_fuel_alerts()
            total_created += count
            self.stdout.write(f'  ✓ Created {count} fuel alerts')
        
        # 5. Clean up old resolved/dismissed alerts (older than 90 days)
        self.cleanup_old_alerts()
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Alert generation complete! Total alerts created: {total_created}'))

    def generate_license_alerts(self):
        """Generate alerts for expiring licenses"""
        count = 0
        today = date_type.today()
        
        # Check licenses expiring in next 30 days
        thirty_days = today + timedelta(days=30)
        seven_days = today + timedelta(days=7)
        
        expiring_licenses = LicenseTracking.objects.filter(
            status__in=['VALID', 'EXPIRING_SOON'],
            expiry_date__lte=thirty_days,
            expiry_date__gte=today
        ).select_related('driver', 'vehicle')
        
        for license in expiring_licenses:
            days_until_expiry = (license.expiry_date - today).days
            
            # Determine severity
            if days_until_expiry <= 3:
                severity = 'CRITICAL'
            elif days_until_expiry <= 7:
                severity = 'WARNING'
            else:
                severity = 'INFO'
            
            # Check if alert already exists for this license
            existing_alert = Alert.objects.filter(
                license=license,
                alert_type='LICENSE_EXPIRY',
                status__in=['ACTIVE', 'ACKNOWLEDGED']
            ).first()
            
            if existing_alert:
                # Update severity if it changed
                if existing_alert.severity != severity:
                    existing_alert.severity = severity
                    existing_alert.message = f'{license.get_license_type_display()} expires in {days_until_expiry} days'
                    existing_alert.save()
            else:
                # Create new alert
                entity_name = str(license.driver) if license.driver else str(license.vehicle)
                
                Alert.objects.create(
                    alert_type='LICENSE_EXPIRY',
                    severity=severity,
                    status='ACTIVE',
                    title=f'{license.get_license_type_display()} Expiring Soon',
                    message=f'{entity_name} - {license.get_license_type_display()} expires in {days_until_expiry} days',
                    driver=license.driver,
                    vehicle=license.vehicle,
                    license=license,
                    action_required=True,
                    due_date=timezone.make_aware(timezone.datetime.combine(license.expiry_date, timezone.datetime.min.time()))
                )
                count += 1
        
        return count

    def generate_maintenance_alerts(self):
        """Generate alerts for overdue and upcoming maintenance"""
        count = 0
        now = timezone.now()
        seven_days_ahead = now + timedelta(days=7)
        
        # 1. OVERDUE MAINTENANCE (Critical)
        overdue_maintenance = MaintenanceSchedule.objects.filter(
            Q(status='SCHEDULED') | Q(status='OVERDUE'),
            scheduled_date__lt=now
        ).select_related('vehicle')
        
        for maintenance in overdue_maintenance:
            # Check if alert already exists
            existing_alert = Alert.objects.filter(
                maintenance=maintenance,
                alert_type='MAINTENANCE_OVERDUE',
                status__in=['ACTIVE', 'ACKNOWLEDGED']
            ).first()
            
            if not existing_alert:
                days_overdue = (now.date() - maintenance.scheduled_date.date()).days
                
                Alert.objects.create(
                    alert_type='MAINTENANCE_OVERDUE',
                    severity='CRITICAL' if days_overdue > 7 else 'WARNING',
                    status='ACTIVE',
                    title='Maintenance Overdue',
                    message=f'{maintenance.vehicle.license_plate} - {maintenance.maintenance_type} is {days_overdue} days overdue',
                    vehicle=maintenance.vehicle,
                    maintenance=maintenance,
                    action_required=True,
                    due_date=maintenance.scheduled_date
                )
                count += 1
        
        # 2. UPCOMING MAINTENANCE (next 7 days)
        upcoming_maintenance = MaintenanceSchedule.objects.filter(
            status='SCHEDULED',
            scheduled_date__gte=now,
            scheduled_date__lte=seven_days_ahead
        ).select_related('vehicle')
        
        for maintenance in upcoming_maintenance:
            # Check if alert already exists
            existing_alert = Alert.objects.filter(
                maintenance=maintenance,
                alert_type='MAINTENANCE_DUE',
                status__in=['ACTIVE', 'ACKNOWLEDGED']
            ).first()
            
            if not existing_alert:
                days_until = (maintenance.scheduled_date.date() - now.date()).days
                
                Alert.objects.create(
                    alert_type='MAINTENANCE_DUE',
                    severity='INFO',
                    status='ACTIVE',
                    title='Maintenance Due Soon',
                    message=f'{maintenance.vehicle.license_plate} - {maintenance.maintenance_type} scheduled in {days_until} days',
                    vehicle=maintenance.vehicle,
                    maintenance=maintenance,
                    action_required=False,
                    due_date=maintenance.scheduled_date
                )
                count += 1
        
        # 3. VEHICLES IN MAINTENANCE STATUS
        vehicles_in_maintenance = Vehicle.objects.filter(status='MAINTENANCE')
        
        for vehicle in vehicles_in_maintenance:
            # Check if alert already exists
            existing_alert = Alert.objects.filter(
                vehicle=vehicle,
                alert_type='VEHICLE_INACTIVE',
                status__in=['ACTIVE', 'ACKNOWLEDGED']
            ).first()
            
            if not existing_alert:
                Alert.objects.create(
                    alert_type='VEHICLE_INACTIVE',
                    severity='WARNING',
                    status='ACTIVE',
                    title='Vehicle In Maintenance',
                    message=f'{vehicle.license_plate} - {vehicle.make} {vehicle.model} is currently in maintenance',
                    vehicle=vehicle,
                    action_required=True
                )
                count += 1
        
        return count

    def generate_behavior_alerts(self):
        """Generate alerts for driver behavior issues (violations)"""
        count = 0
        seven_days_ago = timezone.now() - timedelta(days=7)
        
        # Find drivers with 3+ violations in last 7 days
        driver_violations = DriverBehaviorLog.objects.filter(
            timestamp__gte=seven_days_ago,
            behavior_type__in=['HARSH_BRAKE', 'HARSH_ACCEL', 'OVERSPEED', 'SHARP_TURN']
        ).values('driver').annotate(
            violation_count=Count('id')
        ).filter(violation_count__gte=3)
        
        for violation in driver_violations:
            try:
                driver = Driver.objects.get(id=violation['driver'])
                violation_count = violation['violation_count']
                
                # Check if alert already exists (within last 7 days)
                existing_alert = Alert.objects.filter(
                    driver=driver,
                    alert_type='BEHAVIOR_ISSUE',
                    status__in=['ACTIVE', 'ACKNOWLEDGED'],
                    created_at__gte=seven_days_ago
                ).first()
                
                if existing_alert:
                    # Update existing alert with new count
                    existing_alert.message = f'{driver.first_name} {driver.last_name} - {violation_count} violations in last 7 days'
                    existing_alert.severity = 'CRITICAL' if violation_count >= 5 else 'WARNING'
                    existing_alert.save()
                else:
                    # Get most recent violation details
                    recent_violations = DriverBehaviorLog.objects.filter(
                        driver=driver,
                        timestamp__gte=seven_days_ago,
                        behavior_type__in=['HARSH_BRAKE', 'HARSH_ACCEL', 'OVERSPEED', 'SHARP_TURN']
                    ).order_by('-timestamp')[:3]
                    
                    violation_types = ', '.join([v.get_behavior_type_display() for v in recent_violations])
                    
                    Alert.objects.create(
                        alert_type='BEHAVIOR_ISSUE',
                        severity='CRITICAL' if violation_count >= 5 else 'WARNING',
                        status='ACTIVE',
                        title='Driver Behavior Violation',
                        message=f'{driver.first_name} {driver.last_name} - {violation_count} violations in last 7 days ({violation_types})',
                        driver=driver,
                        vehicle=driver.assigned_vehicles.first() if driver.assigned_vehicles.exists() else None,
                        action_required=True
                    )
                    count += 1
            except Driver.DoesNotExist:
                continue
        
        return count

    def generate_fuel_alerts(self):
        """Generate alerts for high fuel consumption (efficiency drop)"""
        count = 0
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Get vehicles with recent fuel records
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
                        # Check if alert already exists (within last 7 days)
                        seven_days_ago = timezone.now() - timedelta(days=7)
                        existing_alert = Alert.objects.filter(
                            vehicle=vehicle,
                            alert_type='COST_THRESHOLD',
                            status__in=['ACTIVE', 'ACKNOWLEDGED'],
                            created_at__gte=seven_days_ago
                        ).first()
                        
                        if not existing_alert:
                            Alert.objects.create(
                                alert_type='COST_THRESHOLD',
                                severity='WARNING',
                                status='ACTIVE',
                                title='High Fuel Consumption',
                                message=f'{vehicle.license_plate} - Fuel efficiency dropped: {latest_efficiency:.2f} km/L (avg: {avg_efficiency:.2f} km/L)',
                                vehicle=vehicle,
                                driver=vehicle.current_driver,
                                action_required=True
                            )
                            count += 1
            except Vehicle.DoesNotExist:
                continue
        
        return count

    def cleanup_old_alerts(self):
        """Clean up old resolved/dismissed alerts older than 90 days"""
        ninety_days_ago = timezone.now() - timedelta(days=90)
        
        deleted_count = Alert.objects.filter(
            status__in=['RESOLVED', 'DISMISSED'],
            updated_at__lt=ninety_days_ago
        ).delete()[0]
        
        if deleted_count > 0:
            self.stdout.write(f'  🗑️  Cleaned up {deleted_count} old alerts')
