import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  AlertTriangle,
  Map,
  History,
  Settings,
  X,
  CloudSun
} from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import { useWeather } from '../context/WeatherContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/forecast', label: 'Forecast', icon: CalendarDays },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle, hasBadge: true },
  { path: '/map', label: 'Weather Map', icon: Map },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings }
];

const Sidebar = ({ isOpen, onClose }) => {
  const { unreadCount } = useAlerts();
  const { city, weatherData } = useWeather();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand-mobile">
            <span className="brand-title">Navigation</span>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close navigation sidebar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="nav-item">
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'nav-link-active' : ''}`
                    }
                    onClick={() => {
                      if (window.innerWidth <= 1024) onClose();
                    }}
                  >
                    <Icon size={19} className="nav-icon" />
                    <span className="nav-text">{item.label}</span>

                    {/* Unread Alerts Badge */}
                    {item.hasBadge && unreadCount > 0 && (
                      <span className="sidebar-badge">{unreadCount}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Current City Quick Card */}
        {weatherData && (
          <div className="sidebar-city-widget glass-panel">
            <div className="widget-header">
              <CloudSun size={16} className="widget-icon" />
              <span className="widget-city">{city}</span>
            </div>
            <div className="widget-body">
              <span className="widget-temp">{Math.round(weatherData.temperature)}°C</span>
              <span className="widget-condition">{weatherData.condition}</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
