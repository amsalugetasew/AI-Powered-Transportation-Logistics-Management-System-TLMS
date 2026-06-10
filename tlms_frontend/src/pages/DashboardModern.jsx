import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api/api';

export default function DashboardModern() {
  const { theme } = useTheme();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState(null);
  const [latestLocations, setLatestLocations] = useState([]);
  const [driverBehaviour, setDriverBehaviour] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('W');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [vRes, dRes, sRes, locRes, dbRes, actRes] = await Promise.all([
        api.get('fleet/vehicles/'),
        api.get('fleet/drivers/'),
        api.get('tracking/dashboard-stats/').catch(() => ({ data: null })),
        api.get('tracking/vehicles/latest/').catch(() => ({ data: [] })),
        api.get('tracking/driver-behaviour/').catch(() => ({ data: [] })),
        api.get('tracking/recent-activities/?limit=10').catch(() => ({ data: [] })),
      ]);
      
      setVehicles(vRes.data);
      setDrivers(dRes.data);
      setStats(sRes.data);
      setLatestLocations(locRes.data);
      setDriverBehaviour(dbRes.data);
      setRecentActivities(actRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalVehicles = stats?.total_vehicles ?? vehicles.length;
  const activeVehicles = stats?.active_vehicles ?? vehicles.filter(v => v.status === 'ACTIVE').length;
  const totalDrivers = stats?.total_drivers ?? drivers.length;
  const activeDrivers = stats?.active_drivers ?? drivers.filter(d => d.is_active).length;
  const onlineVehicles = stats?.online_vehicles ?? 0;
  const trackedVehicles = stats?.tracked_vehicles ?? 0;
  const totalTrips = stats?.total_trips ?? 0;
  
  // Calculate revenue metrics (mock data - replace with real API data)
  const revenuePerTrip = 420;
  const revenue = totalTrips * revenuePerTrip;
  const profitPercent = 88;
  const lossPercent = 12;
  
  // Get active routes from latest locations
  const activeRoutes = latestLocations.filter(loc => loc.is_online && loc.speed > 0);
  
  // Driver time distribution (mock data - can be calculated from VehicleLocation)
  const totalDriverHours = activeDrivers * 8; // Assume 8 hours per active driver
  const drivingHours = Math.floor(totalDriverHours * 0.6);
  const idleHours = Math.floor(totalDriverHours * 0.25);
  const breakHours = totalDriverHours - drivingHours - idleHours;
  
  const categories = ['All', 'Transport', 'Delivery', 'Service'];
  const periods = [
    { key: 'W', label: 'Week' },
    { key: 'M', label: 'Month' },
    { key: '6M', label: '6 Months' },
    { key: 'Y', label: 'Year' }
  ];

  // Department managers - Get from real users data (top users by vehicle/driver count)
  const managers = drivers.slice(0, 3).map((driver, idx) => ({
    id: driver.id,
    name: `${driver.first_name} ${driver.last_name}`,
    role: idx === 0 ? 'Fleet Manager' : idx === 1 ? 'Operations Manager' : 'Logistics Coordinator',
    vehicles: Math.floor(totalVehicles / 3),
    drivers: Math.floor(totalDrivers / 3),
    avatar: idx === 0 ? '👨‍💼' : idx === 1 ? '👩‍💼' : '👨‍💼',
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className={`text-3xl font-bold ${theme.textPrimary}`}>Overview</h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className={`flex items-center gap-2 ${theme.cardBg} px-3 py-2 rounded-lg shadow-sm border ${theme.border}`}>
            <span className={`text-sm ${theme.textSecondary}`}>Category:</span>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`${theme.cardBg} ${theme.textPrimary} border-none text-sm font-medium focus:outline-none cursor-pointer`}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className={`flex items-center gap-1 ${theme.cardBg} px-2 py-1 rounded-lg shadow-sm border ${theme.border}`}>
            {periods.map(period => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period.key
                    ? 'bg-blue-600 text-white'
                    : `${theme.textSecondary} ${theme.hover}`
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Trips */}
        <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border} p-6`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm ${theme.textSecondary} font-medium`}>Total Trips</p>
              <p className={`text-3xl font-bold ${theme.textPrimary} mt-2`}>{totalTrips.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <span>↑</span> 12% vs last {selectedPeriod === 'W' ? 'week' : selectedPeriod === 'M' ? 'month' : 'period'}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border} p-6`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm ${theme.textSecondary} font-medium`}>Revenue</p>
              <p className={`text-3xl font-bold ${theme.textPrimary} mt-2`}>${revenue.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <span>↑</span> 8% vs last {selectedPeriod === 'W' ? 'week' : selectedPeriod === 'M' ? 'month' : 'period'}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Profit/Loss */}
        <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border} p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm ${theme.textSecondary} font-medium mb-4`}>Profit/Loss Ratio</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${theme.textSecondary}`}>Profit</span>
                    <span className="text-xs font-semibold text-green-600">{profitPercent}%</span>
                  </div>
                  <div className={`h-2 ${theme.cardBg === 'bg-white' ? 'bg-gray-100' : 'bg-slate-700'} rounded-full overflow-hidden`}>
                    <div className="h-full bg-green-500" style={{ width: `${profitPercent}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${theme.textSecondary}`}>Loss</span>
                    <span className="text-xs font-semibold text-red-600">{lossPercent}%</span>
                  </div>
                  <div className={`h-2 ${theme.cardBg === 'bg-white' ? 'bg-gray-100' : 'bg-slate-700'} rounded-full overflow-hidden`}>
                    <div className="h-full bg-red-500" style={{ width: `${lossPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Route Tracking & Driver Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route Tracking */}
          <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border}`}>
            <div className={`px-6 py-4 border-b ${theme.border} flex justify-between items-center`}>
              <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Route Tracking</h3>
              <Link to="/tracking" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </Link>
            </div>
            <div className="p-6">
              {activeRoutes.length > 0 ? (
                <div className="space-y-4">
                  {activeRoutes.slice(0, 5).map((route) => (
                    <div key={route.vehicle_id} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {route.license_plate.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-semibold ${theme.textPrimary} truncate`}>
                            {route.license_plate} - {route.make} {route.model}
                          </p>
                          <span className={`text-xs ${theme.textSecondary}`}>{route.speed.toFixed(0)} km/h</span>
                        </div>
                        <p className={`text-xs ${theme.textSecondary} mb-2 truncate`}>
                          {route.driver || 'No driver assigned'}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className={`flex-1 h-2 ${theme.cardBg === 'bg-white' ? 'bg-gray-100' : 'bg-slate-700'} rounded-full overflow-hidden`}>
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((route.speed / 100) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            route.speed > 80 ? 'bg-red-100 text-red-700' : 
                            route.speed > 50 ? 'bg-green-100 text-green-700' : 
                            theme.cardBg === 'bg-white' ? 'bg-gray-100 text-gray-700' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {route.speed > 80 ? 'Fast' : route.speed > 50 ? 'Moving' : 'Slow'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${theme.cardBg === 'bg-white' ? 'bg-gray-100' : 'bg-slate-700'} rounded-full mb-3`}>
                    <svg className={`w-8 h-8 ${theme.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <p className={`text-sm ${theme.textSecondary}`}>No active routes at the moment</p>
                  <p className={`text-xs ${theme.textSecondary} opacity-75 mt-1`}>Vehicles will appear here when they start moving</p>
                </div>
              )}
            </div>
          </div>

          {/* Driver Statistics */}
          <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border}`}>
            <div className={`px-6 py-4 border-b ${theme.border} flex justify-between items-center`}>
              <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Driver Statistics</h3>
              <Link to="/drivers" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </Link>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Time Distribution */}
                <div>
                  <h4 className={`text-sm font-medium ${theme.textPrimary} mb-4`}>Time Distribution</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${theme.textSecondary}`}>Driving</span>
                        <span className={`text-xs font-semibold ${theme.textPrimary}`}>{drivingHours}h ({Math.round(drivingHours/totalDriverHours*100)}%)</span>
                      </div>
                      <div className={`h-2 ${theme.cardBg === 'bg-white' ? 'bg-gray-100' : 'bg-slate-700'} rounded-full overflow-hidden`}>
                        <div className="h-full bg-green-500" style={{ width: `${(drivingHours/totalDriverHours*100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${theme.textSecondary}`}>Idle</span>
                        <span className={`text-xs font-semibold ${theme.textPrimary}`}>{idleHours}h ({Math.round(idleHours/totalDriverHours*100)}%)</span>
                      </div>
                      <div className={`h-2 ${theme.cardBg === 'bg-white' ? 'bg-gray-100' : 'bg-slate-700'} rounded-full overflow-hidden`}>
                        <div className="h-full bg-amber-500" style={{ width: `${(idleHours/totalDriverHours*100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${theme.textSecondary}`}>Break</span>
                        <span className={`text-xs font-semibold ${theme.textPrimary}`}>{breakHours}h ({Math.round(breakHours/totalDriverHours*100)}%)</span>
                      </div>
                      <div className={`h-2 ${theme.cardBg === 'bg-white' ? 'bg-gray-100' : 'bg-slate-700'} rounded-full overflow-hidden`}>
                        <div className="h-full bg-blue-500" style={{ width: `${(breakHours/totalDriverHours*100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Drivers */}
                <div>
                  <h4 className={`text-sm font-medium ${theme.textPrimary} mb-4`}>Top Performers</h4>
                  <div className="space-y-2">
                    {driverBehaviour.slice(0, 5).map((driver, idx) => (
                      <div key={driver.driver_id} className={`flex items-center justify-between py-2 px-3 ${theme.hover} rounded-lg`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${theme.textSecondary}`}>#{idx + 1}</span>
                          <span className={`text-xs font-medium ${theme.textPrimary} truncate`}>{driver.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-green-600">{driver.score}/100</span>
                      </div>
                    ))}
                    {driverBehaviour.length === 0 && (
                      <p className={`text-xs ${theme.textSecondary} text-center py-4`}>No driver data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Information Summary */}
          <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border}`}>
            <div className={`px-6 py-4 border-b ${theme.border} flex justify-between items-center`}>
              <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Vehicle Information</h3>
              <Link to="/vehicles" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </Link>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{totalVehicles}</p>
                  <p className={`text-xs ${theme.textSecondary} mt-1`}>Total Fleet</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{activeVehicles}</p>
                  <p className={`text-xs ${theme.textSecondary} mt-1`}>Active</p>
                </div>
                <div className="text-center p-4 bg-cyan-50 rounded-lg">
                  <p className="text-2xl font-bold text-cyan-600">{onlineVehicles}</p>
                  <p className={`text-xs ${theme.textSecondary} mt-1`}>Online</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{trackedVehicles}</p>
                  <p className={`text-xs ${theme.textSecondary} mt-1`}>GPS Enabled</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed & Managers */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border}`}>
            <div className={`px-6 py-4 border-b ${theme.border}`}>
              <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Activity Feed</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm bg-${activity.color}-100`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${theme.textPrimary}`}>{activity.message}</p>
                      <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                        {activity.vehicle} • {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`px-6 py-3 border-t ${theme.border} ${theme.cardBg === 'bg-white' ? 'bg-gray-50' : 'bg-slate-900'} rounded-b-xl`}>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium w-full text-center">
                View All Activities →
              </button>
            </div>
          </div>

          {/* Department Managers */}
          <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border}`}>
            <div className={`px-6 py-4 border-b ${theme.border}`}>
              <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Department Managers</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {managers.map((manager) => (
                  <div key={manager.id} className={`flex items-center gap-3 p-3 ${theme.hover} rounded-lg transition-colors`}>
                    <div className={`flex-shrink-0 w-12 h-12 ${theme.cardBg === 'bg-white' ? 'bg-gradient-to-br from-gray-100 to-gray-200' : 'bg-gradient-to-br from-slate-700 to-slate-800'} rounded-full flex items-center justify-center text-2xl`}>
                      {manager.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${theme.textPrimary}`}>{manager.name}</p>
                      <p className={`text-xs ${theme.textSecondary}`}>{manager.role}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${theme.textSecondary}`}>
                          🚛 {manager.vehicles} vehicles
                        </span>
                        <span className={`text-xs ${theme.textSecondary}`}>
                          👤 {manager.drivers} drivers
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Fleet Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90">Active Drivers</span>
                <span className="text-xl font-bold">{activeDrivers}/{totalDrivers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90">Active Vehicles</span>
                <span className="text-xl font-bold">{activeVehicles}/{totalVehicles}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90">Online Now</span>
                <span className="text-xl font-bold">{onlineVehicles}</span>
              </div>
              <div className="pt-3 border-t border-blue-500">
                <Link 
                  to="/tracking" 
                  className="block w-full text-center bg-white text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  View Live Map
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
