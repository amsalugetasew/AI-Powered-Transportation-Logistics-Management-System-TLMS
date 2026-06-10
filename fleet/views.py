from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Driver, Vehicle, VehicleDocument
from .serializers import DriverSerializer, VehicleSerializer, VehicleDocumentSerializer

class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

class VehicleDocumentViewSet(viewsets.ModelViewSet):
    queryset = VehicleDocument.objects.all()
    serializer_class = VehicleDocumentSerializer
    permission_classes = [IsAuthenticated]
