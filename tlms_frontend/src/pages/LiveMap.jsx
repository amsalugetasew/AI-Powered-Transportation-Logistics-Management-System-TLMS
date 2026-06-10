import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/api';

// Fix Leaflet icons in Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
});

// Create custom icons for different vehicle states
const createCustomIcon = (color, isMoving) => {
  return L.divIcon({
    html: `
      <div style="position: relative;">
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ${isMoving ? 'animation: pulse 2s infinite;' : ''}
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      </style>
    `,
    className: 'custom-vehicle-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

export default function LiveMap() {
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleRoute, setVehicleRoute] = useState([]);
  const [showRoute, setShowRoute] = useState(false);
  const [wsStatus, setWsStatus] = useState('Connecting...');
  const mapRef = useRef();
  const wsRef = useRef(null);

  // Fetch initial vehicle locations
  useEffect(() => {
    fetchLatestLocations();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchLatestLocations = async () => {
    try {
      const response = await api.get('tracking/vehicles/latest/');
      const vehiclesMap = {};
      response.data.forEach(v => {
        vehiclesMap[v.vehicle_id] = v;
      });
      setVehicles(vehiclesMap);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsScheme}://localhost:8000/ws/tracking/live/`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Connected to Live Tracking WebSocket');
      setWsStatus('Connected');
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log('📍 Location update:', data);
      
      setVehicles(prev => ({
        ...prev,
        [data.vehicle_id]: {
          ...prev[data.vehicle_id],
          vehicle_id: data.vehicle_id,
          license_plate: data.license_plate,
          lat: data.lat,
          lng: data.lng,
          speed: data.speed,
          heading: data.heading,
          timestamp: data.timestamp,
          is_online: true,
        }
      }));
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setWsStatus('Error');
    };

    ws.onclose = () => {
      console.log('🔌 Disconnected from Live Tracking WebSocket');
      setWsStatus('Disconnected');
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };

    wsRef.current = ws;
  };

  const fetchVehicleRoute = async (vehicleId) => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const response = await api.get(
        `tracking/vehicles/${vehicleId}/history/`,
        {
          params: {
            start: oneHourAgo.toISOString(),
            end: now.toISOString(),
            limit: 200
          }
        }
      );
      
      const route = response.data.locations.map(loc => [loc.lat, loc.lng]);
      setVehicleRoute(route);
      setShowRoute(true);
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const handleVehicleClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    fetchVehicleRoute(vehicle.vehicle_id);
    
    // Center map on vehicle
    if (mapRef.current) {
      mapRef.current.setView([vehicle.lat, vehicle.lng], 15);
    }
  };

  const handleCloseRoute = () => {
    setSelectedVehicle(null);
    setShowRoute(false);
    setVehicleRoute([]);
  };

  const vehiclesList = Object.values(vehicles);
  const onlineVehicles = vehiclesList.filter(v => v.is_online);

  // Default center (Addis Ababa)
  const defaultCenter = onlineVehicles.length > 0 
    ? [onlineVehicles[0].lat, onlineVehicles[0].lng]
    : [9.03, 38.74];

  const getVehicleIcon = (vehicle) => {
    const isMoving = vehicle.speed > 5;
    let color = '#10B981'; // Green for online
    
    if (!vehicle.is_online) {
      color = '#6B7280'; // Gray for offline
    } else if (vehicle.speed > 80) {
      color = '#EF4444'; // Red for speeding
    } else if (isMoving) {
      color = '#3B82F6'; // Blue for moving
    }
    
    return createCustomIcon(color, isMoving);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] -mt-4 -mb-8 -mx-8">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full z-10 shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>🗺️</span>
              Live Tracking
            </h2>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              wsStatus === 'Connected' ? 'bg-green-100 text-green-800' :
              wsStatus === 'Connecting...' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {wsStatus}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-500">Online:</span>
              <span className="font-bold text-green-600 ml-1">{onlineVehicles.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Total:</span>
              <span className="font-bold text-gray-900 ml-1">{vehiclesList.length}</span>
            </div>
          </div>
        </div>

        {/* Vehicle List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading vehicles...</p>
            </div>
          ) : vehiclesList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-2">🚗</p>
              <p>No vehicles with GPS trackers</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {vehiclesList.map(v => (
                <li
                  key={v.vehicle_id}
                  onClick={() => v.is_online && handleVehicleClick(v)}
                  className={`p-4 transition-colors ${
                    v.is_online ? 'hover:bg-blue-50 cursor-pointer' : 'opacity-60'
                  } ${selectedVehicle?.vehicle_id === v.vehicle_id ? 'bg-blue-100' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${v.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {v.license_plate}
                      </h3>
                      <p className="text-xs text-gray-600 ml-4">
                        {v.make} {v.model}
                      </p>
                      <p className="text-xs text-gray-500 ml-4">
                        {v.driver || 'Unassigned'}
                      </p>
                    </div>
                    {v.is_online && (
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          v.speed > 80 ? 'bg-red-100 text-red-800' :
                          v.speed > 5 ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {Math.round(v.speed)} km/h
                        </span>
                      </div>
                    )}
                  </div>
                  {v.timestamp && (
                    <p className="text-[10px] text-gray-400 ml-4">
                      📍 {new Date(v.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs">
          <div className="font-semibold text-gray-700 mb-2">Legend:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-600">Online & Stopped</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-gray-600">Moving</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-gray-600">Speeding (&gt;80 km/h)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              <span className="text-gray-600">Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative z-0">
        {/* Route Info Panel */}
        {selectedVehicle && showRoute && (
          <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-gray-900">{selectedVehicle.license_plate}</h3>
                <p className="text-sm text-gray-600">{selectedVehicle.driver || 'Unassigned'}</p>
              </div>
              <button
                onClick={handleCloseRoute}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>📍 Route Points: <span className="font-semibold">{vehicleRoute.length}</span></p>
              <p>⚡ Current Speed: <span className="font-semibold">{Math.round(selectedVehicle.speed)} km/h</span></p>
              <p>🧭 Heading: <span className="font-semibold">{selectedVehicle.heading}°</span></p>
              <p className="text-xs text-gray-500 mt-2">Showing last hour of movement</p>
            </div>
          </div>
        )}

        <MapContainer 
          center={defaultCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }} 
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Vehicle Markers */}
          {onlineVehicles.map(v => (
            <Marker 
              key={v.vehicle_id} 
              position={[v.lat, v.lng]}
              icon={getVehicleIcon(v)}
              eventHandlers={{
                click: () => handleVehicleClick(v)
              }}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <div className="font-bold text-base mb-2 border-b pb-2">{v.license_plate}</div>
                  <div className="space-y-1">
                    <div><span className="text-gray-600">Vehicle:</span> {v.make} {v.model}</div>
                    <div><span className="text-gray-600">Driver:</span> {v.driver || 'None'}</div>
                    <div><span className="text-gray-600">Speed:</span> <span className="font-semibold">{Math.round(v.speed)} km/h</span></div>
                    <div><span className="text-gray-600">Heading:</span> {v.heading}°</div>
                    <div><span className="text-gray-600">Status:</span> {v.status}</div>
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Updated: {new Date(v.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Route Polyline */}
          {showRoute && vehicleRoute.length > 0 && (
            <Polyline
              positions={vehicleRoute}
              pathOptions={{
                color: '#3B82F6',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 5'
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
