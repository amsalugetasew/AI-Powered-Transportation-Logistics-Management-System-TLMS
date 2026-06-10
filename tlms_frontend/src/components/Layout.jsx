import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api/api';
import myicon from "../assets/Tracking.png"
import iconimage from "../assets/cbe.png"
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  // Fetch alerts on mount and every 30 seconds
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('fleet/compliance/alerts/notifications/');
      setAlerts(response.data.slice(0, 10));
      setAlertCount(response.data.length);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isComplianceActive = () => {
    return location.pathname.startsWith('/compliance');
  };

  const isFleetActive = () => {
    return location.pathname.startsWith('/fleet') || 
           location.pathname === '/vehicles' || 
           location.pathname === '/drivers' || 
           location.pathname === '/tracking' || 
           location.pathname === '/reporting';
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  return (
    <div className={`h-screen ${theme.bodyBg} flex flex-col overflow-hidden`}>
      {/* Top Navbar - Fixed */}
      <header className={`${theme.navbar} ${theme.navbarText} shadow-md py-3 px-6 flex justify-between items-center flex-shrink-0`}>
        <div className="flex items-center gap-10">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className='w-18 h-18 flex items-center justify-center relative'>
              {/* <img src={myicon} alt = "AI TLMS" className='w-18 h-16'/>
              <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white'></span> */}
              <h1 className="text-2xl font-bold tracking-tight">TLMS</h1>
              <img src={iconimage} alt = "AI TLMS" className='w-18 h-16'/>
              <span className='absolute text-[#8E288D] font-black text-xs tracking-wider bg-white/80 px-1 rounded shadow-sm'></span>
            </div>            
          </div>

          {/* Navigation with Icons */}
          <nav className="flex gap-2 font-medium">
              <Link
                to="/dashboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive('/dashboard')
                    ? theme.navbarActive
                    : theme.navbarHover
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Dashboard</span>
              </Link>

              <Link
                to="/fleet"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isFleetActive()
                    ? theme.navbarActive
                    : theme.navbarHover
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Fleet Management</span>
              </Link>

              <Link
                to="/compliance"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isComplianceActive()
                    ? theme.navbarActive
                    : theme.navbarHover
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Compliance</span>
              </Link>

              <Link
                to="/ai-assistant"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive('/ai-assistant')
                    ? theme.navbarActive
                    : theme.navbarHover
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>AI Assistant</span>
              </Link>

              <Link
                to="/settings"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive('/settings')
                    ? theme.navbarActive
                    : theme.navbarHover
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </Link>
            </nav>
          </div>

          {/* Right side - Notifications & Logout */}
          <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 ${theme.navbarHover} rounded-full transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {alertCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {alertCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    <Link
                      to="/compliance/alerts"
                      onClick={() => setShowNotifications(false)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View All
                    </Link>
                  </div>
                  
                  <div className="overflow-y-auto flex-1">
                    {alerts.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">🎉</div>
                        <p>No alerts</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {alerts.map((alert) => (
                          <Link
                            key={alert.id}
                            to="/compliance/alerts"
                            onClick={() => setShowNotifications(false)}
                            className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                                alert.severity === 'CRITICAL' ? 'bg-red-500' :
                                alert.severity === 'WARNING' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                    alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                    alert.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {alert.severity_display}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(alert.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                  {alert.title}
                                </p>
                                <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                  {alert.message}
                                </p>
                                {(alert.driver_name || alert.vehicle_plate) && (
                                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                                    {alert.driver_name && <span>👤 {alert.driver_name}</span>}
                                    {alert.vehicle_plate && <span>🚗 {alert.vehicle_plate}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {alerts.length > 0 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <Link
                        to="/compliance/alerts"
                        onClick={() => setShowNotifications(false)}
                        className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View All {alertCount} Alert{alertCount !== 1 ? 's' : ''}
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

      {/* Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Show on Fleet Management or Compliance pages */}
        {isFleetActive() && (
          <aside className={`w-64 ${theme.sidebar} shadow-lg flex-shrink-0 overflow-y-auto border-r ${theme.border}`}>
            <div className={`p-6 border-b ${theme.border}`}>
              <h2 className={`text-xl font-bold ${theme.textPrimary} flex items-center gap-2`}>
                <span>🚚</span>
                <span>Fleet Management</span>
              </h2>
            </div>
            <nav className="p-4 space-y-2">
              <Link
                to="/fleet"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/fleet' || location.pathname === '/reporting'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">📊</span>
                <span className="font-medium">Reports</span>
              </Link>
              <Link
                to="/vehicles"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/vehicles'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">🚗</span>
                <span className="font-medium">Vehicles</span>
              </Link>
              <Link
                to="/drivers"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/drivers'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">👥</span>
                <span className="font-medium">Drivers</span>
              </Link>
              <Link
                to="/tracking"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/tracking'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">📍</span>
                <span className="font-medium">Tracking</span>
              </Link>
            </nav>
          </aside>
        )}
        
        {isComplianceActive() && (
          <aside className={`w-64 ${theme.sidebar} shadow-lg flex-shrink-0 overflow-y-auto border-r ${theme.border}`}>
            <div className={`p-6 border-b ${theme.border}`}>
              <h2 className={`text-xl font-bold ${theme.textPrimary} flex items-center gap-2`}>
                <span>🛡️</span>
                <span>Compliance</span>
              </h2>
            </div>
            <nav className="p-4 space-y-2">
              <Link
                to="/compliance"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/compliance'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">📊</span>
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link
                to="/compliance/licenses"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/compliance/licenses'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">📋</span>
                <span className="font-medium">Licenses</span>
              </Link>
              <Link
                to="/compliance/maintenance"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/compliance/maintenance'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">🔧</span>
                <span className="font-medium">Maintenance</span>
              </Link>
              <Link
                to="/compliance/alerts"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/compliance/alerts'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">🔔</span>
                <span className="font-medium">Alerts</span>
              </Link>
              <Link
                to="/compliance/audit"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === '/compliance/audit'
                    ? theme.sidebarActive
                    : theme.sidebarInactive
                }`}
              >
                <span className="text-xl">📜</span>
                <span className="font-medium">Audit Trail</span>
              </Link>
            </nav>
          </aside>
        )}

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
