import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { formatDateTime } from '../utils/helpers';
import { SEVERITY_COLORS } from '../utils/constants';

const AlertCard = ({
  alert,
  isRead = false,
  onMarkAsRead,
  className = ''
}) => {
  if (!alert) return null;

  const {
    id,
    city,
    title,
    severity = 'Medium',
    category,
    timestamp,
    aiExplanation,
    safetyTips = []
  } = alert;

  const severityColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Medium;

  const getSeverityIcon = () => {
    switch (severity) {
      case 'Critical':
        return <AlertCircle size={18} className="severity-icon-critical" />;
      case 'High':
      case 'Medium':
        return <AlertTriangle size={18} className="severity-icon-warning" />;
      case 'Low':
      default:
        return <Info size={18} className="severity-icon-low" />;
    }
  };

  return (
    <div
      className={`alert-card glass-panel severity-${severity.toLowerCase()} ${
        isRead ? 'alert-read' : 'alert-unread'
      } ${className}`}
    >
      {/* Top Header Row */}
      <div className="alert-card-header">
        <div className="alert-meta-group">
          {/* Severity Badge */}
          <span
            className={`severity-badge badge-${severity.toLowerCase()}`}
            style={{ borderColor: severityColor.badge }}
          >
            {getSeverityIcon()}
            <span>{severity} Severity</span>
          </span>

          {category && <span className="category-pill">{category}</span>}

          <span className="location-pill">
            <MapPin size={13} /> {city}
          </span>
        </div>

        <div className="alert-header-actions">
          <span className="alert-time">
            <Clock size={13} /> {formatDateTime(timestamp)}
          </span>

          {!isRead ? (
            <button
              type="button"
              className="mark-read-btn"
              onClick={() => onMarkAsRead(id)}
              title="Mark alert as read"
            >
              <Check size={14} />
              <span>Mark as Read</span>
            </button>
          ) : (
            <span className="read-status-badge">
              <CheckCircle2 size={13} /> Read
            </span>
          )}
        </div>
      </div>

      {/* Alert Title */}
      <h3 className="alert-title">{title}</h3>

      {/* AI Explanation Diagnostic Block */}
      {aiExplanation && (
        <div className="ai-diagnostic-box">
          <div className="diagnostic-header">
            <Sparkles size={15} className="ai-sparkle-icon" />
            <span className="diagnostic-title">AI Atmospheric Diagnostic:</span>
          </div>
          <p className="diagnostic-text">{aiExplanation}</p>
        </div>
      )}

      {/* Safety Tips & Actionable Advice */}
      {safetyTips && safetyTips.length > 0 && (
        <div className="safety-tips-box">
          <div className="safety-header">
            <ShieldCheck size={15} className="shield-icon" />
            <span className="safety-title">Recommended Safety Precautions:</span>
          </div>
          <ul className="safety-list">
            {safetyTips.map((tip, idx) => (
              <li key={idx} className="safety-item">
                <span className="bullet-point">▸</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AlertCard;
