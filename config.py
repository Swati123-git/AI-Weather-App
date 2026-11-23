import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

class Config:
    """Base application configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-ai-weather-2026')
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    
    # Database
    db_path = BASE_DIR / 'weather_system.db'
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', f'sqlite:///{db_path}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Open-Meteo Cache (10 minutes)
    CACHE_TIMEOUT = int(os.getenv('CACHE_TIMEOUT', 600))
    
    # Scheduler interval in minutes
    SCHEDULER_INTERVAL_MINUTES = int(os.getenv('SCHEDULER_INTERVAL_MINUTES', 30))
    
    # Flask-Mail / SMTP settings
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False').lower() in ('true', '1', 't')
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', None)
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', None)
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'weather-alerts@ai-monitoring.org')
    NOTIFY_EMAIL = os.getenv('NOTIFY_EMAIL', 'admin@example.com')
    
    # Default monitoring cities
    DEFAULT_CITIES = [
        {'name': 'New York', 'lat': 40.7128, 'lon': -74.0060, 'country': 'USA'},
        {'name': 'London', 'lat': 51.5074, 'lon': -0.1278, 'country': 'UK'},
        {'name': 'Tokyo', 'lat': 35.6762, 'lon': 139.6503, 'country': 'Japan'},
        {'name': 'Paris', 'lat': 48.8566, 'lon': 2.3522, 'country': 'France'},
        {'name': 'Mumbai', 'lat': 19.0760, 'lon': 72.8777, 'country': 'India'},
        {'name': 'Sydney', 'lat': -33.8688, 'lon': 151.2093, 'country': 'Australia'},
        {'name': 'San Francisco', 'lat': 37.7749, 'lon': -122.4194, 'country': 'USA'},
        {'name': 'Berlin', 'lat': 52.5200, 'lon': 13.4050, 'country': 'Germany'},
        {'name': 'Singapore', 'lat': 1.3521, 'lon': 103.8198, 'country': 'Singapore'},
        {'name': 'Dubai', 'lat': 25.2048, 'lon': 55.2708, 'country': 'UAE'},
        {'name': 'Lucknow', 'lat': 26.8500, 'lon': 80.9500, 'country': 'India'}
    ]


class TestConfig(Config):
    """Configuration for automated test execution."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    DEBUG = False
    CACHE_TIMEOUT = 0

