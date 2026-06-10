import { useState, useEffect } from 'react';
import api from '../../api/api';

const AlertsDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get summary from dashboard endpoint
      const summaryRes = await api.get('fleet/compliance/alerts/dashboard/');
      setSummary(summaryRes.data);

      // Get all notifications (includes database alerts + auto-generated alerts)
      const notificationsRes = await api.get('fleet/compliance/alerts/notifications/');
      let allAlerts = notificationsRes.data;

      // Apply filter
      if (filter === 'active') {
        allAlerts = allAlerts.filter(a => a.status === 'ACTIVE');
      } else if (filter === 'critical') {
        allAlerts = allAlerts.filter(a => a.severity === 'CRITICAL' && ['ACTIVE', 'ACKNOWLEDGED'].includes(a.status));
      } else if (filter === 'ACKNOWLEDGED') {
        allAlerts = allAlerts.filter(a => a.status === 'ACKNOWLEDGED');
      } else if (filter === 'RESOLVED') {
        allAlerts = allAlerts.filter(a => a.status === 'RESOLVED');
      }
      // 'all' shows everything (no filter)

      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
    setLoading(false);
  };

  const handleAcknowledge = async (alertId) => {
    // Check if this is an auto-generated alert (string ID like "maintenance_4")
    if (typeof alertId === 'string' && alertId.includes('_')) {
      alert('This is an auto-generated alert. To resolve it, address the underlying issue (complete maintenance, renew license, etc.)');
      return;
    }
    
    try {
      await api.post(`fleet/compliance/alerts/${alertId}/acknowledge/`);
      fetchData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleResolve = async (alertId) => {
    // Check if this is an auto-generated alert
    if (typeof alertId === 'string' && alertId.includes('_')) {
      alert('This is an auto-generated alert. To resolve it, address the underlying issue (complete maintenance, renew license, etc.)');
      return;
    }
    
    const notes = prompt('Resolution notes (optional):');
    try {
      await api.post(`fleet/compliance/alerts/${alertId}/resolve/`, {
        resolution_notes: notes || ''
      });
      fetchData();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const handleDismiss = async (alertId) => {
    // Check if this is an auto-generated alert
    if (typeof alertId === 'string' && alertId.includes('_')) {
      alert('This is an auto-generated alert. It will disappear automatically when the underlying issue is resolved.');
      return;
    }
    
    if (confirm('Are you sure you want to dismiss this alert?')) {
      try {
        await api.post(`fleet/compliance/alerts/${alertId}/dismiss/`);
        fetchData();
      } catch (error) {
        console.error('Error dismissing alert:', error);
      }
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      'CRITICAL': 'bg-red-100 text-red-800 border-red-300',
      'WARNING': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'INFO': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[severity] || colors['INFO'];
  };

  const getStatusBadge = (status) => {
    const colors = {
      'ACTIVE': 'bg-red-500 text-white',
      'ACKNOWLEDGED': 'bg-yellow-500 text-white',
      'RESOLVED': 'bg-green-500 text-white',
      'DISMISSED': 'bg-gray-500 text-white'
    };
    return colors[status] || colors['ACTIVE'];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🔔 Alerts Dashboard</h1>
        <p className="text-gray-600">Monitor and manage system alerts</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total Active</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{summary.total_active}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
            <h3 className="text-red-600 text-sm font-medium">Critical</h3>
            <p className="text-3xl font-bold text-red-700 mt-2">{summary.critical}</p>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
            <h3 className="text-yellow-600 text-sm font-medium">Warning</h3>
            <p className="text-3xl font-bold text-yellow-700 mt-2">{summary.warning}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
            <h3 className="text-blue-600 text-sm font-medium">Info</h3>
            <p className="text-3xl font-bold text-blue-700 mt-2">{summary.info}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['active', 'critical', 'all', 'ACKNOWLEDGED', 'RESOLVED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Alerts</h3>
            <p className="text-gray-500">Everything is running smoothly!</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                alert.severity === 'CRITICAL' ? 'border-red-500' :
                alert.severity === 'WARNING' ? 'border-yellow-500' :
                'border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity_display}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(alert.status)}`}>
                      {alert.status_display}
                    </span>
                    {alert.action_required && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        Action Required
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {alert.title}
                    {(typeof alert.id === 'string' && alert.id.includes('_')) && (
                      <span className="ml-2 text-xs font-normal text-gray-500">(Auto-generated)</span>
                    )}
                  </h3>
                  <p className="text-gray-600 mt-1">{alert.message}</p>
                  
                  <div className="mt-3 text-sm text-gray-500 space-y-1">
                    {alert.driver_name && (
                      <div>👤 Driver: <span className="font-medium">{alert.driver_name}</span></div>
                    )}
                    {alert.vehicle_plate && (
                      <div>🚗 Vehicle: <span className="font-medium">{alert.vehicle_plate}</span></div>
                    )}
                    <div>📅 Created: {new Date(alert.created_at).toLocaleString()}</div>
                    {alert.due_date && (
                      <div>⏰ Due: {new Date(alert.due_date).toLocaleString()}</div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {alert.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {alert.status === 'ACKNOWLEDGED' && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Resolution Info */}
              {alert.status === 'RESOLVED' && (
                <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                  <div className="text-sm text-green-800">
                    <strong>Resolved by:</strong> {alert.resolved_by || 'System'} on {new Date(alert.resolved_at).toLocaleString()}
                    {alert.resolution_notes && (
                      <div className="mt-1"><strong>Notes:</strong> {alert.resolution_notes}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsDashboard;
