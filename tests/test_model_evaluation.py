import pytest
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ml.evaluate_model import (
    get_dynamic_evaluation_dates,
    build_lagged_features,
    split_time_series_data,
    train_and_tune_random_forest,
    evaluate_test_set,
    save_results_csv,
    generate_evaluation_plot,
    compute_rmse,
    FEATURE_COLS,
    TARGET_COL
)


@pytest.fixture
def synthetic_weather_df():
    """Generates a tiny 120-hour synthetic temperature DataFrame for fast isolated tests."""
    start = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    times = [start + timedelta(hours=i) for i in range(120)]
    hours = np.array([t.hour for t in times])

    # Simple diurnal cycle with small noise
    temperatures = 20.0 + 5.0 * np.sin(2 * np.pi * (hours - 8) / 24.0) + np.linspace(0, 2, 120)

    return pd.DataFrame({
        'time': times,
        'temperature': temperatures
    })


def test_dynamic_evaluation_dates():
    start_date, end_date = get_dynamic_evaluation_dates()
    today = datetime.now(timezone.utc).date()

    assert end_date == today - timedelta(days=7)
    assert (end_date - start_date).days == 365


def test_build_lagged_features(synthetic_weather_df):
    clean_df = build_lagged_features(synthetic_weather_df)

    # 120 rows original: minus 3 for lag-3, minus 1 for forward target shift = 116 rows
    assert len(clean_df) == 116
    assert clean_df.isna().sum().sum() == 0

    for col in FEATURE_COLS:
        assert col in clean_df.columns

    assert TARGET_COL in clean_df.columns

    # Verify lag values correctness
    # Row 0 in clean_df corresponds to index 3 in original df
    orig_temp = synthetic_weather_df['temperature'].values
    assert clean_df.loc[0, 'temp_t'] == orig_temp[3]
    assert clean_df.loc[0, 'temp_t_minus_1'] == orig_temp[2]
    assert clean_df.loc[0, 'temp_t_minus_2'] == orig_temp[1]
    assert clean_df.loc[0, 'temp_t_minus_3'] == orig_temp[0]
    assert clean_df.loc[0, TARGET_COL] == orig_temp[4]

    # Verify cyclical hour encoding bounds
    assert clean_df['hour_sin'].between(-1.0, 1.0).all()
    assert clean_df['hour_cos'].between(-1.0, 1.0).all()


def test_chronological_splitting(synthetic_weather_df):
    clean_df = build_lagged_features(synthetic_weather_df)
    n_total = len(clean_df)

    train_df, val_df, test_df = split_time_series_data(clean_df, train_pct=0.70, val_pct=0.15, gap=4)

    expected_train = int(n_total * 0.70)
    expected_val = int(n_total * 0.15)

    assert len(train_df) == expected_train
    assert len(val_df) == expected_val
    assert len(test_df) > 0

    # Ensure chronological order with boundary gap (no data leakage)
    train_last_time = train_df['time'].iloc[-1]
    val_first_time = val_df['time'].iloc[0]
    val_last_time = val_df['time'].iloc[-1]
    test_first_time = test_df['time'].iloc[0]

    # Gap between train and val is at least 4 hours
    assert (val_first_time - train_last_time) >= timedelta(hours=4)
    # Gap between val and test is at least 4 hours
    assert (test_first_time - val_last_time) >= timedelta(hours=4)


def test_tuning_and_evaluation_pipeline(synthetic_weather_df, tmp_path):
    clean_df = build_lagged_features(synthetic_weather_df)
    train_df, val_df, test_df = split_time_series_data(clean_df, train_pct=0.70, val_pct=0.15, gap=2)

    # Fast tuning with limited depths
    model, best_depth, tuning_log = train_and_tune_random_forest(
        train_df, val_df, candidate_depths=[4, 8]
    )

    assert model is not None
    assert best_depth in [4, 8]
    assert len(tuning_log) == 2

    # Evaluate on test set
    results = evaluate_test_set(model, test_df)

    assert results['test_samples'] == len(test_df)
    assert results['baseline_mae'] >= 0.0
    assert results['baseline_rmse'] >= 0.0
    assert results['rf_mae'] >= 0.0
    assert results['rf_rmse'] >= 0.0
    assert isinstance(results['rf_beats_baseline'], bool)

    # Test CSV output
    csv_file = tmp_path / 'test_results.csv'
    df_res = save_results_csv(results, csv_path=csv_file)
    assert csv_file.exists()
    assert len(df_res) == 2

    # Test plot generation
    plot_file = tmp_path / 'test_plot.png'
    generate_evaluation_plot(results, plot_path=plot_file, hours_to_plot=24)
    assert plot_file.exists()
    assert plot_file.stat().st_size > 1000
