# GPS Tracking System - Quick Test Guide

## Prerequisites Check

1. ✅ Django server installed
2. ✅ Django Channels installed (`pip install channels daphne`)
3. ✅ Frontend dependencies (`npm install leaflet react-leaflet`)
4. ✅ MySQL database running
5. ✅ At least one vehicle with `device_imei` field populated

## Quick Test (5 Minutes)

### Step 1: Check Vehicle IMEI (1 min)

Run this in Django shell:
```bash
python manage.py shell
```

```python
from fleet.models import Vehicle

# Check if vehicles have device_imei
vehicles = Vehicle.objects.filter(device_imei__isnull=False).exclude(device_imei='')
print(f"Vehicles with GPS: {vehicles.count()}")

# If none, add IMEI to a vehicle
if vehicles.count() == 0:
    v = Vehicle.objects.first()
    if v:
        v.device_imei = "012345678901234"
        v.save()
        print(f"Added IMEI to vehicle: {v.license_plate}")

# Show IMEIs
for v in vehicles:
    print(f"{v.license_plate}: {v.device_imei}")
```

### Step 2: Start Services (2 min)

**Terminal 1 - Django:**
```bash
python manage.py runserver
```
✅ Look for: "Starting development server at http://127.0.0.1:8000/"

**Terminal 2 - GT-06 Server:**
```bash
python manage.py run_gt06_server
```
✅ Look for: "GT06 Server listening on ('0.0.0.0', 5000)"

### Step 3: Run Simulator (1 min)

**Terminal 3:**

First edit `simulate_gt06.py`:
```python
# Change this line to match your vehicle's IMEI
IMEI = "012345678901234"  # Use the IMEI from Step 1
```

Then run:
```bash
python simulate_gt06.py
```

✅ Look for:
- "Sending Login for IMEI 012345678901234"
- "Login Response: ..."
- "Sending Location: Lat 9.03, Lng 38.74, Speed 40.0"

### Step 4: Check Database (30 sec)

In Django shell:
```python
from tracking.models import VehicleLocation

# Check if locations are being saved
locations = VehicleLocation.objects.all().order_by('-timestamp')[:5]
print(f"Total locations: {VehicleLocation.objects.count()}")

for loc in locations:
    print(f"{loc.vehicle.license_plate}: {loc.latitude}, {loc.longitude} @ {loc.timestamp}")
```

✅ Should see new location records

### Step 5: Test Frontend (30 sec)

1. Open: `http://localhost:5173/tracking`
2. Open browser console (F12)

✅ Look for:
- "✅ Connected to Live Tracking WebSocket"
- "📍 Location update: ..." (every 3 seconds from simulator)
- Map loads with markers
- Sidebar shows vehicles

## Success Indicators

### Backend Success ✅
- [ ] GT-06 server running without errors
- [ ] Simulator connects and sends data
- [ ] Database has new VehicleLocation records
- [ ] No errors in Django console

### Frontend Success ✅
- [ ] Map loads (shows Addis Ababa area)
- [ ] Vehicle markers appear
- [ ] Markers update in real-time
- [ ] Click marker shows popup
- [ ] Sidebar shows online vehicles
- [ ] WebSocket status: "Connected"

## Common Issues & Quick Fixes

### Issue 1: "Unrecognized IMEI"
**Fix:** Vehicle's `device_imei` doesn't match simulator IMEI
```python
# In Django shell:
from fleet.models import Vehicle
v = Vehicle.objects.first()
v.device_imei = "012345678901234"
v.save()
```

### Issue 2: "Port 5000 already in use"
**Fix:**
```bash
# Windows:
netstat -ano | findstr :5000
taskkill /PID <pid> /F

# Then restart GT-06 server
```

### Issue 3: WebSocket won't connect
**Fix:** 
- Ensure Django server is running
- Check URL: `ws://localhost:8000/ws/tracking/live/`
- Clear browser cache

### Issue 4: Map doesn't load
**Fix:**
```bash
cd tlms_frontend
npm install leaflet react-leaflet
npm run dev
```

## Expected Output

### GT-06 Server Console:
```
GT06 Server listening on ('0.0.0.0', 5000)
New connection from ('127.0.0.1', 54321)
Login request from IMEI: 012345678901234
Location saved for AA-001-ET: 9.03, 38.74
Location saved for AA-001-ET: 9.0301, 38.7401
...
```

### Simulator Console:
```
Sending Login for IMEI 012345678901234
Login Response: b'78780501000193790d0a'
Sending Location: Lat 9.03, Lng 38.74, Speed 40.0
Sending Location: Lat 9.0301, Lng 38.7401, Speed 40.0
...
```

### Browser Console:
```
✅ Connected to Live Tracking WebSocket
📍 Location update: {vehicle_id: 1, license_plate: 'AA-001-ET', lat: 9.03, lng: 38.74, speed: 40, ...}
📍 Location update: {vehicle_id: 1, license_plate: 'AA-001-ET', lat: 9.0301, lng: 38.7401, speed: 40, ...}
...
```

## Next: Modern Dashboard

Once GPS tracking is confirmed working:
1. Stop simulator (Ctrl+C)
2. Keep Django and GT-06 servers running
3. Ready for modern dashboard implementation!

---

**Test Duration**: ~5 minutes  
**Last Updated**: June 8, 2026
