import React, { useState } from 'react';
import { useWeather } from '../context/WeatherContext';
import ForecastChart from '../components/ForecastChart';
import { ChartSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import {
  CalendarDays,
  CloudRain,
  Sun,
  Cloud,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  SunMedium
} from 'lucide-react';
import { formatTemperature } from '../utils/helpers';

const getDayWeatherIcon = (condition, size = 28) => {
  if (!condition) return <Sun size={size} className="weather-icon-sun" />;
  const cond = condition.toLowerCase();
  if (cond.includes('rain')) return <CloudRain size={size} className="weather-icon-rain" />;
  if (cond.includes('thunder')) return <CloudLightning size={size} className="weather-icon-storm" />;
  if (cond.includes('snow')) return <Snowflake size={size} className="weather-icon-snow" />;
  if (cond.includes('cloud')) return <Cloud size={size} className="weather-icon-cloud" />;
  return <Sun size={size} className="weather-icon-sun" />;
};

const ForecastPage = () => {
  const { city, forecastData, loading } = useWeather();
  const [expandedDay, setExpandedDay] = useState(null);

  const toggleExpand = (index) => {
    setExpandedDay((prev) => (prev === index ? null : index));
  };

  const hourly = forecastData?.hourly || [];
  const daily = forecastData?.daily || [];

  return (
    <div className="page-forecast">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Atmospheric Forecast <span className="city-pill">{city}</span>
          </h1>
          <p className="page-subtitle">
            High-precision 24-hour sensor timeline & 5-day predictive synoptic outlook
          </p>
        </div>
      </div>

      {/* 24-Hour Interactive Recharts Chart */}
      <div className="forecast-chart-section">
        {loading && !forecastData ? (
          <ChartSkeleton height="320px" />
        ) : (
          <ForecastChart data={hourly} />
        )}
      </div>

      {/* 5-Day Forecast Cards Section */}
      <div className="five-day-section">
        <div className="section-title-wrap">
          <CalendarDays size={20} className="section-icon" />
          <h2 className="section-heading">5-Day Meteorological Outlook</h2>
        </div>

        {loading && !forecastData ? (
          <div className="five-day-grid">
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} height="180px" />
            ))}
          </div>
        ) : (
          <div className="five-day-grid">
            {daily.map((item, idx) => {
              const isExpanded = expandedDay === idx;
              return (
                <div
                  key={idx}
                  className={`day-card glass-panel ${isExpanded ? 'day-card-expanded' : ''}`}
                >
                  <div className="day-card-header">
                    <div className="day-name-wrap">
                      <h3 className="day-title">{item.day}</h3>
                      <span className="day-date">{item.date}</span>
                    </div>
                    <div className="day-icon-wrap">
                      {getDayWeatherIcon(item.condition, 32)}
                    </div>
                  </div>

                  <div className="day-condition-label">{item.condition}</div>

                  {/* Temp High / Low Row */}
                  <div className="day-temp-row">
                    <div className="temp-badge max">
                      <ArrowUp size={14} />
                      <span>{formatTemperature(item.tempMax)}</span>
                    </div>
                    <div className="temp-badge min">
                      <ArrowDown size={14} />
                      <span>{formatTemperature(item.tempMin)}</span>
                    </div>
                  </div>

                  {/* Key Highlights */}
                  <div className="day-stats-row">
                    <div className="stat-pill" title="Precipitation chance">
                      <CloudRain size={13} className="text-cyan" />
                      <span>{item.rainChance}% Rain</span>
                    </div>
                    <div className="stat-pill" title="Wind speed">
                      <Wind size={13} className="text-emerald" />
                      <span>{item.windSpeed} km/h</span>
                    </div>
                  </div>

                  {/* Expand / Details Toggle Button */}
                  <button
                    type="button"
                    className="day-expand-toggle"
                    onClick={() => toggleExpand(idx)}
                    aria-expanded={isExpanded}
                  >
                    <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  {/* Expanded Synoptic Details */}
                  {isExpanded && (
                    <div className="day-expanded-content">
                      <p className="day-synopsis">{item.description}</p>
                      <div className="expanded-metrics">
                        <div className="expanded-metric">
                          <Droplets size={14} className="text-purple" />
                          <span>Humidity: <strong>{item.humidity}%</strong></span>
                        </div>
                        <div className="expanded-metric">
                          <SunMedium size={14} className="text-amber" />
                          <span>UV Index: <strong>{item.uvIndex} (Moderate)</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForecastPage;
