import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchAlerts } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import { getFromLocalStorage, saveToLocalStorage } from '../utils/helpers';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [readAlertIds, setReadAlertIds] = useState(() => {
    return new Set(getFromLocalStorage(STORAGE_KEYS.READ_ALERTS, ['alt-003', 'alt-004', 'alt-005']));
  });
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const knownAlertIdsRef = useRef(new Set());

  // Function to add a floating toast notification
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = {
      id,
      title: toast.title || 'System Notification',
      message: toast.message || '',
      severity: toast.severity || 'info', // 'Critical', 'High', 'Medium', 'Low', 'info', 'success'
      duration: toast.duration || 6000,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep max 5 toasts

    // Auto dismiss
    if (newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
  }, [dismissToast]);

  // Fetch alerts from API / Mock
  const loadAlerts = useCallback(async (isInitial = false) => {
    try {
      const response = await fetchAlerts();
      const rawAlerts = response.data || [];

      // Check for newly arrived critical alerts to trigger toast pop-ups
      if (!isInitial) {
        rawAlerts.forEach((alert) => {
          if (
            alert.severity === 'Critical' &&
            !knownAlertIdsRef.current.has(alert.id) &&
            !readAlertIds.has(alert.id)
          ) {
            addToast({
              title: `⚠️ CRITICAL WEATHER ALERT: ${alert.city}`,
              message: alert.title,
              severity: 'Critical',
              duration: 8000
            });
          }
        });
      }

      // Update known IDs ref
      rawAlerts.forEach((a) => knownAlertIdsRef.current.add(a.id));

      setAlerts(rawAlerts);
    } catch (err) {
      console.error('Failed to load weather alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [addToast, readAlertIds]);

  // Initial load
  useEffect(() => {
    loadAlerts(true);
  }, [loadAlerts]);

  // Auto-refresh every 60 seconds (as requested in spec)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[Alerts] Auto-refreshing alerts (60s cycle)...');
      loadAlerts(false);
    }, 60000);

    return () => clearInterval(interval);
  }, [loadAlerts]);

  // Mark single alert as read
  const markAsRead = useCallback((alertId) => {
    setReadAlertIds((prev) => {
      const updated = new Set(prev);
      updated.add(alertId);
      saveToLocalStorage(STORAGE_KEYS.READ_ALERTS, Array.from(updated));
      return updated;
    });
  }, []);

  // Mark all alerts as read
  const markAllAsRead = useCallback(() => {
    const allIds = alerts.map((a) => a.id);
    const updated = new Set(allIds);
    setReadAlertIds(updated);
    saveToLocalStorage(STORAGE_KEYS.READ_ALERTS, Array.from(updated));
    addToast({
      title: 'Alerts Updated',
      message: 'All active notifications marked as read',
      severity: 'Low',
      duration: 3500
    });
  }, [alerts, addToast]);

  // Trigger a test critical alert (super handy for user demo/testing)
  const triggerTestAlert = useCallback(() => {
    const newId = `alt-${Date.now()}`;
    const cities = ['New York', 'Tokyo', 'London', 'Mumbai', 'Paris'];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];

    const testAlert = {
      id: newId,
      city: randomCity,
      title: `Extreme Flash Flood & Convective Storm Warning for ${randomCity}`,
      severity: 'Critical',
      category: 'Severe Storm',
      timestamp: new Date().toISOString(),
      coordinates: { lat: 40.7128 + (Math.random() - 0.5) * 5, lon: -74.0060 + (Math.random() - 0.5) * 5 },
      aiExplanation: 'Deep predictive model detected rapid mesoscale vortex intensification with estimated rain rates over 65mm/hr in urban sectors.',
      safetyTips: [
        'Seek high ground immediately if in low-lying zones.',
        'Avoid driving through water of unknown depth.',
        'Charge backup devices and prepare emergency supply kits.'
      ],
      isRead: false
    };

    setAlerts((prev) => [testAlert, ...prev]);
    knownAlertIdsRef.current.add(newId);

    // Trigger toast pop-up
    addToast({
      title: `⚠️ NEW CRITICAL ALERT: ${randomCity}`,
      message: testAlert.title,
      severity: 'Critical',
      duration: 9000
    });
  }, [addToast]);

  // Calculate unread count
  const unreadCount = alerts.filter((a) => !readAlertIds.has(a.id)).length;

  // Filtered alerts
  const filteredAlerts = alerts.filter((alert) => {
    const isRead = readAlertIds.has(alert.id);
    
    // Severity filter
    if (severityFilter !== 'All' && alert.severity !== severityFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'Unread' && isRead) return false;
    if (statusFilter === 'Read' && !isRead) return false;

    return true;
  });

  return (
    <AlertContext.Provider
      value={{
        alerts,
        filteredAlerts,
        unreadCount,
        readAlertIds,
        loading,
        toasts,
        addToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        refreshAlerts: () => loadAlerts(false),
        triggerTestAlert,
        severityFilter,
        setSeverityFilter,
        statusFilter,
        setStatusFilter
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
