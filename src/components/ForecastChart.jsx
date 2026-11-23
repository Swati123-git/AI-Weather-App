import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Thermometer, CloudRain, Wind, Droplets } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const METRICS = {
  temperature: {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    color: '#3b82f6',
    fillColor: '#3b82f6',
    icon: Thermometer
  },
  rainChance: {
    key: 'rainChance',
    label: 'Rain Probability',
    unit: '%',
    color: '#06b6d4',
    fillColor: '#06b6d4',
    icon: CloudRain
  },
  windSpeed: {
    key: 'windSpeed',
    label: 'Wind Speed',
    unit: 'km/h',
    color: '#10b981',
    fillColor: '#10b981',
    icon: Wind
  },
  humidity: {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    color: '#8b5cf6',
    fillColor: '#8b5cf6',
    icon: Droplets
  }
};

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-time">{label}</p>
        <p className="tooltip-value">
          <span className="dot" style={{ backgroundColor: payload[0].stroke }}></span>
          {payload[0].name}: <strong>{payload[0].value} {unit}</strong>
        </p>
        <p className="tooltip-condition">Condition: {data.condition}</p>
      </div>
    );
  }
  return null;
};

const ForecastChart = ({ data = [], className = '' }) => {
  const [activeMetric, setActiveMetric] = useState('temperature');
  const { isDark } = useTheme();

  const currentMetric = METRICS[activeMetric];

  // Axis grid colors based on dark/light
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className={`forecast-chart-card glass-panel ${className}`}>
      <div className="chart-header">
        <div className="chart-title-wrap">
          <h3 className="card-heading">24-Hour Hourly Forecast</h3>
          <span className="chart-subtitle">Real-time dynamic trend trajectory</span>
        </div>

        {/* Metric Selector Tabs */}
        <div className="metric-tabs">
          {Object.entries(METRICS).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = activeMetric === key;
            return (
              <button
                key={key}
                type="button"
                className={`metric-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveMetric(key)}
              >
                <Icon size={14} />
                <span className="tab-label">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts Area/Line Chart */}
      <div className="chart-container" style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="time"
              stroke={textColor}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke={textColor}
              tickLine={false}
              tick={{ fontSize: 12 }}
              unit={currentMetric.unit === '°C' ? '°' : ''}
            />
            <Tooltip
              content={<CustomTooltip unit={currentMetric.unit} />}
            />
            <Area
              type="monotone"
              dataKey={currentMetric.key}
              name={currentMetric.label}
              stroke={currentMetric.color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#gradient-${activeMetric})`}
              dot={{ r: 3, fill: currentMetric.color, strokeWidth: 1 }}
              activeDot={{ r: 6, fill: currentMetric.color, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ForecastChart;
