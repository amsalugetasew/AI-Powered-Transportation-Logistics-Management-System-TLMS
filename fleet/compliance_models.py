from django.db import models
from django.conf import settings
from .models import Driver, Vehicle
from django.utils import timezone
from datetime import timedelta


class LicenseTracking(models.Model):
    """Track all licenses and certifications with expiry dates"""
    LICENSE_TYPES = (
        ('DRIVER', 'Driver License'),
        ('VEHICLE_REG', 'Vehicle Registration'),
        ('INSURANCE', 'Insurance'),
        ('INSPECTION', 'Inspection Certificate'),
        ('PERMIT', 'Special Permit'),
        ('CERTIFICATION', 'Driver Certification'),
        ('OTHER', 'Other'),
    )
    
    STATUS_CHOICES = (
        ('VALID', 'Valid'),
        ('EXPIRING_SOON', 'Expiring Soon'),
        ('EXPIRED', 'Expired'),
        ('RENEWED', 'Renewed'),
    )
    
    license_type = models.CharField(max_length=20, choices=LICENSE_TYPES)
    license_number = models.CharField(max_length=100)
    
    # Related entity (either driver or vehicle)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, null=True, blank=True, related_name='licenses')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, null=True, blank=True, related_name='licenses')
    
    issue_date = models.DateField()
    expiry_date = models.DateField()
    issuing_authority = models.CharField(max_length=200, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='VALID')
    
    document_file = models.CharField(max_length=500, blank=True, help_text="Path or URL to document")
    notes = models.TextField(blank=True)
    
    # Renewal tracking
    renewal_date = models.DateField(null=True, blank=True)
    renewed_license = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='previous_version')
    
    alert_sent = models.BooleanField(default=False)
    alert_sent_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'license_tracking'
        ordering = ['expiry_date']
        indexes = [
            models.Index(fields=['expiry_date']),
            models.Index(fields=['status']),
            models.Index(fields=['license_type']),
        ]
    
    def __str__(self):
        entity = self.driver or self.vehicle
        return f"{self.get_license_type_display()} - {entity} - Expires: {self.expiry_date}"
    
    def save(self, *args, **kwargs):
        # Auto-update status based on expiry date
        today = timezone.now().date()
        days_until_expiry = (self.expiry_date - today).days
        
        old_status = None
        if self.pk:
            try:
                old_status = LicenseTracking.objects.get(pk=self.pk).status
            except LicenseTracking.DoesNotExist:
                pass
        
        if days_until_expiry < 0:
            self.status = 'EXPIRED'
        elif days_until_expiry <= 30:
            self.status = 'EXPIRING_SOON'
        else:
            self.status = 'VALID'
        
        super().save(*args, **kwargs)
        
        # Auto-generate alert if status changed to EXPIRING_SOON or EXPIRED
        if old_status != self.status and self.status in ['EXPIRING_SOON', 'EXPIRED']:
            # Check if alert already exists
            existing_alert = Alert.objects.filter(
                license=self,
                alert_type='LICENSE_EXPIRY',
                status__in=['ACTIVE', 'ACKNOWLEDGED']
            ).first()
            
            if not existing_alert:
                entity_name = str(self.driver) if self.driver else str(self.vehicle)
                severity = 'CRITICAL' if days_until_expiry <= 7 else 'WARNING'
                
                Alert.objects.create(
                    alert_type='LICENSE_EXPIRY',
                    severity=severity,
                    status='ACTIVE',
                    title=f'{self.get_license_type_display()} Expiring Soon',
                    message=f'{entity_name} - {self.get_license_type_display()} expires in {days_until_expiry} days',
                    driver=self.driver,
                    vehicle=self.vehicle,
                    license=self,
                    action_required=True,
                    due_date=timezone.make_aware(timezone.datetime.combine(self.expiry_date, timezone.datetime.min.time()))
                )
    
    @property
    def days_until_expiry(self):
        today = timezone.now().date()
        return (self.expiry_date - today).days


class AuditTrail(models.Model):
    """Comprehensive audit trail for all system changes"""
    ACTION_TYPES = (
        ('CREATE', 'Created'),
        ('UPDATE', 'Updated'),
        ('DELETE', 'Deleted'),
        ('ASSIGN', 'Assigned'),
        ('UNASSIGN', 'Unassigned'),
        ('STATUS_CHANGE', 'Status Changed'),
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('ALERT', 'Alert Generated'),
        ('MAINTENANCE', 'Maintenance Activity'),
        ('OTHER', 'Other'),
    )
    
    ENTITY_TYPES = (
        ('DRIVER', 'Driver'),
        ('VEHICLE', 'Vehicle'),
        ('LICENSE', 'License'),
        ('MAINTENANCE', 'Maintenance'),
        ('USER', 'User'),
        ('ALERT', 'Alert'),
        ('SYSTEM', 'System'),
    )
    
    # Who did it
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    username = models.CharField(max_length=150)  # Store username in case user is deleted
    
    # What happened
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    entity_id = models.IntegerField(null=True, blank=True)
    entity_name = models.CharField(max_length=200, blank=True)
    
    # Details
    description = models.TextField()
    changes = models.JSONField(null=True, blank=True, help_text="JSON of what changed (before/after)")
    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_trail'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['action_type']),
        ]
    
    def __str__(self):
        return f"{self.username} - {self.get_action_type_display()} - {self.entity_type} - {self.timestamp}"


