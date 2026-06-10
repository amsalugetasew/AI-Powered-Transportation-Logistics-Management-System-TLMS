"""
Check database setup and provide instructions for reporting
Run: python manage.py shell < check_and_setup_reporting.py
"""

import sys
from django.db import connection

print("=" * 70)
print("REPORTING DATABASE SETUP CHECK")
print("=" * 70)

# Check if analytics tables exist
def check_tables():
    """Check if analytics tables exist in database"""
    tables_to_check = [
        'driver_behavior_logs',
        'fuel_records',
        'maintenance_records',
        'vehicle_utilization',
    ]
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        existing_tables = [row[0] for row in cursor.fetchall()]
    
    print("\n1. CHECKING DATABASE TABLES:")
    print("-" * 70)
    
    all_exist = True
    for table in tables_to_check:
        exists = table in existing_tables
        status = "✓ EXISTS" if exists else "✗ MISSING"
        print(f"   {table:30} {status}")
        if not exists:
            all_exist = False
    
    return all_exist

# Check if there's data in the tables
def check_data():
    """Check if tables have data"""
    from fleet.models import Driver, Vehicle
    from fleet.analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord, VehicleUtilization
    
    print("\n2. CHECKING DATA IN TABLES:")
    print("-" * 70)
    
    models_to_check = [
        ('Drivers', Driver),
        ('Vehicles', Vehicle),
        ('Driver Behavior Logs', DriverBehaviorLog),
        ('Fuel Records', FuelRecord),
        ('Maintenance Records', MaintenanceRecord),
        ('Vehicle Utilization', VehicleUtilization),
    ]
    
    has_data = False
    for name, model in models_to_check:
        count = model.objects.count()
        status = "✓ HAS DATA" if count > 0 else "✗ EMPTY"
        print(f"   {name:30} {count:6} records  {status}")
        if count > 0:
            has_data = True
    
    return has_data

# Main check
try:
    tables_exist = check_tables()
    
    if not tables_exist:
        print("\n" + "=" * 70)
        print("❌ ISSUE: Analytics tables are missing!")
        print("=" * 70)
        print("\n📋 SOLUTION: Run migrations to create tables")
        print("\nOn Windows (with virtual environment):")
        print("   1. venv\\Scripts\\activate")
        print("   2. python manage.py migrate fleet")
        print("\nOn Mac/Linux:")
        print("   1. source venv/bin/activate")
        print("   2. python manage.py migrate fleet")
        print("\n" + "=" * 70)
        sys.exit(1)
    
    has_data = check_data()
    
    if not has_data:
        print("\n" + "=" * 70)
        print("⚠️  WARNING: Tables exist but have no data!")
        print("=" * 70)
        print("\n📋 SOLUTION: Generate sample data for testing")
        print("\nRun this command:")
        print("   python manage.py shell < generate_sample_analytics_data.py")
        print("\nThis will create 90 days of sample data for:")
        print("   • Driver behavior logs")
        print("   • Fuel records")
        print("   • Maintenance records")
        print("   • Vehicle utilization data")
        print("\n" + "=" * 70)
        sys.exit(1)
    
    # All good!
    print("\n" + "=" * 70)
    print("✅ SUCCESS: Database is properly set up!")
    print("=" * 70)
    print("\n🎉 Your reporting system is ready to use!")
    print("\nWhat you have:")
    from fleet.models import Driver, Vehicle
    from fleet.analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord, VehicleUtilization
    
    print(f"   • {Driver.objects.count()} drivers")
    print(f"   • {Vehicle.objects.count()} vehicles")
    print(f"   • {DriverBehaviorLog.objects.count()} behavior logs")
    print(f"   • {FuelRecord.objects.count()} fuel records")
    print(f"   • {MaintenanceRecord.objects.count()} maintenance records")
    print(f"   • {VehicleUtilization.objects.count()} utilization records")
    
    print("\n📊 Access your reports at:")
    print("   http://localhost:5173/reporting")
    print("\n" + "=" * 70)

except ImportError as e:
    print("\n" + "=" * 70)
    print("❌ ERROR: Cannot import required models")
    print("=" * 70)
    print(f"\nError: {str(e)}")
    print("\nThis usually means migrations haven't been run.")
    print("\n📋 SOLUTION: Run migrations first")
    print("   python manage.py migrate fleet")
    print("\n" + "=" * 70)
    sys.exit(1)

except Exception as e:
    print("\n" + "=" * 70)
    print("❌ ERROR: Unexpected error occurred")
    print("=" * 70)
    print(f"\nError: {str(e)}")
    print("\nPlease check your database configuration.")
    print("\n" + "=" * 70)
    sys.exit(1)
