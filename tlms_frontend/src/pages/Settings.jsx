import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('appearance');

  const tabs = [
    { id: 'appearance', name: 'Appearance', icon: '🎨' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'account', name: 'Account', icon: '👤' },
    { id: 'system', name: 'System', icon: '⚙️' },
  ];

  return (
    <div className={`space-y-6 ${theme.textPrimary}`}>
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${theme.textPrimary}`}>Settings</h1>
        <p className={`${theme.textSecondary} mt-1`}>Manage your dashboard preferences and configurations</p>
      </div>

      {/* Tabs */}
      <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border}`}>
        <div className={`border-b ${theme.border}`}>
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? isDarkMode 
                      ? 'border-violet-600 text-violet-400' 
                      : 'border-[#8E288D] text-[#8E288D]'
                    : `border-transparent ${theme.textSecondary} ${theme.hover}`
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Toggle */}
              <div>
                <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-4`}>Theme Mode</h3>
                <p className={`text-sm ${theme.textSecondary} mb-6`}>
                  Switch between light and dark mode
                </p>

                <div className={`${theme.cardBg} border ${theme.border} rounded-xl p-6`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${
                        isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
                      }`}>
                        {isDarkMode ? '🌙' : '☀️'}
                      </div>
                      <div>
                        <h4 className={`text-lg font-semibold ${theme.textPrimary}`}>
                          {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                        </h4>
                        <p className={`text-sm ${theme.textSecondary}`}>
                          {isDarkMode 
                            ? 'Dark background with light text - perfect for night work' 
                            : 'Light background with purple accents - classic professional look'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isDarkMode}
                        onChange={toggleTheme}
                        className="sr-only peer" 
                      />
                      <div className="w-16 h-8 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className={`border-t ${theme.border} pt-6`}>
                <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-4`}>Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Light Mode Preview */}
                  <div className={`border-2 rounded-xl overflow-hidden ${
                    !isDarkMode ? 'border-[#8E288D]' : 'border-gray-300'
                  }`}>
                    <div className="bg-[#F8F8FF] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-[#8E288D] rounded"></div>
                        <div className="h-4 bg-[#8E288D] rounded w-20"></div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="bg-white p-3 border-t border-gray-200">
                      <p className={`text-xs text-center font-medium ${!isDarkMode ? 'text-[#8E288D]' : 'text-gray-500'}`}>
                        {!isDarkMode ? '✓ Active' : 'Light Mode'}
                      </p>
                    </div>
                  </div>

                  {/* Dark Mode Preview */}
                  <div className={`border-2 rounded-xl overflow-hidden ${
                    isDarkMode ? 'border-violet-500' : 'border-gray-300'
                  }`}>
                    <div className="bg-slate-950 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-violet-600 rounded"></div>
                        <div className="h-4 bg-slate-700 rounded w-20"></div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-4 shadow-sm">
                        <div className="h-3 bg-slate-600 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-slate-600 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-3 border-t border-slate-700">
                      <p className={`text-xs text-center font-medium ${isDarkMode ? 'text-violet-400' : 'text-gray-400'}`}>
                        {isDarkMode ? '✓ Active' : 'Dark Mode'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Appearance Settings */}
              <div className={`pt-6 border-t ${theme.border}`}>
                <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-4`}>Display Options</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className={`font-medium ${theme.textPrimary}`}>Compact Mode</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Reduce spacing between elements</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 ${
                        isDarkMode ? 'peer-focus:ring-violet-300' : 'peer-focus:ring-purple-300'
                      } rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        isDarkMode ? 'peer-checked:bg-violet-600' : 'peer-checked:bg-[#8E288D]'
                      }`}></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className={`font-medium ${theme.textPrimary}`}>Animations</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Enable smooth transitions and animations</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 ${
                        isDarkMode ? 'peer-focus:ring-violet-300' : 'peer-focus:ring-purple-300'
                      } rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        isDarkMode ? 'peer-checked:bg-violet-600' : 'peer-checked:bg-[#8E288D]'
                      }`}></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-4`}>Notification Preferences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className={`font-medium ${theme.textPrimary}`}>Vehicle Alerts</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Get notified about vehicle issues</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 ${
                        isDarkMode ? 'peer-focus:ring-violet-300' : 'peer-focus:ring-purple-300'
                      } rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        isDarkMode ? 'peer-checked:bg-violet-600' : 'peer-checked:bg-[#8E288D]'
                      }`}></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className={`font-medium ${theme.textPrimary}`}>Maintenance Reminders</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Receive maintenance schedule notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 ${
                        isDarkMode ? 'peer-focus:ring-violet-300' : 'peer-focus:ring-purple-300'
                      } rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        isDarkMode ? 'peer-checked:bg-violet-600' : 'peer-checked:bg-[#8E288D]'
                      }`}></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className={`font-medium ${theme.textPrimary}`}>Speed Violations</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Alert when vehicles exceed speed limits</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 ${
                        isDarkMode ? 'peer-focus:ring-violet-300' : 'peer-focus:ring-purple-300'
                      } rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        isDarkMode ? 'peer-checked:bg-violet-600' : 'peer-checked:bg-[#8E288D]'
                      }`}></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-4`}>Account Information</h3>
                <p className={`text-sm ${theme.textSecondary} mb-6`}>
                  Manage your account details and preferences
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme.textPrimary} mb-2`}>Email</label>
                    <input
                      type="email"
                      className={`w-full px-4 py-2 border ${theme.border} ${theme.cardBg} ${theme.textPrimary} rounded-lg focus:ring-2 ${
                        isDarkMode ? 'focus:ring-violet-500' : 'focus:ring-purple-500'
                      } focus:border-transparent`}
                      placeholder="your.email@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${theme.textPrimary} mb-2`}>Full Name</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-2 border ${theme.border} ${theme.cardBg} ${theme.textPrimary} rounded-lg focus:ring-2 ${
                        isDarkMode ? 'focus:ring-violet-500' : 'focus:ring-purple-500'
                      } focus:border-transparent`}
                      placeholder="John Doe"
                    />
                  </div>

                  <button className={`mt-4 px-6 py-2 ${
                    isDarkMode ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#8E288D] hover:bg-[#7a1f7a]'
                  } text-white rounded-lg transition-colors`}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-4`}>System Information</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between py-2">
                    <span className={`${theme.textSecondary}`}>Version</span>
                    <span className={`font-medium ${theme.textPrimary}`}>1.0.0</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className={`${theme.textSecondary}`}>Database</span>
                    <span className={`font-medium ${theme.textPrimary}`}>MySQL 8.0</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className={`${theme.textSecondary}`}>Backend</span>
                    <span className={`font-medium ${theme.textPrimary}`}>Django 4.2</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className={`${theme.textSecondary}`}>Frontend</span>
                    <span className={`font-medium ${theme.textPrimary}`}>React 18</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className={`${theme.cardBg} border ${theme.border} rounded-xl p-6 text-left ${theme.hover} transition-colors`}>
          <div className="text-3xl mb-3">🔄</div>
          <h4 className={`font-semibold ${theme.textPrimary} mb-1`}>Reset Settings</h4>
          <p className={`text-sm ${theme.textSecondary}`}>Restore default preferences</p>
        </button>

        <button className={`${theme.cardBg} border ${theme.border} rounded-xl p-6 text-left ${theme.hover} transition-colors`}>
          <div className="text-3xl mb-3">📥</div>
          <h4 className={`font-semibold ${theme.textPrimary} mb-1`}>Export Data</h4>
          <p className={`text-sm ${theme.textSecondary}`}>Download your dashboard data</p>
        </button>

        <button className={`${theme.cardBg} border ${theme.border} rounded-xl p-6 text-left ${theme.hover} transition-colors`}>
          <div className="text-3xl mb-3">📚</div>
          <h4 className={`font-semibold ${theme.textPrimary} mb-1`}>Help Center</h4>
          <p className={`text-sm ${theme.textSecondary}`}>Get support and documentation</p>
        </button>
      </div>
    </div>
  );
}
