import os
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import joblib

ML_DIR = Path(__file__).resolve().parent
MODELS_DIR = ML_DIR / 'models'
TEMP_MODEL_PATH = MODELS_DIR / 'temp_model.joblib'
RAIN_MODEL_PATH = MODELS_DIR / 'rain_model.joblib'
METADATA_PATH = MODELS_DIR / 'model_metadata.joblib'

FEATURE_COLUMNS = [
    'temperature',
    'humidity',
    'pressure',
    'pressure_change',
    'wind_speed',
    'cloud_cover',
    'hour_of_day',
    'month'
]

# Global cache for models
_TEMP_MODEL = None
_RAIN_MODEL = None
_METADATA = None


def load_models():
    """Load trained models from disk, triggering training if missing."""
    global _TEMP_MODEL, _RAIN_MODEL, _METADATA
    if _TEMP_MODEL is not None and _RAIN_MODEL is not None:
        return _TEMP_MODEL, _RAIN_MODEL, _METADATA

    if not TEMP_MODEL_PATH.exists() or not RAIN_MODEL_PATH.exists():
        from ml.train import train_models
        train_models()

    _TEMP_MODEL = joblib.load(TEMP_MODEL_PATH)
    _RAIN_MODEL = joblib.load(RAIN_MODEL_PATH)
    if METADATA_PATH.exists():
        _METADATA = joblib.load(METADATA_PATH)
    else:
        _METADATA = {}

    return _TEMP_MODEL, _RAIN_MODEL, _METADATA


def extract_features(data):
    """Normalize input dict into ordered feature vector DataFrame."""
    now = datetime.now(timezone.utc)
    
    temp = float(data.get('temperature', 20.0))
    hum = float(data.get('humidity', 60.0))
    press = float(data.get('pressure', 1013.25))
    p_change = float(data.get('pressure_change', 0.0))
    wind = float(data.get('wind_speed', 15.0))
    cloud = float(data.get('cloud_cover', 40.0))
    hour = int(data.get('hour_of_day', now.hour))
    month = int(data.get('month', now.month))

    row = {
        'temperature': temp,
        'humidity': hum,
        'pressure': press,
        'pressure_change': p_change,
        'wind_speed': wind,
        'cloud_cover': cloud,
        'hour_of_day': hour,
        'month': month
    }
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


