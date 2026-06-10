import { useState, useEffect } from 'react';
import api from '../../api/api';

const LicenseManagement = () => {
  const [licenses, setLicenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewingLicense, setRenewingLicense] = useState(null);
  const [renewFormData, setRenewFormData] = useState({
    issue_date: '',
    expiry_date: '',
    issuing_authority: ''
  });
  const [renewError, setRenewError] = useState('');

  const [formData, setFormData] = useState({
    license_type: 'DRIVER',
    license_number: '',
    driver: '',
    vehicle: '',
    issue_date: '',
    expiry_date: '',
    issuing_authority: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    fetchDropdownData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const summaryRes = await api.get('fleet/compliance/licenses/summary/');
      setSummary(summaryRes.data);

      let endpoint = 'fleet/compliance/licenses/';
      if (filter === 'expiring') endpoint = 'fleet/compliance/licenses/expiring_soon/';
      else if (filter === 'expired') endpoint = 'fleet/compliance/licenses/expired/';
      else if (filter !== 'all') endpoint = `fleet/compliance/licenses/?status=${filter}`;

      const licensesRes = await api.get(endpoint);
      setLicenses(licensesRes.data);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    }
    setLoading(false);
  };

  const fetchDropdownData = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        api.get('fleet/drivers/'),
        api.get('fleet/vehicles/')
      ]);
      setDrivers(driversRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data - only include driver OR vehicle, not both
      const submitData = { ...formData };
      if (formData.license_type.includes('VEHICLE') || formData.license_type === 'INSURANCE' || formData.license_type === 'INSPECTION') {
        delete submitData.driver;
      } else {
        delete submitData.vehicle;
      }

      if (editingLicense) {
        await api.put(`fleet/compliance/licenses/${editingLicense.id}/`, submitData);
      } else {
        await api.post('fleet/compliance/licenses/', submitData);
      }
      
      setShowModal(false);
      setEditingLicense(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving license:', error);
      alert('Error saving license: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const openRenewModal = (license) => {
    setRenewingLicense(license);
    setRenewFormData({
      issue_date: '',
      expiry_date: '',
      issuing_authority: license.issuing_authority || ''
    });
    setRenewError('');
    setShowRenewModal(true);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setRenewError('');
    try {
      await api.post(`fleet/compliance/licenses/${renewingLicense.id}/renew/`, {
        issue_date: renewFormData.issue_date,
        expiry_date: renewFormData.expiry_date,
        issuing_authority: renewFormData.issuing_authority
      });
      setShowRenewModal(false);
      setRenewingLicense(null);
      fetchData();
    } catch (error) {
      console.error('Error renewing license:', error);
      setRenewError(error.response?.data?.detail || 'Error renewing license. Please try again.');
    }
  };

  const handleEdit = (license) => {
    setEditingLicense(license);
    setFormData({
      license_type: license.license_type,
      license_number: license.license_number,
      driver: license.driver || '',
      vehicle: license.vehicle || '',
      issue_date: license.issue_date,
      expiry_date: license.expiry_date,
      issuing_authority: license.issuing_authority || '',
      notes: license.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this license record?')) {
      try {
        await api.delete(`fleet/compliance/licenses/${id}/`);
        fetchData();
      } catch (error) {
        console.error('Error deleting license:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      license_type: 'DRIVER',
      license_number: '',
      driver: '',
      vehicle: '',
      issue_date: '',
      expiry_date: '',
      issuing_authority: '',
      notes: ''
    });
  };

  const getStatusBadge = (status, daysUntilExpiry) => {
    if (status === 'EXPIRED') {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (status === 'EXPIRING_SOON' || daysUntilExpiry <= 30) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (status === 'RENEWED') {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const licenseTypeOptions = [
    { value: 'DRIVER', label: 'Driver License' },
    { value: 'VEHICLE_REG', label: 'Vehicle Registration' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'INSPECTION', label: 'Inspection Certificate' },
    { value: 'PERMIT', label: 'Special Permit' },
    { value: 'CERTIFICATION', label: 'Driver Certification' },
    { value: 'OTHER', label: 'Other' }
  ];

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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 License Management</h1>
          <p className="text-gray-600">Track licenses, registrations, and certifications</p>
        </div>
        <button
          onClick={() => {
            setEditingLicense(null);
            resetForm();
            setShowModal(true);
          }}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
        >
          + Add License
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total Licenses</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{summary.total}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
            <h3 className="text-green-600 text-sm font-medium">Valid</h3>
            <p className="text-3xl font-bold text-green-700 mt-2">{summary.valid}</p>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
            <h3 className="text-yellow-600 text-sm font-medium">Expiring Soon</h3>
            <p className="text-3xl font-bold text-yellow-700 mt-2">{summary.expiring_soon}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
            <h3 className="text-red-600 text-sm font-medium">Expired</h3>
            <p className="text-3xl font-bold text-red-700 mt-2">{summary.expired}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['all', 'VALID', 'expiring', 'expired', 'RENEWED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f === 'expiring' ? 'Expiring Soon' : f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Licenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {licenses.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  No licenses found
                </td>
              </tr>
            ) : (
              licenses.map((license) => (
                <tr key={license.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {license.license_type_display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {license.license_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {license.driver_name || license.vehicle_plate || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {license.issue_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {license.expiry_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className={`font-semibold ${
                      license.days_until_expiry < 0 ? 'text-red-600' :
                      license.days_until_expiry <= 30 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {license.days_until_expiry < 0 ? `Expired ${Math.abs(license.days_until_expiry)} days ago` :
                       `${license.days_until_expiry} days`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(license.status, license.days_until_expiry)}`}>
                      {license.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {license.status !== 'RENEWED' && (
                        <>
                          <button
                            onClick={() => openRenewModal(license)}
                             className="px-4 py-2 bg-[#8E288D] text-white rounded hover:bg-[#008080] text-sm"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => handleEdit(license)}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                          >
                            Edit
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(license.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {editingLicense ? 'Edit License' : 'Add New License'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Type</label>
                  <select
                    value={formData.license_type}
                    onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {licenseTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Show driver dropdown for driver-related licenses */}
                {!['VEHICLE_REG', 'INSURANCE', 'INSPECTION'].includes(formData.license_type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
                    <select
                      value={formData.driver}
                      onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Driver</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name} - {driver.employee_id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Show vehicle dropdown for vehicle-related licenses */}
                {['VEHICLE_REG', 'INSURANCE', 'INSPECTION'].includes(formData.license_type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
                    <select
                      value={formData.vehicle}
                      onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.license_plate} - {vehicle.model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                    <input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issuing Authority</label>
                  <input
                    type="text"
                    value={formData.issuing_authority}
                    onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingLicense(null);
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
                    {editingLicense ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Renew License Modal */}
      {showRenewModal && renewingLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0 bg-blue-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">🔄 Renew License</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {renewingLicense.license_type_display} — {renewingLicense.license_number}
                </p>
              </div>
              <button
                onClick={() => { setShowRenewModal(false); setRenewingLicense(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleRenewSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {renewError && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{renewError}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                  <input
                    type="date"
                    value={renewFormData.issue_date}
                    onChange={(e) => setRenewFormData({ ...renewFormData, issue_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={renewFormData.expiry_date}
                    onChange={(e) => setRenewFormData({ ...renewFormData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issuing Authority</label>
                  <input
                    type="text"
                    value={renewFormData.issuing_authority}
                    onChange={(e) => setRenewFormData({ ...renewFormData, issuing_authority: e.target.value })}
                    placeholder="e.g., Department of Motor Vehicles"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={() => { setShowRenewModal(false); setRenewingLicense(null); }}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Renew License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseManagement;
