import React, { useState } from 'react';
import { saveSettingsApi } from '../services/api';
import { useAlerts } from '../context/AlertContext';
import { useWeather } from '../context/WeatherContext';
import { DEFAULT_SETTINGS, STORAGE_KEYS, SEVERITY_LEVELS } from '../utils/constants';
import { getFromLocalStorage, saveToLocalStorage } from '../utils/helpers';
import {
  Bell,
  Sliders,
  Mail,
  Smartphone,
  Globe,
  Save,
  RotateCcw,
  CheckCircle2,
  Shield,
  Trash2
} from 'lucide-react';

const SettingsPage = () => {
  const { addToast } = useAlerts();
  const { setCity, clearRecentSearches } = useWeather();

  const [settings, setSettings] = useState(() => {
    return getFromLocalStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Validate inputs
  const validateForm = () => {
    const errs = {};

    if (!settings.defaultCity || settings.defaultCity.trim().length === 0) {
      errs.defaultCity = 'Default city cannot be empty.';
    }

    if (settings.notificationMethods.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!settings.emailAddress || !emailRegex.test(settings.emailAddress)) {
        errs.emailAddress = 'Please enter a valid email address.';
      }
    }

    if (settings.notificationMethods.sms) {
      const phoneRegex = /^\+?[0-9\s-]{8,15}$/;
      if (!settings.phoneNumber || !phoneRegex.test(settings.phoneNumber)) {
        errs.phoneNumber = 'Please enter a valid phone number (e.g. +1 555-0199).';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAlertTypeChange = (key) => {
    setSettings((prev) => ({
      ...prev,
      alertTypes: {
        ...prev.alertTypes,
        [key]: !prev.alertTypes[key]
      }
    }));
  };

  const handleNotificationMethodChange = (method) => {
    setSettings((prev) => ({
      ...prev,
      notificationMethods: {
        ...prev.notificationMethods,
        [method]: !prev.notificationMethods[method]
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await saveSettingsApi(settings);
      saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);

      // Update current weather city to new default if changed
      if (settings.defaultCity) {
        setCity(settings.defaultCity);
      }

      setSaveSuccess(true);
      addToast({
        title: 'Settings Saved',
        message: res.isMock
          ? 'Preferences saved to browser storage (API offline fallback).'
          : 'Preferences synchronized with backend server.',
        severity: 'success',
        duration: 4000
      });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      addToast({
        title: 'Save Failed',
        message: 'Could not persist settings.',
        severity: 'Critical'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all alert settings to system defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      saveToLocalStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      setErrors({});
      addToast({
        title: 'Settings Reset',
        message: 'Alert preferences restored to default configuration.',
        severity: 'info'
      });
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all recent search queries and cached read states?')) {
      clearRecentSearches();
      saveToLocalStorage(STORAGE_KEYS.READ_ALERTS, []);
      addToast({
        title: 'Storage Cleared',
        message: 'Recent searches and read history reset.',
        severity: 'info'
      });
    }
  };

  return (
    <div className="page-settings">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Monitoring & Alert Configuration</h1>
          <p className="page-subtitle">
            Customize AI hazard thresholds, notification dispatch pipelines & location defaults
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="settings-form">
        {/* Section 1: Default City & Units */}
        <div className="settings-section glass-panel">
          <div className="section-header">
            <Globe className="section-icon text-blue" size={20} />
            <div>
              <h2 className="section-title">Telemetry Target & Region</h2>
              <p className="section-desc">Designate primary station city and display parameters</p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="defaultCity" className="form-label">
                Default Station City <span className="req">*</span>
              </label>
              <input
                id="defaultCity"
                type="text"
                className={`form-input ${errors.defaultCity ? 'input-error' : ''}`}
                value={settings.defaultCity}
                onChange={(e) => setSettings({ ...settings, defaultCity: e.target.value })}
                placeholder="e.g. New York, London, Tokyo"
              />
              {errors.defaultCity && <span className="error-text">{errors.defaultCity}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="tempUnit" className="form-label">
                Temperature Metric Unit
              </label>
              <select
                id="tempUnit"
                className="form-select"
                value={settings.temperatureUnit || 'Celsius'}
                onChange={(e) => setSettings({ ...settings, temperatureUnit: e.target.value })}
              >
                <option value="Celsius">Celsius (°C)</option>
                <option value="Fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Alert Types */}
        <div className="settings-section glass-panel">
          <div className="section-header">
            <Sliders className="section-icon text-cyan" size={20} />
            <div>
              <h2 className="section-title">Hazard Detection Classifications</h2>
              <p className="section-desc">Select which atmospheric anomalies should trigger push advisories</p>
            </div>
          </div>

          <div className="checkboxes-grid">
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={settings.alertTypes.rainAndFloods}
                onChange={() => handleAlertTypeChange('rainAndFloods')}
              />
              <div className="checkbox-info">
                <span className="checkbox-title">Severe Rain & Flash Flooding</span>
                <span className="checkbox-desc">Inundation watch, rapid runoff, torrential accumulation</span>
              </div>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={settings.alertTypes.thunderstorms}
                onChange={() => handleAlertTypeChange('thunderstorms')}
              />
              <div className="checkbox-info">
                <span className="checkbox-title">Convective Thunderstorms & Lightning</span>
                <span className="checkbox-desc">High-frequency cloud-to-ground discharges and localized squalls</span>
              </div>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={settings.alertTypes.extremeHeat}
                onChange={() => handleAlertTypeChange('extremeHeat')}
              />
              <div className="checkbox-info">
                <span className="checkbox-title">Extreme Heatwave & Solar Radiation</span>
                <span className="checkbox-desc">Thermal dome index exceeding safety thresholds</span>
              </div>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={settings.alertTypes.highWinds}
                onChange={() => handleAlertTypeChange('highWinds')}
              />
              <div className="checkbox-info">
                <span className="checkbox-title">High Gale & Tropical Squalls</span>
                <span className="checkbox-desc">Sustained gusts above 50 km/h and microburst hazards</span>
              </div>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={settings.alertTypes.poorAirQuality}
                onChange={() => handleAlertTypeChange('poorAirQuality')}
              />
              <div className="checkbox-info">
                <span className="checkbox-title">Hazardous Air Quality & Smog</span>
                <span className="checkbox-desc">Elevated PM2.5 / PM10 industrial particulate peaks</span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Severity Threshold */}
        <div className="settings-section glass-panel">
          <div className="section-header">
            <Shield className="section-icon text-amber" size={20} />
            <div>
              <h2 className="section-title">Trigger Severity Threshold</h2>
              <p className="section-desc">Suppress notifications below this risk classification</p>
            </div>
          </div>

          <div className="threshold-selector">
            {Object.values(SEVERITY_LEVELS).map((lvl) => {
              const isSelected = settings.severityThreshold === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  className={`threshold-btn threshold-${lvl.toLowerCase()} ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => setSettings({ ...settings, severityThreshold: lvl })}
                >
                  <span className="threshold-circle"></span>
                  <span className="threshold-name">{lvl}</span>
                  <span className="threshold-sub">
                    {lvl === 'Low' && 'All advisory notices'}
                    {lvl === 'Medium' && 'Moderate & higher'}
                    {lvl === 'High' && 'Significant danger'}
                    {lvl === 'Critical' && 'Life-safety emergency only'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Notification Dispatch Channels */}
        <div className="settings-section glass-panel">
          <div className="section-header">
            <Bell className="section-icon text-purple" size={20} />
            <div>
              <h2 className="section-title">Notification Channels & Delivery</h2>
              <p className="section-desc">Channels used to dispatch urgent weather advisories</p>
            </div>
          </div>

          <div className="channels-wrapper">
            {/* Browser Push */}
            <label className="channel-row">
              <div className="channel-info">
                <span className="channel-name">In-Browser Real-Time Toasts</span>
                <span className="channel-desc">Floating banners and audible alerts when active</span>
              </div>
              <input
                type="checkbox"
                className="channel-toggle"
                checked={settings.notificationMethods.browser}
                onChange={() => handleNotificationMethodChange('browser')}
              />
            </label>

            {/* Email Dispatch */}
            <div className="channel-block">
              <label className="channel-row">
                <div className="channel-info">
                  <span className="channel-name">Email Dispatch</span>
                  <span className="channel-desc">Receive formal meteorological incident briefs</span>
                </div>
                <input
                  type="checkbox"
                  className="channel-toggle"
                  checked={settings.notificationMethods.email}
                  onChange={() => handleNotificationMethodChange('email')}
                />
              </label>

              {settings.notificationMethods.email && (
                <div className="channel-sub-input">
                  <Mail size={16} className="input-inner-icon" />
                  <input
                    type="email"
                    className={`form-input sub-input ${errors.emailAddress ? 'input-error' : ''}`}
                    placeholder="Enter email address (e.g. meteorology@agency.org)"
                    value={settings.emailAddress || ''}
                    onChange={(e) => setSettings({ ...settings, emailAddress: e.target.value })}
                  />
                  {errors.emailAddress && (
                    <span className="error-text">{errors.emailAddress}</span>
                  )}
                </div>
              )}
            </div>

            {/* SMS Dispatch */}
            <div className="channel-block">
              <label className="channel-row">
                <div className="channel-info">
                  <span className="channel-name">SMS Telemetry Broadcast</span>
                  <span className="channel-desc">Immediate cellular text notifications for critical threats</span>
                </div>
                <input
                  type="checkbox"
                  className="channel-toggle"
                  checked={settings.notificationMethods.sms}
                  onChange={() => handleNotificationMethodChange('sms')}
                />
              </label>

              {settings.notificationMethods.sms && (
                <div className="channel-sub-input">
                  <Smartphone size={16} className="input-inner-icon" />
                  <input
                    type="tel"
                    className={`form-input sub-input ${errors.phoneNumber ? 'input-error' : ''}`}
                    placeholder="Enter cellular number (e.g. +1 555-0199)"
                    value={settings.phoneNumber || ''}
                    onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                  />
                  {errors.phoneNumber && (
                    <span className="error-text">{errors.phoneNumber}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions-footer">
          <div className="left-actions">
            <button
              type="button"
              className="action-btn-danger"
              onClick={handleClearHistory}
              title="Clear Local Storage cache"
            >
              <Trash2 size={16} />
              <span>Clear Local Cache</span>
            </button>
            <button
              type="button"
              className="action-btn-secondary"
              onClick={handleResetDefaults}
            >
              <RotateCcw size={16} />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="right-actions">
            {saveSuccess && (
              <span className="save-success-indicator">
                <CheckCircle2 size={16} className="text-emerald" /> Saved Successfully!
              </span>
            )}
            <button
              type="submit"
              className="action-btn-primary"
              disabled={isSaving}
            >
              <Save size={16} />
              <span>{isSaving ? 'Synchronizing...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
