import os
import atexit
from datetime import datetime, timezone
from flask import Flask, jsonify
from flask_cors import CORS
from flask_mail import Mail

from config import Config
from models import db, City, Setting, Alert
from routes import api_bp
from scheduler import start_scheduler, shutdown_scheduler
from ml.predict import load_models

mail = Mail()


def create_app(config_class=Config):
    """Application factory for Flask Weather Monitoring Backend."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for the React frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)
    mail.init_app(app)

    # Register API routes blueprint
    app.register_blueprint(api_bp)

    # Consistent JSON error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            'error': 'Bad Request',
            'message': getattr(e, 'description', 'Invalid request parameters or payload.')
        }), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource or endpoint was not found.'
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({
            'error': 'Method Not Allowed',
            'message': 'The HTTP method is not permitted on this endpoint.'
        }), 405

    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected server error occurred. Please try again later.'
        }), 500

    # Initialize database tables and bootstrap data
    with app.app_context():
        db.create_all()

        # Seed default monitored cities if not present
        if not City.query.first():
            print("[Init] Seeding default cities into database...")
            for c_info in Config.DEFAULT_CITIES:
                city = City(
                    name=c_info['name'],
                    lat=c_info['lat'],
                    lon=c_info['lon'],
                    country=c_info.get('country', 'Global')
                )
                db.session.add(city)
            db.session.commit()

        # Seed default settings if not present
        if not Setting.query.first():
            setting = Setting(
                default_city='New York',
                severity_threshold='Medium',
                units='Celsius',
                alert_types='{"rainAndFloods": true, "thunderstorms": true, "extremeHeat": true, "highWinds": true, "poorAirQuality": false}'
            )
            db.session.add(setting)
            db.session.commit()

        # Preload ML models at server startup
        print("[Init] Loading Machine Learning models into memory...")
        load_models()
        print("[Init] ML models ready for inference.")

    # Start APScheduler (unless in testing mode or reloader child)
    if not app.config.get('TESTING') and not os.environ.get('WERKZEUG_RUN_MAIN') == 'false':
        start_scheduler(app)
        atexit.register(shutdown_scheduler)

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 AI Weather Monitoring Backend running on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