def predict_weather(features_dict):
    """
    Generate next-hour temperature, rain probability, confidence scores,
    and structured risk assessments.
    """
    temp_model, rain_model, _ = load_models()
    X = extract_features(features_dict)

    # 1. Temperature Prediction (Task 1)
    temp_pred = float(temp_model.predict(X)[0])
    
    # Estimate temperature confidence based on tree variance
    tree_preds = [tree.predict(X.values)[0] for tree in temp_model.estimators_]
    tree_std = float(np.std(tree_preds))
    # Lower standard deviation indicates higher consensus / confidence
    temp_conf = max(70.0, min(96.0, round(95.0 - (tree_std * 6.0), 1)))

    # 2. Rain Probability Prediction (Task 2)
    proba = rain_model.predict_proba(X)[0]
    # Check classes
    if len(proba) > 1:
        rain_prob = float(proba[1])
    else:
        rain_prob = 0.0 if rain_model.classes_[0] == 0 else 1.0

    rain_prob_pct = int(round(rain_prob * 100))
    
    # Rain confidence: higher when probability is decisive (near 0% or near 100%)
    decision_margin = abs(rain_prob - 0.5) * 2  # 0 to 1
    rain_conf = max(70.0, min(95.0, round(72.0 + (decision_margin * 22.0), 1)))

    # Overall Confidence
    overall_conf = round((temp_conf + rain_conf) / 2.0, 1)

    # Derive temperature delta from current input
    curr_temp = float(features_dict.get('temperature', 20.0))
    temp_delta = round(temp_pred - curr_temp, 1)

    # Expected rainfall volume estimate (if rain predicted)
    expected_volume = 0.0
    if rain_prob_pct > 30:
        expected_volume = round((rain_prob_pct / 100.0) * (features_dict.get('cloud_cover', 50) / 100.0) * 18.0, 1)

    # Risk level determination
    risk_level = 'Low'
    if rain_prob_pct >= 80 or temp_pred >= 42 or temp_pred <= 5 or features_dict.get('wind_speed', 0) >= 60:
        risk_level = 'Critical' if (rain_prob_pct >= 90 or temp_pred >= 45 or temp_pred <= 0) else 'High'
    elif rain_prob_pct >= 60 or temp_pred >= 38 or temp_pred <= 10 or features_dict.get('wind_speed', 0) >= 45:
        risk_level = 'Medium'

    # Diagnostics & Explanation
    explanation_parts = []
    if rain_prob_pct >= 60:
        explanation_parts.append(
            f"Barometric pressure flux and high moisture saturation ({features_dict.get('humidity', 60)}%) indicate a {rain_prob_pct}% probability of precipitation."
        )
    else:
        explanation_parts.append(
            f"Barometric conditions remain stable with low precipitation probability ({rain_prob_pct}%)."
        )

    if abs(temp_delta) >= 2.0:
        direction = "warming" if temp_delta > 0 else "cooling"
        explanation_parts.append(f"Thermal gradient shifts indicate a rapid 1-hour {direction} trend ({temp_delta:+.1f}°C).")
    else:
        explanation_parts.append(f"Temperature trajectory remains steady near {temp_pred:.1f}°C.")

    ai_explanation = " ".join(explanation_parts)

    # Key model factors
    p_change = features_dict.get('pressure_change', 0.0)
    p_status = f"Falling ({p_change:+.1f} hPa)" if p_change < -0.5 else f"Rising ({p_change:+.1f} hPa)" if p_change > 0.5 else "Stable"
    factors = [
        {"name": "Barometric Gradient", "status": p_status, "impact": "High" if abs(p_change) >= 1.0 else "Medium"},
        {"name": "Moisture Saturation", "status": f"{features_dict.get('humidity', 60)}% RH", "impact": "High" if features_dict.get('humidity', 60) > 75 else "Low"},
        {"name": "Cloud Optical Depth", "status": f"{features_dict.get('cloud_cover', 40)}% Cover", "impact": "Medium"},
        {"name": "Wind Shear", "status": f"{features_dict.get('wind_speed', 15)} km/h", "impact": "High" if features_dict.get('wind_speed', 15) > 50 else "Low"}
    ]

    # Precaution
    if risk_level in ('High', 'Critical'):
        precaution = "Exercise elevated caution outdoors, secure vulnerable equipment, and monitor real-time radar advisories."
    elif risk_level == 'Medium':
        precaution = "Moderate atmospheric variance expected; carry suitable gear for transient rain or wind."
    else:
        precaution = "Atmospheric conditions remain benign and optimal for routine outdoor activities."

    return {
        # Exact API spec fields
        'rain_probability': rain_prob_pct,
        'next_hour_temperature': round(temp_pred, 1),
        'confidence': overall_conf,
        
        # Extended fields for React PredictionCard
        'rainPrediction': {
            'probability': rain_prob_pct,
            'expectedVolumeMm': expected_volume,
            'peakWindow': 'Next 1 to 2 hours' if rain_prob_pct > 50 else 'Isolated / Minimal',
            'confidence': int(rain_conf)
        },
        'temperaturePrediction': {
            'next6HoursDelta': temp_delta,
            'predictedAverage': round(temp_pred, 1),
            'shiftDescription': f"{'Warm inflow' if temp_delta > 0 else 'Cold advection'} with {abs(temp_delta):.1f}°C delta",
            'confidence': int(temp_conf)
        },
        'overallConfidence': overall_conf,
        'riskLevel': risk_level,
        'aiExplanation': ai_explanation,
        'keyModelFactors': factors,
        'recommendedPrecaution': precaution,
        'model': 'Random Forest Dual-Task Ensemble'
    }
