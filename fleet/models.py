from django.db import models
from django.conf import settings
from hierarchy.models import OrganizationLevel

class Driver(models.Model):
    employee_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=20, blank=True)
    license_number = models.CharField(max_length=50, unique=True)
    license_issue_date = models.DateField(null=True, blank=True)
    license_expiry_date = models.DateField()
    issuing_authority = models.CharField(max_length=200, blank=True)
    license_notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    organization = models.ForeignKey(OrganizationLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name='drivers')
    
    # Audit trail fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_drivers')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_drivers')

    class Meta:
        db_table = 'drivers'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.license_number})"
    
    def save(self, *args, **kwargs):
        """
        Override save to also create/update license tracking record
        """
        # Save the driver first
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Create or update license tracking record
        if self.license_number and self.license_expiry_date:
            from .compliance_models import LicenseTracking
            
            # Check if license record exists for this driver
            license_record = LicenseTracking.objects.filter(
                driver=self,
                license_type='DRIVER'
            ).first()
            
            if license_record:
                # Update existing record
                license_record.license_number = self.license_number
                license_record.issue_date = self.license_issue_date or license_record.issue_date
                license_record.expiry_date = self.license_expiry_date
                license_record.issuing_authority = self.issuing_authority or ''
                license_record.notes = self.license_notes or ''
                license_record.save()
            else:
                # Create new license record
                LicenseTracking.objects.create(
                    license_type='DRIVER',
                    license_number=self.license_number,
                    driver=self,
                    issue_date=self.license_issue_date or self.created_at.date(),
                    expiry_date=self.license_expiry_date,
                    issuing_authority=self.issuing_authority or '',
                    notes=self.license_notes or ''
                )


class Vehicle(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('MAINTENANCE', 'In Maintenance'),
    )

    license_plate = models.CharField(max_length=20, unique=True)
    vin = models.CharField(max_length=50, unique=True, verbose_name="Vehicle Identification Number")
    make = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField()
    capacity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Capacity in tons or passengers")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    is_immobilized = models.BooleanField(default=False)
    
    current_driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_vehicles')
    organization = models.ForeignKey(OrganizationLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles')
    
    device_imei = models.CharField(max_length=50, unique=True, null=True, blank=True, help_text="GT06 GPS Device IMEI")

    # Audit trail fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_vehicles')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_vehicles')

    class Meta:
        db_table = 'vehicles'

    def __str__(self):
        return f"{self.license_plate} - {self.make} {self.model}"


class VehicleDocument(models.Model):
    DOC_TYPES = (
        ('INSURANCE', 'Insurance Policy'),
        ('REGISTRATION', 'Registration Certificate'),
        ('INSPECTION', 'Inspection Report'),
        ('OTHER', 'Other'),
    )
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOC_TYPES)
    document_number = models.CharField(max_length=100, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField()
    file_url = models.URLField(blank=True, help_text="URL to stored document file")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vehicle_documents'

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.vehicle.license_plate}"

class VehicleAssignmentHistory(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='assignment_history')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='assignment_history')
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'vehicle_assignment_history'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.driver} assigned to {self.vehicle} from {self.start_date}"

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

@receiver(pre_save, sender=Vehicle)
def track_vehicle_driver_change(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Vehicle.objects.get(pk=instance.pk)
            instance._old_driver = old_instance.current_driver
        except Vehicle.DoesNotExist:
            instance._old_driver = None
    else:
        instance._old_driver = None

@receiver(post_save, sender=Vehicle)
def update_vehicle_assignment_history(sender, instance, created, **kwargs):
    old_driver = getattr(instance, '_old_driver', None)
    new_driver = instance.current_driver
    
    if old_driver != new_driver:
        # Close old assignment
        if old_driver:
            open_histories = VehicleAssignmentHistory.objects.filter(
                vehicle=instance, driver=old_driver, end_date__isnull=True
            )
            open_histories.update(end_date=timezone.now())
        
        # Open new assignment
        if new_driver:
            VehicleAssignmentHistory.objects.create(
                vehicle=instance, driver=new_driver
            )
