import axios from 'axios';

const api = axios.create({
  // Use the current hostname (works on desktop, laptop, or phone) and port 8000 for the Django backend
  baseURL: `${window.location.protocol}//${window.location.hostname}:8000/api/`,
});

// Add a request interceptor for JWT later
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
