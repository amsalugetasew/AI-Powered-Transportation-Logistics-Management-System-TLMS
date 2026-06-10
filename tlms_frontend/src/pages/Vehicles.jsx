import { useState, useEffect } from 'react';
import api from '../api/api';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [originalDriverId, setOriginalDriverId] = useState(null);
  
  const initialForm = { license_plate: '', vin: '', make: '', model: '', year: new Date().getFullYear(), status: 'ACTIVE', current_driver_id: '', device_imei: '' };
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');

  const fetchVehicles = () => {
    setLoading(true);
    api.get('fleet/vehicles/')
      .then(res => setVehicles(res.data))
      .catch(err => console.error("Error fetching vehicles", err))
      .finally(() => setLoading(false));
  };

  const fetchDrivers = () => {
    api.get('fleet/drivers/').then(res => setDrivers(res.data));
  };

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData(initialForm);
    setOriginalDriverId(null);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (vehicle) => {
    setIsEditMode(true);
    setEditingId(vehicle.id);
    setOriginalDriverId(vehicle.current_driver ? vehicle.current_driver.id : null);
    setFormData({
      license_plate: vehicle.license_plate,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      status: vehicle.status,
      current_driver_id: vehicle.current_driver ? vehicle.current_driver.id : '',
      device_imei: vehicle.device_imei || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const openHistoryModal = (vehicle) => {
    setHistoryVehicle(vehicle);
    setShowHistoryModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    
    // Prepare payload: convert empty strings to null for optional fields
    const payload = { 
      ...formData, 
      current_driver_id: formData.current_driver_id || null,
      device_imei: formData.device_imei?.trim() || null  // Convert empty/whitespace to null
    };
    
    const request = isEditMode 
      ? api.put(`fleet/vehicles/${editingId}/`, payload)
      : api.post('fleet/vehicles/', payload);

    request.then(() => {
      setShowModal(false);
      fetchVehicles();
      fetchDrivers();
    }).catch(err => {
      console.error('Error saving vehicle:', err.response?.data);
      
      // Display specific field errors
      if (err.response?.data) {
        const errors = err.response.data;
        
        // Check for specific field errors
        if (errors.current_driver_id) {
          setFormError(`Driver Assignment: ${errors.current_driver_id[0]}`);
        } else if (errors.device_imei) {
          setFormError(`GPS Tracker IMEI: ${errors.device_imei[0]}`);
        } else if (errors.license_plate) {
          setFormError(`License Plate: ${errors.license_plate[0]}`);
        } else if (errors.vin) {
          setFormError(`VIN: ${errors.vin[0]}`);
        } else if (errors.non_field_errors) {
          setFormError(errors.non_field_errors[0]);
        } else if (errors.detail) {
          setFormError(errors.detail);
        } else {
          // Generic error with field names
          const fieldErrors = Object.entries(errors)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
            .join(', ');
          setFormError(fieldErrors || 'An error occurred while saving. Please check all fields.');
        }
      } else {
        setFormError('An error occurred while saving. Please try again.');
      }
    });
  };

  const handleDelete = (id) => {
    if(window.confirm("Are you sure you want to delete this vehicle?")) {
      api.delete(`fleet/vehicles/${id}/`).then(() => {
        fetchVehicles();
        fetchDrivers();
      });
    }
  };

  const handleToggleDeactivate = (vehicle) => {
    const newStatus = vehicle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    api.patch(`fleet/vehicles/${vehicle.id}/`, { status: newStatus }).then(() => {
      fetchVehicles();
      fetchDrivers();
    });
  };

  // Filter drivers: show only those without a vehicle AND ACTIVE, OR the one originally assigned to this vehicle
  const availableDrivers = drivers.filter(d => 
    (!d.assigned_vehicle_plate && d.is_active) || d.id === originalDriverId
  );

  return (
    <>
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Vehicles</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage your fleet vehicles, driver assignments, and status.</p>
        </div>
        <button 
          onClick={openAddModal} 
          className="w-full sm:w-auto bg-primary hover:bg-blue-700 text-white font-semibold py-3 sm:py-2 px-6 rounded-lg shadow-sm transition-all text-center"
        >
          + Add Vehicle
        </button>
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plate Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Make/Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No vehicles found.</td></tr>
              ) : (
                vehicles.map(vehicle => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vehicle.license_plate}</div>
                      {vehicle.device_imei ? (
                        <div className="text-xs text-blue-600 mt-0.5">IMEI: {vehicle.device_imei}</div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-0.5">No Tracker</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.make} {vehicle.model} ({vehicle.year})</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.current_driver ? `${vehicle.current_driver.first_name} ${vehicle.current_driver.last_name}` : 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button onClick={() => openHistoryModal(vehicle)} className="px-4 py-2 bg-[#8E288D] text-white rounded hover:bg-[#8E088D] text-sm">History</button>
                      <button onClick={() => handleToggleDeactivate(vehicle)} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">
                        {vehicle.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => openEditModal(vehicle)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">Edit</button>
                      <button onClick={() => handleDelete(vehicle.id)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">Delete</button>
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
        ) : vehicles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">No vehicles found.</div>
        ) : (
          vehicles.map(vehicle => (
            <div key={vehicle.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {vehicle.license_plate}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                  </p>
                  {vehicle.device_imei ? (
                    <p className="text-xs text-blue-600 mt-0.5">IMEI: {vehicle.device_imei}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">No GPS Tracker</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${vehicle.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {vehicle.status}
                </span>
              </div>

              {/* Card Content */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">VIN:</span>
                  <span className="font-medium text-gray-900">{vehicle.vin}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Driver:</span>
                  <span className="font-medium text-gray-900">
                    {vehicle.current_driver ? `${vehicle.current_driver.first_name} ${vehicle.current_driver.last_name}` : 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => openHistoryModal(vehicle)} 
                  className="px-3 py-2 bg-[#8E288D] text-white rounded hover:bg-[#8E088D] text-sm font-medium"
                >
                  History
                </button>
                <button 
                  onClick={() => handleToggleDeactivate(vehicle)} 
                  className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm font-medium"
                >
                  {vehicle.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                  onClick={() => openEditModal(vehicle)} 
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(vehicle.id)} 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                {formError && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{formError}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                    <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm uppercase" 
                      value={formData.license_plate} onChange={e => setFormData({...formData, license_plate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                    <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                      value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                      value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                      value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input required type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                      value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Note: Status changes to "Maintenance" automatically when scheduled</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">GPS Tracker IMEI (Optional)</label>
                    <input type="text" placeholder="e.g. 012345678901234" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                      value={formData.device_imei} onChange={e => setFormData({...formData, device_imei: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Driver</label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      value={formData.current_driver_id} onChange={e => setFormData({...formData, current_driver_id: e.target.value})}>
                      <option value="">-- Unassigned --</option>
                      {availableDrivers.map(d => (
                        <option key={d.id} value={d.id}>{d.employee_id} - {d.first_name} {d.last_name} - {d.license_number}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-2 flex-shrink-0 bg-gray-50">
                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md border border-gray-300">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-md">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && historyVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Assignment History</h3>
                <p className="text-xs sm:text-sm text-gray-500">Vehicle: {historyVehicle.license_plate} ({historyVehicle.make} {historyVehicle.model})</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto">
              {historyVehicle.assignment_history?.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No assignment history found for this vehicle.</p>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">License No.</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyVehicle.assignment_history.map(hist => (
                          <tr key={hist.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{hist.driver_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{hist.driver_employee_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{hist.driver_license_number}</td>
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
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-3">
                    {historyVehicle.assignment_history.map(hist => (
                      <div key={hist.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{hist.driver_name}</h4>
                          {!hist.end_date && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Employee ID:</span>
                            <span className="font-medium">{hist.driver_employee_id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">License:</span>
                            <span className="font-medium">{hist.driver_license_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Start:</span>
                            <span className="font-medium">{new Date(hist.start_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">End:</span>
                            <span className="font-medium">
                              {hist.end_date ? new Date(hist.end_date).toLocaleDateString() : 'Current'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
