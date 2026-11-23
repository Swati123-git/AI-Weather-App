import React from 'react';
import { useWeather } from '../context/WeatherContext';
import WeatherCard from '../components/WeatherCard';
import AQICard from '../components/AQICard';
import PredictionCard from '../components/PredictionCard';
import SearchBar from '../components/SearchBar';
import { CardSkeleton } from '../components/SkeletonLoader';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const {
    city,
    weatherData,
    predictionData,
    loading,
    error,
    refreshWeather
  } = useWeather();

  return (
    <div className="page-dashboard">
      {/* Top Banner Row */}
      <div className="dashboard-top-bar">
        <div className="title-area">
          <h1 className="page-title">
            AI Weather Dashboard <span className="city-pill">{city}</span>
          </h1>
          <p className="page-subtitle">
            Continuous meteorological sensor telemetry & machine learning atmospheric forecasting
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            type="button"
            className="action-btn-outline"
            onClick={refreshWeather}
            disabled={loading}
            title="Refresh weather data"
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* Embedded Search on Mobile/Dashboard */}
      <div className="dashboard-search-container">
        <SearchBar />
      </div>

      {/* Error Notice */}
      {error && (
        <div className="error-alert-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={refreshWeather} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Main Grid Content */}
      {loading && !weatherData ? (
        <div className="dashboard-grid">
          <CardSkeleton height="360px" />
          <CardSkeleton height="360px" />
          <CardSkeleton height="360px" />
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* 1. Current Weather Card */}
          <div className="grid-col-weather">
            <WeatherCard data={weatherData} />
          </div>

          {/* 2. AQI Card */}
          <div className="grid-col-aqi">
            <AQICard aqi={weatherData?.aqi} />
          </div>

          {/* 3. AI Prediction Card */}
          <div className="grid-col-prediction">
            <PredictionCard data={predictionData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
