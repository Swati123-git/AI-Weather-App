import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Bell,
  Menu,
  CloudLightning,
  Activity,
  CheckCircle2,
  Database
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAlerts } from '../context/AlertContext';
import { useWeather } from '../context/WeatherContext';
import SearchBar from './SearchBar';

const Navbar = ({ onToggleSidebar }) => {
  const { isDark, toggleTheme } = useTheme();
  const { unreadCount, alerts } = useAlerts();
  const { isUsingMock } = useWeather();
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>

        {/* Brand identity */}
        <Link to="/" className="brand-logo">
          <div className="brand-icon-wrap">
            <CloudLightning size={22} className="brand-icon" />
            <span className="pulse-dot"></span>
          </div>
          <div className="brand-text">
            <span className="brand-name">AeroPulse AI</span>
            <span className="brand-sub">Weather & Alerts</span>
          </div>
        </Link>
      </div>

      {/* Center Search Bar */}
      <div className="navbar-center">
        <SearchBar className="navbar-search" />
      </div>

      {/* Right Controls */}
      <div className="navbar-right">
        {/* Backend / Mock Status Indicator */}
        <div
          className={`status-pill ${isUsingMock ? 'status-mock' : 'status-live'}`}
          title={
            isUsingMock
              ? 'Backend API not detected. Operating in High-Fidelity Mock Mode.'
              : 'Connected to Live Weather Backend Service'
          }
        >
          {isUsingMock ? (
            <>
              <Database size={13} />
              <span className="status-label">Mock Mode</span>
            </>
          ) : (
            <>
              <Activity size={13} className="live-icon-spin" />
              <span className="status-label">Backend Live</span>
            </>
          )}
        </div>

        {/* Alerts Bell Button & Dropdown */}
        <div className="notification-bell-wrap">
          <button
            type="button"
            className="navbar-icon-btn bell-btn"
            onClick={() => setShowBellDropdown((prev) => !prev)}
            aria-label="View notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="unread-counter-badge">{unreadCount}</span>
            )}
          </button>

          {showBellDropdown && (
            <div className="bell-dropdown glass-panel">
              <div className="bell-dropdown-header">
                <span className="bell-heading">Active Alerts</span>
                <span className="bell-count-pill">{unreadCount} Unread</span>
              </div>
              <div className="bell-items-list">
                {alerts && alerts.length > 0 ? (
                  alerts.slice(0, 4).map((alt) => (
                    <div
                      key={alt.id}
                      className={`bell-alert-item severity-${alt.severity.toLowerCase()}`}
                      onClick={() => {
                        setShowBellDropdown(false);
                        navigate('/alerts');
                      }}
                    >
                      <div className="bell-alert-row">
                        <span className={`mini-badge badge-${alt.severity.toLowerCase()}`}>
                          {alt.severity}
                        </span>
                        <span className="bell-alert-city">{alt.city}</span>
                      </div>
                      <p className="bell-alert-title">{alt.title}</p>
                    </div>
                  ))
                ) : (
                  <div className="bell-empty">
                    <CheckCircle2 size={24} className="text-emerald" />
                    <p>No active atmospheric warnings</p>
                  </div>
                )}
              </div>
              <div className="bell-dropdown-footer">
                <Link
                  to="/alerts"
                  className="view-all-alerts-link"
                  onClick={() => setShowBellDropdown(false)}
                >
                  View All Alerts Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          type="button"
          className="navbar-icon-btn theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle color theme"
        >
          {isDark ? (
            <Sun size={20} className="theme-icon sun" />
          ) : (
            <Moon size={20} className="theme-icon moon" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
