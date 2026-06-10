import { useState, useEffect } from 'react';
import api from '../../api/api';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    username: '',
    action_type: '',
    entity_type: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const summaryRes = await api.get('fleet/compliance/audit/summary/?days=30');
      setSummary(summaryRes.data);

      const logsRes = await api.get('fleet/compliance/audit/recent/');
      setLogs(logsRes.data);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`fleet/compliance/audit/?${params.toString()}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error searching audit trail:', error);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setFilters({
      username: '',
      action_type: '',
      entity_type: '',
      start_date: '',
      end_date: ''
    });
    fetchData();
  };

  const getActionBadge = (actionType) => {
    const colors = {
      'CREATE': 'bg-green-100 text-green-800 border-green-300',
      'UPDATE': 'bg-blue-100 text-blue-800 border-blue-300',
      'DELETE': 'bg-red-100 text-red-800 border-red-300',
      'ASSIGN': 'bg-purple-100 text-purple-800 border-purple-300',
      'UNASSIGN': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'STATUS_CHANGE': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'LOGIN': 'bg-teal-100 text-teal-800 border-teal-300',
      'LOGOUT': 'bg-gray-100 text-gray-800 border-gray-300',
      'ALERT': 'bg-orange-100 text-orange-800 border-orange-300',
      'MAINTENANCE': 'bg-cyan-100 text-cyan-800 border-cyan-300'
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getEntityIcon = (entityType) => {
    const icons = {
      'DRIVER': '👤',
      'VEHICLE': '🚗',
      'LICENSE': '📋',
      'MAINTENANCE': '🔧',
      'USER': '👥',
      'ALERT': '🔔',
      'SYSTEM': '⚙️'
    };
    return icons[entityType] || '📄';
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📜 Audit Trail</h1>
        <p className="text-gray-600">Complete log of all system activities and changes</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total Actions (30 Days)</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{summary.total_actions}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
            <h3 className="text-blue-600 text-sm font-medium">Top Action</h3>
            <p className="text-xl font-bold text-blue-700 mt-2">
              {summary.by_action_type && summary.by_action_type.length > 0
                ? summary.by_action_type[0].action_type
                : 'N/A'}
            </p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
            <h3 className="text-green-600 text-sm font-medium">Top Entity</h3>
            <p className="text-xl font-bold text-green-700 mt-2">
              {summary.by_entity_type && summary.by_entity_type.length > 0
                ? summary.by_entity_type[0].entity_type
                : 'N/A'}
            </p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg shadow border border-purple-200">
            <h3 className="text-purple-600 text-sm font-medium">Active Users</h3>
            <p className="text-3xl font-bold text-purple-700 mt-2">
              {summary.top_users ? summary.top_users.length : 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => setFilters({ ...filters, username: e.target.value })}
              placeholder="Enter username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
            <select
              value={filters.action_type}
              onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
              <option value="ASSIGN">Assigned</option>
              <option value="UNASSIGN">Unassigned</option>
              <option value="STATUS_CHANGE">Status Changed</option>
              <option value="LOGIN">User Login</option>
              <option value="LOGOUT">User Logout</option>
              <option value="ALERT">Alert Generated</option>
              <option value="MAINTENANCE">Maintenance Activity</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <select
              value={filters.entity_type}
              onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <option value="DRIVER">Driver</option>
              <option value="VEHICLE">Vehicle</option>
              <option value="LICENSE">License</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="USER">User</option>
              <option value="ALERT">Alert</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Search
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getActionBadge(log.action_type)}`}>
                        {log.action_type_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEntityIcon(log.entity_type)}</span>
                        <div>
                          <div className="font-medium">{log.entity_type_display}</div>
                          {log.entity_name && (
                            <div className="text-xs text-gray-500">{log.entity_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                      <div className="truncate" title={log.description}>
                        {log.description}
                      </div>
                      {log.changes && (
                        <details className="mt-1 text-xs text-gray-500 cursor-pointer">
                          <summary>View Changes</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && summary.by_action_type && summary.by_action_type.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions by Type</h3>
            <div className="space-y-2">
              {summary.by_action_type.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.action_type}</span>
                  <span className="text-sm font-bold text-gray-800">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Entities Modified</h3>
            <div className="space-y-2">
              {summary.by_entity_type.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="text-lg">{getEntityIcon(item.entity_type)}</span>
                    {item.entity_type}
                  </span>
                  <span className="text-sm font-bold text-gray-800">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {summary && summary.top_users && summary.top_users.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Active Users (Last 30 Days)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.top_users.slice(0, 6).map((user, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">{user.username}</span>
                <span className="text-sm font-bold text-blue-600">{user.count} actions</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
