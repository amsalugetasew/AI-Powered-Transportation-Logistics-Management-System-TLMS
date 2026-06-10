import { useState, useEffect } from 'react';
import api from '../../api/api';

const MaintenanceSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  const [formData, setFormData] = useState({
    vehicle: '',
    schedule_type: 'TIME_BASED',
    maintenance_type: '',
    description: '',
    scheduled_date: '',
    scheduled_mileage: '',
    is_recurring: false,
    recurrence_interval_days: '',
    recurrence_interval_miles: '',
    priority: 'MEDIUM',
    assigned_to: '',
    estimated_cost: '0'
  });

  useEffect(() => {
    fetchData();
    fetchVehicles();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const summaryRes = await api.get('fleet/compliance/maintenance-schedules/summary/');
      setSummary(summaryRes.data);

      let endpoint = 'fleet/compliance/maintenance-schedules/';
      if (filter === 'upcoming') endpoint = 'fleet/compliance/maintenance-schedules/upcoming/';
      else if (filter === 'overdue') endpoint = 'fleet/compliance/maintenance-schedules/overdue/';
      else if (filter !== 'all') endpoint = `fleet/compliance/maintenance-schedules/?status=${filter}`;

      const schedulesRes = await api.get(endpoint);
      setSchedules(schedulesRes.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
    setLoading(false);
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('fleet/vehicles/');
      setVehicles(res.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        scheduled_mileage: formData.scheduled_mileage ? parseInt(formData.scheduled_mileage) : null,
        recurrence_interval_days: formData.recurrence_interval_days ? parseInt(formData.recurrence_interval_days) : null,
        recurrence_interval_miles: formData.recurrence_interval_miles ? parseInt(formData.recurrence_interval_miles) : null,
        estimated_cost: parseFloat(formData.estimated_cost) || 0
      };

      if (editingSchedule) {
        await api.put(`fleet/compliance/maintenance-schedules/${editingSchedule.id}/`, submitData);
      } else {
        await api.post('fleet/compliance/maintenance-schedules/', submitData);
      }
      
      setShowModal(false);
      setEditingSchedule(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error saving schedule: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleComplete = async (schedule) => {
    const actualCost = prompt('Enter actual cost (optional):');
    const completedMileage = prompt('Enter completed mileage (optional):');
    const notes = prompt('Additional notes (optional):');

    try {
      await api.post(`fleet/compliance/maintenance-schedules/${schedule.id}/complete/`, {
        actual_cost: actualCost ? parseFloat(actualCost) : schedule.estimated_cost,
        completed_mileage: completedMileage ? parseInt(completedMileage) : null,
        notes: notes || schedule.notes,
        labor_cost: 0,
        parts_cost: 0
      });
      fetchData();
    } catch (error) {
      console.error('Error completing schedule:', error);
      alert('Error completing maintenance');
    }
  };

  const handleReschedule = async (schedule) => {
    const newDate = prompt('Enter new scheduled date (YYYY-MM-DDTHH:MM):');
    if (newDate) {
      try {
        await api.post(`fleet/compliance/maintenance-schedules/${schedule.id}/reschedule/`, {
          scheduled_date: newDate
        });
        fetchData();
      } catch (error) {
        console.error('Error rescheduling:', error);
        alert('Error rescheduling maintenance');
      }
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      vehicle: schedule.vehicle,
      schedule_type: schedule.schedule_type,
      maintenance_type: schedule.maintenance_type,
      description: schedule.description,
      scheduled_date: schedule.scheduled_date.slice(0, 16),
      scheduled_mileage: schedule.scheduled_mileage || '',
      is_recurring: schedule.is_recurring,
      recurrence_interval_days: schedule.recurrence_interval_days || '',
      recurrence_interval_miles: schedule.recurrence_interval_miles || '',
      priority: schedule.priority,
      assigned_to: schedule.assigned_to || '',
      estimated_cost: schedule.estimated_cost
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      try {
        await api.delete(`fleet/compliance/maintenance-schedules/${id}/`);
        fetchData();
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle: '',
      schedule_type: 'TIME_BASED',
      maintenance_type: '',
      description: '',
      scheduled_date: '',
      scheduled_mileage: '',
      is_recurring: false,
      recurrence_interval_days: '',
      recurrence_interval_miles: '',
      priority: 'MEDIUM',
      assigned_to: '',
      estimated_cost: '0'
    });
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'LOW': 'bg-blue-100 text-blue-800 border-blue-300',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-300',
      'CRITICAL': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[priority] || colors['MEDIUM'];
  };

  const getStatusBadge = (status) => {
    const colors = {
      'SCHEDULED': 'bg-blue-500 text-white',
      'IN_PROGRESS': 'bg-yellow-500 text-white',
      'COMPLETED': 'bg-green-500 text-white',
      'CANCELLED': 'bg-gray-500 text-white',
      'OVERDUE': 'bg-red-500 text-white'
    };
    return colors[status] || colors['SCHEDULED'];
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🔧 Maintenance Schedule</h1>
          <p className="text-gray-600">Plan and track vehicle maintenance activities</p>
        </div>
        <button
          onClick={() => {
            setEditingSchedule(null);
            resetForm();
            setShowModal(true);
          }}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
        >
          + Schedule Maintenance
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{summary.total}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
            <h3 className="text-blue-600 text-sm font-medium">Scheduled</h3>
            <p className="text-3xl font-bold text-blue-700 mt-2">{summary.scheduled}</p>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
            <h3 className="text-yellow-600 text-sm font-medium">In Progress</h3>
            <p className="text-3xl font-bold text-yellow-700 mt-2">{summary.in_progress}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
            <h3 className="text-green-600 text-sm font-medium">Completed</h3>
            <p className="text-3xl font-bold text-green-700 mt-2">{summary.completed}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
            <h3 className="text-red-600 text-sm font-medium">Overdue</h3>
            <p className="text-3xl font-bold text-red-700 mt-2">{summary.overdue}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['upcoming', 'overdue', 'all', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Scheduled Maintenance</h3>
            <p className="text-gray-500">Create a maintenance schedule to get started</p>
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(schedule.status)}`}>
                      {schedule.status_display}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(schedule.priority)}`}>
                      {schedule.priority_display}
                    </span>
                    {schedule.is_recurring && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                        🔄 Recurring
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-800">{schedule.maintenance_type}</h3>
                  <p className="text-gray-600 mt-1">{schedule.description}</p>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Vehicle:</span>
                      <p className="font-medium">{schedule.vehicle_plate}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Scheduled Date:</span>
                      <p className="font-medium">{new Date(schedule.scheduled_date).toLocaleString()}</p>
                    </div>
                    {schedule.scheduled_mileage && (
                      <div>
                        <span className="text-gray-500">Scheduled Mileage:</span>
                        <p className="font-medium">{schedule.scheduled_mileage.toLocaleString()} km</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Estimated Cost:</span>
                      <p className="font-medium">${schedule.estimated_cost}</p>
                    </div>
                    {schedule.assigned_to && (
                      <div>
                        <span className="text-gray-500">Assigned To:</span>
                        <p className="font-medium">{schedule.assigned_to}</p>
                      </div>
                    )}
                  </div>

                  {schedule.status === 'COMPLETED' && (
                    <div className="mt-4 p-3 bg-green-50 rounded border border-green-200 text-sm">
                      <strong>Completed:</strong> {new Date(schedule.completed_date).toLocaleString()}
                      {schedule.actual_cost && <span> | Cost: ${schedule.actual_cost}</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {(schedule.status === 'SCHEDULED' || schedule.status === 'OVERDUE') && (
                    <>
                      <button
                        onClick={() => handleComplete(schedule)}
                        className="px-4 py-2 bg-[#008080] text-white rounded hover:bg-green-600 text-sm"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleReschedule(schedule)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        Edit
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {editingSchedule ? 'Edit Maintenance Schedule' : 'Schedule New Maintenance'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle *</label>
                  <select
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type *</label>
                    <select
                      value={formData.schedule_type}
                      onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="TIME_BASED">Time-Based</option>
                      <option value="MILEAGE_BASED">Mileage-Based</option>
                      <option value="CONDITION_BASED">Condition-Based</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Type *</label>
                  <input
                    type="text"
                    value={formData.maintenance_type}
                    onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                    placeholder="e.g., Oil Change, Tire Rotation, Brake Inspection"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date *</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Mileage</label>
                    <input
                      type="number"
                      value={formData.scheduled_mileage}
                      onChange={(e) => setFormData({ ...formData, scheduled_mileage: e.target.value })}
                      placeholder="km"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      placeholder="Service provider or mechanic"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Cost *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Recurring Maintenance</span>
                  </label>

                  {formData.is_recurring && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence Interval (Days)</label>
                        <input
                          type="number"
                          value={formData.recurrence_interval_days}
                          onChange={(e) => setFormData({ ...formData, recurrence_interval_days: e.target.value })}
                          placeholder="e.g., 90 for every 3 months"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence Interval (Miles)</label>
                        <input
                          type="number"
                          value={formData.recurrence_interval_miles}
                          onChange={(e) => setFormData({ ...formData, recurrence_interval_miles: e.target.value })}
                          placeholder="e.g., 5000"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingSchedule(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {editingSchedule ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSchedule;
