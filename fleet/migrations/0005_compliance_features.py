# Generated migration for compliance features

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fleet', '0004_analytics_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='LicenseTracking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('license_type', models.CharField(choices=[('DRIVER', 'Driver License'), ('VEHICLE_REG', 'Vehicle Registration'), ('INSURANCE', 'Insurance'), ('INSPECTION', 'Inspection Certificate'), ('PERMIT', 'Special Permit'), ('CERTIFICATION', 'Driver Certification'), ('OTHER', 'Other')], max_length=20)),
                ('license_number', models.CharField(max_length=100)),
                ('issue_date', models.DateField()),
                ('expiry_date', models.DateField()),
                ('issuing_authority', models.CharField(blank=True, max_length=200)),
                ('status', models.CharField(choices=[('VALID', 'Valid'), ('EXPIRING_SOON', 'Expiring Soon'), ('EXPIRED', 'Expired'), ('RENEWED', 'Renewed')], default='VALID', max_length=20)),
                ('document_file', models.CharField(blank=True, help_text='Path or URL to document', max_length=500)),
                ('notes', models.TextField(blank=True)),
                ('renewal_date', models.DateField(blank=True, null=True)),
                ('alert_sent', models.BooleanField(default=False)),
                ('alert_sent_date', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('driver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='licenses', to='fleet.driver')),
                ('vehicle', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='licenses', to='fleet.vehicle')),
                ('renewed_license', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='previous_version', to='fleet.licensetracking')),
            ],
            options={
                'db_table': 'license_tracking',
                'ordering': ['expiry_date'],
            },
        ),
        migrations.CreateModel(
            name='AuditTrail',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.CharField(max_length=150)),
                ('action_type', models.CharField(choices=[('CREATE', 'Created'), ('UPDATE', 'Updated'), ('DELETE', 'Deleted'), ('ASSIGN', 'Assigned'), ('UNASSIGN', 'Unassigned'), ('STATUS_CHANGE', 'Status Changed'), ('LOGIN', 'User Login'), ('LOGOUT', 'User Logout'), ('ALERT', 'Alert Generated'), ('MAINTENANCE', 'Maintenance Activity'), ('OTHER', 'Other')], max_length=20)),
                ('entity_type', models.CharField(choices=[('DRIVER', 'Driver'), ('VEHICLE', 'Vehicle'), ('LICENSE', 'License'), ('MAINTENANCE', 'Maintenance'), ('USER', 'User'), ('ALERT', 'Alert'), ('SYSTEM', 'System')], max_length=20)),
                ('entity_id', models.IntegerField(blank=True, null=True)),
                ('entity_name', models.CharField(blank=True, max_length=200)),
                ('description', models.TextField()),
                ('changes', models.JSONField(blank=True, help_text='JSON of what changed (before/after)', null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=500)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'audit_trail',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='MaintenanceSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('schedule_type', models.CharField(choices=[('TIME_BASED', 'Time-Based'), ('MILEAGE_BASED', 'Mileage-Based'), ('CONDITION_BASED', 'Condition-Based'), ('EMERGENCY', 'Emergency')], max_length=20)),
                ('maintenance_type', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('scheduled_date', models.DateTimeField()),
                ('scheduled_mileage', models.IntegerField(blank=True, help_text='Schedule at this mileage', null=True)),
                ('is_recurring', models.BooleanField(default=False)),
                ('recurrence_interval_days', models.IntegerField(blank=True, null=True)),
                ('recurrence_interval_miles', models.IntegerField(blank=True, null=True)),
                ('priority', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], default='MEDIUM', max_length=20)),
                ('status', models.CharField(choices=[('SCHEDULED', 'Scheduled'), ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled'), ('OVERDUE', 'Overdue')], default='SCHEDULED', max_length=20)),
                ('assigned_to', models.CharField(blank=True, help_text='Service provider or mechanic', max_length=200)),
                ('completed_date', models.DateTimeField(blank=True, null=True)),
                ('completed_mileage', models.IntegerField(blank=True, null=True)),
                ('estimated_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('actual_cost', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('next_schedule_date', models.DateTimeField(blank=True, null=True)),
                ('next_schedule_mileage', models.IntegerField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('alert_sent', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_schedules', to=settings.AUTH_USER_MODEL)),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='scheduled_maintenance', to='fleet.vehicle')),
            ],
            options={
                'db_table': 'maintenance_schedule',
                'ordering': ['scheduled_date'],
            },
        ),
        migrations.CreateModel(
            name='Alert',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('alert_type', models.CharField(choices=[('LICENSE_EXPIRY', 'License Expiring'), ('MAINTENANCE_DUE', 'Maintenance Due'), ('MAINTENANCE_OVERDUE', 'Maintenance Overdue'), ('VEHICLE_INACTIVE', 'Vehicle Inactive'), ('DRIVER_INACTIVE', 'Driver Inactive'), ('BEHAVIOR_ISSUE', 'Driver Behavior Issue'), ('COST_THRESHOLD', 'Cost Threshold Exceeded'), ('SYSTEM', 'System Alert'), ('CUSTOM', 'Custom Alert')], max_length=30)),
                ('severity', models.CharField(choices=[('INFO', 'Information'), ('WARNING', 'Warning'), ('CRITICAL', 'Critical')], default='WARNING', max_length=20)),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('ACKNOWLEDGED', 'Acknowledged'), ('RESOLVED', 'Resolved'), ('DISMISSED', 'Dismissed')], default='ACTIVE', max_length=20)),
                ('title', models.CharField(max_length=200)),
                ('message', models.TextField()),
                ('action_required', models.BooleanField(default=False)),
                ('action_url', models.CharField(blank=True, max_length=500)),
                ('due_date', models.DateTimeField(blank=True, null=True)),
                ('acknowledged_at', models.DateTimeField(blank=True, null=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('resolution_notes', models.TextField(blank=True)),
                ('email_sent', models.BooleanField(default=False)),
                ('sms_sent', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('acknowledged_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acknowledged_alerts', to=settings.AUTH_USER_MODEL)),
                ('resolved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='resolved_alerts', to=settings.AUTH_USER_MODEL)),
                ('driver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='fleet.driver')),
                ('vehicle', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='fleet.vehicle')),
                ('license', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='fleet.licensetracking')),
                ('maintenance', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='fleet.maintenanceschedule')),
            ],
            options={
                'db_table': 'alerts',
                'ordering': ['-created_at'],
            },
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='licensetracking',
            index=models.Index(fields=['expiry_date'], name='license_tra_expiry__c035ad_idx'),
        ),
        migrations.AddIndex(
            model_name='licensetracking',
            index=models.Index(fields=['status'], name='license_tra_status_258b2c_idx'),
        ),
        migrations.AddIndex(
            model_name='licensetracking',
            index=models.Index(fields=['license_type'], name='license_tra_license_ecf950_idx'),
        ),
        migrations.AddIndex(
            model_name='audittrail',
            index=models.Index(fields=['-timestamp'], name='audit_trail_timesta_c3dcfb_idx'),
        ),
        migrations.AddIndex(
            model_name='audittrail',
            index=models.Index(fields=['user', '-timestamp'], name='audit_trail_user_id_fc5d0c_idx'),
        ),
        migrations.AddIndex(
            model_name='audittrail',
            index=models.Index(fields=['entity_type', 'entity_id'], name='audit_trail_entity__611b97_idx'),
        ),
        migrations.AddIndex(
            model_name='audittrail',
            index=models.Index(fields=['action_type'], name='audit_trail_action__ea3df4_idx'),
        ),
        migrations.AddIndex(
            model_name='maintenanceschedule',
            index=models.Index(fields=['vehicle', 'scheduled_date'], name='maintenance_vehicle_9f6431_idx'),
        ),
        migrations.AddIndex(
            model_name='maintenanceschedule',
            index=models.Index(fields=['status'], name='maintenance_status_da4263_idx'),
        ),
        migrations.AddIndex(
            model_name='maintenanceschedule',
            index=models.Index(fields=['priority'], name='maintenance_priorit_95873d_idx'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['-created_at'], name='alerts_created_6327ec_idx'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['status', 'severity'], name='alerts_status_5203b6_idx'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['alert_type'], name='alerts_alert_t_eda531_idx'),
        ),
    ]
