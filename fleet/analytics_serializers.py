from rest_framework import serializers
from .analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord, VehicleUtilization
from .models import Driver, Vehicle


class DriverBehaviorLogSerializer(serializers.ModelSerializer):
    driver_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.SerializerMethodField()
    behavior_display = serializers.CharField(source='get_behavior_type_display', read_only=True)
    
    class Meta:
        model = DriverBehaviorLog
        fields = '__all__'
        
    def get_driver_name(self, obj):
        return f"{obj.driver.first_name} {obj.driver.last_name}"
    
    def get_vehicle_plate(self, obj):
        return obj.vehicle.license_plate


class FuelRecordSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    fuel_type_display = serializers.CharField(source='get_fuel_type_display', read_only=True)
    efficiency = serializers.ReadOnlyField()
    
    class Meta:
        model = FuelRecord
        fields = '__all__'
        
    def get_vehicle_plate(self, obj):
        return obj.vehicle.license_plate
    
    def get_driver_name(self, obj):
        if obj.driver:
            return f"{obj.driver.first_name} {obj.driver.last_name}"
        return "N/A"


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.SerializerMethodField()
    maintenance_type_display = serializers.CharField(source='get_maintenance_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = MaintenanceRecord
        fields = '__all__'
        
    def get_vehicle_plate(self, obj):
        return obj.vehicle.license_plate
    
    def get_total_cost(self, obj):
        return float(obj.labor_cost) + float(obj.parts_cost)


class VehicleUtilizationSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    idle_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = VehicleUtilization
        fields = '__all__'
        
    def get_vehicle_plate(self, obj):
        return obj.vehicle.license_plate
    
    def get_driver_name(self, obj):
        if obj.driver:
            return f"{obj.driver.first_name} {obj.driver.last_name}"
        return "N/A"
    
    def get_idle_percentage(self, obj):
        if obj.engine_hours and float(obj.engine_hours) > 0:
            return round((float(obj.idle_hours) / float(obj.engine_hours)) * 100, 2)
        return 0
