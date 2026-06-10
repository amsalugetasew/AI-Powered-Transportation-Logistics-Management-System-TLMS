from fleet.models import Vehicle, Driver
from fleet.analytics_models import MaintenanceRecord
from tracking.models import VehicleLocation
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Max, Min, Q


class QueryGenerator:
    """Generate database queries based on analysis"""
    
    def generate_query(self, analysis):
        """
        Generate database query based on analysis
        Returns: QuerySet or list of data
        """
        entities = analysis.get('entities', [])
        filters = analysis.get('filters', {})
        
        if not entities:
            return []
        
        # Route to appropriate entity query
        if 'vehicles' in entities:
            # Check for "need maintenance" type queries
            if 'maintenance' in analysis.get('sql_hints', '').lower() or filters.get('status') == 'maintenance':
                return self._vehicles_needing_maintenance(filters)
            return self._vehicle_query(filters)
        elif 'drivers' in entities:
            return self._driver_query(filters)
        elif 'maintenance' in entities:
            return self._maintenance_query(filters)
        elif 'trips' in entities or 'tracking' in entities:
            return self._tracking_query(filters)
        else:
            return []
    
    def _vehicles_needing_maintenance(self, filters):
        """Get vehicles that need maintenance"""
        # Return vehicles with status MAINTENANCE or that have overdue maintenance
        queryset = Vehicle.objects.select_related('current_driver', 'organization').filter(
            status='MAINTENANCE'
        )
        
        return list(queryset.values(
            'id', 'license_plate', 'make', 'model', 'year', 'status', 
            'vin', 'current_driver__first_name', 
            'current_driver__last_name', 'created_at'
        ))
    
    def _vehicle_query(self, filters):
        """Query vehicles with filters"""
        queryset = Vehicle.objects.select_related('current_driver', 'organization').all()
        
        # Apply status filter - Vehicle uses STATUS_CHOICES with uppercase values
        status = filters.get('status', '').lower()
        if status:
            if status == 'active':
                queryset = queryset.filter(status='ACTIVE')
            elif status == 'inactive':
                queryset = queryset.filter(status='INACTIVE')
            elif status == 'maintenance':
                queryset = queryset.filter(status='MAINTENANCE')
        
        # Apply date range filter for recently added
        date_range = filters.get('date_range', '')
        if date_range:
            queryset = self._apply_date_filter(queryset, 'created_at', date_range)
        
        # Return as list of dicts for easier processing
        # Note: Vehicle model uses 'license_plate' not 'plate_number'
        #       and 'current_driver' not 'driver'
        return list(queryset.values(
            'id', 'license_plate', 'make', 'model', 'year', 'status', 
            'vin', 'capacity', 'current_driver__first_name', 
            'current_driver__last_name', 'created_at', 'device_imei'
        ))
    
    def _driver_query(self, filters):
        """Query drivers with filters"""
        queryset = Driver.objects.select_related('organization').all()
        
        # Apply status filter - Driver uses is_active field
        status = filters.get('status', '').lower()
        if status == 'active':
            queryset = queryset.filter(is_active=True)
        elif status == 'inactive':
            queryset = queryset.filter(is_active=False)
        
        # Apply date range
        date_range = filters.get('date_range', '')
        if date_range:
            queryset = self._apply_date_filter(queryset, 'created_at', date_range)
        
        # Return as list of dicts
        return list(queryset.values(
            'id', 'employee_id', 'first_name', 'last_name', 
            'phone_number', 'license_number', 'license_expiry_date',
            'is_active', 'created_at'
        ))
    
    def _maintenance_query(self, filters):
        """Query maintenance records with filters"""
        try:
            queryset = MaintenanceRecord.objects.select_related('vehicle').all()
            
            # Apply date range
            date_range = filters.get('date_range', '')
            if date_range:
                queryset = self._apply_date_filter(queryset, 'scheduled_date', date_range)
            
            # Return as list of dicts
            # Note: Vehicle uses 'license_plate' not 'plate_number'
            return list(queryset.values(
                'id', 'vehicle__license_plate', 'maintenance_type', 
                'status', 'cost', 'scheduled_date', 'completed_date',
                'description'
            ))
        except Exception as e:
            print(f"Error querying maintenance records: {e}")
            return []
    
    def _tracking_query(self, filters):
        """Query vehicle locations/trips"""
        queryset = VehicleLocation.objects.select_related('vehicle').all()
        
        # Apply date range
        date_range = filters.get('date_range', '')
        if date_range:
            queryset = self._apply_date_filter(queryset, 'timestamp', date_range)
        
        # Return as list of dicts, limit to 100 records
        # Note: Vehicle uses 'license_plate' not 'plate_number'
        return list(queryset.values(
            'id', 'vehicle__license_plate', 'latitude', 'longitude',
            'speed', 'heading', 'timestamp'
        )[:100])
    
    def _apply_date_filter(self, queryset, field_name, date_range):
        """Apply date range filter to queryset"""
        now = timezone.now()
        
        if date_range == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(**{f'{field_name}__gte': start_date})
        elif date_range == 'week':
            start_date = now - timedelta(days=7)
            queryset = queryset.filter(**{f'{field_name}__gte': start_date})
        elif date_range == 'month':
            start_date = now - timedelta(days=30)
            queryset = queryset.filter(**{f'{field_name}__gte': start_date})
        elif date_range == 'year':
            start_date = now - timedelta(days=365)
            queryset = queryset.filter(**{f'{field_name}__gte': start_date})
        
        return queryset
    
    def get_aggregated_data(self, entity, analysis):
        """Get aggregated data for charts and reports"""
        
        if entity == 'vehicles':
            return self._vehicle_aggregations()
        elif entity == 'drivers':
            return self._driver_aggregations()
        
        return {}
    
    def _vehicle_aggregations(self):
        """Aggregate vehicle data"""
        return {
            'total': Vehicle.objects.count(),
            'by_status': Vehicle.objects.values('status').annotate(count=Count('id')),
            'by_type': Vehicle.objects.values('vehicle_type').annotate(count=Count('id')),
        }
    
    def _driver_aggregations(self):
        """Aggregate driver data"""
        return {
            'total': Driver.objects.count(),
            'active': Driver.objects.filter(status='active').count(),
            'inactive': Driver.objects.filter(status='inactive').count(),
        }
