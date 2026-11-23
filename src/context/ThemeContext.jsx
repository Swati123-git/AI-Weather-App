import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import { getFromLocalStorage, saveToLocalStorage, getWeatherBackgroundClass } from '../utils/helpers';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return getFromLocalStorage(STORAGE_KEYS.THEME, 'dark');
  });

  const [weatherCondition, setWeatherCondition] = useState('Clear');

  useEffect(() => {
    // Apply theme attribute to html and body
    document.documentElement.setAttribute('data-theme', theme);
    saveToLocalStorage(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const weatherBgClass = getWeatherBackgroundClass(weatherCondition);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        weatherCondition,
        setWeatherCondition,
        weatherBgClass
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
