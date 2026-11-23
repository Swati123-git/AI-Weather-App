import React from 'react';
import {
  Brain,
  CloudRain,
  Thermometer,
  ShieldCheck,
  Zap,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';

const PredictionCard = ({ data, className = '' }) => {
  if (!data) return null;

  const {
    rainPrediction = {},
    temperaturePrediction = {},
    overallConfidence = 88,
    riskLevel = 'Low',
    aiExplanation = '',
    keyModelFactors = [],
    model = 'NeuralEnsemble-v4'
  } = data;

  const getRiskBadgeClass = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return 'risk-crit';
      case 'high':
        return 'risk-high';
      case 'medium':
      case 'elevated':
        return 'risk-med';
      default:
        return 'risk-low';
    }
  };

  return (
    <div className={`prediction-card glass-panel ${className}`}>
      {/* Header */}
      <div className="prediction-header">
        <div className="card-title-group">
          <div className="ai-icon-pulse">
            <Brain size={20} className="card-title-icon brain" />
          </div>
          <div>
            <h3 className="card-heading">AI Weather Prediction Engine</h3>
            <span className="model-tag">{model}</span>
          </div>
        </div>

        <div className={`risk-pill ${getRiskBadgeClass(riskLevel)}`}>
          <Zap size={14} />
          <span>{riskLevel} Risk</span>
        </div>
      </div>

      {/* Main Predictions Grid */}
      <div className="prediction-metrics-row">
        {/* Rain Probability Card */}
        <div className="prediction-sub-box">
          <div className="box-top">
            <div className="icon-badge blue">
              <CloudRain size={18} />
            </div>
            <span className="box-label">Rain Probability</span>
          </div>
          <div className="box-value-row">
            <span className="box-big-value">{rainPrediction.probability}%</span>
            <span className="box-sub-text">{rainPrediction.peakWindow}</span>
          </div>

          {/* Rain Probability Progress Bar */}
          <div className="confidence-bar-wrap">
            <div className="confidence-track">
              <div
                className="confidence-fill rain"
                style={{ width: `${rainPrediction.probability}%` }}
              ></div>
            </div>
            <div className="bar-labels">
              <span>Expected Volume: {rainPrediction.expectedVolumeMm || 0} mm</span>
              <span>Conf: {rainPrediction.confidence}%</span>
            </div>
          </div>
        </div>

        {/* Temperature Delta Card */}
        <div className="prediction-sub-box">
          <div className="box-top">
            <div className="icon-badge amber">
              <Thermometer size={18} />
            </div>
            <span className="box-label">6-Hour Temp Trend</span>
          </div>
          <div className="box-value-row">
            <span className="box-big-value">
              {temperaturePrediction.next6HoursDelta > 0 ? (
                <span className="delta-up">
                  <TrendingUp size={20} className="inline-icon" /> +{temperaturePrediction.next6HoursDelta}°C
                </span>
              ) : (
                <span className="delta-down">
                  <TrendingDown size={20} className="inline-icon" /> {temperaturePrediction.next6HoursDelta}°C
                </span>
              )}
            </span>
            <span className="box-sub-text">{temperaturePrediction.shiftDescription}</span>
          </div>

          {/* Temp Confidence Progress Bar */}
          <div className="confidence-bar-wrap">
            <div className="confidence-track">
              <div
                className="confidence-fill temp"
                style={{ width: `${temperaturePrediction.confidence}%` }}
              ></div>
            </div>
            <div className="bar-labels">
              <span>Model Confidence</span>
              <span>{temperaturePrediction.confidence}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall AI Model Confidence Bar */}
      <div className="overall-confidence-section">
        <div className="confidence-header">
          <span className="confidence-title">
            <ShieldCheck size={16} className="text-emerald" /> AI Ensemble Confidence Score
          </span>
          <span className="confidence-percent">{overallConfidence}%</span>
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${overallConfidence}%` }}
          ></div>
        </div>
      </div>

      {/* AI Diagnostic Explanation */}
      {aiExplanation && (
        <div className="ai-explanation-box">
          <div className="explanation-title">
            <Info size={15} /> AI Atmospheric Diagnostics
          </div>
          <p className="explanation-text">{aiExplanation}</p>
        </div>
      )}

      {/* Key Model Atmospheric Indicators */}
      {keyModelFactors && keyModelFactors.length > 0 && (
        <div className="model-factors-list">
          <span className="factors-title">Key Driving Indicators:</span>
          <div className="factors-tags">
            {keyModelFactors.map((factor, idx) => (
              <div key={idx} className="factor-tag">
                <span className="factor-name">{factor.name}:</span>
                <span className="factor-status">{factor.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionCard;
