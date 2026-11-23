import pytest
from datetime import datetime, timedelta, timezone
from alert_engine import AlertEngine


def test_normal_weather_no_alerts():
    """Verify benign conditions generate no false-positive alerts."""
    weather = {
        'temperature': 22.0,
        'windSpeed': 15.0,
        'precipitation': 0.0,
        'weatherCode': 1,
        'aqi': {'value': 45}
    }
    alerts = AlertEngine.evaluate_thresholds('Paris', weather, ml_prediction=None)
    assert len(alerts) == 0


def test_heatwave_thresholds():
    """Heatwave rule: > 42°C (High), >= 45°C (Critical)."""
    # High severity
    weather_high = {'temperature': 43.5, 'windSpeed': 10, 'precipitation': 0, 'weatherCode': 0, 'aqi': {'value': 50}}
    alerts = AlertEngine.evaluate_thresholds('Dubai', weather_high)
    assert len(alerts) == 1
    assert alerts[0]['type'] == 'Heatwave'
    assert alerts[0]['severity'] == 'High'
    assert len(alerts[0]['safety_tips']) >= 2

    # Critical severity
    weather_crit = {'temperature': 46.2, 'windSpeed': 10, 'precipitation': 0, 'weatherCode': 0, 'aqi': {'value': 50}}
    alerts_crit = AlertEngine.evaluate_thresholds('Dubai', weather_crit)
    assert len(alerts_crit) == 1
    assert alerts_crit[0]['severity'] == 'Critical'


def test_cold_wave_thresholds():
    """Cold Wave rule: < 5°C (High), <= 0°C (Critical)."""
    # High severity
    weather_high = {'temperature': 3.2, 'windSpeed': 12, 'precipitation': 0, 'weatherCode': 3, 'aqi': {'value': 30}}
    alerts = AlertEngine.evaluate_thresholds('London', weather_high)
    assert len(alerts) == 1
    assert alerts[0]['type'] == 'Cold Wave'
    assert alerts[0]['severity'] == 'High'

    # Critical severity
    weather_crit = {'temperature': -4.5, 'windSpeed': 15, 'precipitation': 0, 'weatherCode': 3, 'aqi': {'value': 30}}
    alerts_crit = AlertEngine.evaluate_thresholds('Berlin', weather_crit)
    assert len(alerts_crit) == 1
    assert alerts_crit[0]['severity'] == 'Critical'


def test_heavy_rain_thresholds():
    """Heavy Rain rule: precipitation > 15 mm/h (High), >= 25 mm/h (Critical)."""
    weather_high = {'temperature': 18.0, 'windSpeed': 20, 'precipitation': 18.5, 'weatherCode': 65, 'aqi': {'value': 40}}
    alerts = AlertEngine.evaluate_thresholds('Singapore', weather_high)
    rain_alerts = [a for a in alerts if a['type'] == 'Heavy Rain']
    assert len(rain_alerts) == 1
    assert rain_alerts[0]['severity'] == 'High'

    weather_crit = {'temperature': 18.0, 'windSpeed': 20, 'precipitation': 32.0, 'weatherCode': 82, 'aqi': {'value': 40}}
    alerts_crit = AlertEngine.evaluate_thresholds('Singapore', weather_crit)
    rain_crit = [a for a in alerts_crit if a['type'] == 'Heavy Rain']
    assert len(rain_crit) == 1
    assert rain_crit[0]['severity'] == 'Critical'


def test_high_wind_thresholds():
    """High Wind rule: wind_speed > 60 km/h (High), >= 85 km/h (Critical)."""
    weather_high = {'temperature': 19.0, 'windSpeed': 65.0, 'precipitation': 0, 'weatherCode': 2, 'aqi': {'value': 35}}
    alerts = AlertEngine.evaluate_thresholds('San Francisco', weather_high)
    assert len(alerts) == 1
    assert alerts[0]['type'] == 'High Wind'
    assert alerts[0]['severity'] == 'High'

    weather_crit = {'temperature': 19.0, 'windSpeed': 92.0, 'precipitation': 0, 'weatherCode': 2, 'aqi': {'value': 35}}
    alerts_crit = AlertEngine.evaluate_thresholds('San Francisco', weather_crit)
    assert len(alerts_crit) == 1
    assert alerts_crit[0]['severity'] == 'Critical'


