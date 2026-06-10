# Generated migration for analytics models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fleet', '0003_vehicleassignmenthistory'),
    ]

    operations = [
        migrations.CreateModel(
            name='DriverBehaviorLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('behavior_type', models.CharField(choices=[('HARSH_BRAKE', 'Harsh Braking'), ('HARSH_ACCEL', 'Harsh Acceleration'), ('OVERSPEED', 'Overspeeding'), ('IDLE', 'Excessive Idling'), ('SHARP_TURN', 'Sharp Turn'), ('NORMAL', 'Normal Driving')], max_length=20)),
                ('severity', models.IntegerField(default=1, help_text='1-10 scale')),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('speed', models.DecimalField(blank=True, decimal_places=2, help_text='Speed in km/h', max_digits=5, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('driver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='behavior_logs', to='fleet.driver')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='behavior_logs', to='fleet.vehicle')),
            ],
            options={
                'db_table': 'driver_behavior_logs',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='FuelRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fuel_type', models.CharField(choices=[('PETROL', 'Petrol'), ('DIESEL', 'Diesel'), ('CNG', 'CNG'), ('ELECTRIC', 'Electric'), ('HYBRID', 'Hybrid')], max_length=20)),
                ('quantity', models.DecimalField(decimal_places=2, help_text='Quantity in liters or kWh', max_digits=10)),
                ('cost', models.DecimalField(decimal_places=2, help_text='Total cost', max_digits=10)),
                ('price_per_unit', models.DecimalField(decimal_places=2, help_text='Price per liter/kWh', max_digits=10)),
                ('odometer_reading', models.DecimalField(decimal_places=2, help_text='Odometer reading in km', max_digits=10)),
                ('station_name', models.CharField(blank=True, max_length=200)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('filled_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('driver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fuel_records', to='fleet.driver')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fuel_records', to='fleet.vehicle')),
            ],
            options={
                'db_table': 'fuel_records',
                'ordering': ['-filled_at'],
            },
        ),
        migrations.CreateModel(
            name='MaintenanceRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('maintenance_type', models.CharField(choices=[('ROUTINE', 'Routine Service'), ('REPAIR', 'Repair'), ('INSPECTION', 'Inspection'), ('TIRE', 'Tire Replacement'), ('BRAKE', 'Brake Service'), ('ENGINE', 'Engine Work'), ('TRANSMISSION', 'Transmission'), ('ELECTRICAL', 'Electrical'), ('BODYWORK', 'Body Work'), ('OTHER', 'Other')], max_length=20)),
                ('status', models.CharField(choices=[('SCHEDULED', 'Scheduled'), ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='SCHEDULED', max_length=20)),
                ('description', models.TextField()),
                ('cost', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('labor_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('parts_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('odometer_reading', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('service_provider', models.CharField(blank=True, max_length=200)),
                ('scheduled_date', models.DateTimeField()),
                ('completed_date', models.DateTimeField(blank=True, null=True)),
                ('next_service_date', models.DateTimeField(blank=True, null=True)),
                ('next_service_odometer', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notes', models.TextField(blank=True)),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='maintenance_records', to='fleet.vehicle')),
            ],
            options={
                'db_table': 'maintenance_records',
                'ordering': ['-scheduled_date'],
            },
        ),
        migrations.CreateModel(
            name='VehicleUtilization',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('distance_traveled', models.DecimalField(decimal_places=2, default=0, help_text='Distance in km', max_digits=10)),
                ('start_odometer', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('end_odometer', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('engine_hours', models.DecimalField(decimal_places=2, default=0, help_text='Hours', max_digits=10)),
                ('idle_hours', models.DecimalField(decimal_places=2, default=0, help_text='Hours', max_digits=10)),
                ('moving_hours', models.DecimalField(decimal_places=2, default=0, help_text='Hours', max_digits=10)),
                ('number_of_trips', models.IntegerField(default=0)),
                ('average_speed', models.DecimalField(blank=True, decimal_places=2, help_text='km/h', max_digits=5, null=True)),
                ('max_speed', models.DecimalField(blank=True, decimal_places=2, help_text='km/h', max_digits=5, null=True)),
                ('utilization_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('driver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='utilization_records', to='fleet.driver')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='utilization_records', to='fleet.vehicle')),
            ],
            options={
                'db_table': 'vehicle_utilization',
                'ordering': ['-date'],
            },
        ),
        migrations.AddIndex(
            model_name='driverbehaviorlog',
            index=models.Index(fields=['driver', '-timestamp'], name='driver_beha_driver__idx'),
        ),
        migrations.AddIndex(
            model_name='driverbehaviorlog',
            index=models.Index(fields=['vehicle', '-timestamp'], name='driver_beha_vehicle_idx'),
        ),
        migrations.AddIndex(
            model_name='driverbehaviorlog',
            index=models.Index(fields=['behavior_type'], name='driver_beha_behavio_idx'),
        ),
        migrations.AddIndex(
            model_name='fuelrecord',
            index=models.Index(fields=['vehicle', '-filled_at'], name='fuel_record_vehicle_idx'),
        ),
        migrations.AddIndex(
            model_name='fuelrecord',
            index=models.Index(fields=['driver', '-filled_at'], name='fuel_record_driver__idx'),
        ),
        migrations.AddIndex(
            model_name='maintenancerecord',
            index=models.Index(fields=['vehicle', '-scheduled_date'], name='maintenanc_vehicle_idx'),
        ),
        migrations.AddIndex(
            model_name='maintenancerecord',
            index=models.Index(fields=['status'], name='maintenanc_status_idx'),
        ),
        migrations.AddIndex(
            model_name='maintenancerecord',
            index=models.Index(fields=['maintenance_type'], name='maintenanc_mainten_idx'),
        ),
        migrations.AddIndex(
            model_name='vehicleutilization',
            index=models.Index(fields=['vehicle', '-date'], name='vehicle_uti_vehicle_idx'),
        ),
        migrations.AddIndex(
            model_name='vehicleutilization',
            index=models.Index(fields=['date'], name='vehicle_uti_date_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='vehicleutilization',
            unique_together={('vehicle', 'date')},
        ),
    ]
