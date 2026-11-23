from datetime import datetime, timezone
from flask import request, jsonify
from . import api_bp
from services.weather_service import WeatherService, FALLBACK_CITIES
from ml.predict import predict_weather
from models import db, City, WeatherReading
from services.alert_service import AlertService

@api_bp.route('/health', methods=['GET'])
def health_check():
    """System health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'AI-Based Weather Monitoring and Alert System',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.0.0'
    }), 200


@api_bp.route('/weather', methods=['GET'])
def get_weather():
    """
    GET /api/weather?city=
    Retrieves current weather observations and air quality metrics.
    """
    city_name = request.args.get('city', 'New York').strip()
    if not city_name:
        return jsonify({
            'error': 'Bad Request',
            'message': "The 'city' query parameter cannot be empty."
        }), 400

    try:
        data = WeatherService.get_current_weather(city_name)
        
        # Ensure city exists in db and log a reading if registered
        city_obj = City.query.filter(City.name.ilike(data['city'])).first()
        if not city_obj:
            city_obj = City(
                name=data['city'],
                lat=data['coordinates']['lat'],
                lon=data['coordinates']['lon'],
                country=data.get('country', 'Global')
            )
            db.session.add(city_obj)
            db.session.commit()

        # Opportunistic reading storage & alert check
        reading = WeatherReading(
            city_id=city_obj.id,
            timestamp=datetime.now(timezone.utc),
            temperature=data['temperature'],
            humidity=data['humidity'],
            pressure=data['pressure'],
            wind_speed=data['windSpeed'],
            cloud_cover=data['cloudCover'],
            precipitation=data.get('precipitation', 0.0),
            aqi=data.get('aqi', {}).get('value')
        )
        db.session.add(reading)

        # ML check
        ml_pred = predict_weather({
            'temperature': data['temperature'],
            'humidity': data['humidity'],
            'pressure': data['pressure'],
            'wind_speed': data['windSpeed'],
            'cloud_cover': data['cloudCover']
        })
        AlertService.evaluate_and_record_alerts(city_obj, data, ml_pred)
        db.session.commit()

        return jsonify(data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': f"Failed to retrieve weather for '{city_name}': {str(e)}"
        }), 500


@api_bp.route('/forecast', methods=['GET'])
def get_forecast():
    """
    GET /api/forecast?city=
    Retrieves 24-hour hourly and 5-day synoptic forecast.
    """
    city_name = request.args.get('city', 'New York').strip()
    if not city_name:
        return jsonify({
            'error': 'Bad Request',
            'message': "The 'city' query parameter cannot be empty."
        }), 400

    try:
        data = WeatherService.get_forecast(city_name)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            'error': 'Internal Server Error',
            'message': f"Failed to retrieve forecast for '{city_name}': {str(e)}"
        }), 500


@api_bp.route('/predict', methods=['GET'])
def get_prediction():
    """
    GET /api/predict?city=
    Generates AI-driven precipitation and 1-hour temperature predictions.
    Returns { rain_probability, next_hour_temperature, confidence } plus extended model metrics.
    """
    city_name = request.args.get('city', 'New York').strip()
    if not city_name:
        return jsonify({
            'error': 'Bad Request',
            'message': "The 'city' query parameter cannot be empty."
        }), 400

    try:
        # Fetch current conditions for the city to feed feature pipeline
        weather_data = WeatherService.get_current_weather(city_name)
        
        # Calculate pressure change from previous reading if available
        pressure_change = 0.0
        city_obj = City.query.filter(City.name.ilike(weather_data['city'])).first()
        if city_obj:
            past_readings = WeatherReading.query.filter(
                WeatherReading.city_id == city_obj.id
            ).order_by(WeatherReading.timestamp.desc()).limit(2).all()
            if len(past_readings) >= 2:
                pressure_change = round(past_readings[0].pressure - past_readings[1].pressure, 2)

        features = {
            'temperature': weather_data.get('temperature', 20.0),
            'humidity': weather_data.get('humidity', 60.0),
            'pressure': weather_data.get('pressure', 1013.25),
            'pressure_change': pressure_change,
            'wind_speed': weather_data.get('windSpeed', 15.0),
            'cloud_cover': weather_data.get('cloudCover', 40.0)
        }

        prediction = predict_weather(features)
        prediction['city'] = weather_data['city']
        prediction['timestamp'] = datetime.now(timezone.utc).isoformat()

        return jsonify(prediction), 200
    except Exception as e:
        return jsonify({
            'error': 'Internal Server Error',
            'message': f"Prediction calculation failed: {str(e)}"
        }), 500


@api_bp.route('/history', methods=['GET'])
def get_history():
    """
    GET /api/history?city=&days=7
    Retrieves historical temperature, precipitation, and incident telemetry.
    """
    city_name = request.args.get('city', 'New York').strip()
    days_param = request.args.get('days', '7').strip()

    try:
        days = int(days_param)
        if days < 1 or days > 90:
            days = 7
    except ValueError:
        days = 7

    try:
        data = WeatherService.get_history(city_name, days=days)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            'error': 'Internal Server Error',
            'message': f"Failed to retrieve history for '{city_name}': {str(e)}"
        }), 500


@api_bp.route('/cities/search', methods=['GET'])
def search_cities():
    """
    GET /api/cities/search?q=<query>&limit=<n>
    Returns city name suggestions from the Open-Meteo Geocoding API and the
    built-in fallback registry for fast offline autocomplete support.
    """
    query = request.args.get('q', '').strip()
    limit = min(int(request.args.get('limit', 8)), 20)

    if not query or len(query) < 2:
        return jsonify([]), 200

    suggestions = []

    # 1. Offline fallback registry (instant response while API loads)
    for key, info in FALLBACK_CITIES.items():
        if query.lower() in key:
            suggestions.append({
                'name': info['name'],
                'country': info['country'],
                'lat': info['lat'],
                'lon': info['lon']
            })

    # 2. Try the Open-Meteo Geocoding API for broader coverage
    try:
        import requests as _req
        url = (
            f"https://geocoding-api.open-meteo.com/v1/search"
            f"?name={query}&count={limit}&language=en&format=json"
        )
        resp = _req.get(url, timeout=4)
        if resp.status_code == 200:
            results = resp.json().get('results', [])
            seen = {s['name'].lower() for s in suggestions}
            for r in results:
                city_name = r.get('name', '')
                country = r.get('country', '')
                display = f"{city_name}, {country}" if country else city_name
                if city_name.lower() not in seen:
                    suggestions.append({
                        'name': city_name,
                        'display': display,
                        'country': country,
                        'lat': r.get('latitude'),
                        'lon': r.get('longitude')
                    })
                    seen.add(city_name.lower())
    except Exception:
        pass  # Offline graceful degrade — return fallback results only

    return jsonify(suggestions[:limit]), 200
