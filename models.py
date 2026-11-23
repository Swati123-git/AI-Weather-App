import json
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def utc_now():
    return datetime.now(timezone.utc)

class City(db.Model):
    """Monitored Cities Table"""
    __tablename__ = 'cities'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    lat = db.Column(db.Float, nullable=False)
    lon = db.Column(db.Float, nullable=False)
    country = db.Column(db.String(100), default='Global')
    created_at = db.Column(db.DateTime, default=utc_now)

    # Relationships
    readings = db.relationship('WeatherReading', backref='city', lazy=True, cascade='all, delete-orphan')
    alerts = db.relationship('Alert', backref='city', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'lat': self.lat,
            'lon': self.lon,
            'country': self.country,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class WeatherReading(db.Model):
    """Weather Readings History Table"""
    __tablename__ = 'weather_readings'

    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey('cities.id'), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=utc_now, index=True)
    temperature = db.Column(db.Float, nullable=False)
    humidity = db.Column(db.Float, nullable=False)
    pressure = db.Column(db.Float, nullable=False)
    wind_speed = db.Column(db.Float, nullable=False)
    cloud_cover = db.Column(db.Float, nullable=False)
    precipitation = db.Column(db.Float, nullable=False, default=0.0)
    aqi = db.Column(db.Float, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'city_id': self.city_id,
            'city_name': self.city.name if self.city else None,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'pressure': self.pressure,
            'wind_speed': self.wind_speed,
            'cloud_cover': self.cloud_cover,
            'precipitation': self.precipitation,
            'aqi': self.aqi
        }


class Alert(db.Model):
    """Atmospheric & ML Weather Alerts Table"""
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey('cities.id'), nullable=False, index=True)
    type = db.Column(db.String(100), nullable=False, index=True)  # Heatwave, Heavy Rain, etc.
    severity = db.Column(db.String(50), nullable=False)          # Low, Medium, High, Critical
    message = db.Column(db.String(255), nullable=False)          # Alert title / message
    explanation = db.Column(db.Text, nullable=False)             # Cause / diagnostic reasoning
    safety_tips = db.Column(db.Text, nullable=False)             # JSON array or string
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now, index=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)

    def get_safety_tips_list(self):
        """Parse safety tips from JSON string or text lines."""
        if not self.safety_tips:
            return []
        try:
            parsed = json.loads(self.safety_tips)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
        return [tip.strip() for tip in self.safety_tips.split('\n') if tip.strip()]

    def to_dict(self):
        tips = self.get_safety_tips_list()
        city_name = self.city.name if self.city else 'Unknown'
        lat = self.city.lat if self.city else None
        lon = self.city.lon if self.city else None

        return {
            'id': str(self.id),
            'numeric_id': self.id,
            'city_id': self.city_id,
            'city': city_name,
            'type': self.type,
            'category': self.type,
            'severity': self.severity,
            'message': self.message,
            'title': self.message,
            'explanation': self.explanation,
            'aiExplanation': self.explanation,
            'safety_tips': tips,
            'safetyTips': tips,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'timestamp': self.created_at.isoformat() if self.created_at else None,
            'is_read': self.is_read,
            'isRead': self.is_read,
            'coordinates': {'lat': lat, 'lon': lon} if lat is not None else None
        }


class Setting(db.Model):
    """User Settings & Preferences Table"""
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True)
    alert_types = db.Column(db.Text, nullable=False, default='{}')
    severity_threshold = db.Column(db.String(50), nullable=False, default='Medium')
    default_city = db.Column(db.String(100), nullable=False, default='New York')
    units = db.Column(db.String(20), nullable=False, default='Celsius')
    notify_email = db.Column(db.String(120), nullable=True)

    def get_alert_types_dict(self):
        try:
            return json.loads(self.alert_types) if self.alert_types else {}
        except Exception:
            return {}

    def to_dict(self):
        types = self.get_alert_types_dict()
        return {
            'id': self.id,
            'alert_types': types,
            'alertTypes': types,
            'severity_threshold': self.severity_threshold,
            'severityThreshold': self.severity_threshold,
            'default_city': self.default_city,
            'defaultCity': self.default_city,
            'units': self.units,
            'temperatureUnit': self.units,
            'notify_email': self.notify_email,
            'emailAddress': self.notify_email,
            'notificationMethods': {
                'browser': True,
                'email': bool(self.notify_email),
                'sms': False
            }
        }
