import React from 'react';
import { useAlerts } from '../context/AlertContext';
import AlertCard from '../components/AlertCard';
import { ListSkeleton } from '../components/SkeletonLoader';
import {
  CheckCheck,
  Filter,
  BellRing,
  RefreshCw,
  PlusCircle,
  CheckCircle2
} from 'lucide-react';

const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['All', 'Unread', 'Read'];

const AlertsPage = () => {
  const {
    filteredAlerts,
    unreadCount,
    readAlertIds,
    loading,
    markAsRead,
    markAllAsRead,
    refreshAlerts,
    triggerTestAlert,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter
  } = useAlerts();

  return (
    <div className="page-alerts">
      {/* Header */}
      <div className="page-header alerts-header">
        <div>
          <div className="alerts-title-row">
            <h1 className="page-title">Atmospheric Alert Center</h1>
            {unreadCount > 0 && (
              <span className="unread-banner-pill">
                <BellRing size={14} className="bell-ring-anim" />
                {unreadCount} Unresolved Warnings
              </span>
            )}
          </div>
          <p className="page-subtitle">
            AI-driven hazard classification, real-time safety advisories & risk mitigation protocols
          </p>
        </div>

        {/* Global Alert Action Buttons */}
        <div className="alerts-action-bar">
          <button
            type="button"
            className="btn-trigger-test"
            onClick={triggerTestAlert}
            title="Simulate a new Critical Alert to verify real-time toast pop-up and notifications"
          >
            <PlusCircle size={15} />
            <span>Simulate Critical Alert</span>
          </button>

          <button
            type="button"
            className="btn-mark-all"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>

          <button
            type="button"
            className="action-btn-outline"
            onClick={refreshAlerts}
            title="Poll alert services"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Auto-Refresh Badge Notification */}
      <div className="alerts-info-banner">
        <span className="live-radar-dot"></span>
        <span>
          Automated 60-second telemetry polling active. Critical anomalies trigger instantaneous floating toast alerts.
        </span>
      </div>

      {/* Filters Toolbar */}
      <div className="filters-toolbar glass-panel">
        {/* Severity Filter Tabs */}
        <div className="filter-group">
          <span className="filter-label">
            <Filter size={14} /> Severity:
          </span>
          <div className="filter-pills">
            {SEVERITIES.map((sev) => {
              const isActive = severityFilter === sev;
              return (
                <button
                  key={sev}
                  type="button"
                  className={`filter-pill filter-sev-${sev.toLowerCase()} ${
                    isActive ? 'active' : ''
                  }`}
                  onClick={() => setSeverityFilter(sev)}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter */}
        <div className="filter-group">
          <span className="filter-label">Status:</span>
          <div className="filter-pills">
            {STATUSES.map((st) => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  className={`filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-list-container">
        {loading ? (
          <ListSkeleton count={4} />
        ) : filteredAlerts && filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isRead={readAlertIds.has(alert.id)}
              onMarkAsRead={markAsRead}
            />
          ))
        ) : (
          <div className="empty-alerts-card glass-panel">
            <CheckCircle2 size={48} className="text-emerald" />
            <h3 className="empty-heading">No Alerts Match Your Filters</h3>
            <p className="empty-text">
              All atmospheric parameters are within acceptable thresholds for the selected criteria.
            </p>
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setSeverityFilter('All');
                setStatusFilter('All');
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
