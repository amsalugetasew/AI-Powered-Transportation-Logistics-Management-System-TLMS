from rest_framework import serializers
from .compliance_models import LicenseTracking, AuditTrail, MaintenanceSchedule, Alert


class LicenseTrackingSerializer(serializers.ModelSerializer):
    license_type_display = serializers.CharField(source='get_license_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_until_expiry = serializers.ReadOnlyField()
    entity_name = serializers.SerializerMethodField()
    entity_type = serializers.SerializerMethodField()
    
    class Meta:
        model = LicenseTracking
        fields = '__all__'
    
    def get_entity_name(self, obj):
        if obj.driver:
            return f"{obj.driver.first_name} {obj.driver.last_name}"
        elif obj.vehicle:
            return obj.vehicle.license_plate
        return "N/A"
    
    def get_entity_type(self, obj):
        if obj.driver:
            return "Driver"
        elif obj.vehicle:
            return "Vehicle"
        return "Unknown"


class AuditTrailSerializer(serializers.ModelSerializer):
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)
    
    class Meta:
        model = AuditTrail
        fields = '__all__'


class MaintenanceScheduleSerializer(serializers.ModelSerializer):
    schedule_type_display = serializers.CharField(source='get_schedule_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.license_plate', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = MaintenanceSchedule
        fields = '__all__'


class AlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    driver_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.SerializerMethodField()
    
    class Meta:
        model = Alert
        fields = '__all__'
    
    def get_driver_name(self, obj):
        if obj.driver:
            return f"{obj.driver.first_name} {obj.driver.last_name}"
        return None
    
    def get_vehicle_plate(self, obj):
        if obj.vehicle:
            return obj.vehicle.license_plate
        return None
