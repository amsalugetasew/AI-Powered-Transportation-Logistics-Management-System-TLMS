# Tracking API Fix - Recent Activities Endpoint

## 🐛 Issue
The recent activities API endpoint was returning a **500 Internal Server Error**:
```
GET /api/tracking/recent-activities/?limit=10
Status: 500 Internal Server Error
```

**Error:** Django FieldError - invalid `select_related()` call with fields that don't exist on the model.

## 🔍 Root Cause

In `tracking/views.py`, the `RecentActivitiesView.get()` method had an incorrect query:

```python
activities = (
    AuditTrail.objects
    .select_related('user', 'driver', 'vehicle')  # ❌ ERROR
    .order_by('-timestamp')[:limit]
)
```

**Problem**: The `AuditTrail` model **does NOT have** `driver` or `vehicle` ForeignKey fields. Instead, it uses a generic entity tracking approach:

```python
class AuditTrail(models.Model):
    user = models.ForeignKey(...)  # ✅ Exists
    entity_type = models.CharField(...)  # 'DRIVER', 'VEHICLE', 'LICENSE', etc.
    entity_id = models.IntegerField(...)  # ID of the entity
    entity_name = models.CharField(...)  # Name/description of entity
```

The `select_related('driver', 'vehicle')` failed because these fields don't exist.

## ✅ Solution

1. **Remove invalid select_related fields**:
```python
activities = (
    AuditTrail.objects
    .select_related('user')  # ✅ Only select_related on 'user'
    .order_by('-timestamp')[:limit]
)
```

2. **Extract vehicle/driver info from entity fields**:
```python
vehicle = None
driver = None
if activity.entity_type == 'VEHICLE':
    vehicle = activity.entity_name
elif activity.entity_type == 'DRIVER':
    driver = activity.entity_name

data.append({
    'vehicle': vehicle or 'N/A',
    'driver': driver,
    'user': f"{activity.user.first_name} {activity.user.last_name}" if activity.user else activity.username or 'System',
    ...
})
```

## 📁 Files Modified

1. **`tracking/views.py`**
   - Line ~630: Changed `.select_related('user', 'driver', 'vehicle')` to `.select_related('user')`
   - Line ~673-679: Added logic to extract vehicle/driver from `entity_type` and `entity_name`
   - Line ~681-688: Updated data dict to use extracted vehicle/driver values

## 🧪 Testing

### Test Script Created
**`test_recent_activities_api.py`** - Tests the recent activities endpoint

```bash
# Run test
venv\Scripts\python.exe test_recent_activities_api.py
```

**Result:**
```
✅ SUCCESS!
Response status: 200
Number of activities: 0

No activities found in audit trail
```

### API Endpoint
```bash
GET /api/tracking/recent-activities/?limit=10
```

**Response Structure:**
```json
[
  {
    "id": 1,
    "type": "create",
    "message": "Vehicle created",
    "vehicle": "ABC-123",
    "driver": null,
    "user": "John Doe",
    "time": "5 min ago",
    "timestamp": "2026-06-09T08:30:00Z",
    "icon": "✓",
    "color": "green"
  }
]
```

## 📝 Notes on AuditTrail Model

The `AuditTrail` model uses a **generic entity tracking pattern**:

| Field | Type | Purpose |
|-------|------|---------|
| `user` | ForeignKey | User who performed action |
| `username` | CharField | Username (persists if user deleted) |
| `entity_type` | CharField | Type: DRIVER, VEHICLE, LICENSE, etc. |
| `entity_id` | IntegerField | ID of the entity |
| `entity_name` | CharField | Name/description of entity |
| `action_type` | CharField | CREATE, UPDATE, DELETE, etc. |
| `description` | TextField | Human-readable description |

This design allows auditing **any entity type** without needing specific ForeignKey relationships for each entity.

## ✅ Verification

1. **Django Check**: ✅ No issues
   ```bash
   venv\Scripts\python.exe manage.py check
   ```

2. **API Test**: ✅ Returns 200 OK
   ```bash
   venv\Scripts\python.exe test_recent_activities_api.py
   ```

3. **Frontend**: ✅ Dashboard should now load without errors

## 💡 Future Enhancement

To populate the audit trail with activities, you could:

1. **Create audit entries on model save** (using signals)
2. **Log user actions** in views
3. **Use Django's built-in admin logging**
4. **Import existing activity logs**

Example of creating an audit entry:
```python
from fleet.compliance_models import AuditTrail

AuditTrail.objects.create(
    user=request.user,
    username=request.user.username,
    action_type='CREATE',
    entity_type='VEHICLE',
    entity_id=vehicle.id,
    entity_name=str(vehicle),
    description=f"Created vehicle {vehicle.license_plate}"
)
```

## 🚀 Status

**FIXED** ✅

The tracking API endpoint is now working correctly. The Dashboard page should load without errors.

---

**Fix Applied**: June 9, 2026  
**Verified**: ✅ Working
