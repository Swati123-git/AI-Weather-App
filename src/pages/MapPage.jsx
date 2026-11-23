import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAlerts } from '../context/AlertContext';
import { useWeather } from '../context/WeatherContext';
import { CITY_COORDINATES } from '../mock/mockData';
import { SEVERITY_COLORS } from '../utils/constants';
import { formatDateTime } from '../utils/helpers';
import {
  Layers,
  MapPin,
  CloudRain,
  Thermometer,
  Sparkles
} from 'lucide-react';

// Custom MapController to smoothly re-center map when active city changes
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

// Create a high-tech pulsing divIcon based on alert severity
const createPulsingMarkerIcon = (severity = 'Medium') => {
  const color = SEVERITY_COLORS[severity]?.badge || '#3b82f6';
  const isCritical = severity === 'Critical';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="marker-pulse-wrapper">
        <div class="marker-ring ${isCritical ? 'marker-ring-crit' : ''}" style="border-color: ${color}; background-color: ${color}33;"></div>
        <div class="marker-core" style="background-color: ${color};">
          <span class="marker-dot"></span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};

const MAP_LAYERS = {
  standard: {
    name: 'CartoDB Dark',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a>'
  },
  dark: {
    name: 'Night Vision',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a>'
  },
  satellite: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }
};

const MapPage = () => {
  const { alerts } = useAlerts();
  const { city, setCity, weatherData } = useWeather();
  const [activeLayer, setActiveLayer] = useState('dark');
  const [activeWeatherOverlay, setActiveWeatherOverlay] = useState('radar'); // 'radar', 'temperature', 'none'

  // Map center from current active city coordinates
  const currentCoords = weatherData?.coordinates
    ? [weatherData.coordinates.lat, weatherData.coordinates.lon]
    : [40.7128, -74.0060];

  const [mapCenter, setMapCenter] = useState(currentCoords);

  useEffect(() => {
    if (weatherData?.coordinates) {
      setMapCenter([weatherData.coordinates.lat, weatherData.coordinates.lon]);
    }
  }, [weatherData]);

  const handleSelectCity = (cityName) => {
    setCity(cityName);
    const coords = CITY_COORDINATES[cityName];
    if (coords) {
      setMapCenter([coords.lat, coords.lon]);
    }
  };

  return (
    <div className="page-map">
      {/* Header Bar */}
      <div className="page-header map-page-header">
        <div>
          <h1 className="page-title">Interactive Geospatial Weather Radar</h1>
          <p className="page-subtitle">
            Geographic anomaly dispersion, active alert nodes & simulated precipitation thermal layers
          </p>
        </div>

        {/* Quick Map Controls */}
        <div className="map-toolbar">
          {/* Base Layer Switcher */}
          <div className="toolbar-pill-group">
            <span className="toolbar-label">
              <Layers size={14} /> Base:
            </span>
            {Object.entries(MAP_LAYERS).map(([key, config]) => (
              <button
                key={key}
                type="button"
                className={`layer-btn ${activeLayer === key ? 'active' : ''}`}
                onClick={() => setActiveLayer(key)}
              >
                {config.name}
              </button>
            ))}
          </div>

          {/* Weather Overlay Switcher */}
          <div className="toolbar-pill-group">
            <span className="toolbar-label">Overlay:</span>
            <button
              type="button"
              className={`layer-btn ${activeWeatherOverlay === 'radar' ? 'active' : ''}`}
              onClick={() => setActiveWeatherOverlay((prev) => (prev === 'radar' ? 'none' : 'radar'))}
            >
              <CloudRain size={13} />
              <span>Rain Radar</span>
            </button>
            <button
              type="button"
              className={`layer-btn ${activeWeatherOverlay === 'temperature' ? 'active' : ''}`}
              onClick={() => setActiveWeatherOverlay((prev) => (prev === 'temperature' ? 'none' : 'temperature'))}
            >
              <Thermometer size={13} />
              <span>Temp Heatmap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick City Jump Bar */}
      <div className="map-quick-cities glass-panel">
        <span className="quick-cities-title">
          <MapPin size={14} /> Jump to Monitored Metropolises:
        </span>
        <div className="city-buttons-wrap">
          {Object.keys(CITY_COORDINATES).map((cityName) => (
            <button
              key={cityName}
              type="button"
              className={`quick-city-chip ${city === cityName ? 'active' : ''}`}
              onClick={() => handleSelectCity(cityName)}
            >
              {cityName}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="map-wrapper glass-panel">
        <MapContainer
          center={mapCenter}
          zoom={5}
          scrollWheelZoom={true}
          className="leaflet-interactive-map"
        >
          <MapController center={mapCenter} zoom={6} />

          {/* Base Map Tile Layer */}
          <TileLayer
            attribution={MAP_LAYERS[activeLayer].attribution}
            url={MAP_LAYERS[activeLayer].url}
          />

          {/* Simulated Rain Radar Overlay Tiles */}
          {activeWeatherOverlay === 'radar' && (
            <TileLayer
              attribution="RainViewer.com"
              url="https://tilecache.rainviewer.com/v2/radar/nowcast_0/256/{z}/{x}/{y}/2/1_1.png"
              opacity={0.65}
              zIndex={500}
            />
          )}

          {/* Simulated Temperature Thermal Overlay */}
          {activeWeatherOverlay === 'temperature' && (
            <div className="temperature-overlay-simulation" aria-hidden="true" />
          )}

          {/* Alert Markers */}
          {alerts &&
            alerts.map((alert) => {
              const coords = alert.coordinates || CITY_COORDINATES[alert.city] || { lat: 40.7128, lon: -74.006 };
              const icon = createPulsingMarkerIcon(alert.severity);

              return (
                <Marker
                  key={alert.id}
                  position={[coords.lat, coords.lon]}
                  icon={icon}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="popup-content">
                      <div className="popup-top">
                        <span className={`popup-severity badge-${alert.severity?.toLowerCase()}`}>
                          {alert.severity} Severity
                        </span>
                        <span className="popup-city">{alert.city}</span>
                      </div>
                      <h4 className="popup-title">{alert.title}</h4>
                      <p className="popup-time">{formatDateTime(alert.timestamp)}</p>

                      {alert.aiExplanation && (
                        <div className="popup-explanation">
                          <Sparkles size={12} className="ai-icon" />
                          <p>{alert.aiExplanation}</p>
                        </div>
                      )}

                      {alert.safetyTips && alert.safetyTips.length > 0 && (
                        <div className="popup-tip">
                          <strong>Safety Action:</strong> {alert.safetyTips[0]}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>

        {/* Floating Map Legend */}
        <div className="map-legend glass-panel">
          <span className="legend-title">Hazard Severity Index</span>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-bullet crit"></span>
              <span>Critical</span>
            </div>
            <div className="legend-item">
              <span className="legend-bullet high"></span>
              <span>High</span>
            </div>
            <div className="legend-item">
              <span className="legend-bullet med"></span>
              <span>Medium</span>
            </div>
            <div className="legend-item">
              <span className="legend-bullet low"></span>
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
