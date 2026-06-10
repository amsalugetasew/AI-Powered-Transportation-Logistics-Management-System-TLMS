from django.db import models
from fleet.models import Vehicle


class VehicleLocation(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='locations')
    latitude = models.DecimalField(max_digits=10, decimal_places=6)
    longitude = models.DecimalField(max_digits=10, decimal_places=6)
    speed = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    heading = models.IntegerField(default=0)
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vehicle_locations'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['vehicle', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.vehicle.license_plate} at {self.timestamp}: {self.latitude}, {self.longitude}"

    def distance_to(self, other):
        """Return Haversine distance in km between this point and another VehicleLocation."""
        from math import radians, sin, cos, sqrt, atan2
        lat1, lon1 = float(self.latitude), float(self.longitude)
        lat2, lon2 = float(other.latitude), float(other.longitude)
        rlat1, rlon1, rlat2, rlon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = rlat2 - rlat1
        dlon = rlon2 - rlon1
        a = sin(dlat / 2)**2 + cos(rlat1) * cos(rlat2) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        radius_km = 6371.0
        return radius_km * c
