"""
AeroPulse AI — Machine Learning Model Evaluation Pipeline
Evaluates 1-hour ahead temperature prediction comparing:
  1. Persistence Baseline: T_pred(t+1) = T(t)
  2. Random Forest Regressor: [T(t), T(t-1), T(t-2), T(t-3), sin(hour), cos(hour)] -> T(t+1)

Dataset: ~1 year of hourly temperature_2m from Open-Meteo Archive API
Split: Chronological 70% Train, 15% Validation, 15% Test with a 4-hour boundary gap.
Metrics: MAE (°C) and RMSE (°C) evaluated strictly on the holdout TEST set.
Outputs:
  - ml/results.csv
  - ml/actual_vs_predicted.png
  - ml/models/temp_eval_model.joblib
"""

import os
import sys
import math
from pathlib import Path
from datetime import datetime, timedelta, timezone
import requests
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Directories and paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
MODELS_DIR = SCRIPT_DIR / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

RESULTS_CSV_PATH = SCRIPT_DIR / 'results.csv'
PLOT_PATH = SCRIPT_DIR / 'actual_vs_predicted.png'
MODEL_SAVE_PATH = MODELS_DIR / 'temp_eval_model.joblib'

FEATURE_COLS = ['temp_t', 'temp_t_minus_1', 'temp_t_minus_2', 'temp_t_minus_3', 'hour_sin', 'hour_cos']
TARGET_COL = 'target_temp_next_hour'


def compute_rmse(y_true, y_pred):
    """Compute Root Mean Squared Error with scikit-learn cross-version support."""
    try:
        from sklearn.metrics import root_mean_squared_error
        return float(root_mean_squared_error(y_true, y_pred))
    except ImportError:
        return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def get_pilot_location(requested_city=None, requested_lat=None, requested_lon=None):
    """
    Resolve pilot location coordinates:
      - Uses CLI arguments if provided
      - Checks database or config
      - Defaults to Lucknow (26.85, 80.95)
    """
    if requested_lat is not None and requested_lon is not None:
        return {
            'name': requested_city or 'Custom Pilot Station',
            'lat': float(requested_lat),
            'lon': float(requested_lon),
            'source': 'Command-line arguments'
        }

    # Default to Lucknow pilot station as specified
    location = {
        'name': 'Lucknow',
        'lat': 26.85,
        'lon': 80.95,
        'source': 'Pilot Station (Lucknow)'
    }

    try:
        sys.path.insert(0, str(PROJECT_ROOT))
        from config import Config
        from models import db, City, Setting
        from app import create_app

        app = create_app()
        with app.app_context():
            # If a specific city was requested
            target_name = requested_city or 'Lucknow'
            city_record = City.query.filter(City.name.ilike(target_name.strip())).first()
            if city_record:
                location['name'] = city_record.name
                location['lat'] = city_record.lat
                location['lon'] = city_record.lon
                location['source'] = f"Database City ({city_record.name})"
                return location

            # Check config DEFAULT_CITIES for match
            for c in Config.DEFAULT_CITIES:
                if c['name'].lower() == target_name.lower():
                    location['name'] = c['name']
                    location['lat'] = c['lat']
                    location['lon'] = c['lon']
                    location['source'] = f"Config DEFAULT_CITIES ({c['name']})"
                    return location

            # If default setting exists in database and Lucknow wasn't specifically passed
            if not requested_city:
                setting = Setting.query.first()
                if setting and setting.default_city:
                    matched = City.query.filter(City.name.ilike(setting.default_city.strip())).first()
                    if matched:
                        location['name'] = matched.name
                        location['lat'] = matched.lat
                        location['lon'] = matched.lon
                        location['source'] = f"Database Setting ({matched.name})"
                        return location

    except Exception:
        pass

    return location


def get_dynamic_evaluation_dates():
    """
    Calculate dynamic UTC dates:
      end_date = today minus 7 days
      start_date = end_date minus 365 days
    """
    today_utc = datetime.now(timezone.utc).date()
    end_date = today_utc - timedelta(days=7)
    start_date = end_date - timedelta(days=365)
    return start_date, end_date


