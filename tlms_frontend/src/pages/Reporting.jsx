import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../api/api';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const Reporting = () => {
  const [activeTab, setActiveTab] = useState('driver-behavior');
  const [timeRangeType, setTimeRangeType] = useState('preset'); // 'preset' or 'custom'
  const [timeRange, setTimeRange] = useState(30);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [driverBehaviorData, setDriverBehaviorData] = useState(null);
  const [driverScores, setDriverScores] = useState([]);
  const [fuelCostData, setFuelCostData] = useState(null);
  const [fuelEfficiency, setFuelEfficiency] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [vehicleHealth, setVehicleHealth] = useState([]);
  const [utilizationData, setUtilizationData] = useState(null);
  const [fleetEfficiency, setFleetEfficiency] = useState(null);
  const [driverInfoData, setDriverInfoData] = useState([]);
  const [vehicleInfoData, setVehicleInfoData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab, timeRange, customStartDate, customEndDate]);

  const calculateDaysFromDates = () => {
    if (timeRangeType === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return timeRange;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = calculateDaysFromDates();
      switch (activeTab) {
        case 'driver-behavior':
          await fetchDriverBehaviorData(days);
          break;
        case 'fuel-cost':
          await fetchFuelCostData(days);
          break;
        case 'maintenance':
          await fetchMaintenanceData(days);
          break;
        case 'utilization':
          await fetchUtilizationData(days);
          break;
        case 'driver-info':
          await fetchDriverInfoData(days);
          break;
        case 'vehicle-info':
          await fetchVehicleInfoData(days);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchDriverBehaviorData = async (days) => {
    const summaryRes = await api.get(`fleet/analytics/driver-behavior/summary/?days=${days}`);
    setDriverBehaviorData(summaryRes.data);
    
    const scoresRes = await api.get(`fleet/analytics/driver-behavior/driver_score/?days=${days}`);
    setDriverScores(scoresRes.data);
  };

  const fetchFuelCostData = async (days) => {
    const summaryRes = await api.get(`fleet/analytics/fuel-cost/summary/?days=${days}`);
    setFuelCostData(summaryRes.data);
    
    const efficiencyRes = await api.get(`fleet/analytics/fuel-cost/efficiency_report/?days=${days}`);
    setFuelEfficiency(efficiencyRes.data);
  };

  const fetchMaintenanceData = async (days) => {
    const summaryRes = await api.get(`fleet/analytics/maintenance/summary/?days=${days}`);
    setMaintenanceData(summaryRes.data);
    
    const healthRes = await api.get(`fleet/analytics/maintenance/vehicle_health_score/`);
    setVehicleHealth(healthRes.data);
  };

  const fetchUtilizationData = async (days) => {
    const summaryRes = await api.get(`fleet/analytics/utilization/summary/?days=${days}`);
    setUtilizationData(summaryRes.data);
    
    const efficiencyRes = await api.get(`fleet/analytics/utilization/fleet_efficiency/?days=${days}`);
    setFleetEfficiency(efficiencyRes.data);
  };

  const fetchDriverInfoData = async (days) => {
    const response = await api.get(`fleet/reports/drivers/detailed_list/?days=${days}`);
    setDriverInfoData(response.data);
  };

  const fetchVehicleInfoData = async (days) => {
    const response = await api.get(`fleet/reports/vehicles/detailed_list/?days=${days}`);
    setVehicleInfoData(response.data);
  };

  const tabs = [
    { id: 'driver-behavior', label: 'Driver Behavior Analytics', icon: '👤' },
    { id: 'fuel-cost', label: 'Fuel & Cost Reports', icon: '⛽' },
    { id: 'maintenance', label: 'Maintenance Cost Analysis', icon: '🔧' },
    { id: 'utilization', label: 'Vehicle Utilization Reports', icon: '📊' },
    { id: 'driver-info', label: 'Driver Info Reports', icon: '👥' },
    { id: 'vehicle-info', label: 'Vehicle Info Reports', icon: '🚗' },
  ];

  const presetTimeRanges = [
    { value: 1, label: 'Today' },
    { value: 2, label: 'Last 2 Days' },
    { value: 5, label: 'Last 5 Days' },
    { value: 7, label: 'Last 7 Days' },
    { value: 30, label: 'Last 30 Days' },
    { value: 90, label: 'Last 90 Days' },
    { value: 180, label: 'Last 180 Days' },
    { value: 365, label: 'Last 365 Days' },
  ];

  const handleTimeRangeTypeChange = (type) => {
    setTimeRangeType(type);
    if (type === 'preset') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      fetchData();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Fleet Analytics & Reporting</h1>
        <p className="text-gray-600">Comprehensive insights into fleet performance and costs</p>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Analytics Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analytics Type
            </label>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.icon} {tab.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range Type
            </label>
            <select
              value={timeRangeType}
              onChange={(e) => handleTimeRangeTypeChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="preset">📅 Preset Range</option>
              <option value="custom">🗓️ Custom Range</option>
            </select>
          </div>

          {/* Preset Time Range Dropdown */}
          {timeRangeType === 'preset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Time Period
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {presetTimeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Date Range Inputs */}
          {timeRangeType === 'custom' && (
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Start Date"
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="End Date"
                />
                <button
                  onClick={handleApplyCustomRange}
                  disabled={!customStartDate || !customEndDate}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Content Sections */}
      {!loading && (
        <>
          {activeTab === 'driver-behavior' && (
            <DriverBehaviorSection data={driverBehaviorData} scores={driverScores} />
          )}
          {activeTab === 'fuel-cost' && (
            <FuelCostSection data={fuelCostData} efficiency={fuelEfficiency} />
          )}
          {activeTab === 'maintenance' && (
            <MaintenanceSection data={maintenanceData} health={vehicleHealth} />
          )}
          {activeTab === 'utilization' && (
            <UtilizationSection data={utilizationData} efficiency={fleetEfficiency} />
          )}
          {activeTab === 'driver-info' && (
            <DriverInfoSection data={driverInfoData} />
          )}
          {activeTab === 'vehicle-info' && (
            <VehicleInfoSection data={vehicleInfoData} />
          )}
        </>
      )}
    </div>
  );
};

// Driver Behavior Analytics Section
const DriverBehaviorSection = ({ data, scores }) => {
  if (!data) return <div className="text-center py-8">No data available</div>;

  // Prepare data for pie chart - behavior counts
  const behaviorPieData = data.behavior_counts.map(item => ({
    name: item.behavior_type.replace(/_/g, ' '),
    value: item.count,
  }));

  // Prepare data for bar chart - top offenders
  const offendersBarData = data.top_offenders.slice(0, 10).map(item => ({
    name: `${item.driver__first_name} ${item.driver__last_name}`,
    incidents: item.total_incidents,
    severity: parseFloat(item.avg_severity).toFixed(1),
  }));

  // Prepare daily trends for line chart
  const trendsByType = {};
  data.daily_trends.forEach(item => {
    if (!trendsByType[item.date]) {
      trendsByType[item.date] = { date: item.date };
    }
    trendsByType[item.date][item.behavior_type] = item.count;
  });
  const trendsLineData = Object.values(trendsByType);

  // Prepare driver scores for radar chart (top 5)
  const radarData = scores.slice(0, 5).map(driver => ({
    driver: driver.driver_name.split(' ')[0],
    score: driver.score,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Behavior Logs</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.total_logs}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Unique Behaviors</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.behavior_counts.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Top Offenders</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.top_offenders.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Best Drivers</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.best_drivers.length}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Behavior Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Behavior Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={behaviorPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {behaviorPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Top Offenders */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Incident Drivers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={offendersBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="incidents" fill="#ef4444" name="Total Incidents" />
              <Bar dataKey="severity" fill="#f59e0b" name="Avg Severity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Daily Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Daily Behavior Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsLineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="HARSH_BRAKE" stroke="#ef4444" name="Harsh Brake" />
              <Line type="monotone" dataKey="HARSH_ACCEL" stroke="#f59e0b" name="Harsh Accel" />
              <Line type="monotone" dataKey="OVERSPEED" stroke="#8b5cf6" name="Overspeed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart - Driver Safety Scores */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 5 Driver Safety Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="driver" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Safety Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Scores Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Driver Safety Scores (All)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Safety Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Logs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incidents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scores.map((driver, index) => (
                <tr key={driver.driver_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{driver.driver_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      driver.score >= 80 ? 'bg-green-100 text-green-800' :
                      driver.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {driver.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.total_logs}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.total_incidents}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      driver.score >= 80 ? 'bg-green-500 text-white' :
                      driver.score >= 60 ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {driver.score >= 80 ? 'Excellent' : driver.score >= 60 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Fuel & Cost Reports Section
const FuelCostSection = ({ data, efficiency }) => {
  if (!data) return <div className="text-center py-8">No data available</div>;

  // Prepare fuel type data for pie chart
  const fuelTypePieData = data.fuel_type_costs.map(item => ({
    name: item.fuel_type,
    value: parseFloat(item.total_cost),
  }));

  // Prepare vehicle costs for bar chart
  const vehicleCostsBarData = data.vehicle_costs.slice(0, 10).map(item => ({
    name: item.vehicle__license_plate,
    cost: parseFloat(item.total_cost),
    quantity: parseFloat(item.total_quantity),
  }));

  // Prepare daily trends for area chart
  const dailyTrendsData = data.daily_trends.map(item => ({
    date: item.date,
    cost: parseFloat(item.total_cost),
    quantity: parseFloat(item.total_quantity),
  }));

  // Prepare efficiency data for scatter chart
  const efficiencyScatterData = efficiency.map(item => ({
    vehicle: item.vehicle_plate,
    efficiency: item.avg_efficiency,
    refills: item.total_refills,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Fuel Cost</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            ${parseFloat(data.totals.total_cost || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Fuel Quantity</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {parseFloat(data.totals.total_quantity || 0).toFixed(2)} L
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Average Price/Unit</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            ${parseFloat(data.totals.avg_price || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Refills</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.totals.total_records}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Fuel Type Costs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Cost by Fuel Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fuelTypePieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {fuelTypePieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Vehicle Costs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Fuel Costs by Vehicle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vehicleCostsBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="cost" fill="#3b82f6" name="Total Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart - Daily Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Daily Fuel Cost & Quantity Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="cost" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Cost ($)" />
              <Area yAxisId="right" type="monotone" dataKey="quantity" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Quantity (L)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scatter Chart - Fuel Efficiency */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Fuel Efficiency by Vehicle (km/L)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey="refills" name="Refills" />
              <YAxis dataKey="efficiency" name="Efficiency (km/L)" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="Vehicles" data={efficiencyScatterData} fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Efficiency Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Vehicle Fuel Efficiency Report</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Efficiency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Refills</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {efficiency.map((vehicle, index) => (
                <tr key={vehicle.vehicle_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.vehicle_plate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.vehicle_info}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {vehicle.avg_efficiency} km/L
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.min_efficiency} km/L</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.max_efficiency} km/L</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.total_refills}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Maintenance Cost Analysis Section
const MaintenanceSection = ({ data, health }) => {
  if (!data) return <div className="text-center py-8">No data available</div>;

  // Prepare maintenance type data for pie chart
  const typesPieData = data.type_costs.map(item => ({
    name: item.maintenance_type.replace(/_/g, ' '),
    value: parseFloat(item.total_cost),
    count: item.count,
  }));

  // Prepare vehicle costs for bar chart
  const vehicleCostsBarData = data.vehicle_costs.slice(0, 10).map(item => ({
    name: item.vehicle__license_plate,
    cost: parseFloat(item.total_cost),
    count: item.maintenance_count,
  }));

  // Prepare monthly trends for area chart
  const monthlyTrendsData = data.monthly_trends.map(item => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    cost: parseFloat(item.total_cost),
    count: item.count,
  }));

  // Prepare health scores for bar chart
  const healthScoresData = health.slice(0, 10).map(item => ({
    vehicle: item.vehicle_plate,
    score: item.health_score,
    cost: item.total_cost,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Cost</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            ${parseFloat(data.totals.total_cost || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Labor Cost</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            ${parseFloat(data.totals.total_labor || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Parts Cost</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            ${parseFloat(data.totals.total_parts || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Completed</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{data.totals.completed}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Scheduled</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{data.totals.scheduled}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Maintenance Type Costs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Cost by Maintenance Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typesPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {typesPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Vehicle Costs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Maintenance Costs by Vehicle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vehicleCostsBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="cost" fill="#ef4444" name="Total Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart - Monthly Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Monthly Maintenance Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="cost" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Cost ($)" />
              <Area yAxisId="right" type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Count" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Vehicle Health Scores */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Bottom 10 Vehicle Health Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={healthScoresData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="vehicle" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#f59e0b" name="Health Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vehicle Health Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Vehicle Health Report (Needs Attention)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Maintenance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overdue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {health.slice(0, 15).map((vehicle, index) => (
                <tr key={vehicle.vehicle_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.vehicle_plate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.vehicle_info}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      vehicle.health_score >= 75 ? 'bg-green-100 text-green-800' :
                      vehicle.health_score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {vehicle.health_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.total_maintenance}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{vehicle.overdue}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${vehicle.total_cost.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      vehicle.health_score >= 75 ? 'bg-green-500 text-white' :
                      vehicle.health_score >= 50 ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {vehicle.health_score >= 75 ? 'Good' : vehicle.health_score >= 50 ? 'Fair' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Vehicle Utilization Reports Section
const UtilizationSection = ({ data, efficiency }) => {
  if (!data) return <div className="text-center py-8">No data available</div>;

  // Prepare vehicle utilization for bar chart
  const vehicleUtilBarData = data.vehicle_utilization.slice(0, 10).map(item => ({
    name: item.vehicle__license_plate,
    utilization: parseFloat(item.avg_utilization),
    distance: parseFloat(item.total_distance),
  }));

  // Prepare daily trends for line chart
  const dailyTrendsData = data.daily_trends.map(item => ({
    date: item.date,
    utilization: parseFloat(item.avg_utilization),
    distance: parseFloat(item.total_distance),
    vehicles: item.active_vehicles,
  }));

  // Prepare idle analysis for bar chart
  const idleAnalysisData = data.high_idle_vehicles.map(item => ({
    name: item.vehicle__license_plate,
    idle: parseFloat(item.idle_percentage).toFixed(1),
  }));

  // Prepare fleet time breakdown for pie chart
  const timeBreakdownData = efficiency ? [
    { name: 'Moving Hours', value: parseFloat(efficiency.time_breakdown.moving_hours || 0) },
    { name: 'Idle Hours', value: parseFloat(efficiency.time_breakdown.idle_hours || 0) },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Avg Utilization</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {parseFloat(data.totals.avg_utilization || 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Distance</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {parseFloat(data.totals.total_distance || 0).toFixed(0)} km
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Engine Hours</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {parseFloat(data.totals.total_engine_hours || 0).toFixed(0)} hrs
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Idle Hours</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {parseFloat(data.totals.total_idle_hours || 0).toFixed(0)} hrs
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Trips</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.totals.total_trips || 0}</p>
        </div>
      </div>

      {/* Fleet Efficiency Summary */}
      {efficiency && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Fleet Efficiency Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Total Vehicles</p>
              <p className="text-3xl font-bold">{efficiency.total_vehicles}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Utilized Vehicles</p>
              <p className="text-3xl font-bold">{efficiency.utilized_vehicles}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Utilization Rate</p>
              <p className="text-3xl font-bold">{efficiency.utilization_rate}%</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Idle Percentage</p>
              <p className="text-3xl font-bold">{efficiency.time_breakdown.idle_percentage}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Vehicle Utilization */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Vehicle Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vehicleUtilBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilization" fill="#10b981" name="Utilization (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Time Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Fleet Time Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={timeBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {timeBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(1)} hrs`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Daily Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Daily Utilization Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="utilization" stroke="#10b981" name="Utilization (%)" />
              <Line yAxisId="right" type="monotone" dataKey="vehicles" stroke="#3b82f6" name="Active Vehicles" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - High Idle Vehicles */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 High Idle Vehicles</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={idleAnalysisData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Bar dataKey="idle" fill="#f59e0b" name="Idle %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Utilization Details Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Detailed Vehicle Utilization Report</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance (km)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engine Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Idle Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.vehicle_utilization.map((vehicle, index) => (
                <tr key={vehicle.vehicle__id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.vehicle__license_plate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.vehicle__make} {vehicle.vehicle__model}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      vehicle.avg_utilization >= 70 ? 'bg-green-100 text-green-800' :
                      vehicle.avg_utilization >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {parseFloat(vehicle.avg_utilization).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parseFloat(vehicle.total_distance).toFixed(0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parseFloat(vehicle.total_engine_hours).toFixed(1)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parseFloat(vehicle.total_idle_hours).toFixed(1)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.days_used}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      vehicle.avg_utilization >= 70 ? 'bg-green-500 text-white' :
                      vehicle.avg_utilization >= 40 ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {vehicle.avg_utilization >= 70 ? 'Optimal' : vehicle.avg_utilization >= 40 ? 'Moderate' : 'Under-utilized'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Driver Info Reports Section
const DriverInfoSection = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-2xl mx-auto">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Drivers Found</h3>
          <p className="text-gray-600 mb-4">
            There are no drivers in the system yet.
          </p>
          <div className="text-left bg-white p-4 rounded border border-gray-200 text-sm">
            <p className="font-semibold mb-2">To add drivers:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Go to the <strong>Drivers</strong> page in the navigation menu</li>
              <li>Click "Add Driver" or create via Django Admin</li>
              <li>Return here to see driver information and analytics</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const topDriversByDistance = [...data]
    .sort((a, b) => b.total_distance - a.total_distance)
    .slice(0, 10)
    .map(d => ({
      name: d.name.split(' ')[0],
      distance: parseFloat(d.total_distance).toFixed(0),
    }));

  const topDriversByTrips = [...data]
    .sort((a, b) => b.total_trips - a.total_trips)
    .slice(0, 10)
    .map(d => ({
      name: d.name.split(' ')[0],
      trips: d.total_trips,
    }));

  const safetyScoresData = [...data]
    .sort((a, b) => b.safety_score - a.safety_score)
    .slice(0, 10)
    .map(d => ({
      name: d.name.split(' ')[0],
      score: d.safety_score,
    }));

  const fuelCostDistribution = [...data]
    .sort((a, b) => b.total_fuel_cost - a.total_fuel_cost)
    .slice(0, 8)
    .map(d => ({
      name: d.name.split(' ')[0],
      value: parseFloat(d.total_fuel_cost),
    }));

  // Calculate summary statistics
  const totalDrivers = data.length;
  const activeDrivers = data.filter(d => d.is_active).length;
  const assignedDrivers = data.filter(d => d.current_vehicle !== 'Unassigned').length;
  const avgSafetyScore = (data.reduce((sum, d) => sum + d.safety_score, 0) / totalDrivers).toFixed(1);
  const totalDistance = data.reduce((sum, d) => sum + d.total_distance, 0).toFixed(0);
  const totalTrips = data.reduce((sum, d) => sum + d.total_trips, 0);

  // Check if we have any analytics data
  const hasAnalyticsData = data.some(d => 
    d.total_behavior_logs > 0 || 
    d.total_fuel_cost > 0 || 
    d.total_distance > 0 || 
    d.total_trips > 0
  );

  return (
    <div className="space-y-6">
      {/* Analytics Data Warning */}
      {!hasAnalyticsData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Driver Information Available</h4>
              <p className="text-blue-800 text-sm mb-2">
                Showing {totalDrivers} driver(s) with basic information. Performance metrics are currently zero because no analytics data has been recorded yet.
              </p>
              <p className="text-blue-700 text-xs">
                <strong>To see performance metrics:</strong> Generate sample data or start recording real operations (fuel records, behavior logs, utilization data).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Drivers</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{totalDrivers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Active Drivers</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{activeDrivers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Assigned</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{assignedDrivers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Avg Safety Score</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{avgSafetyScore}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Distance</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{totalDistance} km</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Trips</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{totalTrips}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Top Drivers by Distance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Drivers by Distance Traveled</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDriversByDistance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="distance" fill="#3b82f6" name="Distance (km)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Top Drivers by Trips */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Drivers by Number of Trips</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDriversByTrips}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="trips" fill="#10b981" name="Trips" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Safety Scores */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Driver Safety Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={safetyScoresData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#10b981" name="Safety Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Fuel Cost Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Fuel Cost Distribution (Top 8 Drivers)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fuelCostDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {fuelCostDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Driver Info Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Detailed Driver Information</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Safety Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance (km)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trips</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incidents</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuel Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((driver, index) => (
                <tr key={driver.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{driver.employee_id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{driver.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{driver.license_number}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{driver.current_vehicle}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      driver.safety_score >= 80 ? 'bg-green-100 text-green-800' :
                      driver.safety_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {driver.safety_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{parseFloat(driver.total_distance).toFixed(0)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{driver.total_trips}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{driver.total_incidents}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${driver.total_fuel_cost.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{driver.avg_utilization.toFixed(1)}%</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      driver.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Vehicle Info Reports Section
const VehicleInfoSection = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-2xl mx-auto">
          <div className="text-6xl mb-4">🚗</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Vehicles Found</h3>
          <p className="text-gray-600 mb-4">
            There are no vehicles in the system yet.
          </p>
          <div className="text-left bg-white p-4 rounded border border-gray-200 text-sm">
            <p className="font-semibold mb-2">To add vehicles:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Go to the <strong>Vehicles</strong> page in the navigation menu</li>
              <li>Click "Add Vehicle" or create via Django Admin</li>
              <li>Return here to see vehicle information and analytics</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const topVehiclesByDistance = [...data]
    .sort((a, b) => b.total_distance - a.total_distance)
    .slice(0, 10)
    .map(v => ({
      name: v.license_plate,
      distance: parseFloat(v.total_distance).toFixed(0),
    }));

  const vehicleStatusData = data.reduce((acc, v) => {
    const existing = acc.find(item => item.name === v.status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: v.status, value: 1 });
    }
    return acc;
  }, []);

  const maintenanceCostData = [...data]
    .sort((a, b) => b.total_maintenance_cost - a.total_maintenance_cost)
    .slice(0, 10)
    .map(v => ({
      name: v.license_plate,
      cost: parseFloat(v.total_maintenance_cost),
    }));

  const fuelEfficiencyData = [...data]
    .filter(v => v.avg_fuel_efficiency > 0)
    .sort((a, b) => b.avg_fuel_efficiency - a.avg_fuel_efficiency)
    .slice(0, 10)
    .map(v => ({
      name: v.license_plate,
      efficiency: v.avg_fuel_efficiency,
    }));

  const idleTimeData = [...data]
    .sort((a, b) => b.idle_percentage - a.idle_percentage)
    .slice(0, 10)
    .map(v => ({
      name: v.license_plate,
      idle: v.idle_percentage,
    }));

  // Calculate summary statistics
  const totalVehicles = data.length;
  const activeVehicles = data.filter(v => v.status === 'ACTIVE').length;
  const assignedVehicles = data.filter(v => v.current_driver !== 'Unassigned').length;
  const totalFuelCost = data.reduce((sum, v) => sum + v.total_fuel_cost, 0).toFixed(2);
  const totalMaintenanceCost = data.reduce((sum, v) => sum + v.total_maintenance_cost, 0).toFixed(2);
  const avgUtilization = (data.reduce((sum, v) => sum + v.avg_utilization, 0) / totalVehicles).toFixed(1);

  // Check if we have any analytics data
  const hasAnalyticsData = data.some(v => 
    v.total_fuel_cost > 0 || 
    v.total_maintenance_cost > 0 || 
    v.total_distance > 0 || 
    v.total_engine_hours > 0
  );

  return (
    <div className="space-y-6">
      {/* Analytics Data Warning */}
      {!hasAnalyticsData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Vehicle Information Available</h4>
              <p className="text-blue-800 text-sm mb-2">
                Showing {totalVehicles} vehicle(s) with basic information. Performance metrics are currently zero because no analytics data has been recorded yet.
              </p>
              <p className="text-blue-700 text-xs">
                <strong>To see performance metrics:</strong> Generate sample data or start recording real operations (fuel records, maintenance logs, utilization data).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Vehicles</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{totalVehicles}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Active</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{activeVehicles}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Assigned</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{assignedVehicles}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Fuel Cost</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">${totalFuelCost}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Maintenance Cost</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">${totalMaintenanceCost}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Avg Utilization</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{avgUtilization}%</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Top Vehicles by Distance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Vehicles by Distance Traveled</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topVehiclesByDistance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="distance" fill="#3b82f6" name="Distance (km)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Vehicle Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Vehicle Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vehicleStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {vehicleStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Maintenance Costs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Vehicles by Maintenance Cost</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={maintenanceCostData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="cost" fill="#ef4444" name="Maintenance Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Fuel Efficiency */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Vehicles by Fuel Efficiency (km/L)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fuelEfficiencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="efficiency" fill="#10b981" name="Efficiency (km/L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - High Idle Time */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Vehicles by Idle Time %</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={idleTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Bar dataKey="idle" fill="#f59e0b" name="Idle %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Vehicle Info Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Detailed Vehicle Information</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">License Plate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make/Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance (km)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuel Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maint. Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Idle %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Used</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((vehicle, index) => (
                <tr key={vehicle.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.license_plate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.make} {vehicle.model}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.year}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      vehicle.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      vehicle.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.current_driver}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{parseFloat(vehicle.total_distance).toFixed(0)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${vehicle.total_fuel_cost.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.avg_fuel_efficiency > 0 ? `${vehicle.avg_fuel_efficiency} km/L` : 'N/A'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${vehicle.total_maintenance_cost.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      vehicle.avg_utilization >= 70 ? 'bg-green-100 text-green-800' :
                      vehicle.avg_utilization >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {vehicle.avg_utilization.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 font-semibold">{vehicle.idle_percentage.toFixed(1)}%</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.days_used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reporting;
