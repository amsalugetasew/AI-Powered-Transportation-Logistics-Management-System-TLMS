import { useState, useEffect } from 'react';
import api from '../api/api';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDriver, setHistoryDriver] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialForm = { 
    employee_id: '', 
    first_name: '', 
    last_name: '', 
    license_number: '', 
    license_issue_date: '',
    license_expiry_date: '', 
    issuing_authority: '',
    license_notes: '',
    is_active: true, 
    assigned_vehicle_id: '' 
  };
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');

  const fetchDrivers = () => {
    setLoading(true);
    api.get('fleet/drivers/')
      .then(res => setDrivers(res.data))
      .catch(err => console.error("Error fetching drivers", err))
      .finally(() => setLoading(false));
  };

  const fetchVehicles = () => {
    api.get('fleet/vehicles/').then(res => setVehicles(res.data));
  };

  useEffect(() => {
    fetchDrivers();
    fetchVehicles();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData(initialForm);
    setFormError('');
    setShowModal(true);
  };

  const openHistoryModal = (driver) => {
    setHistoryDriver(driver);
    setShowHistoryModal(true);
  };

  const openEditModal = (driver) => {
    setIsEditMode(true);
    setEditingId(driver.id);
    
    // Find the vehicle currently assigned to this driver
    const assignedVehicle = vehicles.find(v => v.current_driver && v.current_driver.id === driver.id);
    
    setFormData({
      employee_id: driver.employee_id,
      first_name: driver.first_name,
      last_name: driver.last_name,
      license_number: driver.license_number,
      license_issue_date: driver.license_issue_date || '',
      license_expiry_date: driver.license_expiry_date,
      issuing_authority: driver.issuing_authority || '',
      license_notes: driver.license_notes || '',
      is_active: driver.is_active,
      assigned_vehicle_id: assignedVehicle ? assignedVehicle.id : ''
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    
    const payload = { ...formData, assigned_vehicle_id: formData.assigned_vehicle_id || null };

    const request = isEditMode 
      ? api.put(`fleet/drivers/${editingId}/`, payload)
      : api.post('fleet/drivers/', payload);

    request.then(() => {
      setShowModal(false);
      fetchDrivers();
      fetchVehicles(); // Refresh vehicles to update assignments
    }).catch(err => {
      if (err.response?.data?.assigned_vehicle_id) {
        setFormError(err.response.data.assigned_vehicle_id[0]);
      } else if (err.response?.data?.employee_id) {
        setFormError(`Employee ID: ${err.response.data.employee_id[0]}`);
      } else if (err.response?.data?.license_number) {
        setFormError(`License Number: ${err.response.data.license_number[0]}`);
      } else {
        setFormError('An error occurred while saving.');
      }
    });
  };

  const handleDelete = (id) => {
    if(window.confirm("Are you sure you want to delete this driver?")) {
      api.delete(`fleet/drivers/${id}/`).then(() => {
        fetchDrivers();
        fetchVehicles();
      });
    }
  };

  const handleToggleDeactivate = (driver) => {
    api.patch(`fleet/drivers/${driver.id}/`, { is_active: !driver.is_active }).then(() => {
      fetchDrivers();
      fetchVehicles();
    });
  };

  // Filter vehicles: show only those without a driver AND ACTIVE, OR the one currently assigned to this driver
  const availableVehicles = vehicles.filter(v => 
    (!v.current_driver && v.status === 'ACTIVE') || (isEditMode && v.id === formData.assigned_vehicle_id)
  );

  return (
    <>
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Drivers</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage driver assignments, licenses, and performance.</p>
        </div>
        <button 
          onClick={openAddModal} 
          className="w-full sm:w-auto bg-primary hover:bg-blue-700 text-white font-semibold py-3 sm:py-2 px-6 rounded-lg shadow-sm transition-all text-center"
        >
          + Add Driver
        </button>
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">No drivers found.</td></tr>
              ) : (
                drivers.map(driver => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{driver.employee_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {driver.first_name} {driver.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.license_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.license_expiry_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {driver.assigned_vehicle_plate || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {driver.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => openHistoryModal(driver)} className="px-3 py-1.5 bg-[#8E288D] text-white rounded hover:bg-[#8E088D] text-sm">History</button>
                      <button onClick={() => handleToggleDeactivate(driver)} className="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">
                        {driver.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => openEditModal(driver)} className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">Edit</button>
                      <button onClick={() => handleDelete(driver.id)} className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View - Hidden on desktop */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Loading...</div>
        ) : drivers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">No drivers found.</div>
        ) : (
          drivers.map(driver => (
            <div key={driver.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {driver.first_name} {driver.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {driver.employee_id}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {driver.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Card Content */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">License:</span>
                  <span className="font-medium text-gray-900">{driver.license_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expiry:</span>
                  <span className="font-medium text-gray-900">{driver.license_expiry_date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vehicle:</span>
                  <span className="font-medium text-gray-900">{driver.assigned_vehicle_plate || 'Unassigned'}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => openHistoryModal(driver)} 
                  className="px-3 py-2 bg-[#8E288D] text-white rounded hover:bg-[#8E088D] text-sm font-medium"
                >
                  History
                </button>
                <button 
                  onClick={() => handleToggleDeactivate(driver)} 
                  className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm font-medium"
                >
                  {driver.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                  onClick={() => openEditModal(driver)} 
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(driver.id)} 
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{isEditMode ? 'Edit Driver' : 'Add New Driver'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm uppercase" 
                    value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                    value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                    value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                    value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Issue Date</label>
                  <input required type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                    value={formData.license_issue_date} onChange={e => setFormData({...formData, license_issue_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry Date</label>
                  <input required type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                    value={formData.license_expiry_date} onChange={e => setFormData({...formData, license_expiry_date: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Authority</label>
                  <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                    placeholder="e.g., Department of Motor Vehicles"
                    value={formData.issuing_authority} onChange={e => setFormData({...formData, issuing_authority: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Notes</label>
                  <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                    rows="2"
                    placeholder="Additional notes about the license"
                    value={formData.license_notes} onChange={e => setFormData({...formData, license_notes: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Vehicle</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={formData.assigned_vehicle_id} onChange={e => setFormData({...formData, assigned_vehicle_id: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {availableVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.license_plate} - {v.make} {v.model}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 flex items-center mt-2">
                  <input type="checkbox" id="isActive" className="mr-2"
                    checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Driver is Active</label>
                </div>
              </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0 bg-gray-50">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md border border-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-md">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && historyDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Vehicle Assignment History</h3>
                <p className="text-sm text-gray-500">Driver: {historyDriver.first_name} {historyDriver.last_name} ({historyDriver.employee_id})</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              {historyDriver.assignment_history?.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No vehicle assignment history found for this driver.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plate Number</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Make/Model</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {historyDriver.assignment_history.map(hist => (
                      <tr key={hist.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{hist.vehicle_plate}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{hist.vehicle_make} {hist.vehicle_model}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(hist.start_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {hist.end_date ? new Date(hist.end_date).toLocaleDateString() : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Current
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
