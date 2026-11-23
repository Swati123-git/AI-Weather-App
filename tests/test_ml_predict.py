import pytest
from ml.predict import predict_weather, load_models, extract_features

def test_load_models():
    temp_model, rain_model, metadata = load_models()
    assert temp_model is not None
    assert rain_model is not None
    assert isinstance(metadata, dict)

def test_extract_features():
    raw_data = {
        'temperature': 28.5,
        'humidity': 85.0,
        'pressure': 1002.5,
        'pressure_change': -2.5,
        'wind_speed': 35.0,
        'cloud_cover': 90.0,
        'hour_of_day': 14,
        'month': 7
    }
    df = extract_features(raw_data)
    assert len(df) == 1
    assert df.loc[0, 'temperature'] == 28.5
    assert df.loc[0, 'pressure_change'] == -2.5

def test_predict_weather_rain_scenario():
    # Rainy conditions: high humidity, low pressure, high cloud cover
    features = {
        'temperature': 19.0,
        'humidity': 92.0,
        'pressure': 995.0,
        'pressure_change': -4.0,
        'wind_speed': 25.0,
        'cloud_cover': 95.0
    }
    prediction = predict_weather(features)
    assert 'rain_probability' in prediction
    assert 'next_hour_temperature' in prediction
    assert 'confidence' in prediction
    assert 'rainPrediction' in prediction
    assert 'temperaturePrediction' in prediction
    assert 'riskLevel' in prediction
    assert prediction['rain_probability'] >= 0 and prediction['rain_probability'] <= 100
    assert prediction['confidence'] >= 0 and prediction['confidence'] <= 100

def test_predict_weather_clear_scenario():
    # Dry/clear conditions: low humidity, high pressure, 0 cloud cover
    features = {
        'temperature': 25.0,
        'humidity': 30.0,
        'pressure': 1025.0,
        'pressure_change': 1.5,
        'wind_speed': 8.0,
        'cloud_cover': 5.0
    }
    prediction = predict_weather(features)
    assert prediction['rain_probability'] <= 50
    assert prediction['riskLevel'] in ['Low', 'Medium', 'High', 'Critical']