def fetch_open_meteo_archive(lat, lon, start_date, end_date):
    """
    Download 1 year of hourly temperature_2m from Open-Meteo Historical Archive API.
    Returns a pandas DataFrame or None if request fails.
    """
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')

    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat}&longitude={lon}&start_date={start_str}&end_date={end_str}"
        f"&hourly=temperature_2m&timezone=UTC"
    )

    print(f"[Data] Querying Open-Meteo Archive API ({start_str} to {end_str}) for lat={lat}, lon={lon}...")
    try:
        resp = requests.get(url, timeout=25)
        if resp.status_code == 200:
            payload = resp.json()
            hourly = payload.get('hourly', {})
            if 'time' in hourly and 'temperature_2m' in hourly:
                df = pd.DataFrame({
                    'time': pd.to_datetime(hourly['time'], utc=True),
                    'temperature': hourly['temperature_2m']
                })
                # Drop invalid nulls if any
                df = df.dropna(subset=['temperature']).sort_values('time').reset_index(drop=True)
                print(f"[Data] Successfully downloaded {len(df)} hourly temperature records from Open-Meteo.")
                return df
            else:
                print(f"[Data] Unexpected response schema: keys={list(hourly.keys())}")
        else:
            print(f"[Data] HTTP {resp.status_code} returned by Open-Meteo: {resp.text[:120]}")
    except Exception as err:
        print(f"[Data] Network query failed: {err}")

    return None


def generate_synthetic_evaluation_data(start_date, end_date, lat=26.85):
    """
    Realistic fallback generator modeling diurnal and seasonal temperature dynamics
    for offline execution and automated test isolation.
    """
    print(f"[Data] Generating realistic synthetic temperature series ({start_date} to {end_date})...")
    np.random.seed(42)
    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)

    timestamps = pd.date_range(start=start_dt, end=end_dt, freq='h', tz='UTC')
    hours_total = len(timestamps)

    df = pd.DataFrame({'time': timestamps})
    day_of_year = df['time'].dt.dayofyear
    hour = df['time'].dt.hour

    # Annual seasonal oscillation centered at 26°C with 12°C swing
    seasonal_temp = 26.0 + 11.5 * np.sin((day_of_year - 80) * 2 * np.pi / 365.25)
    # Daily solar cycle: min at 5 AM, max at 2 PM
    diurnal_temp = 6.0 * np.sin((hour - 8.5) * 2 * np.pi / 24.0)
    # Autoregressive thermal inertia noise
    noise = np.zeros(hours_total)
    eps = np.random.normal(0, 0.45, hours_total)
    for i in range(1, hours_total):
        noise[i] = 0.85 * noise[i - 1] + eps[i]

    df['temperature'] = np.round(seasonal_temp + diurnal_temp + noise, 2)
    print(f"[Data] Generated {len(df)} synthetic hourly records.")
    return df


def build_lagged_features(df):
    """
    Builds lag and cyclical features according to the evaluation specification:
      Features: T(t), T(t-1h), T(t-2h), T(t-3h), sin(hour), cos(hour)
      Target:   T(t+1h)
      Baseline: T(t)
    """
    if 'time' not in df.columns or 'temperature' not in df.columns:
        raise ValueError("DataFrame must contain 'time' and 'temperature' columns.")

    data = df.copy()
    data = data.sort_values('time').reset_index(drop=True)

    # Core temperature series
    temp = data['temperature']

    # Lags: T(t), T(t-1), T(t-2), T(t-3)
    data['temp_t'] = temp
    data['temp_t_minus_1'] = temp.shift(1)
    data['temp_t_minus_2'] = temp.shift(2)
    data['temp_t_minus_3'] = temp.shift(3)

    # Cyclical hour features (sine and cosine of hour [0..23])
    hour = data['time'].dt.hour
    data['hour_sin'] = np.sin(2.0 * np.pi * hour / 24.0)
    data['hour_cos'] = np.cos(2.0 * np.pi * hour / 24.0)

    # Target: T(t+1h)
    data[TARGET_COL] = temp.shift(-1)

    # Drop edge NaNs caused by lagging (first 3 rows) and forward shift (last row)
    clean_data = data.dropna(subset=FEATURE_COLS + [TARGET_COL]).reset_index(drop=True)

    return clean_data


