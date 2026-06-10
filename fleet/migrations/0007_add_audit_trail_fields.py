# Generated manually to add audit trail fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fleet', '0006_driver_license_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='driver',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_drivers', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='driver',
            name='updated_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_drivers', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_vehicles', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='updated_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_vehicles', to=settings.AUTH_USER_MODEL),
        ),
    ]
