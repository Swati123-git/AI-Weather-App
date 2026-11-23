import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchWeather,
  fetchForecast,
  fetchPrediction,
  fetchHistory
} from '../services/api';
import { useTheme } from './ThemeContext';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/constants';
import { getFromLocalStorage, saveToLocalStorage } from '../utils/helpers';

const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const { setWeatherCondition } = useTheme();

  // Load default city from saved settings or fallback to 'New York'
  const savedSettings = getFromLocalStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const initialCity = savedSettings.defaultCity || 'New York';

  const [city, setCityState] = useState(initialCity);
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingMock, setIsUsingMock] = useState(false);

  // Recent Searches
  const [recentSearches, setRecentSearches] = useState(() => {
    return getFromLocalStorage(STORAGE_KEYS.RECENT_SEARCHES, [
      'New York',
      'London',
      'Tokyo',
      'Mumbai'
    ]);
  });

  // Add city to recent searches
  const addRecentSearch = useCallback((cityName) => {
    if (!cityName) return;
    const formatted = cityName.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== formatted.toLowerCase());
      const updated = [formatted, ...filtered].slice(0, 8); // max 8 items
      saveToLocalStorage(STORAGE_KEYS.RECENT_SEARCHES, updated);
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveToLocalStorage(STORAGE_KEYS.RECENT_SEARCHES, []);
  }, []);

  // Fetch all weather related endpoints for the target city
  const loadCityData = useCallback(async (cityName) => {
    if (!cityName) return;
    setLoading(true);
    setError(null);

    try {
      const [weatherRes, forecastRes, predictRes, historyRes] = await Promise.all([
        fetchWeather(cityName),
        fetchForecast(cityName),
        fetchPrediction(cityName),
        fetchHistory(cityName)
      ]);

      setWeatherData(weatherRes.data);
      setForecastData(forecastRes.data);
      setPredictionData(predictRes.data);
      setHistoryData(historyRes.data);

      // Track if fallback mock is active
      setIsUsingMock(weatherRes.isMock || forecastRes.isMock || predictRes.isMock);

      // Dynamically update weather condition for reactive styling / dynamic background
      if (weatherRes.data?.condition) {
        setWeatherCondition(weatherRes.data.condition);
      }

      addRecentSearch(cityName);
    } catch (err) {
      console.error('Failed to load city weather bundle:', err);
      setError('Unable to retrieve weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setWeatherCondition, addRecentSearch]);

  // Set city & load
  const setCity = useCallback((newCity) => {
    if (!newCity || newCity.trim().toLowerCase() === city.toLowerCase()) return;
    setCityState(newCity.trim());
  }, [city]);

  // Trigger data load when city changes
  useEffect(() => {
    loadCityData(city);
  }, [city, loadCityData]);

  // Use My Location action using browser Geolocation API
  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Attempt reverse geocoding via free Open-Meteo or Nominatim lookup
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (geoRes.ok) {
            const data = await geoRes.json();
            const detectedCity =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.state ||
              'Current Location';
            
            setCityState(detectedCity);
          } else {
            setCityState('San Francisco');
          }
        } catch {
          // In case reverse lookup blocked by network or offline
          setCityState('San Francisco');
        }
      },
      (geoError) => {
        console.warn('Geolocation denied or unavailable:', geoError.message);
        // Default to London or current
        setLoading(false);
      },
      { timeout: 7000 }
    );
  }, []);

  return (
    <WeatherContext.Provider
      value={{
        city,
        setCity,
        weatherData,
        forecastData,
        predictionData,
        historyData,
        loading,
        error,
        isUsingMock,
        recentSearches,
        clearRecentSearches,
        refreshWeather: () => loadCityData(city),
        useCurrentLocation
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};
