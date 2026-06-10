import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import DashboardModern from './pages/DashboardModern';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Login from './pages/Login';
import Register from './pages/Register';
import LiveMap from './pages/LiveMap';
import Reporting from './pages/Reporting';
import Settings from './pages/Settings';
import ChatAssistant from './pages/ChatAssistant';
import ComplianceDashboard from './pages/compliance/ComplianceDashboard';
import LicenseManagement from './pages/compliance/LicenseManagement';
import MaintenanceSchedule from './pages/compliance/MaintenanceSchedule';
import AuditTrail from './pages/compliance/AuditTrail';
import AlertsDashboard from './pages/compliance/AlertsDashboard';

// Simple Auth Wrapper
function PrivateRoute({ children }) {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Root path always shows login */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<DashboardModern />} />
            <Route path="/fleet" element={<Reporting />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/tracking" element={<LiveMap />} />
            <Route path="/reporting" element={<Reporting />} />
            <Route path="/ai-assistant" element={<ChatAssistant />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/compliance" element={<ComplianceDashboard />} />
            <Route path="/compliance/licenses" element={<LicenseManagement />} />
            <Route path="/compliance/maintenance" element={<MaintenanceSchedule />} />
            <Route path="/compliance/audit" element={<AuditTrail />} />
            <Route path="/compliance/alerts" element={<AlertsDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
