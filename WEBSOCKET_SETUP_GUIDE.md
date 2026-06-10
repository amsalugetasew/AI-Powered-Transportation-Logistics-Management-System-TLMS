# WebSocket Setup Guide - Live Tracking Fix

## 🐛 Issue

The LiveMap component shows WebSocket connection errors:
```
WebSocket connection to 'ws://localhost:8000/ws/tracking/live/' failed: 
WebSocket is closed before the connection is established.
```

## 🔍 Root Cause

**Django's `runserver` command does NOT support WebSockets!**

The standard development server (`python manage.py runserver`) only handles HTTP requests, not WebSocket connections. To use WebSockets with Django Channels, you need an ASGI server like **Daphne** or **Uvicorn**.

## ✅ Solution Options

### Option 1: Run with Daphne (Recommended for Development)

**Daphne** is the official ASGI server for Django Channels.

#### 1. Install Daphne
```bash
venv\Scripts\activate.bat
pip install daphne
```

#### 2. Run the Server
```bash
# Stop your current Django server (Ctrl+C)

# Run with Daphne instead
daphne -b 0.0.0.0 -p 8000 tlms_backend.asgi:application
```

**Or** create a batch file `run_with_websockets.bat`:
```batch
@echo off
cd /d "D:\AI Project\AI-Powered-Transportation-Logistics-Management-System-TLMS"
call venv\Scripts\activate.bat
echo Starting server with WebSocket support...
daphne -b 0.0.0.0 -p 8000 tlms_backend.asgi:application
```

### Option 2: Run with Uvicorn (Alternative)

**Uvicorn** is a fast ASGI server that also supports WebSockets.

#### 1. Install Uvicorn
```bash
venv\Scripts\activate.bat
pip install uvicorn
```

#### 2. Run the Server
```bash
uvicorn tlms_backend.asgi:application --host 0.0.0.0 --port 8000 --reload
```

**Or** create a batch file `run_with_uvicorn.bat`:
```batch
@echo off
cd /d "D:\AI Project\AI-Powered-Transportation-Logistics-Management-System-TLMS"
call venv\Scripts\activate.bat
echo Starting server with WebSocket support (Uvicorn)...
uvicorn tlms_backend.asgi:application --host 0.0.0.0 --port 8000 --reload
```

### Option 3: Disable WebSocket in Frontend (Quick Fix)

If you don't need real-time live tracking right now, you can disable the WebSocket connection:

**Edit `tlms_frontend/src/pages/LiveMap.jsx`:**

```jsx
useEffect(() => {
  // Temporarily disable WebSocket
  console.log('WebSocket disabled - using polling instead');
  
  // Use polling for updates instead
  const intervalId = setInterval(() => {
    fetchVehicleLocations();
  }, 5000); // Poll every 5 seconds
  
  return () => clearInterval(intervalId);
}, []);
```

## 📦 Install Required Package

Choose **Option 1 (Daphne)** - it's the official and recommended approach:

```bash
venv\Scripts\activate.bat
pip install daphne
```

## 🚀 Running the Server

### Before (HTTP only - No WebSocket support):
```bash
python manage.py runserver
```

### After (HTTP + WebSocket support):
```bash
daphne -b 0.0.0.0 -p 8000 tlms_backend.asgi:application
```

## ✅ Verification

### 1. Install Daphne
```bash
venv\Scripts\python.exe -m pip install daphne
```

### 2. Start Server with WebSocket Support
```bash
venv\Scripts\python.exe -m daphne -b 0.0.0.0 -p 8000 tlms_backend.asgi:application
```

### 3. Check Backend Console
You should see:
```
Starting ASGI/Daphne version 4.x.x development server at http://0.0.0.0:8000/
Django version 4.x, using settings 'tlms_backend.settings'
Daphne running, listening on 0.0.0.0:8000
```

### 4. Check Frontend Console
When you visit the LiveMap page, you should see:
```
✅ Connected to Live Tracking WebSocket
```

Instead of:
```
❌ WebSocket error
```

## 📝 Comparison

| Server | HTTP | WebSocket | Auto-reload | Best For |
|--------|------|-----------|-------------|----------|
| `runserver` | ✅ | ❌ | ✅ | REST API only |
| Daphne | ✅ | ✅ | ❌ | Development with WebSockets |
| Uvicorn | ✅ | ✅ | ✅ (with --reload) | Development with WebSockets |
| Gunicorn + Uvicorn | ✅ | ✅ | ❌ | Production |

## 🔧 Development Workflow

**For development with live tracking:**

1. **Terminal 1 - Backend (with WebSocket support):**
   ```bash
   venv\Scripts\activate.bat
   daphne -b 0.0.0.0 -p 8000 tlms_backend.asgi:application
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd tlms_frontend
   npm run dev
   ```

**Note:** Daphne doesn't auto-reload on code changes. You'll need to restart manually after backend changes.

**Tip:** Use Uvicorn with `--reload` flag for auto-reload during development:
```bash
uvicorn tlms_backend.asgi:application --host 0.0.0.0 --port 8000 --reload
```

## 🎯 Configuration Already Complete

Your project is already configured for WebSockets:

✅ **`tlms_backend/settings.py`:**
```python
INSTALLED_APPS = [
    'channels',  # ✅ Installed
    ...
]

ASGI_APPLICATION = 'tlms_backend.asgi.application'  # ✅ Configured
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'  # ✅ Configured
    }
}
```

✅ **`tlms_backend/asgi.py`:**
```python
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(tracking.routing.websocket_urlpatterns)  # ✅ Configured
    ),
})
```

✅ **`tracking/routing.py`:**
```python
websocket_urlpatterns = [
    re_path(r'ws/tracking/live/$', consumers.LiveTrackingConsumer.as_asgi()),  # ✅ Configured
]
```

✅ **`tracking/consumers.py`:**
```python
class LiveTrackingConsumer(AsyncWebsocketConsumer):  # ✅ Implemented
    async def connect(self):
        await self.channel_layer.group_add('live_tracking', self.channel_name)
        await self.accept()
```

**Everything is configured correctly! You just need to run with Daphne or Uvicorn instead of `runserver`.**

## 🚨 Important Notes

### For Production
Use **Gunicorn + Uvicorn workers** or **Daphne behind Nginx**:

```bash
# Production with Uvicorn workers
gunicorn tlms_backend.asgi:application -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

# Or with Daphne
daphne -b 0.0.0.0 -p 8000 tlms_backend.asgi:application
```

### Channel Layers
Currently using `InMemoryChannelLayer` which works for development but **doesn't support multiple workers**. For production, use **Redis**:

```python
# settings.py - Production
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

## 📚 Quick Reference

### Install Daphne
```bash
pip install daphne
```

### Run Server
```bash
# With Daphne
daphne -b 0.0.0.0 -p 8000 tlms_backend.asgi:application

# With Uvicorn (auto-reload)
uvicorn tlms_backend.asgi:application --host 0.0.0.0 --port 8000 --reload
```

### Test WebSocket
Open browser console at `http://localhost:5173/tracking` (LiveMap page):
- Should see: `✅ Connected to Live Tracking WebSocket`
- Should NOT see: `❌ WebSocket error`

## ✅ Summary

**Problem**: Django `runserver` doesn't support WebSockets  
**Solution**: Use Daphne or Uvicorn instead  
**Status**: Configuration complete, just need to run with correct server  

---

**Created**: June 9, 2026  
**Next Step**: Install Daphne and run server with WebSocket support