def test_poor_aqi_thresholds():
    """Poor AQI rule: aqi > 200 (High), >= 300 (Critical)."""
    weather_high = {'temperature': 25.0, 'windSpeed': 10, 'precipitation': 0, 'weatherCode': 1, 'aqi': {'value': 225}}
    alerts = AlertEngine.evaluate_thresholds('Mumbai', weather_high)
    assert len(alerts) == 1
    assert alerts[0]['type'] == 'Poor AQI'
    assert alerts[0]['severity'] == 'High'

    weather_crit = {'temperature': 25.0, 'windSpeed': 10, 'precipitation': 0, 'weatherCode': 1, 'aqi': {'value': 340}}
    alerts_crit = AlertEngine.evaluate_thresholds('Delhi', weather_crit)
    assert len(alerts_crit) == 1
    assert alerts_crit[0]['severity'] == 'Critical'


def test_thunderstorm_codes():
    """Thunderstorm WMO weather codes: 95/96 (High), 99 (Critical)."""
    weather_95 = {'temperature': 24.0, 'windSpeed': 30, 'precipitation': 5.0, 'weatherCode': 95, 'aqi': {'value': 50}}
    alerts_95 = AlertEngine.evaluate_thresholds('Mumbai', weather_95)
    assert len(alerts_95) == 1
    assert alerts_95[0]['type'] == 'Thunderstorm'
    assert alerts_95[0]['severity'] == 'High'

    weather_99 = {'temperature': 22.0, 'windSpeed': 55, 'precipitation': 12.0, 'weatherCode': 99, 'aqi': {'value': 50}}
    alerts_99 = AlertEngine.evaluate_thresholds('Tokyo', weather_99)
    assert len(alerts_99) == 1
    assert alerts_99[0]['severity'] == 'Critical'


def test_ml_prediction_alerts():
    """Verify alerts raised when ML prediction crosses thresholds."""
    weather = {'temperature': 28.0, 'windSpeed': 15.0, 'precipitation': 0.0, 'weatherCode': 2, 'aqi': {'value': 50}}
    
    # ML predicted heatwave (> 42°C)
    ml_heat = {'next_hour_temperature': 43.5, 'rain_probability': 10}
    alerts_heat = AlertEngine.evaluate_thresholds('Dubai', weather, ml_prediction=ml_heat)
    assert any(a['type'] == 'Heatwave' for a in alerts_heat)

    # ML predicted freeze (< 5°C)
    ml_cold = {'next_hour_temperature': 2.5, 'rain_probability': 15}
    alerts_cold = AlertEngine.evaluate_thresholds('Berlin', weather, ml_prediction=ml_cold)
    assert any(a['type'] == 'Cold Wave' for a in alerts_cold)

    # ML predicted heavy rain (> 80%)
    ml_rain = {'next_hour_temperature': 24.0, 'rain_probability': 88}
    alerts_rain = AlertEngine.evaluate_thresholds('New York', weather, ml_prediction=ml_rain)
    assert any(a['type'] == 'Heavy Rain' for a in alerts_rain)


def test_alert_safety_tips_and_explanation():
    """Ensure every alert includes an explanatory message and 2-3 safety tips."""
    weather = {'temperature': 44.0, 'windSpeed': 10, 'precipitation': 0, 'weatherCode': 0, 'aqi': {'value': 50}}
    alerts = AlertEngine.evaluate_thresholds('Dubai', weather)
    assert len(alerts) > 0
    for a in alerts:
        assert isinstance(a['explanation'], str) and len(a['explanation']) > 15
        assert isinstance(a['safety_tips'], list)
        assert 2 <= len(a['safety_tips']) <= 4


def test_deduplication_within_3_hours():
    """Verify deduplication avoids duplicate alerts for the same city and type within 3 hours."""
    now = datetime.now(timezone.utc)
    
    recent_alerts = [
        {'type': 'Heatwave', 'created_at': now - timedelta(hours=1, minutes=30)},
        {'type': 'High Wind', 'created_at': now - timedelta(hours=4)} # Older than 3 hours
    ]

    # Heatwave was issued 1.5 hours ago -> should be detected as duplicate
    assert AlertEngine.is_duplicate(recent_alerts, 'Heatwave', window_hours=3) is True

    # High Wind was issued 4 hours ago -> outside 3h window, NOT duplicate
    assert AlertEngine.is_duplicate(recent_alerts, 'High Wind', window_hours=3) is False

    # Cold Wave was never issued -> NOT duplicate
    assert AlertEngine.is_duplicate(recent_alerts, 'Cold Wave', window_hours=3) is False