class MaintenanceSchedule(models.Model):
    """Schedule and track maintenance activities"""
    SCHEDULE_TYPES = (
        ('TIME_BASED', 'Time-Based'),
        ('MILEAGE_BASED', 'Mileage-Based'),
        ('CONDITION_BASED', 'Condition-Based'),
        ('EMERGENCY', 'Emergency'),
    )
    
    PRIORITY_CHOICES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    )
    
    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('OVERDUE', 'Overdue'),
    )
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='scheduled_maintenance')
    
    schedule_type = models.CharField(max_length=20, choices=SCHEDULE_TYPES)
    maintenance_type = models.CharField(max_length=100)
    description = models.TextField()
    
    # Scheduling criteria
    scheduled_date = models.DateTimeField()
    scheduled_mileage = models.IntegerField(null=True, blank=True, help_text="Schedule at this mileage")
    
    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_interval_days = models.IntegerField(null=True, blank=True)
    recurrence_interval_miles = models.IntegerField(null=True, blank=True)
    
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    
    # Assignment
    assigned_to = models.CharField(max_length=200, blank=True, help_text="Service provider or mechanic")
    
    # Completion tracking
    completed_date = models.DateTimeField(null=True, blank=True)
    completed_mileage = models.IntegerField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Cost (links to MaintenanceRecord when completed)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Next schedule (for recurring)
    next_schedule_date = models.DateTimeField(null=True, blank=True)
    next_schedule_mileage = models.IntegerField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    alert_sent = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_schedules')
    
    class Meta:
        db_table = 'maintenance_schedule'
        ordering = ['scheduled_date']
        indexes = [
            models.Index(fields=['vehicle', 'scheduled_date']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
        ]
    
    def __str__(self):
        return f"{self.vehicle.license_plate} - {self.maintenance_type} - {self.scheduled_date}"
    
    def save(self, *args, **kwargs):
        # Track old status
        old_status = None
        if self.pk:
            try:
                old_status = MaintenanceSchedule.objects.get(pk=self.pk).status
            except MaintenanceSchedule.DoesNotExist:
                pass
        
        # Auto-update status to OVERDUE if past scheduled date
        if self.status == 'SCHEDULED' and self.scheduled_date < timezone.now():
            self.status = 'OVERDUE'
        
        super().save(*args, **kwargs)
        
        # Auto-generate alert if status changed to OVERDUE
        if old_status != 'OVERDUE' and self.status == 'OVERDUE':
            # Check if alert already exists
            existing_alert = Alert.objects.filter(
                maintenance=self,
                alert_type='MAINTENANCE_OVERDUE',
                status__in=['ACTIVE', 'ACKNOWLEDGED']
            ).first()
            
            if not existing_alert:
                days_overdue = (timezone.now().date() - self.scheduled_date.date()).days
                
                Alert.objects.create(
                    alert_type='MAINTENANCE_OVERDUE',
                    severity='CRITICAL' if days_overdue > 7 else 'WARNING',
                    status='ACTIVE',
                    title='Maintenance Overdue',
                    message=f'{self.vehicle.license_plate} - {self.maintenance_type} is {days_overdue} days overdue',
                    vehicle=self.vehicle,
                    maintenance=self,
                    action_required=True,
                    due_date=self.scheduled_date
                )
    
    @property
    def is_overdue(self):
        return self.status == 'SCHEDULED' and self.scheduled_date < timezone.now()


class Alert(models.Model):
    """System alerts and notifications"""
    ALERT_TYPES = (
        ('LICENSE_EXPIRY', 'License Expiring'),
        ('MAINTENANCE_DUE', 'Maintenance Due'),
        ('MAINTENANCE_OVERDUE', 'Maintenance Overdue'),
        ('VEHICLE_INACTIVE', 'Vehicle Inactive'),
        ('DRIVER_INACTIVE', 'Driver Inactive'),
        ('BEHAVIOR_ISSUE', 'Driver Behavior Issue'),
        ('COST_THRESHOLD', 'Cost Threshold Exceeded'),
        ('SYSTEM', 'System Alert'),
        ('CUSTOM', 'Custom Alert'),
    )
    
    SEVERITY_CHOICES = (
        ('INFO', 'Information'),
        ('WARNING', 'Warning'),
        ('CRITICAL', 'Critical'),
    )
    
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('RESOLVED', 'Resolved'),
        ('DISMISSED', 'Dismissed'),
    )
    
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='WARNING')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Related entities
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, null=True, blank=True, related_name='alerts')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, null=True, blank=True, related_name='alerts')
    license = models.ForeignKey(LicenseTracking, on_delete=models.CASCADE, null=True, blank=True, related_name='alerts')
    maintenance = models.ForeignKey(MaintenanceSchedule, on_delete=models.CASCADE, null=True, blank=True, related_name='alerts')
    
    # Action required
    action_required = models.BooleanField(default=False)
    action_url = models.CharField(max_length=500, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    
    # Response tracking
    acknowledged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    # Notification tracking
    email_sent = models.BooleanField(default=False)
    sms_sent = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status', 'severity']),
            models.Index(fields=['alert_type']),
        ]
    
    def __str__(self):
        return f"{self.get_severity_display()} - {self.title} - {self.created_at}"
    
    def acknowledge(self, user):
        """Mark alert as acknowledged"""
        self.status = 'ACKNOWLEDGED'
        self.acknowledged_by = user
        self.acknowledged_at = timezone.now()
        self.save()
    
    def resolve(self, user, notes=''):
        """Mark alert as resolved"""
        self.status = 'RESOLVED'
        self.resolved_by = user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()
