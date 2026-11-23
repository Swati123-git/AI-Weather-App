import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
import joblib
import requests

# Base paths
ML_DIR = Path(__file__).resolve().parent
MODELS_DIR = ML_DIR / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

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


def fetch_open_meteo_archive(lat=40.7128, lon=-74.0060, days=365):
    """
    Fetch historical hourly data from Open-Meteo Archive API.
    Returns a DataFrame if successful, or None if network/request fails.
    """
    end_date = (datetime.utcnow() - timedelta(days=2)).strftime('%Y-%m-%d')
    start_date = (datetime.utcnow() - timedelta(days=days + 2)).strftime('%Y-%m-%d')
    
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}"
        f"&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,cloud_cover,precipitation"
        f"&timezone=auto"
    )
    
    try:
        print(f"[ML Train] Attempting to fetch historical data from Open-Meteo ({start_date} to {end_date})...")
        resp = requests.get(url, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            hourly = data.get('hourly', {})
            if 'time' in hourly and 'temperature_2m' in hourly:
                df = pd.DataFrame({
                    'time': pd.to_datetime(hourly['time']),
                    'temperature': hourly['temperature_2m'],
                    'humidity': hourly['relative_humidity_2m'],
                    'pressure': hourly['surface_pressure'],
                    'wind_speed': hourly['wind_speed_10m'],
                    'cloud_cover': hourly['cloud_cover'],
                    'precipitation': hourly['precipitation']
                })
                print(f"[ML Train] Successfully fetched {len(df)} hourly records from Open-Meteo.")
                return df
    except Exception as e:
        print(f"[ML Train] Open-Meteo archive request failed ({type(e).__name__}: {e}).")
    
    return None


def generate_synthetic_historical_data(days=500):
    """
    Generate realistic multi-season hourly meteorological records
    incorporating diurnal solar radiation cycles, barometric pressure oscillations,
    seasonal drift, and convective moisture precipitation events.
    """
    print(f"[ML Train] Generating synthetic meteorological training series ({days} days)...")
    np.random.seed(42)
    hours = days * 24
    start_time = datetime(2023, 1, 1, 0, 0, 0)
    timestamps = [start_time + timedelta(hours=i) for i in range(hours)]
    
    df = pd.DataFrame({'time': timestamps})
    df['hour_of_day'] = df['time'].dt.hour
    df['day_of_year'] = df['time'].dt.dayofyear
    df['month'] = df['time'].dt.month
    
    # Seasonal temperature cycle (annual sine) + Diurnal cycle (daily sine) + stochastic noise
    annual_cycle = 18 + 12 * np.sin((df['day_of_year'] - 80) * 2 * np.pi / 365.25)
    daily_cycle = 5 * np.sin((df['hour_of_day'] - 9) * 2 * np.pi / 24)
    temp_noise = np.random.normal(0, 1.8, hours)
    df['temperature'] = np.round(annual_cycle + daily_cycle + temp_noise, 2)
    
    # Pressure: base ~1013 hPa, slow weather systems (period ~4-7 days) + diurnal tide
    synoptic_pressure = 1013.25 + 10 * np.sin(df.index / 48.0) + 4 * np.cos(df.index / 120.0)
    pressure_noise = np.random.normal(0, 0.8, hours)
    df['pressure'] = np.round(synoptic_pressure + pressure_noise, 2)
    
    # Humidity: inversely related to temperature + random rain front moisture
    base_humidity = 65 - 1.2 * daily_cycle + np.random.normal(0, 8, hours)
    df['humidity'] = np.clip(np.round(base_humidity, 1), 20.0, 100.0)
    
    # Cloud cover: correlated with humidity
    cloud_base = (df['humidity'] - 30) * 1.3 + np.random.normal(0, 15, hours)
    df['cloud_cover'] = np.clip(np.round(cloud_base, 1), 0.0, 100.0)
    
    # Wind speed
    df['wind_speed'] = np.clip(np.round(12 + 6 * np.sin(df['hour_of_day'] * np.pi / 12) + np.random.exponential(4, hours), 1), 0.0, 85.0)
    
    # Precipitation: Occurs when humidity > 78 and cloud_cover > 75 and pressure drop
    pressure_diff = df['pressure'].diff().fillna(0)
    rain_prob = np.where((df['humidity'] > 75) & (df['cloud_cover'] > 70) & (pressure_diff < 0), 0.65, 0.05)
    is_rain = np.random.rand(hours) < rain_prob
    rain_volume = np.where(is_rain, np.random.exponential(3.5, hours) + 0.5, 0.0)
    df['precipitation'] = np.round(rain_volume, 2)
    
    return df


def prepare_features(df):
    """
    Create feature matrix according to spec:
    temperature, humidity, pressure, pressure_change, wind_speed, cloud_cover, hour_of_day, month.
    Targets:
    1. next_hour_temperature = temperature at t+1
    2. rain_next_hour = binary (1 if precipitation at t+1 > 0.05 mm, else 0)
    """
    df = df.copy()
    if 'hour_of_day' not in df.columns:
        df['hour_of_day'] = df['time'].dt.hour
    if 'month' not in df.columns:
        df['month'] = df['time'].dt.month
        
    # Pressure change = pressure(t) - pressure(t-1)
    df['pressure_change'] = df['pressure'].diff().fillna(0.0)
    
    # Targets (shifted by -1 for t+1)
    df['target_temp_next_hour'] = df['temperature'].shift(-1)
    df['target_rain_next_hour'] = (df['precipitation'].shift(-1) > 0.1).astype(int)
    
    # Drop last row since it doesn't have t+1
    df = df.dropna().reset_index(drop=True)
    
    X = df[FEATURE_COLUMNS]
    y_temp = df['target_temp_next_hour']
    y_rain = df['target_rain_next_hour']
    
    # Current temperature for persistence baseline
    current_temp = df['temperature']
    
    return X, y_temp, y_rain, current_temp


def train_models(days=730):
    """
    Train Task 1 (temperature 1h ahead) and Task 2 (rain probability).
    Save models with joblib.
    """
    # 1. Acquire data
    df = fetch_open_meteo_archive(days=days)
    if df is None or len(df) < 500:
        df = generate_synthetic_historical_data(days=days)
        
    X, y_temp, y_rain, current_temp = prepare_features(df)
    
    # Train / test split (80% train, 20% test, chronological or standard split)
    X_train, X_test, y_temp_train, y_temp_test, y_rain_train, y_rain_test, curr_temp_train, curr_temp_test = train_test_split(
        X, y_temp, y_rain, current_temp, test_size=0.2, random_state=42, shuffle=False
    )
    
    print(f"\n[ML Train] Training sample count: {len(X_train)}, Testing sample count: {len(X_test)}")
    
    # -------------------------------------------------------------
    # TASK 1: Temperature 1-Hour Ahead Prediction
    # -------------------------------------------------------------
    print("\n--- TASK 1: Temperature Prediction (Random Forest Regressor vs Persistence) ---")
    rf_temp = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf_temp.fit(X_train, y_temp_train)
    y_temp_pred = rf_temp.predict(X_test)
    
    # Metrics for Random Forest
    rf_mae = mean_absolute_error(y_temp_test, y_temp_pred)
    rf_rmse = root_mean_squared_error(y_temp_test, y_temp_pred)
    
    # Metrics for Persistence Baseline (Predicted temp at t+1 = Current temp at t)
    base_mae = mean_absolute_error(y_temp_test, curr_temp_test)
    base_rmse = root_mean_squared_error(y_temp_test, curr_temp_test)
    
    print(f"Persistence Baseline -> MAE: {base_mae:.4f}°C | RMSE: {base_rmse:.4f}°C")
    print(f"Random Forest Regressor -> MAE: {rf_mae:.4f}°C | RMSE: {rf_rmse:.4f}°C")
    mae_improvement = ((base_mae - rf_mae) / base_mae) * 100
    rmse_improvement = ((base_rmse - rf_rmse) / base_rmse) * 100
    print(f"RF Improvement over Baseline: MAE +{mae_improvement:.2f}%, RMSE +{rmse_improvement:.2f}%")
    
    # -------------------------------------------------------------
    # TASK 2: Rain Probability Prediction
    # -------------------------------------------------------------
    print("\n--- TASK 2: Rain Probability Prediction (Random Forest Classifier) ---")
    rf_rain = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=4,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf_rain.fit(X_train, y_rain_train)
    y_rain_pred = rf_rain.predict(X_test)
    
    acc = accuracy_score(y_rain_test, y_rain_pred)
    prec = precision_score(y_rain_test, y_rain_pred, zero_division=0)
    rec = recall_score(y_rain_test, y_rain_pred, zero_division=0)
    
    print(f"Rain Classifier -> Accuracy: {acc * 100:.2f}% | Precision: {prec * 100:.2f}% | Recall: {rec * 100:.2f}%")
    
    # Save models
    joblib.dump(rf_temp, TEMP_MODEL_PATH)
    joblib.dump(rf_rain, RAIN_MODEL_PATH)
    
    metadata = {
        'trained_at': datetime.utcnow().isoformat(),
        'feature_columns': FEATURE_COLUMNS,
        'temp_metrics': {
            'baseline_mae': float(base_mae),
            'baseline_rmse': float(base_rmse),
            'rf_mae': float(rf_mae),
            'rf_rmse': float(rf_rmse),
            'mae_improvement_pct': float(mae_improvement)
        },
        'rain_metrics': {
            'accuracy': float(acc),
            'precision': float(prec),
            'recall': float(rec)
        }
    }
    joblib.dump(metadata, METADATA_PATH)
    print(f"\n[ML Train] Models successfully saved to:\n - {TEMP_MODEL_PATH}\n - {RAIN_MODEL_PATH}\n - {METADATA_PATH}")
    return metadata


if __name__ == '__main__':
    train_models()
