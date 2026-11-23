import pytest
import json
from app import create_app
from config import TestConfig
from models import db, City, Setting, Alert, WeatherReading

@pytest.fixture(scope='module')
def test_app():
    app = create_app(TestConfig)
    with app.app_context():
        # Ensure fresh tables
        db.create_all()
        # Ensure default setting exists
        setting = Setting.query.first()
        if not setting:
            setting = Setting(
                default_city='New York',
                severity_threshold='Medium',
                units='Celsius',
                alert_types='{"rainAndFloods": true}'
            )
            db.session.add(setting)
            db.session.commit()
            
        # Add a test alert for New York
        ny = City.query.filter_by(name='New York').first()
        if ny:
            alert = Alert(
                city_id=ny.id,
                type='High Wind',
                severity='High',
                message='Strong Gale Advisory: Sustained gale winds detected.',
                explanation='Deep atmospheric depression approaching coast.',
                safety_tips='["Stay indoors", "Secure outdoor patio items"]',
                is_read=False
            )
            db.session.add(alert)
            db.session.commit()
            
    yield app

    with app.app_context():
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(test_app):
    return test_app.test_client()

def test_health_endpoint(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'ok'
    assert 'version' in data

def test_weather_endpoint_valid_city(client):
    res = client.get('/api/weather?city=London')
    assert res.status_code == 200
    data = res.get_json()
    assert 'temperature' in data
    assert 'city' in data
    assert 'aqi' in data

def test_weather_endpoint_empty_city(client):
    res = client.get('/api/weather?city=')
    assert res.status_code == 400
    data = res.get_json()
    assert 'error' in data

def test_forecast_endpoint(client):
    res = client.get('/api/forecast?city=Paris')
    assert res.status_code == 200
    data = res.get_json()
    assert 'hourly' in data
    assert 'daily' in data

def test_predict_endpoint(client):
    res = client.get('/api/predict?city=Tokyo')
    assert res.status_code == 200
    data = res.get_json()
    assert 'rain_probability' in data
    assert 'confidence' in data

def test_history_endpoint(client):
    res = client.get('/api/history?city=Berlin&days=7')
    assert res.status_code == 200
    data = res.get_json()
    assert 'temperatureHistory' in data
    assert 'rainfallHistory' in data
    assert 'summary' in data

def test_get_alerts(client):
    res = client.get('/api/alerts')
    assert res.status_code == 200
    alerts = res.get_json()
    assert isinstance(alerts, list)
    assert len(alerts) >= 1

def test_mark_alert_read(client):
    # Fetch first alert
    res = client.get('/api/alerts')
    alerts = res.get_json()
    assert len(alerts) > 0
    target_id = alerts[0]['id']

    patch_res = client.patch(f'/api/alerts/{target_id}/read')
    assert patch_res.status_code == 200
    patch_data = patch_res.get_json()
    assert patch_data['success'] is True
    assert patch_data['alert']['is_read'] is True

def test_get_settings(client):
    res = client.get('/api/settings')
    assert res.status_code == 200
    data = res.get_json()
    assert 'defaultCity' in data
    assert 'severityThreshold' in data

def test_save_settings_validation(client):
    # Valid payload
    payload = {
        'defaultCity': 'London',
        'severityThreshold': 'High',
        'temperatureUnit': 'Fahrenheit',
        'emailAddress': 'test@example.com',
        'alertTypes': {'rainAndFloods': True, 'extremeHeat': False},
        'notificationMethods': {'browser': True, 'email': True, 'sms': False}
    }
    res = client.post('/api/settings', json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['settings']['defaultCity'] == 'London'

    # Invalid email payload
    bad_payload = {
        'defaultCity': 'London',
        'severityThreshold': 'High',
        'temperatureUnit': 'Celsius',
        'emailAddress': 'invalid-email',
        'notificationMethods': {'email': True}
    }
    res_bad = client.post('/api/settings', json=bad_payload)
    assert res_bad.status_code == 400
