import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '', email: '', first_name: '', last_name: '', password: '', role: 'VIEWER'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('users/auth/register/', formData);
      setSuccess('Registration successful! You can now log in.');
      setError('');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError('Registration failed. Please check your inputs.');
      setSuccess('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create an Account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input required type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input required type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input required type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm">
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="DISPATCHER">Dispatcher</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>

            <div>
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700">
                Register
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-medium text-primary hover:text-blue-500">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
