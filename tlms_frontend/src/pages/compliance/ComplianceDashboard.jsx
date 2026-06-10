import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';

const ComplianceDashboard = () => {
  const [data, setData] = useState({
    licenses: null,
    alerts: null,
    maintenance: null,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [licensesRes, alertsRes, maintenanceRes, auditRes] = await Promise.all([
        api.get('fleet/compliance/licenses/summary/'),
        api.get('fleet/compliance/alerts/dashboard/'),
        api.get('fleet/compliance/maintenance-schedules/summary/'),
        api.get('fleet/compliance/audit/recent/')
      ]);

      setData({
        licenses: licensesRes.data,
        alerts: alertsRes.data,
        maintenance: maintenanceRes.data,
        recentActivity: auditRes.data.slice(0, 10)
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const { licenses, alerts, maintenance, recentActivity } = data;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">🛡️ Compliance Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600">Overview of fleet compliance status and activities</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {/* Licenses Card */}
        <Link to="/compliance/licenses" className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">📋 Licenses</h3>
            <div className="text-xl sm:text-2xl">→</div>
          </div>
          {licenses && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-bold text-gray-800">{licenses.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-green-600">Valid</span>
                <span className="text-lg font-bold text-green-600">{licenses.valid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-yellow-600">Expiring Soon</span>
                <span className="text-lg font-bold text-yellow-600">{licenses.expiring_soon}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-600">Expired</span>
                <span className="text-lg font-bold text-red-600">{licenses.expired}</span>
              </div>
            </div>
          )}
        </Link>

        {/* Alerts Card */}
        <Link to="/compliance/alerts" className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">🔔 Alerts</h3>
            <div className="text-xl sm:text-2xl">→</div>
          </div>
          {alerts && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <span className="text-lg font-bold text-gray-800">{alerts.total_active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-600">Critical</span>
                <span className="text-lg font-bold text-red-600">{alerts.critical}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-yellow-600">Warning</span>
                <span className="text-lg font-bold text-yellow-600">{alerts.warning}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-600">Info</span>
                <span className="text-lg font-bold text-blue-600">{alerts.info}</span>
              </div>
            </div>
          )}
        </Link>

        {/* Maintenance Card */}
        <Link to="/compliance/maintenance" className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">🔧 Maintenance</h3>
            <div className="text-xl sm:text-2xl">→</div>
          </div>
          {maintenance && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-bold text-gray-800">{maintenance.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-600">Scheduled</span>
                <span className="text-lg font-bold text-blue-600">{maintenance.scheduled}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-yellow-600">In Progress</span>
                <span className="text-lg font-bold text-yellow-600">{maintenance.in_progress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-600">Overdue</span>
                <span className="text-lg font-bold text-red-600">{maintenance.overdue}</span>
              </div>
            </div>
          )}
        </Link>

        {/* Audit Trail Card */}
        <Link to="/compliance/audit" className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">📜 Audit Trail</h3>
            <div className="text-xl sm:text-2xl">→</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 mb-3">Track all system activities and changes</div>
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <span>View Logs</span>
              <span>→</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Critical Alerts Section */}
      {alerts && alerts.recent_alerts && alerts.recent_alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">⚠️ Recent Critical Alerts</h2>
            <Link to="/compliance/alerts" className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {alerts.recent_alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                  alert.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                  alert.severity === 'WARNING' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{alert.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{alert.message}</p>
                    <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                      {alert.driver_name && <span>👤 {alert.driver_name}</span>}
                      {alert.vehicle_plate && <span>🚗 {alert.vehicle_plate}</span>}
                      <span>📅 {new Date(alert.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity_display}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* License Status Breakdown */}
        {licenses && licenses.by_type && licenses.by_type.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📊 Licenses by Type</h2>
            <div className="space-y-3">
              {licenses.by_type.map((item, idx) => {
                const typeLabels = {
                  'DRIVER': 'Driver License',
                  'VEHICLE_REG': 'Vehicle Registration',
                  'INSURANCE': 'Insurance',
                  'INSPECTION': 'Inspection Certificate',
                  'PERMIT': 'Special Permit',
                  'CERTIFICATION': 'Driver Certification',
                  'OTHER': 'Other'
                };
                return (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">
                      {typeLabels[item.license_type] || item.license_type}
                    </span>
                    <span className="text-sm font-bold text-blue-600">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Maintenance Priority */}
        {maintenance && maintenance.by_priority && maintenance.by_priority.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">⚡ Maintenance by Priority</h2>
            <div className="space-y-3">
              {maintenance.by_priority.map((item, idx) => {
                const colors = {
                  'CRITICAL': 'text-red-600',
                  'HIGH': 'text-orange-600',
                  'MEDIUM': 'text-yellow-600',
                  'LOW': 'text-blue-600'
                };
                return (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className={`text-sm font-medium ${colors[item.priority] || 'text-gray-700'}`}>
                      {item.priority}
                    </span>
                    <span className={`text-sm font-bold ${colors[item.priority] || 'text-gray-700'}`}>
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">📋 Recent Activity</h2>
            <Link to="/compliance/audit" className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">
              View Full Audit Trail →
            </Link>
          </div>
          <div className="space-y-2">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded hover:bg-gray-100">
                <div className="text-xs text-gray-500 sm:w-32">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{log.username}</span>
                  <span className="text-sm text-gray-600 ml-2">{log.action_type_display}</span>
                  <span className="text-sm text-gray-600 ml-2">•</span>
                  <span className="text-sm text-gray-600 ml-2">{log.entity_type_display}</span>
                </div>
                <div className="text-xs text-gray-500 truncate sm:max-w-xs">
                  {log.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/compliance/licenses"
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-3xl mb-2">📋</div>
          <div className="font-semibold">Manage Licenses</div>
        </Link>
        <Link
          to="/compliance/alerts"
          className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-3xl mb-2">🔔</div>
          <div className="font-semibold">View Alerts</div>
        </Link>
        <Link
          to="/compliance/maintenance"
          className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-3xl mb-2">🔧</div>
          <div className="font-semibold">Schedule Maintenance</div>
        </Link>
        <Link
          to="/compliance/audit"
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-3xl mb-2">📜</div>
          <div className="font-semibold">Audit Trail</div>
        </Link>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