def split_time_series_data(df, train_pct=0.70, val_pct=0.15, gap=4):
    """
    Chronological time series split (no shuffling):
      - 70% Train
      - 4-hour Boundary Gap
      - 15% Validation
      - 4-hour Boundary Gap
      - 15% Test
    """
    n_total = len(df)
    n_train = int(n_total * train_pct)
    n_val = int(n_total * val_pct)

    if n_train <= 0 or n_val <= 0 or (n_train + gap + n_val + gap) >= n_total:
        raise ValueError(f"Insufficient samples ({n_total}) for requested split and boundary gap.")

    # Train split
    train_df = df.iloc[0 : n_train].copy()

    # Validation split with boundary gap
    val_start = n_train + gap
    val_end = val_start + n_val
    val_df = df.iloc[val_start : val_end].copy()

    # Test split with boundary gap
    test_start = val_end + gap
    test_df = df.iloc[test_start : ].copy()

    return train_df, val_df, test_df


def train_and_tune_random_forest(train_df, val_df, candidate_depths=None):
    """
    Train RandomForestRegressor with modest tuning on the validation set.
    Selects best max_depth based on validation MAE.
    """
    if candidate_depths is None:
        candidate_depths = [4, 6, 8, 12, 16, None]

    X_train = train_df[FEATURE_COLS].values
    y_train = train_df[TARGET_COL].values

    X_val = val_df[FEATURE_COLS].values
    y_val = val_df[TARGET_COL].values

    best_model = None
    best_depth = None
    best_val_mae = float('inf')
    tuning_log = []

    print("\n[Tuning] Evaluating candidate max_depth parameters on Validation set:")
    for depth in candidate_depths:
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=depth,
            min_samples_split=4,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_train, y_train)

        val_pred = model.predict(X_val)
        val_mae = mean_absolute_error(y_val, val_pred)
        val_rmse = compute_rmse(y_val, val_pred)

        tuning_log.append({'max_depth': depth, 'val_mae': val_mae, 'val_rmse': val_rmse})
        depth_str = str(depth) if depth is not None else 'None'
        print(f"  - max_depth={depth_str:<6} -> Val MAE: {val_mae:.4f}°C | Val RMSE: {val_rmse:.4f}°C")

        if val_mae < best_val_mae:
            best_val_mae = val_mae
            best_depth = depth
            best_model = model

    print(f"[Tuning] Selected Best Model: max_depth={best_depth} (Val MAE: {best_val_mae:.4f}°C)")
    return best_model, best_depth, tuning_log


def evaluate_test_set(model, test_df):
    """
    Evaluates both models strictly on the holdout TEST set:
      1. Persistence Baseline: predicted T(t+1) = T(t)
      2. Random Forest Regressor: model.predict(X_test)
    Calculates MAE and RMSE in degrees Celsius.
    """
    X_test = test_df[FEATURE_COLS].values
    y_true = test_df[TARGET_COL].values
    y_persistence = test_df['temp_t'].values

    # Predictions
    rf_pred = model.predict(X_test)

    # Persistence Baseline Metrics
    base_mae = mean_absolute_error(y_true, y_persistence)
    base_rmse = compute_rmse(y_true, y_persistence)

    # Random Forest Metrics
    rf_mae = mean_absolute_error(y_true, rf_pred)
    rf_rmse = compute_rmse(y_true, rf_pred)

    # Relative improvements
    mae_diff = base_mae - rf_mae
    mae_improvement_pct = (mae_diff / base_mae) * 100.0 if base_mae > 0 else 0.0

    rmse_diff = base_rmse - rf_rmse
    rmse_improvement_pct = (rmse_diff / base_rmse) * 100.0 if base_rmse > 0 else 0.0

    rf_beats_baseline = (rf_mae < base_mae) and (rf_rmse < base_rmse)

    test_start_str = test_df['time'].iloc[0].strftime('%Y-%m-%d %H:%M UTC')
    test_end_str = test_df['time'].iloc[-1].strftime('%Y-%m-%d %H:%M UTC')

    results = {
        'test_samples': len(test_df),
        'test_start': test_start_str,
        'test_end': test_end_str,
        'baseline_mae': base_mae,
        'baseline_rmse': base_rmse,
        'rf_mae': rf_mae,
        'rf_rmse': rf_rmse,
        'mae_improvement_pct': mae_improvement_pct,
        'rmse_improvement_pct': rmse_improvement_pct,
        'rf_beats_baseline': rf_beats_baseline,
        'y_true': y_true,
        'rf_pred': rf_pred,
        'y_persistence': y_persistence,
        'time_test': test_df['time'].to_numpy()
    }

    return results


