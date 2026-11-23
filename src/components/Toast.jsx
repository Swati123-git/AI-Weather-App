import React from 'react';
import { useAlerts } from '../context/AlertContext';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const Toast = () => {
  const { toasts, dismissToast } = useAlerts();

  if (!toasts || toasts.length === 0) return null;

  const getIcon = (severity) => {
    switch (severity) {
      case 'Critical':
        return <AlertCircle className="toast-icon crit" size={20} />;
      case 'High':
      case 'Medium':
        return <AlertTriangle className="toast-icon warn" size={20} />;
      case 'Low':
      case 'success':
        return <CheckCircle className="toast-icon success" size={20} />;
      default:
        return <Info className="toast-icon info" size={20} />;
    }
  };

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-card toast-${toast.severity?.toLowerCase()}`}>
          <div className="toast-header">
            <div className="toast-title-wrap">
              {getIcon(toast.severity)}
              <span className="toast-title">{toast.title}</span>
            </div>
            <button
              className="toast-close-btn"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
          {toast.message && <div className="toast-body">{toast.message}</div>}
          <div className="toast-time">{toast.timestamp}</div>
        </div>
      ))}
    </div>
  );
};

export default Toast;
