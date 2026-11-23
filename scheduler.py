from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from models import db, City, WeatherReading
from services.weather_service import WeatherService
from services.alert_service import AlertService
from ml.predict import predict_weather
from config import Config

_scheduler = None

def fetch_and_record_all_cities(app):
    """
    Scheduled task that retrieves live weather data for all registered cities,
    stores historical readings in SQLite, runs ML inference, and triggers alerts.
    """
    with app.app_context():
        cities = City.query.all()
        if not cities:
            # Seed default cities if empty
            for c_info in Config.DEFAULT_CITIES:
                city_obj = City(
                    name=c_info['name'],
                    lat=c_info['lat'],
                    lon=c_info['lon'],
                    country=c_info.get('country', 'Global')
                )
                db.session.add(city_obj)
            db.session.commit()
            cities = City.query.all()

        print(f"[Scheduler] Running 30-minute weather update for {len(cities)} cities...")
        for city in cities:
            try:
                # 1. Fetch current weather
                w_data = WeatherService.get_current_weather(city.name)
                
                # 2. Extract AQI value safely
                aqi_val = None
                if isinstance(w_data.get('aqi'), dict):
                    aqi_val = w_data['aqi'].get('value')
                elif isinstance(w_data.get('aqi'), (int, float)):
                    aqi_val = w_data['aqi']

                # 3. Save reading in SQLite
                reading = WeatherReading(
                    city_id=city.id,
                    timestamp=datetime.now(timezone.utc),
                    temperature=float(w_data.get('temperature', 20.0)),
                    humidity=float(w_data.get('humidity', 60.0)),
                    pressure=float(w_data.get('pressure', 1013.0)),
                    wind_speed=float(w_data.get('windSpeed', 15.0)),
                    cloud_cover=float(w_data.get('cloudCover', 40.0)),
                    precipitation=float(w_data.get('precipitation', 0.0)),
                    aqi=float(aqi_val) if aqi_val is not None else None
                )
                db.session.add(reading)

                # 4. Run ML predictions
                ml_pred = predict_weather({
                    'temperature': w_data.get('temperature', 20.0),
                    'humidity': w_data.get('humidity', 60.0),
                    'pressure': w_data.get('pressure', 1013.0),
                    'wind_speed': w_data.get('windSpeed', 15.0),
                    'cloud_cover': w_data.get('cloudCover', 40.0)
                })

                # 5. Evaluate and record alerts with 3-hour deduplication
                AlertService.evaluate_and_record_alerts(city, w_data, ml_pred)

            except Exception as e:
                print(f"[Scheduler] Error processing weather for {city.name}: {e}")

        try:
            db.session.commit()
            print("[Scheduler] 30-minute weather telemetry cycle successfully completed.")
        except Exception as e:
            db.session.rollback()
            print(f"[Scheduler] Database commit error: {e}")


def start_scheduler(app):
    """Initialize and start the background APScheduler."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    interval = getattr(Config, 'SCHEDULER_INTERVAL_MINUTES', 30)
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        func=fetch_and_record_all_cities,
        args=[app],
        trigger='interval',
        minutes=interval,
        id='weather_update_job',
        replace_existing=True
    )
    _scheduler.start()
    print(f"[Scheduler] APScheduler started (interval: {interval} minutes).")
    return _scheduler


def shutdown_scheduler():
    """Gracefully shutdown scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("[Scheduler] APScheduler stopped.")
