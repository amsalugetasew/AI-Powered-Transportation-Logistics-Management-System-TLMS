"""
Diagnose why reporting shows "No data available"
Run: python manage.py shell < diagnose_reporting_issue.py
"""

print("=" * 80)
print("REPORTING ISSUE DIAGNOSIS")
print("=" * 80)

# Check basic entities (drivers and vehicles)
from fleet.models import Driver, Vehicle

drivers_count = Driver.objects.count()
vehicles_count = Vehicle.objects.count()

print("\n1. BASIC DATA (What you see in Drivers/Vehicles pages):")
print("-" * 80)
print(f"   Drivers:  {drivers_count}")
print(f"   Vehicles: {vehicles_count}")

if drivers_count > 0:
    print("\n   Driver Examples:")
    for driver in Driver.objects.all()[:3]:
        status = "Active" if driver.is_active else "Inactive"
        vehicle = driver.assigned_vehicles.first()
        assignment = vehicle.license_plate if vehicle else "Unassigned"
        print(f"      • {driver.first_name} {driver.last_name} - {status} - {assignment}")

if vehicles_count > 0:
    print("\n   Vehicle Examples:")
    for vehicle in Vehicle.objects.all()[:3]:
        driver_name = f"{vehicle.current_driver.first_name} {vehicle.current_driver.last_name}" if vehicle.current_driver else "Unassigned"
        print(f"      • {vehicle.license_plate} ({vehicle.make} {vehicle.model}) - {vehicle.status} - {driver_name}")

# Check analytics data (what reporting needs)
print("\n" + "=" * 80)
print("2. ANALYTICS DATA (What Reporting Dashboard needs):")
print("=" * 80)

try:
    from fleet.analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord, VehicleUtilization
    
    behavior_count = DriverBehaviorLog.objects.count()
    fuel_count = FuelRecord.objects.count()
    maintenance_count = MaintenanceRecord.objects.count()
    utilization_count = VehicleUtilization.objects.count()
    
    print("\n   Analytics Tables:")
    print(f"      Driver Behavior Logs:  {behavior_count}")
    print(f"      Fuel Records:          {fuel_count}")
    print(f"      Maintenance Records:   {maintenance_count}")
    print(f"      Vehicle Utilization:   {utilization_count}")
    
    # Diagnosis
    print("\n" + "=" * 80)
    print("3. DIAGNOSIS:")
    print("=" * 80)
    
    if drivers_count > 0 and vehicles_count > 0:
        print("\n   ✅ You have Drivers and Vehicles (Good!)")
        print("      These show up in /drivers and /vehicles pages")
    else:
        print("\n   ⚠️  You don't have Drivers or Vehicles yet")
        print("      Create them first in the system")
    
    if behavior_count == 0 and fuel_count == 0 and maintenance_count == 0 and utilization_count == 0:
        print("\n   ❌ BUT: You have NO ANALYTICS DATA")
        print("      This is why Reporting shows 'No data available'")
        print("\n   EXPLANATION:")
        print("      • Drivers/Vehicles pages show basic info from 'drivers' and 'vehicles' tables")
        print("      • Reporting Dashboard needs data from 'analytics' tables:")
        print("        - driver_behavior_logs")
        print("        - fuel_records")
        print("        - maintenance_records")
        print("        - vehicle_utilization")
        print("\n   These are DIFFERENT tables that track historical performance data!")
    else:
        print("\n   ✅ You have some analytics data!")
        if behavior_count > 0:
            print(f"      • {behavior_count} behavior logs")
        if fuel_count > 0:
            print(f"      • {fuel_count} fuel records")
        if maintenance_count > 0:
            print(f"      • {maintenance_count} maintenance records")
        if utilization_count > 0:
            print(f"      • {utilization_count} utilization records")
    
    # Solution
    print("\n" + "=" * 80)
    print("4. SOLUTION:")
    print("=" * 80)
    
    if behavior_count == 0 and fuel_count == 0 and maintenance_count == 0 and utilization_count == 0:
        print("\n   📋 To see data in Reporting Dashboard:")
        print("\n   OPTION 1: Generate Sample Analytics Data (Quick Testing)")
        print("   -------------------------------------------------------")
        print("   Run this command:")
        print("      python manage.py shell < generate_sample_analytics_data.py")
        print("\n   This creates 90 days of sample performance data for your existing")
        print("   drivers and vehicles.")
        
        print("\n   OPTION 2: Add Real Data (Production Use)")
        print("   -----------------------------------------")
        print("   You need to start recording:")
        print("      • Driver behavior (from GPS/sensors)")
        print("      • Fuel refills (when drivers refuel)")
        print("      • Maintenance activities (when serviced)")
        print("      • Daily vehicle utilization (distance, hours)")
        print("\n   These can be:")
        print("      • Manually entered in Django Admin (/admin)")
        print("      • Imported from existing systems")
        print("      • Auto-recorded via GPS/IoT integration")
        
        print("\n   RECOMMENDED FOR NOW: Use Option 1 to test the dashboard,")
        print("   then set up Option 2 for real production data.")
    else:
        print("\n   ✅ You already have some analytics data!")
        print("      If you still see 'No data available', check:")
        print("      1. Is the backend running? (python manage.py runserver)")
        print("      2. Check browser console for API errors (F12 → Console)")
        print("      3. Try this URL in browser:")
        print(f"         http://localhost:8000/api/fleet/reports/drivers/detailed_list/?days=30")
        
except ImportError:
    print("\n   ❌ Analytics tables don't exist yet!")
    print("\n   Run migrations first:")
    print("      python manage.py migrate")

print("\n" + "=" * 80)
print("SUMMARY:")
print("=" * 80)
print("""
KEY POINT: Having drivers and vehicles is NOT enough for reporting!

ANALOGY:
- Drivers/Vehicles tables = Employee roster (names, IDs, assignments)
- Analytics tables = Timesheet and performance records

You have the roster, but no timesheets yet! That's why reporting is empty.

The Reporting Dashboard analyzes HISTORICAL PERFORMANCE DATA:
• How did drivers perform over time?
• How much fuel was consumed?
• What maintenance was done?
• How were vehicles utilized?

To see this data, you need to either:
1. Generate sample data for testing, OR
2. Start recording real operational data
""")
print("=" * 80)
