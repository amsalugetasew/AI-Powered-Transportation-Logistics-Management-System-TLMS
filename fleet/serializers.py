from rest_framework import serializers
from .models import Driver, Vehicle, VehicleDocument, VehicleAssignmentHistory
from tracking.models import VehicleLocation
from hierarchy.models import OrganizationLevel
from hierarchy.models import OrganizationLevel

class DriverSerializer(serializers.ModelSerializer):
    assigned_vehicle_plate = serializers.SerializerMethodField()
    assigned_vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    assignment_history = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Driver
        fields = '__all__'

    def get_assignment_history(self, obj):
        # We define a local serializer or use the global one.
        # But wait, VehicleAssignmentHistorySerializer is defined below.
        # So we can just use the SerializerMethodField to resolve it or move the definition.
        # Let's use a MethodField to avoid circular imports / ordering issues.
        history = obj.assignment_history.all()
        return VehicleAssignmentHistorySerializer(history, many=True).data

    def get_assigned_vehicle_plate(self, obj):
        vehicle = obj.assigned_vehicles.first()
        return vehicle.license_plate if vehicle else None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.username}"
        return 'System'
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.created_by.username}"
        return None

    def validate_assigned_vehicle_id(self, value):
        if value:
            if value.current_driver and (not self.instance or value.current_driver != self.instance):
                raise serializers.ValidationError("This vehicle is already assigned to another driver. Unassign them first.")
        return value

    def create(self, validated_data):
        assigned_vehicle = validated_data.pop('assigned_vehicle_id', None)
        driver = super().create(validated_data)
        if assigned_vehicle:
            assigned_vehicle.current_driver = driver
            assigned_vehicle.save()
        return driver

    def update(self, instance, validated_data):
        assigned_vehicle = validated_data.pop('assigned_vehicle_id', None)
        
        # If the request contains the 'assigned_vehicle_id' key (even if null)
        if 'assigned_vehicle_id' in self.initial_data:
            # First, unassign from any current vehicles
            for vehicle in Vehicle.objects.filter(current_driver=instance):
                vehicle.current_driver = None
                vehicle.save()
            
            # Then assign the new one if provided
            if assigned_vehicle:
                assigned_vehicle.current_driver = instance
                assigned_vehicle.save()
                
        instance = super().update(instance, validated_data)
        
        # Auto-unassign vehicles if driver is deactivated
        if not instance.is_active:
            for vehicle in Vehicle.objects.filter(current_driver=instance):
                vehicle.current_driver = None
                vehicle.save()
                
        return instance

class VehicleDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleDocument
        fields = '__all__'

class VehicleAssignmentHistorySerializer(serializers.ModelSerializer):
    driver_name = serializers.SerializerMethodField()
    driver_employee_id = serializers.CharField(source='driver.employee_id', read_only=True)
    driver_license_number = serializers.CharField(source='driver.license_number', read_only=True)
    
    vehicle_plate = serializers.CharField(source='vehicle.license_plate', read_only=True)
    vehicle_make = serializers.CharField(source='vehicle.make', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle.model', read_only=True)

    class Meta:
        model = VehicleAssignmentHistory
        fields = ['id', 'start_date', 'end_date', 'driver', 'driver_name', 'driver_employee_id', 'driver_license_number', 'vehicle', 'vehicle_plate', 'vehicle_make', 'vehicle_model']

    def get_driver_name(self, obj):
        return f"{obj.driver.first_name} {obj.driver.last_name}"

class VehicleSerializer(serializers.ModelSerializer):
    current_driver = DriverSerializer(read_only=True)
    current_driver_id = serializers.PrimaryKeyRelatedField(
        queryset=Driver.objects.all(),
        source='current_driver',
        write_only=True,
        required=False,
        allow_null=True
    )
    documents = VehicleDocumentSerializer(many=True, read_only=True)
    assignment_history = VehicleAssignmentHistorySerializer(many=True, read_only=True)
    last_location = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = '__all__'

    def get_last_location(self, obj):
        loc = obj.locations.first()
        if loc:
            return {
                'lat': loc.latitude,
                'lng': loc.longitude,
                'speed': loc.speed,
                'heading': loc.heading,
                'timestamp': loc.timestamp
            }
        return None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.username}"
        return 'System'
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.updated_by.username}"
        return None

    def validate_device_imei(self, value):
        """Convert empty string to None for unique constraint"""
        if value == '' or value is None:
            return None
        return value

    def validate_current_driver_id(self, value):
        if value:
            existing = Vehicle.objects.filter(current_driver=value)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError("This driver is already assigned to another vehicle. Unassign them first.")
        return value

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        
        # Auto-unassign driver if vehicle is no longer active
        if instance.status != 'ACTIVE' and instance.current_driver:
            instance.current_driver = None
            instance.save()
            
        return instance
