"""
Quick script to check generated alerts
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tlms_backend.settings')
django.setup()

from fleet.compliance_models import Alert
from django.utils import timezone

# Get all active alerts
alerts = Alert.objects.filter(status='ACTIVE').order_by('-severity', '-created_at')

print(f"\n{'='*80}")
print(f"ACTIVE ALERTS SUMMARY")
print(f"{'='*80}\n")

print(f"Total Active Alerts: {alerts.count()}")

# Group by type
by_type = {}
for alert in alerts:
    alert_type = alert.get_alert_type_display()
    if alert_type not in by_type:
        by_type[alert_type] = []
    by_type[alert_type].append(alert)

# Print by type
for alert_type, alert_list in by_type.items():
    print(f"\n{alert_type} ({len(alert_list)} alerts):")
    print("-" * 80)
    for alert in alert_list:
        severity_icon = '🔴' if alert.severity == 'CRITICAL' else '🟡' if alert.severity == 'WARNING' else '🔵'
        print(f"  {severity_icon} [{alert.get_severity_display()}] {alert.title}")
        print(f"     {alert.message}")
        print(f"     Created: {alert.created_at.strftime('%Y-%m-%d %H:%M')}")
        print()

print(f"{'='*80}\n")

# Show summary by severity
print("By Severity:")
print(f"  CRITICAL: {alerts.filter(severity='CRITICAL').count()}")
print(f"  WARNING:  {alerts.filter(severity='WARNING').count()}")
print(f"  INFO:     {alerts.filter(severity='INFO').count()}")
print()
