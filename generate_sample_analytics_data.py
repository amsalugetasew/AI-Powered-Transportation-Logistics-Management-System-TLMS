"""
Sample data generator for analytics models
Run this script to populate analytics data for testing the reporting dashboard
Usage: python manage.py shell < generate_sample_analytics_data.py
"""

import random
from datetime import datetime, timedelta
from django.utils import timezone
from fleet.models import Vehicle, Driver
from fleet.analytics_models import DriverBehaviorLog, FuelRecord, MaintenanceRecord, VehicleUtilization

def generate_sample_data(days=90):
    """Generate sample analytics data for the specified number of days"""
    
    print(f"Generating sample analytics data for the last {days} days...")
    
    vehicles = list(Vehicle.objects.all())
    drivers = list(Driver.objects.all())
    
    if not vehicles:
        print("No vehicles found! Please create vehicles first.")
        return
    
    if not drivers:
        print("No drivers found! Please create drivers first.")
        return
    
    print(f"Found {len(vehicles)} vehicles and {len(drivers)} drivers")
    
    # Generate data for each day
    for day_offset in range(days):
        current_date = timezone.now() - timedelta(days=day_offset)
        
        # Driver Behavior Logs
        for vehicle in vehicles[:min(5, len(vehicles))]:  # Sample subset
            driver = random.choice(drivers)
            
            # Generate 5-15 behavior logs per day per vehicle
            num_logs = random.randint(5, 15)
            for _ in range(num_logs):
                behavior_type = random.choices(
                    ['NORMAL', 'HARSH_BRAKE', 'HARSH_ACCEL', 'OVERSPEED', 'IDLE', 'SHARP_TURN'],
                    weights=[60, 10, 10, 5, 10, 5]
                )[0]
                
                DriverBehaviorLog.objects.create(
                    driver=driver,
                    vehicle=vehicle,
                    behavior_type=behavior_type,
                    severity=random.randint(1, 10) if behavior_type != 'NORMAL' else 1,
                    latitude=random.uniform(20.0, 30.0),
                    longitude=random.uniform(70.0, 80.0),
                    speed=random.uniform(0, 120),
                    timestamp=current_date - timedelta(hours=random.randint(0, 23))
                )
        
        # Fuel Records (1-2 per vehicle every few days)
        if day_offset % 3 == 0:
            for vehicle in vehicles:
                driver = random.choice(drivers)
                last_odometer = 1000 + (day_offset * random.uniform(50, 200))
                
                FuelRecord.objects.create(
                    vehicle=vehicle,
                    driver=driver,
                    fuel_type=random.choice(['PETROL', 'DIESEL', 'CNG']),
                    quantity=random.uniform(30, 70),
                    cost=random.uniform(2000, 5000),
                    price_per_unit=random.uniform(70, 100),
                    odometer_reading=last_odometer,
                    station_name=f"Station {random.randint(1, 10)}",
                    filled_at=current_date
                )
        
        # Maintenance Records (occasional)
        if day_offset % 15 == 0:
            for vehicle in vehicles[:random.randint(1, 3)]:
                MaintenanceRecord.objects.create(
                    vehicle=vehicle,
                    maintenance_type=random.choice(['ROUTINE', 'REPAIR', 'INSPECTION', 'TIRE', 'BRAKE']),
                    status=random.choice(['COMPLETED', 'SCHEDULED', 'IN_PROGRESS']),
                    description=f"Sample maintenance for {vehicle.license_plate}",
                    labor_cost=random.uniform(500, 3000),
                    parts_cost=random.uniform(1000, 5000),
                    odometer_reading=random.uniform(10000, 50000),
                    service_provider=f"Service Center {random.randint(1, 5)}",
                    scheduled_date=current_date
                )
        
        # Vehicle Utilization (daily)
        for vehicle in vehicles:
            driver = random.choice(drivers)
            engine_hours = random.uniform(2, 20)
            idle_hours = random.uniform(0.5, engine_hours * 0.3)
            moving_hours = engine_hours - idle_hours
            
            VehicleUtilization.objects.create(
                vehicle=vehicle,
                driver=driver,
                date=current_date.date(),
                distance_traveled=random.uniform(50, 500),
                start_odometer=random.uniform(10000, 50000),
                end_odometer=random.uniform(10100, 50500),
                engine_hours=engine_hours,
                idle_hours=idle_hours,
                moving_hours=moving_hours,
                number_of_trips=random.randint(2, 10),
                average_speed=random.uniform(30, 80),
                max_speed=random.uniform(80, 120)
            )
    
    print("Sample data generation completed!")
    print(f"Created:")
    print(f"  - {DriverBehaviorLog.objects.count()} driver behavior logs")
    print(f"  - {FuelRecord.objects.count()} fuel records")
    print(f"  - {MaintenanceRecord.objects.count()} maintenance records")
    print(f"  - {VehicleUtilization.objects.count()} utilization records")

# Run the generator
if __name__ == "__main__":
    generate_sample_data(90)
