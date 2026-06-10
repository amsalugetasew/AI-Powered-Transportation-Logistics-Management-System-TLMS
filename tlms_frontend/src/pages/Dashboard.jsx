import { useState, useEffect } from 'react';
import api from '../api/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  RadialBarChart, RadialBar
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusDist, setStatusDist] = useState([]);
  const [fleetActivity, setFleetActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('fleet/vehicles/'),
      api.get('fleet/drivers/'),
      api.get('tracking/dashboard-stats/').catch(() => ({ data: null })),
      api.get('tracking/vehicle-status-distribution/').catch(() => ({ data: [] })),
      api.get('tracking/fleet-activity/').catch(() => ({ data: [] }))
    ]).then(([vRes, dRes, sRes, sdRes, faRes]) => {
      setVehicles(vRes.data);
      setDrivers(dRes.data);
      setStats(sRes.data);
      setStatusDist(sdRes.data || []);
      setFleetActivity(faRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // Fallback stats from local data if API not ready
  const totalVehicles = stats?.total_vehicles ?? vehicles.length;
  const activeDrivers = stats?.active_drivers ?? drivers.filter(d => d.is_active).length;
  const maintenanceDue = stats?.maintenance_vehicles ?? vehicles.filter(v => v.status === 'MAINTENANCE').length;
  const unassignedVehicles = stats?.unassigned_vehicles ?? vehicles.filter(v => v.status === 'ACTIVE' && !v.current_driver).length;
  const trackedVehicles = stats?.tracked_vehicles ?? vehicles.filter(v => v.device_imei).length;
  const onlineVehicles = stats?.online_vehicles ?? 0;
  const speedingEvents = stats?.speeding_events ?? 0;

  // Fallback status distribution
  const pieData = statusDist.length > 0 ? statusDist : [
    { status: 'ACTIVE', count: vehicles.filter(v => v.status === 'ACTIVE').length },
    { status: 'INACTIVE', count: vehicles.filter(v => v.status === 'INACTIVE').length },
    { status: 'MAINTENANCE', count: vehicles.filter(v => v.status === 'MAINTENANCE').length }
  ].filter(d => d.count > 0);

  // Driver status for radial chart
  const driverData = [
    { name: 'Active', value: drivers.filter(d => d.is_active).length, fill: '#10b981' },
    { name: 'Inactive', value: drivers.filter(d => !d.is_active).length, fill: '#ef4444' }
  ].filter(d => d.value > 0);

  const statCards = [
    { label: 'Total Vehicles', value: totalVehicles, color: 'from-blue-500 to-blue-600', icon: '🚛' },
    { label: 'Active Drivers', value: activeDrivers, color: 'from-emerald-500 to-emerald-600', icon: '👤' },
    { label: 'Tracked / Online', value: `${trackedVehicles} / ${onlineVehicles}`, color: 'from-cyan-500 to-cyan-600', icon: '📡' },
    { label: 'Unassigned', value: unassignedVehicles, color: 'from-amber-500 to-amber-600', icon: '⚠️' },
    { label: 'In Maintenance', value: maintenanceDue, color: 'from-orange-500 to-orange-600', icon: '🔧' },
    { label: 'Speeding Events', value: speedingEvents, color: 'from-red-500 to-red-600', icon: '🚨' },
  ];

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">Fleet Overview</h2>
          <p className="text-gray-500 mt-1">Monitor your vehicles, drivers, and operational status.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className={`bg-gradient-to-br ${card.color} rounded-xl shadow-lg p-5 text-white hover:scale-105 transition-transform duration-200`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium opacity-90 uppercase tracking-wider">{card.label}</p>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="text-3xl font-bold">{loading ? '...' : card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Vehicle Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Vehicle Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  strokeWidth={2}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-16">No vehicle data yet</p>
          )}
        </div>

        {/* Fleet Activity Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Fleet Activity (Last 7 Days)</h3>
          {fleetActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fleetActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="location_count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="GPS Pings" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px]">
              <div className="text-center">
                <p className="text-gray-400 text-sm">No tracking data yet</p>
                <p className="text-gray-300 text-xs mt-1">GPS data will appear here once vehicles start sending locations</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 + Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Driver Status Radial */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Driver Status</h3>
          {driverData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={driverData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    strokeWidth={2}
                  >
                    {driverData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {driverData.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }}></div>
                    <span className="text-sm text-gray-700">{d.name}</span>
                    <span className="ml-auto text-lg font-bold text-gray-900">{d.value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-sm text-gray-700">Total</span>
                    <span className="ml-auto text-lg font-bold text-gray-900">{drivers.length}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-16">No driver data yet</p>
          )}
        </div>

        {/* Recent Vehicles Quick View */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">Vehicle Fleet</h3>
            <span className="text-xs text-gray-500">{vehicles.length} total</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <p className="text-center text-gray-500 py-4">Loading...</p>
            ) : vehicles.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No vehicles available.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {vehicles.slice(0, 10).map(v => (
                  <li key={v.id} className="p-4 flex items-center justify-between hover:bg-gray-50 rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 uppercase">{v.license_plate}</span>
                      <span className="text-xs text-gray-500">{v.make} {v.model}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full mb-1 ${v.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : v.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {v.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {v.current_driver ? `${v.current_driver.first_name} ${v.current_driver.last_name}` : 'Unassigned'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
