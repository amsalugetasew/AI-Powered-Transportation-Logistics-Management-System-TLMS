import { useState, useEffect } from 'react';
import api from '../api/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

function ScoreBadge({ score }) {
  let color = 'bg-red-100 text-red-800';
  let label = 'Poor';
  if (score >= 90) { color = 'bg-green-100 text-green-800'; label = 'Excellent'; }
  else if (score >= 75) { color = 'bg-blue-100 text-blue-800'; label = 'Good'; }
  else if (score >= 60) { color = 'bg-yellow-100 text-yellow-800'; label = 'Fair'; }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>
      {score} — {label}
    </span>
  );
}

export default function DriverBehaviour() {
  const [behaviourData, setBehaviourData] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('tracking/driver-behaviour/')
      .then(res => {
        setBehaviourData(res.data || []);
        if (res.data?.length > 0) {
          setSelectedDriver(res.data[0]);
        }
      })
      .catch(() => setBehaviourData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedDriver?.last_vehicle_id) {
      api.get(`tracking/speed-history/?vehicle_id=${selectedDriver.last_vehicle_id}`)
        .then(res => setSpeedHistory(res.data || []))
        .catch(() => setSpeedHistory([]));
    } else {
      setSpeedHistory([]);
    }
  }, [selectedDriver]);

  // Radar chart data for selected driver
  const radarData = selectedDriver ? [
    { metric: 'Speed Control', value: Math.max(0, 100 - (selectedDriver.speeding_events || 0) * 5) },
    { metric: 'Smooth Driving', value: Math.max(0, 100 - (selectedDriver.harsh_braking_events || 0) * 10) },
    { metric: 'Consistency', value: selectedDriver.avg_speed > 0 ? Math.min(100, Math.round((1 - Math.abs(selectedDriver.avg_speed - 50) / 50) * 100)) : 50 },
    { metric: 'Distance', value: Math.min(100, (selectedDriver.total_locations || 0) * 2) },
    { metric: 'Overall Score', value: selectedDriver.score || 0 },
  ] : [];

  // Bar chart showing top drivers by score
  const scoreChartData = behaviourData
    .map(d => ({ name: d.driver_name?.split(' ')[0] || 'N/A', score: d.score, speeding: d.speeding_events }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">Driver Behaviour Analysis</h2>
          <p className="text-gray-500 mt-1">Monitor driving patterns, speeding events, and safety scores.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-500">Analyzing driver data...</span>
        </div>
      ) : behaviourData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Driver Behaviour Data Yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Driver behaviour data is generated from GPS tracking. Once your vehicles start sending location data 
            through trackers or the phone app, behaviour scores will be calculated automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Score Overview Bar Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Driver Safety Scores</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value, name) => [value, name === 'score' ? 'Safety Score' : 'Speeding Events']}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Safety Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Driver List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-base font-semibold text-gray-900">All Drivers</h3>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                <ul className="divide-y divide-gray-100">
                  {behaviourData.map((d, i) => (
                    <li
                      key={i}
                      onClick={() => setSelectedDriver(d)}
                      className={`p-4 cursor-pointer transition-colors ${selectedDriver === d ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">{d.driver_name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{d.employee_id}</p>
                        </div>
                        <ScoreBadge score={d.score} />
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>🚨 {d.speeding_events} speeding</span>
                        <span>⚡ {d.harsh_braking_events} harsh brake</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Selected Driver Detail */}
            {selectedDriver && (
              <div className="lg:col-span-2 space-y-6">
                {/* Driver Header Card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold">{selectedDriver.driver_name}</h3>
                      <p className="opacity-80 text-sm mt-1">Employee ID: {selectedDriver.employee_id} &bull; License: {selectedDriver.license_number}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold">{selectedDriver.score}</div>
                      <div className="text-xs opacity-80 mt-1">Safety Score</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold">{selectedDriver.total_locations}</div>
                      <div className="text-[10px] opacity-80">GPS Points</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold">{selectedDriver.avg_speed?.toFixed(1)}</div>
                      <div className="text-[10px] opacity-80">Avg Speed (km/h)</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold">{selectedDriver.max_speed?.toFixed(1)}</div>
                      <div className="text-[10px] opacity-80">Max Speed (km/h)</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-red-300">{selectedDriver.speeding_events}</div>
                      <div className="text-[10px] opacity-80">Speeding Events</div>
                    </div>
                  </div>
                </div>

                {/* Radar + Speed History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Radar Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Performance Breakdown</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Speed History Area Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Recent Speed History</h4>
                    {speedHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={speedHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="timestamp" tick={{ fontSize: 9 }} tickFormatter={t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            labelFormatter={t => new Date(t).toLocaleString()}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <defs>
                            <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="speed" stroke="#3b82f6" fill="url(#speedGradient)" strokeWidth={2} name="Speed (km/h)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[250px]">
                        <p className="text-gray-400 text-sm">No speed history available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
