from django.db import models
from .models import Vehicle, Driver


class DriverBehaviorLog(models.Model):
    """Track driver behavior metrics for analytics"""
    BEHAVIOR_TYPES = (
        ('HARSH_BRAKE', 'Harsh Braking'),
        ('HARSH_ACCEL', 'Harsh Acceleration'),
        ('OVERSPEED', 'Overspeeding'),
        ('IDLE', 'Excessive Idling'),
        ('SHARP_TURN', 'Sharp Turn'),
        ('NORMAL', 'Normal Driving'),
    )
    
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='behavior_logs')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='behavior_logs')
    behavior_type = models.CharField(max_length=20, choices=BEHAVIOR_TYPES)
    severity = models.IntegerField(default=1, help_text="1-10 scale")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    speed = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Speed in km/h")
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'driver_behavior_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['driver', '-timestamp']),
            models.Index(fields=['vehicle', '-timestamp']),
            models.Index(fields=['behavior_type']),
        ]

    def __str__(self):
        return f"{self.driver} - {self.get_behavior_type_display()} at {self.timestamp}"


class FuelRecord(models.Model):
    """Track fuel consumption and costs"""
    FUEL_TYPES = (
        ('PETROL', 'Petrol'),
        ('DIESEL', 'Diesel'),
        ('CNG', 'CNG'),
        ('ELECTRIC', 'Electric'),
        ('HYBRID', 'Hybrid'),
    )
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='fuel_records')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='fuel_records')
    fuel_type = models.CharField(max_length=20, choices=FUEL_TYPES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity in liters or kWh")
    cost = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total cost")
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price per liter/kWh")
    odometer_reading = models.DecimalField(max_digits=10, decimal_places=2, help_text="Odometer reading in km")
    station_name = models.CharField(max_length=200, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    filled_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'fuel_records'
        ordering = ['-filled_at']
        indexes = [
            models.Index(fields=['vehicle', '-filled_at']),
            models.Index(fields=['driver', '-filled_at']),
        ]

    def __str__(self):
        return f"{self.vehicle} - {self.quantity}L at {self.filled_at}"

    @property
    def efficiency(self):
        """Calculate fuel efficiency if previous record exists"""
        try:
            prev_record = FuelRecord.objects.filter(
                vehicle=self.vehicle,
                filled_at__lt=self.filled_at
            ).order_by('-filled_at').first()
            
            if prev_record:
                distance = float(self.odometer_reading - prev_record.odometer_reading)
                if distance > 0:
                    return round(distance / float(self.quantity), 2)  # km per liter
        except:
            pass
        return None


class MaintenanceRecord(models.Model):
    """Track vehicle maintenance and costs"""
    MAINTENANCE_TYPES = (
        ('ROUTINE', 'Routine Service'),
        ('REPAIR', 'Repair'),
        ('INSPECTION', 'Inspection'),
        ('TIRE', 'Tire Replacement'),
        ('BRAKE', 'Brake Service'),
        ('ENGINE', 'Engine Work'),
        ('TRANSMISSION', 'Transmission'),
        ('ELECTRICAL', 'Electrical'),
        ('BODYWORK', 'Body Work'),
        ('OTHER', 'Other'),
    )
    
    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    parts_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    odometer_reading = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    service_provider = models.CharField(max_length=200, blank=True)
    scheduled_date = models.DateTimeField()
    completed_date = models.DateTimeField(null=True, blank=True)
    next_service_date = models.DateTimeField(null=True, blank=True)
    next_service_odometer = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'maintenance_records'
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['vehicle', '-scheduled_date']),
            models.Index(fields=['status']),
            models.Index(fields=['maintenance_type']),
        ]

    def __str__(self):
        return f"{self.vehicle} - {self.get_maintenance_type_display()} on {self.scheduled_date}"


class VehicleUtilization(models.Model):
    """Track daily vehicle utilization metrics"""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='utilization_records')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='utilization_records')
    date = models.DateField()
    
    # Distance metrics
    distance_traveled = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Distance in km")
    start_odometer = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    end_odometer = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Time metrics
    engine_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Hours")
    idle_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Hours")
    moving_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Hours")
    
    # Trip metrics
    number_of_trips = models.IntegerField(default=0)
    average_speed = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="km/h")
    max_speed = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="km/h")
    
    # Utilization percentage (engine hours / 24 hours * 100)
    utilization_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vehicle_utilization'
        unique_together = ['vehicle', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['vehicle', '-date']),
            models.Index(fields=['date']),
        ]

    def __str__(self):
        return f"{self.vehicle} - {self.date} ({self.utilization_percentage}%)"

    def save(self, *args, **kwargs):
        # Auto-calculate utilization percentage
        if self.engine_hours:
            self.utilization_percentage = round((float(self.engine_hours) / 24) * 100, 2)
        super().save(*args, **kwargs)
