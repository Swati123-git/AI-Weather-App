import React from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  Gauge,
  Eye,
  Sunrise,
  Sunset,
  ArrowUp,
  ArrowDown,
  Sparkles
} from 'lucide-react';
import { formatTemperature } from '../utils/helpers';

const getWeatherIcon = (condition, size = 36) => {
  if (!condition) return <Sun size={size} className="weather-icon-sun" />;
  const cond = condition.toLowerCase();

  if (cond.includes('rain') || cond.includes('drizzle')) {
    return <CloudRain size={size} className="weather-icon-rain" />;
  }
  if (cond.includes('thunder') || cond.includes('storm')) {
    return <CloudLightning size={size} className="weather-icon-storm" />;
  }
  if (cond.includes('snow') || cond.includes('ice')) {
    return <Snowflake size={size} className="weather-icon-snow" />;
  }
  if (cond.includes('cloud') || cond.includes('overcast')) {
    return <Cloud size={size} className="weather-icon-cloud" />;
  }
  return <Sun size={size} className="weather-icon-sun" />;
};

const WeatherCard = ({ data, unit = 'Celsius', className = '' }) => {
  if (!data) return null;

  return (
    <div className={`weather-card glass-panel ${className}`}>
      {/* Top Banner with City and Live Status */}
      <div className="weather-card-top">
        <div className="city-info">
          <span className="live-badge">
            <span className="live-pulse"></span> LIVE MONITORING
          </span>
          <h2 className="city-name">
            {data.city} <span className="country-code">{data.country}</span>
          </h2>
          <p className="weather-desc">{data.description || data.condition}</p>
        </div>

        <div className="weather-icon-highlight">
          {getWeatherIcon(data.condition, 56)}
        </div>
      </div>

      {/* Main Temp Display */}
      <div className="weather-hero-row">
        <div className="temp-display-wrap">
          <span className="main-temp">{formatTemperature(data.temperature, unit)}</span>
          <div className="temp-sub-details">
            <span className="feels-like">
              Feels like <strong>{formatTemperature(data.feelsLike, unit)}</strong>
            </span>
            <div className="high-low-row">
              <span className="temp-stat max">
                <ArrowUp size={14} /> {formatTemperature(data.tempMax, unit)}
              </span>
              <span className="temp-stat min">
                <ArrowDown size={14} /> {formatTemperature(data.tempMin, unit)}
              </span>
            </div>
          </div>
        </div>

        <div className="condition-pill">
          <Sparkles size={14} className="sparkle-icon" />
          <span>{data.condition}</span>
        </div>
      </div>

      {/* Atmospheric Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap blue">
            <Droplets size={18} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Humidity</span>
            <span className="metric-value">{data.humidity}%</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap teal">
            <Wind size={18} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Wind Speed</span>
            <span className="metric-value">{data.windSpeed} km/h</span>
            <span className="metric-sub">{data.windDirection}</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap purple">
            <Gauge size={18} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Pressure</span>
            <span className="metric-value">{data.pressure} hPa</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap emerald">
            <Eye size={18} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Visibility</span>
            <span className="metric-value">{data.visibility} km</span>
          </div>
        </div>
      </div>

      {/* Sunrise & Sunset Footer */}
      <div className="weather-card-footer">
        <div className="solar-time">
          <Sunrise size={16} className="solar-icon sunrise" />
          <span>Sunrise: <strong>{data.sunrise}</strong></span>
        </div>
        <div className="solar-divider"></div>
        <div className="solar-time">
          <Sunset size={16} className="solar-icon sunset" />
          <span>Sunset: <strong>{data.sunset}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;
