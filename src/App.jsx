import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AlertProvider } from './context/AlertContext';
import { WeatherProvider } from './context/WeatherContext';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

// Pages
import Dashboard from './pages/Dashboard';
import ForecastPage from './pages/ForecastPage';
import AlertsPage from './pages/AlertsPage';
import MapPage from './pages/MapPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { weatherBgClass } = useTheme();

  return (
    <div className={`app-shell ${weatherBgClass}`}>
      {/* Background Animated Weather Ambiance Overlay */}
      <div className="weather-ambiance-layer" aria-hidden="true"></div>

      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      {/* Main Layout Area */}
      <div className="layout-body">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Dynamic Route Content */}
        <main className="main-viewport">
          <div className="viewport-inner">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Global Floating Toast Notifications for Critical Alerts & Updates */}
      <Toast />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AlertProvider>
          <WeatherProvider>
            <AppLayout />
          </WeatherProvider>
        </AlertProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
