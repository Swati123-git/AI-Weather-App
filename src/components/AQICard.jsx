import React from 'react';
import { Wind } from 'lucide-react';
import { getAQIDescription } from '../utils/helpers';

const AQICard = ({ aqi, className = '' }) => {
  if (!aqi) return null;

  const aqiInfo = getAQIDescription(aqi.value);

  // Calculate percentage for progress meter (0-300 scale)
  const percentage = Math.min(100, Math.round((aqi.value / 300) * 100));

  return (
    <div className={`aqi-card glass-panel ${className}`}>
      <div className="aqi-card-header">
        <div className="card-title-group">
          <Wind size={20} className="card-title-icon" />
          <h3 className="card-heading">Air Quality Index (AQI)</h3>
        </div>
        <span
          className="aqi-badge"
          style={{ backgroundColor: `${aqiInfo.color}22`, color: aqiInfo.color, borderColor: aqiInfo.color }}
        >
          {aqiInfo.label}
        </span>
      </div>

      <div className="aqi-main-row">
        <div className="aqi-value-box">
          <span className="aqi-number" style={{ color: aqiInfo.color }}>
            {aqi.value}
          </span>
          <span className="aqi-scale-max">/ 300 AQI</span>
        </div>

        <div className="aqi-status-text">
          <p className="aqi-advice">{aqiInfo.advice}</p>
        </div>
      </div>

      {/* Progress Bar Meter */}
      <div className="aqi-meter-wrapper">
        <div className="aqi-meter-track">
          <div
            className="aqi-meter-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: aqiInfo.color
            }}
          ></div>
        </div>
        <div className="aqi-meter-scale">
          <span>0 (Good)</span>
          <span>100 (Moderate)</span>
          <span>200+ (Hazardous)</span>
        </div>
      </div>

      {/* Detailed Pollutants Breakdown */}
      <div className="pollutants-grid">
        <div className="pollutant-item">
          <span className="pollutant-name">PM2.5</span>
          <span className="pollutant-value">{aqi.pm25} µg/m³</span>
        </div>
        <div className="pollutant-item">
          <span className="pollutant-name">PM10</span>
          <span className="pollutant-value">{aqi.pm10} µg/m³</span>
        </div>
        <div className="pollutant-item">
          <span className="pollutant-name">NO₂</span>
          <span className="pollutant-value">{aqi.no2} ppb</span>
        </div>
        <div className="pollutant-item">
          <span className="pollutant-name">O₃</span>
          <span className="pollutant-value">{aqi.o3} ppb</span>
        </div>
      </div>
    </div>
  );
};

export default AQICard;
