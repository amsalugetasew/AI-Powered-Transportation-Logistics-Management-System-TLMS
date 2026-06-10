"""
Signal handlers for automatic alert generation
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import Count
from datetime import timedelta
from .analytics_models import DriverBehaviorLog
from .compliance_models import Alert


@receiver(post_save, sender=DriverBehaviorLog)
def generate_behavior_alert(sender, instance, created, **kwargs):
    """
    Auto-generate alert when driver has multiple violations in recent period
    """
    if not created:
        return
    
    # Only generate alerts for violation types
    violation_types = ['HARSH_BRAKE', 'HARSH_ACCEL', 'OVERSPEED', 'SHARP_TURN']
    if instance.behavior_type not in violation_types:
        return
    
    # Count violations in last 7 days for this driver
    seven_days_ago = timezone.now() - timedelta(days=7)
    violation_count = DriverBehaviorLog.objects.filter(
        driver=instance.driver,
        timestamp__gte=seven_days_ago,
        behavior_type__in=violation_types
    ).count()
    
    # Generate alert if 3+ violations
    if violation_count >= 3:
        # Check if alert already exists (within last 7 days)
        existing_alert = Alert.objects.filter(
            driver=instance.driver,
            alert_type='BEHAVIOR_ISSUE',
            status__in=['ACTIVE', 'ACKNOWLEDGED'],
            created_at__gte=seven_days_ago
        ).first()
        
        if existing_alert:
            # Update existing alert with new count
            recent_violations = DriverBehaviorLog.objects.filter(
                driver=instance.driver,
                timestamp__gte=seven_days_ago,
                behavior_type__in=violation_types
            ).order_by('-timestamp')[:3]
            
            violation_types_str = ', '.join([v.get_behavior_type_display() for v in recent_violations])
            
            existing_alert.message = f'{instance.driver.first_name} {instance.driver.last_name} - {violation_count} violations in last 7 days ({violation_types_str})'
            existing_alert.severity = 'CRITICAL' if violation_count >= 5 else 'WARNING'
            existing_alert.save()
        else:
            # Create new alert
            recent_violations = DriverBehaviorLog.objects.filter(
                driver=instance.driver,
                timestamp__gte=seven_days_ago,
                behavior_type__in=violation_types
            ).order_by('-timestamp')[:3]
            
            violation_types_str = ', '.join([v.get_behavior_type_display() for v in recent_violations])
            
            Alert.objects.create(
                alert_type='BEHAVIOR_ISSUE',
                severity='CRITICAL' if violation_count >= 5 else 'WARNING',
                status='ACTIVE',
                title='Driver Behavior Violation',
                message=f'{instance.driver.first_name} {instance.driver.last_name} - {violation_count} violations in last 7 days ({violation_types_str})',
                driver=instance.driver,
                vehicle=instance.vehicle,
                action_required=True
            )
