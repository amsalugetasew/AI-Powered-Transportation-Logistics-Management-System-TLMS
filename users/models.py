from django.db import models
from django.contrib.auth.models import AbstractUser
from hierarchy.models import OrganizationLevel

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'System Administrator'),
        ('MANAGER', 'Fleet Manager'),
        ('DISPATCHER', 'Dispatcher'),
        ('VIEWER', 'Viewer'),
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='VIEWER')
    organization = models.ForeignKey(OrganizationLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
