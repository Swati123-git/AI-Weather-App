import React, { useState } from 'react';
import { useWeather } from '../context/WeatherContext';
import { useTheme } from '../context/ThemeContext';
import { ChartSkeleton } from '../components/SkeletonLoader';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  Thermometer,
  CloudRain,
  AlertTriangle,
  TrendingUp,
  CalendarDays
} from 'lucide-react';
import { fetchHistory } from '../services/api';

const DAY_RANGES = [
  { label: '7 Days',  value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
  { label: '60 Days', value: 60 }
];

const HistoryPage = () => {
  const { city, historyData: ctxHistoryData, loading: ctxLoading } = useWeather();
  const { isDark } = useTheme();

  const [selectedDays, setSelectedDays] = useState(30);
  const [localHistory, setLocalHistory] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  // Use locally fetched data when a range was explicitly chosen, else fall back to context
  const historyData = localHistory || ctxHistoryData;
  const loading = rangeLoading || (ctxLoading && !ctxHistoryData);

  const handleRangeChange = async (days) => {
    if (days === selectedDays && localHistory) return;
    setSelectedDays(days);
    setRangeLoading(true);
    try {
      const res = await fetchHistory(city, days);
      setLocalHistory(res.data);
    } catch {
      setLocalHistory(null);
    } finally {
      setRangeLoading(false);
    }
  };

  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const temperatureHistory = historyData?.temperatureHistory || [];
  const rainfallHistory = historyData?.rainfallHistory || [];
  const weeklyAlerts = historyData?.weeklyAlerts || [];
  const summary = historyData?.summary || {};

  return (
    <div className="page-history">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Meteorological History & Climatology <span className="city-pill">{city}</span>
          </h1>
          <p className="page-subtitle">
            Long-horizon sensor telemetry, precipitation analytics & anomaly distribution trends
          </p>
        </div>
      </div>

      {/* Day-Range Selector */}
      <div className="history-range-toolbar">
        <span className="history-range-label">
          <CalendarDays size={15} /> Time window:
        </span>
        <div className="history-range-pills">
          {DAY_RANGES.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`range-pill ${selectedDays === value ? 'active' : ''}`}
              onClick={() => handleRangeChange(value)}
              disabled={rangeLoading}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="history-kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap blue">
            <Thermometer size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{selectedDays}-Day Mean Temp</span>
            <span className="kpi-value">{summary.avgMonthlyTemp ?? 20}°C</span>
            <span className="kpi-sub">Sensor cluster average</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap cyan">
            <CloudRain size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Monthly Precipitation</span>
            <span className="kpi-value">{summary.totalRainfallMm ?? 142} mm</span>
            <span className="kpi-sub">Cumulative liquid gauge</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap amber">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Peak Temperature</span>
            <span className="kpi-value">+{summary.maxRecordedTemp ?? 28}°C</span>
            <span className="kpi-sub">Min: {summary.minRecordedTemp ?? 12}°C</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap purple">
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Atmospheric Incidents</span>
            <span className="kpi-value">{summary.totalAlertsIssued ?? 18}</span>
            <span className="kpi-sub">Critical: {summary.criticalEventsCount ?? 2} events</span>
          </div>
        </div>
      </div>

      {/* Chart 1: 30-Day Temperature Variance (Min, Max, Avg) */}
      <div className="history-chart-card glass-panel">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <Thermometer size={18} className="text-blue" />
            <h3 className="card-heading">30-Day Temperature Trends</h3>
          </div>
          <span className="chart-badge">Daily Recorded Highs, Lows & Means</span>
        </div>

        <div className="chart-container" style={{ width: '100%', height: 300 }}>
          {loading && !historyData ? (
            <ChartSkeleton height="300px" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temperatureHistory} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="date" stroke={textColor} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis stroke={textColor} tickLine={false} tick={{ fontSize: 11 }} unit="°" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderRadius: '8px',
                    color: isDark ? '#f8fafc' : '#0f172a'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="maxTemp"
                  name="Max Temp (°C)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgTemp"
                  name="Average Temp (°C)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="minTemp"
                  name="Min Temp (°C)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Grid: 2 Charts Side by Side */}
      <div className="history-dual-grid">
        {/* Chart 2: Rainfall History Bar Chart */}
        <div className="history-chart-card glass-panel">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <CloudRain size={18} className="text-cyan" />
              <h3 className="card-heading">Precipitation Volume (30 Days)</h3>
            </div>
            <span className="chart-badge">Daily Liquid Millimeters</span>
          </div>

          <div className="chart-container" style={{ width: '100%', height: 280 }}>
            {loading && !historyData ? (
              <ChartSkeleton height="280px" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rainfallHistory} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="date" stroke={textColor} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis stroke={textColor} tickLine={false} tick={{ fontSize: 11 }} unit=" mm" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '8px',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                  />
                  <Bar
                    dataKey="rainfallMm"
                    name="Rainfall (mm)"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Weekly Alerts Breakdown */}
        <div className="history-chart-card glass-panel">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <AlertTriangle size={18} className="text-amber" />
              <h3 className="card-heading">Alerts Triggered per Week</h3>
            </div>
            <span className="chart-badge">Categorized by Severity</span>
          </div>

          <div className="chart-container" style={{ width: '100%', height: 280 }}>
            {loading && !historyData ? (
              <ChartSkeleton height="280px" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAlerts} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="week" stroke={textColor} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis stroke={textColor} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '8px',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Low" stackId="a" fill="#10b981" />
                  <Bar dataKey="Medium" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="High" stackId="a" fill="#f97316" />
                  <Bar dataKey="Critical" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
