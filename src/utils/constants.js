/**
 * Application Constants
 */

export const SEVERITY_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

export const SEVERITY_COLORS = {
  Low: {
    bg: 'var(--color-low-bg)',
    text: 'var(--color-low-text)',
    border: 'var(--color-low-border)',
    badge: '#10b981' // Green
  },
  Medium: {
    bg: 'var(--color-med-bg)',
    text: 'var(--color-med-text)',
    border: 'var(--color-med-border)',
    badge: '#f59e0b' // Yellow
  },
  High: {
    bg: 'var(--color-high-bg)',
    text: 'var(--color-high-text)',
    border: 'var(--color-high-border)',
    badge: '#f97316' // Orange
  },
  Critical: {
    bg: 'var(--color-crit-bg)',
    text: 'var(--color-crit-text)',
    border: 'var(--color-crit-border)',
    badge: '#ef4444' // Red
  }
};

export const WEATHER_CONDITIONS = {
  CLEAR: 'Clear',
  SUNNY: 'Sunny',
  CLOUDY: 'Cloudy',
  PARTLY_CLOUDY: 'Partly Cloudy',
  RAINY: 'Rainy',
  HEAVY_RAIN: 'Heavy Rain',
  THUNDERSTORM: 'Thunderstorm',
  SNOWY: 'Snowy',
  MIST: 'Mist',
  HAZE: 'Haze'
};

export const DEFAULT_CITIES = [
  'New York',
  'London',
  'Tokyo',
  'Paris',
  'Mumbai',
  'Sydney',
  'San Francisco',
  'Berlin',
  'Singapore',
  'Dubai',
  'Lucknow',
  'Los Angeles',
  'Chicago',
  'Toronto',
  'Seoul',
  'Beijing',
  'Shanghai',
  'Cairo',
  'Istanbul',
  'São Paulo',
  'Mexico City',
  'Buenos Aires',
  'Amsterdam',
  'Barcelona',
  'Rome',
  'Moscow',
  'Bangkok',
  'Jakarta',
  'Karachi',
  'Lagos'
];

export const DEFAULT_SETTINGS = {
  defaultCity: 'New York',
  alertTypes: {
    rainAndFloods: true,
    thunderstorms: true,
    extremeHeat: true,
    highWinds: true,
    poorAirQuality: false
  },
  severityThreshold: 'Medium',
  notificationMethods: {
    browser: true,
    email: false,
    sms: false
  },
  emailAddress: '',
  phoneNumber: '',
  temperatureUnit: 'Celsius', // Celsius or Fahrenheit
  autoRefreshInterval: 60 // seconds
};

export const STORAGE_KEYS = {
  THEME: 'ai_weather_theme',
  SETTINGS: 'ai_weather_settings',
  RECENT_SEARCHES: 'ai_weather_recent_searches',
  READ_ALERTS: 'ai_weather_read_alerts',
  CUSTOM_ALERTS: 'ai_weather_custom_alerts'
};
