import axios from 'axios';
import {
  getMockWeather,
  getMockForecast,
  getMockPrediction,
  MOCK_ALERTS,
  getMockHistory
} from '../mock/mockData';
import { getFromLocalStorage, saveToLocalStorage } from '../utils/helpers';
import { STORAGE_KEYS, DEFAULT_CITIES } from '../utils/constants';

// Configurable Base URL from .env (Vite uses import.meta.env)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let isBackendLive = false;

export const getBackendLiveStatus = () => isBackendLive;

/**
 * Check if the backend server is reachable
 */
export const checkBackendHealth = async () => {
  try {
    await apiClient.get('/api/health');
    isBackendLive = true;
    return true;
  } catch {
    isBackendLive = false;
    return false;
  }
};

/**
 * 1. GET /api/weather?city=
 * Fetches current weather for a specific city. Falls back to mock data if backend is offline.
 */
export const fetchWeather = async (city = 'New York') => {
  try {
    const response = await apiClient.get('/api/weather', {
      params: { city }
    });
    isBackendLive = true;
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn(`[API] Backend unavailable at ${BASE_URL}/api/weather?city=${city}. Using mock weather data.`, error?.message);
    const mock = getMockWeather(city);
    return { data: mock, isMock: true };
  }
};

/**
 * 2. GET /api/forecast?city=
 * Fetches hourly (24-hour) and 5-day forecast. Falls back to mock data if backend is offline.
 */
export const fetchForecast = async (city = 'New York') => {
  try {
    const response = await apiClient.get('/api/forecast', {
      params: { city }
    });
    isBackendLive = true;
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn(`[API] Backend unavailable at ${BASE_URL}/api/forecast?city=${city}. Using mock forecast data.`, error?.message);
    const mock = getMockForecast(city);
    return { data: mock, isMock: true };
  }
};

/**
 * 3. GET /api/predict?city=
 * Fetches AI-based rain & temperature predictions with confidence %. Falls back to mock data.
 */
export const fetchPrediction = async (city = 'New York') => {
  try {
    const response = await apiClient.get('/api/predict', {
      params: { city }
    });
    isBackendLive = true;
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn(`[API] Backend unavailable at ${BASE_URL}/api/predict?city=${city}. Using mock AI prediction data.`, error?.message);
    const mock = getMockPrediction(city);
    return { data: mock, isMock: true };
  }
};

/**
 * 4. GET /api/alerts
 * Fetches list of active weather alerts with severity, AI diagnostics, and safety tips.
 */
export const fetchAlerts = async () => {
  try {
    const response = await apiClient.get('/api/alerts');
    isBackendLive = true;
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn(`[API] Backend unavailable at ${BASE_URL}/api/alerts. Using mock alerts data.`, error?.message);
    // Combine mock alerts with any custom alerts saved in localStorage
    const customAlerts = getFromLocalStorage(STORAGE_KEYS.CUSTOM_ALERTS, []);
    const merged = [...customAlerts, ...MOCK_ALERTS];
    return { data: merged, isMock: true };
  }
};

/**
 * 5. POST /api/settings
 * Saves alert preferences (types, threshold, notification methods).
 */
export const saveSettingsApi = async (settings) => {
  try {
    const response = await apiClient.post('/api/settings', settings);
    isBackendLive = true;
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
    return { success: true, data: response.data, isMock: false };
  } catch (error) {
    console.warn(`[API] Backend unavailable at ${BASE_URL}/api/settings. Persisting settings locally in browser.`, error?.message);
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
    return {
      success: true,
      data: { message: 'Settings saved locally (Backend offline fallback)', settings },
      isMock: true
    };
  }
};

/**
 * 6. GET /api/history?city=
 * Fetches historical temperature, rainfall, and weekly alerts data for charts.
 */
export const fetchHistory = async (city = 'New York') => {
  try {
    const response = await apiClient.get('/api/history', {
      params: { city }
    });
    isBackendLive = true;
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn(`[API] Backend unavailable at ${BASE_URL}/api/history?city=${city}. Using mock history data.`, error?.message);
    const mock = getMockHistory(city);
    return { data: mock, isMock: true };
  }
};

/**
 * 7. GET /api/cities/search?q=<query>
 * Live city name autocomplete powered by Open-Meteo Geocoding + fallback registry.
 */
export const searchCities = async (query, limit = 8) => {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await apiClient.get('/api/cities/search', {
      params: { q: query.trim(), limit }
    });
    return response.data || [];
  } catch {
    // Offline: filter DEFAULT_CITIES client-side
    return DEFAULT_CITIES
      .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
      .map((name) => ({ name, country: '' }));
  }
};

export default {
  fetchWeather,
  fetchForecast,
  fetchPrediction,
  fetchAlerts,
  saveSettings: saveSettingsApi,
  fetchHistory,
  checkBackendHealth,
  getBackendLiveStatus,
  searchCities
};
