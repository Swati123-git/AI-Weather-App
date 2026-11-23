"""
AeroPulse AI — Demo Weather Alert Generator
Reads the latest temperature from the database or API, sets a threshold slightly
BELOW it (triggering a high-temperature alert in the dashboard and incident center),
and provides a flag to clean up demo alerts afterwards.

Usage:
  python demo_alert.py                  # Generates demo alert below current temperature
  python demo_alert.py --city Lucknow   # Targets a specific city
  python demo_alert.py --cleanup        # Removes demo alerts and resets threshold
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from app import create_app
from models import db, City, WeatherReading, Alert, Setting
from alert_engine import AlertEngine
from services.weather_service import WeatherService
from services.alert_service import AlertService


def run_cleanup():
    """Removes all generated demo alerts and resets custom demo thresholds."""
    app = create_app()
    with app.app_context():
        # 1. Delete demo alerts
        demo_alerts = Alert.query.filter(
            (Alert.message.like('%DEMO ALERT%')) |
            (Alert.explanation.like('%DEMO ALERT%'))
        ).all()
        count = len(demo_alerts)

        for a in demo_alerts:
            db.session.delete(a)

        # 2. Reset setting demo threshold if stored
        setting = Setting.query.first()
        if setting:
            types = setting.get_alert_types_dict()
            if 'demo_high_temp_threshold' in types:
                del types['demo_high_temp_threshold']
                setting.alert_types = json.dumps(types)

        db.session.commit()

        print("=" * 72)
        print(" 🧹 AeroPulse AI — Demo Alert Cleanup")
        print("=" * 72)
        print(f" ✓ Removed {count} demo alert(s) from the SQLite database.")
        print(f" ✓ Standard temperature alert threshold restored to default (42.0°C).")
        print(f" ✓ Dashboard at http://localhost:5173 is back to standard live telemetry.")
        print("=" * 72 + "\n")


def trigger_demo_alert(city_name=None, delta_below=2.0):
    """
    Reads the latest temperature for the target city, configures a threshold
    slightly BELOW it, triggers the alert engine, and saves to database.
    """
    app = create_app()
    with app.app_context():
        # 1. Identify target city
        if not city_name:
            setting = Setting.query.first()
            if setting and setting.default_city:
                city_name = setting.default_city
            else:
                city_name = 'Lucknow'

        city_obj = City.query.filter(City.name.ilike(city_name.strip())).first()
        if not city_obj:
            # Check if city is known in weather service
            coords = WeatherService.geocode_city(city_name)
            city_obj = City(
                name=coords['name'],
                lat=coords['lat'],
                lon=coords['lon'],
                country=coords.get('country', 'Global')
            )
            db.session.add(city_obj)
            db.session.commit()

        # 2. Fetch latest temperature reading
        latest_reading = WeatherReading.query.filter_by(city_id=city_obj.id).order_by(
            WeatherReading.timestamp.desc()
        ).first()

        latest_temp = None
        if latest_reading:
            latest_temp = latest_reading.temperature
            print(f"[Telemetry] Read latest recorded temperature from database: {latest_temp:.1f}°C")
        else:
            print(f"[Telemetry] Fetching current real-time weather observation for {city_obj.name}...")
            weather_data = WeatherService.get_current_weather(city_obj.name)
            latest_temp = weather_data.get('temperature', 25.0)
            print(f"[Telemetry] Live observed temperature: {latest_temp:.1f}°C")

        # 3. Create threshold slightly BELOW the latest temperature
        demo_threshold = round(latest_temp - delta_below, 1)

        # 4. Update setting preferences with the active demo threshold
        setting = Setting.query.first()
        if not setting:
            setting = Setting(default_city=city_obj.name)
            db.session.add(setting)

        alert_types = setting.get_alert_types_dict()
        alert_types['demo_high_temp_threshold'] = demo_threshold
        setting.alert_types = json.dumps(alert_types)

        # 5. Build synthetic weather payload exceeding the demo threshold
        simulated_weather = {
            'temperature': latest_temp,
            'windSpeed': 18.0,
            'precipitation': 0.0,
            'weatherCode': 1,
            'aqi': {'value': 48}
        }

        # 6. Evaluate via AlertEngine with the custom high-temperature threshold
        custom_thresholds = {
            'heatwave': demo_threshold,
            'heatwave_critical': demo_threshold + 4.0
        }

        severity = 'Critical' if latest_temp >= (demo_threshold + 4.0) else 'High'

        # Create the alert record
        alert = Alert(
            city_id=city_obj.id,
            type='Heatwave',
            severity=severity,
            message=f"[DEMO ALERT] High Temperature Threshold Exceeded for {city_obj.name} ({latest_temp:.1f}°C > {demo_threshold:.1f}°C)",
            explanation=(
                f"DEMO ALERT: Current ambient temperature ({latest_temp:.1f}°C) exceeded the configured "
                f"demo high-limit safety threshold of {demo_threshold:.1f}°C by {latest_temp - demo_threshold:.1f}°C."
            ),
            safety_tips=json.dumps(AlertEngine.SAFETY_TIPS['Heatwave']),
            created_at=datetime.now(timezone.utc),
            is_read=False
        )
        db.session.add(alert)
        db.session.commit()

        # 7. Print summary
        print("\n" + "=" * 78)
        print(" 🚨 AeroPulse AI — DEMO WEATHER ALERT TRIGGERED")
        print("=" * 78)
        print(f" Target Metropolis          : {city_obj.name} ({city_obj.lat}°N, {city_obj.lon}°E)")
        print(f" Current Temperature        : {latest_temp:.1f}°C")
        print(f" Configured Demo Threshold  : {demo_threshold:.1f}°C ({delta_below:.1f}°C below current)")
        print(f" Condition Exceeded         : {latest_temp:.1f}°C > {demo_threshold:.1f}°C (Threshold Tripped)")
        print("-" * 78)
        print(f" Alert ID                   : #{alert.id}")
        print(f" Alert Severity             : {severity.upper()}")
        print(f" Alert Headline             : {alert.message}")
        print(f" Diagnostic Reasoning       : {alert.explanation}")
        print("-" * 78)
        print(f" 🌐 Web Dashboard Preview   : http://localhost:5173/alerts")
        print(f" 🗺️ Interactive Radar Map   : http://localhost:5173/map")
        print(f" 🎛️ Main Telemetry Hub      : http://localhost:5173/")
        print("-" * 78)
        print(f" To remove this demo alert and reset thresholds, run:")
        print(f"   python demo_alert.py --cleanup")
        print("=" * 78 + "\n")

        return alert.to_dict()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="AeroPulse AI Demo Alert Generator")
    parser.add_argument('--city', type=str, default=None, help="Target city for alert (default: active station)")
    parser.add_argument('--delta', type=float, default=2.0, help="Degrees below current temp to place threshold (default: 2.0°C)")
    parser.add_argument('--cleanup', '--remove', action='store_true', help="Remove demo alert and reset threshold")
    args = parser.parse_args()

    if args.cleanup:
        run_cleanup()
    else:
        trigger_demo_alert(city_name=args.city, delta_below=args.delta)
