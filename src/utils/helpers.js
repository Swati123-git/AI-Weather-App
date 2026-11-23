/**
 * Helper utility functions
 */

export const formatTemperature = (temp, unit = 'Celsius') => {
  if (temp === undefined || temp === null) return '--';
  if (unit === 'Fahrenheit') {
    const fahrenheit = (temp * 9) / 5 + 32;
    return `${Math.round(fahrenheit)}°F`;
  }
  return `${Math.round(temp)}°C`;
};

export const getAQIDescription = (aqi) => {
  if (aqi <= 50) return { label: 'Good', color: '#10b981', advice: 'Air quality is satisfactory and poses little to no risk.' };
  if (aqi <= 100) return { label: 'Moderate', color: '#eab308', advice: 'Acceptable; sensitive individuals may experience minor symptoms.' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#f97316', advice: 'Members of sensitive groups may experience health effects.' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#ef4444', advice: 'Everyone may begin to experience health effects.' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: '#8b5cf6', advice: 'Health alert: risk of health effects increased for everyone.' };
  return { label: 'Hazardous', color: '#7f1d1d', advice: 'Health warning of emergency conditions. Remain indoors.' };
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

export const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

export const getWeatherBackgroundClass = (condition) => {
  if (!condition) return 'weather-clear';
  const cond = condition.toLowerCase();
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) return 'weather-rain';
  if (cond.includes('thunder') || cond.includes('storm')) return 'weather-thunderstorm';
  if (cond.includes('snow') || cond.includes('ice') || cond.includes('blizzard') || cond.includes('flurry')) return 'weather-snow';
  if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('fog') || cond.includes('mist') || cond.includes('haze')) return 'weather-cloudy';
  return 'weather-clear';
};

export const getFromLocalStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Error reading ${key} from LocalStorage:`, error);
    return fallback;
  }
};

export const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to LocalStorage:`, error);
  }
};
