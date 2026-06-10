from django.contrib import admin
from .models import Driver, Vehicle, VehicleDocument, VehicleAssignmentHistory
from .analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord, VehicleUtilization
from .compliance_models import LicenseTracking, AuditTrail, MaintenanceSchedule, Alert


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'first_name', 'last_name', 'license_number', 'is_active', 'organization']
    list_filter = ['is_active', 'organization']
    search_fields = ['employee_id', 'first_name', 'last_name', 'license_number']


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['license_plate', 'make', 'model', 'year', 'status', 'current_driver', 'organization']
    list_filter = ['status', 'make', 'organization']
    search_fields = ['license_plate', 'vin', 'make', 'model']


@admin.register(VehicleDocument)
class VehicleDocumentAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'document_type', 'document_number', 'expiry_date']
    list_filter = ['document_type']
    search_fields = ['vehicle__license_plate', 'document_number']


@admin.register(VehicleAssignmentHistory)
class VehicleAssignmentHistoryAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'driver', 'start_date', 'end_date']
    list_filter = ['start_date', 'end_date']
    search_fields = ['vehicle__license_plate', 'driver__first_name', 'driver__last_name']


@admin.register(DriverBehaviorLog)
class DriverBehaviorLogAdmin(admin.ModelAdmin):
    list_display = ['driver', 'vehicle', 'behavior_type', 'severity', 'timestamp']
    list_filter = ['behavior_type', 'timestamp']
    search_fields = ['driver__first_name', 'driver__last_name', 'vehicle__license_plate']
    date_hierarchy = 'timestamp'


@admin.register(FuelRecord)
class FuelRecordAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'driver', 'fuel_type', 'quantity', 'cost', 'filled_at']
    list_filter = ['fuel_type', 'filled_at']
    search_fields = ['vehicle__license_plate', 'station_name']
    date_hierarchy = 'filled_at'


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'maintenance_type', 'status', 'cost', 'scheduled_date', 'completed_date']
    list_filter = ['maintenance_type', 'status', 'scheduled_date']
    search_fields = ['vehicle__license_plate', 'service_provider', 'description']
    date_hierarchy = 'scheduled_date'


@admin.register(VehicleUtilization)
class VehicleUtilizationAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'driver', 'date', 'distance_traveled', 'engine_hours', 'utilization_percentage']
    list_filter = ['date']
    search_fields = ['vehicle__license_plate', 'driver__first_name']
    date_hierarchy = 'date'


# Compliance Models

@admin.register(LicenseTracking)
class LicenseTrackingAdmin(admin.ModelAdmin):
    list_display = ['license_number', 'license_type', 'get_entity', 'expiry_date', 'status', 'days_until_expiry']
    list_filter = ['license_type', 'status', 'expiry_date']
    search_fields = ['license_number', 'driver__first_name', 'driver__last_name', 'vehicle__license_plate']
    date_hierarchy = 'expiry_date'
    readonly_fields = ['days_until_expiry', 'created_at', 'updated_at']
    
    def get_entity(self, obj):
        if obj.driver:
            return f"Driver: {obj.driver.first_name} {obj.driver.last_name}"
        elif obj.vehicle:
            return f"Vehicle: {obj.vehicle.license_plate}"
        return "N/A"
    get_entity.short_description = 'Entity'


@admin.register(AuditTrail)
class AuditTrailAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'username', 'action_type', 'entity_type', 'entity_name', 'description']
    list_filter = ['action_type', 'entity_type', 'timestamp']
    search_fields = ['username', 'entity_name', 'description']
    date_hierarchy = 'timestamp'
    readonly_fields = ['timestamp']
    
    def has_add_permission(self, request):
        return False  # Audit logs shouldn't be manually created
    
    def has_delete_permission(self, request, obj=None):
        return False  # Audit logs shouldn't be deleted


@admin.register(MaintenanceSchedule)
class MaintenanceScheduleAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'maintenance_type', 'scheduled_date', 'priority', 'status', 'estimated_cost', 'is_overdue']
    list_filter = ['schedule_type', 'priority', 'status', 'scheduled_date']
    search_fields = ['vehicle__license_plate', 'maintenance_type', 'description', 'assigned_to']
    date_hierarchy = 'scheduled_date'
    readonly_fields = ['is_overdue', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('vehicle', 'schedule_type', 'maintenance_type', 'description', 'priority')
        }),
        ('Scheduling', {
            'fields': ('scheduled_date', 'scheduled_mileage', 'is_recurring', 'recurrence_interval_days', 'recurrence_interval_miles')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'status')
        }),
        ('Cost', {
            'fields': ('estimated_cost', 'actual_cost')
        }),
        ('Completion', {
            'fields': ('completed_date', 'completed_mileage', 'completed_by')
        }),
        ('Additional', {
            'fields': ('notes', 'alert_sent', 'is_overdue', 'created_at', 'updated_at')
        }),
    )


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'alert_type', 'severity', 'status', 'created_at', 'action_required']
    list_filter = ['alert_type', 'severity', 'status', 'created_at', 'action_required']
    search_fields = ['title', 'message']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Alert Information', {
            'fields': ('alert_type', 'severity', 'status', 'title', 'message')
        }),
        ('Related Entities', {
            'fields': ('driver', 'vehicle', 'license', 'maintenance')
        }),
        ('Action', {
            'fields': ('action_required', 'action_url', 'due_date')
        }),
        ('Response Tracking', {
            'fields': ('acknowledged_by', 'acknowledged_at', 'resolved_by', 'resolved_at', 'resolution_notes')
        }),
        ('Notifications', {
            'fields': ('email_sent', 'sms_sent')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