def save_results_csv(results, csv_path=RESULTS_CSV_PATH):
    """Persist structured evaluation metrics to CSV file."""
    rows = [
        {
            'Model': 'Persistence Baseline',
            'MAE_degC': round(results['baseline_mae'], 4),
            'RMSE_degC': round(results['baseline_rmse'], 4),
            'Test_Samples': results['test_samples'],
            'Start_Date': results['test_start'],
            'End_Date': results['test_end'],
            'Beat_Baseline': 'N/A'
        },
        {
            'Model': 'Random Forest Regressor',
            'MAE_degC': round(results['rf_mae'], 4),
            'RMSE_degC': round(results['rf_rmse'], 4),
            'Test_Samples': results['test_samples'],
            'Start_Date': results['test_start'],
            'End_Date': results['test_end'],
            'Beat_Baseline': str(results['rf_beats_baseline'])
        }
    ]
    df_res = pd.DataFrame(rows)
    df_res.to_csv(csv_path, index=False)
    print(f"\n[Artifact] Evaluation results saved to: {csv_path}")
    return df_res


def generate_evaluation_plot(results, plot_path=PLOT_PATH, hours_to_plot=168):
    """
    Saves a plot ml/actual_vs_predicted.png showing actual, Random Forest,
    and persistence for the first 7 days (168 hours) of the test set.
    """
    n_points = min(hours_to_plot, len(results['y_true']))
    times = results['time_test'][:n_points]
    y_actual = results['y_true'][:n_points]
    y_rf = results['rf_pred'][:n_points]
    y_base = results['y_persistence'][:n_points]

    plt.figure(figsize=(14, 6), dpi=150)
    plt.plot(times, y_actual, label='Actual Temperature T(t+1)', color='#0f172a', linewidth=2.2, zorder=3)
    plt.plot(times, y_rf, label='Random Forest Regressor', color='#2563eb', linewidth=1.8, linestyle='-', zorder=4)
    plt.plot(times, y_base, label='Persistence Baseline T(t)', color='#f59e0b', linewidth=1.4, linestyle='--', alpha=0.85, zorder=2)

    plt.title('1-Hour Ahead Temperature Prediction: Actual vs Random Forest vs Persistence (First 7 Days of Test Set)',
              fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Timestamp (UTC)', fontsize=11, labelpad=8)
    plt.ylabel('Temperature (°C)', fontsize=11, labelpad=8)
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.legend(frameon=True, facecolor='white', framealpha=0.9, loc='upper right', fontsize=10)
    plt.tight_layout()

    plt.savefig(plot_path)
    plt.close()
    print(f"[Artifact] Evaluation plot saved to: {plot_path}")


def print_results_table(results, location=None):
    """Displays honest terminal results table and findings."""
    loc_str = f"{location['name']} ({location['lat']}°N, {location['lon']}°E)" if location else "Lucknow (26.85°N, 80.95°E)"
    print("\n" + "=" * 78)
    print(" 📊 MODEL EVALUATION RESULTS (TEST SET — CHRONOLOGICAL HOLDOUT)")
    print("=" * 78)
    print(f" Pilot Location    : {loc_str}")
    print(f" Test Sample Count : {results['test_samples']} hourly observations")
    print(f" Test Date Range   : {results['test_start']}  -->  {results['test_end']}")
    print("-" * 78)
    print(f" {'Model':<26} | {'MAE (°C)':<12} | {'RMSE (°C)':<12} | {'Beat Baseline?'}")
    print("-" * 78)
    print(f" {'Persistence Baseline':<26} | {results['baseline_mae']:<12.4f} | {results['baseline_rmse']:<12.4f} | {'Baseline'}")
    print(f" {'Random Forest Regressor':<26} | {results['rf_mae']:<12.4f} | {results['rf_rmse']:<12.4f} | {str(results['rf_beats_baseline'])}")
    print("-" * 78)

    # Honest assessment printout
    if results['rf_beats_baseline']:
        print(f" [Verdict] Random Forest OUTPERFORMS the persistence baseline.")
        print(f"           MAE Improvement  : +{results['mae_improvement_pct']:.2f}% ({results['baseline_mae'] - results['rf_mae']:.4f}°C reduction)")
        print(f"           RMSE Improvement : +{results['rmse_improvement_pct']:.2f}% ({results['baseline_rmse'] - results['rf_rmse']:.4f}°C reduction)")
    else:
        print(f" [Verdict] Random Forest did NOT outperform the persistence baseline across all metrics.")
        print(f"           Baseline MAE: {results['baseline_mae']:.4f}°C vs RF MAE: {results['rf_mae']:.4f}°C")
        print(f"           Baseline RMSE: {results['baseline_rmse']:.4f}°C vs RF RMSE: {results['rf_rmse']:.4f}°C")
    print("=" * 78 + "\n")


def run_pipeline(requested_city=None, requested_lat=None, requested_lon=None):
    """Main execution orchestrator."""
    print("=" * 78)
    print(" 🚀 AeroPulse AI — Temperature Model Evaluation Script")
    print("=" * 78)

    # 1. Pilot Location & Dates
    loc = get_pilot_location(requested_city, requested_lat, requested_lon)
    print(f"[Pilot] Station: {loc['name']} ({loc['lat']}°N, {loc['lon']}°E) [{loc['source']}]")
    start_date, end_date = get_dynamic_evaluation_dates()
    print(f"[Dates] Dynamic evaluation window: {start_date} to {end_date} (1 Year, UTC)")

    # 2. Acquire Data (Open-Meteo Archive with synthetic fallback)
    df = fetch_open_meteo_archive(loc['lat'], loc['lon'], start_date, end_date)
    if df is None or len(df) < 500:
        df = generate_synthetic_evaluation_data(start_date, end_date, lat=loc['lat'])

    # 3. Feature Engineering: T(t), T(t-1), T(t-2), T(t-3), sin(hour), cos(hour)
    df_features = build_lagged_features(df)
    print(f"[Features] Created feature matrix with {len(df_features)} rows and {len(FEATURE_COLS)} predictors.")

    # 4. Chronological Splitting: 70% Train, 15% Val, 15% Test with 4-hour gaps
    train_df, val_df, test_df = split_time_series_data(df_features, train_pct=0.70, val_pct=0.15, gap=4)
    print(f"[Splits] Chronological samples: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)} (Boundary gap=4h)")

    # 5. Model Training & Tuning on Validation Set
    best_model, best_depth, _ = train_and_tune_random_forest(train_df, val_df)

    # Save trained model with joblib
    joblib.dump(best_model, MODEL_SAVE_PATH)
    print(f"[Model] Saved best model to: {MODEL_SAVE_PATH}")

    # 6. Evaluation strictly on TEST set
    results = evaluate_test_set(best_model, test_df)

    # 7. Print Results Table & Save CSV
    print_results_table(results, loc)
    save_results_csv(results)

    # 8. Save Plot for First 7 Days
    generate_evaluation_plot(results)

    return results


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate 1-hour ahead temperature prediction model.")
    parser.add_argument('--city', type=str, default='Lucknow', help="Pilot city name (default: Lucknow)")
    parser.add_argument('--lat', type=float, default=None, help="Latitude override")
    parser.add_argument('--lon', type=float, default=None, help="Longitude override")
    args = parser.parse_args()

    run_pipeline(requested_city=args.city, requested_lat=args.lat, requested_lon=args.lon)
