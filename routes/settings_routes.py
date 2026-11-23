import re
import json
from flask import request, jsonify
from . import api_bp
from models import db, Setting

EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
VALID_SEVERITIES = {'Low', 'Medium', 'High', 'Critical'}
VALID_UNITS = {'Celsius', 'Fahrenheit'}

@api_bp.route('/settings', methods=['GET'])
def get_settings():
    """
    GET /api/settings
    Retrieves current user alert preferences and system settings.
    """
    setting = Setting.query.first()
    if not setting:
        # Default settings representation
        return jsonify({
            'id': 1,
            'defaultCity': 'New York',
            'severityThreshold': 'Medium',
            'temperatureUnit': 'Celsius',
            'units': 'Celsius',
            'emailAddress': '',
            'notify_email': '',
            'alertTypes': {
                'rainAndFloods': True,
                'thunderstorms': True,
                'extremeHeat': True,
                'highWinds': True,
                'poorAirQuality': False
            },
            'notificationMethods': {
                'browser': True,
                'email': False,
                'sms': False
            }
        }), 200

    return jsonify(setting.to_dict()), 200


@api_bp.route('/settings', methods=['POST'])
def save_settings():
    """
    POST /api/settings
    Validates and persists alert preferences, thresholds, and notification configuration.
    """
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return jsonify({
            'error': 'Bad Request',
            'message': 'Invalid JSON body in request.'
        }), 400

    # Extract fields with support for both camelCase and snake_case
    default_city = data.get('defaultCity') or data.get('default_city')
    severity_threshold = data.get('severityThreshold') or data.get('severity_threshold', 'Medium')
    units = data.get('temperatureUnit') or data.get('units', 'Celsius')
    email = data.get('emailAddress') or data.get('notify_email', '')
    alert_types = data.get('alertTypes') or data.get('alert_types', {})
    notification_methods = data.get('notificationMethods') or data.get('notification_methods', {})

    # Validation errors container
    errors = {}

    # 1. City validation
    if not default_city or not str(default_city).strip():
        errors['defaultCity'] = 'Default city cannot be empty.'
    else:
        default_city = str(default_city).strip()

    # 2. Severity threshold validation
    if severity_threshold not in VALID_SEVERITIES:
        errors['severityThreshold'] = f"Severity threshold must be one of: {', '.join(VALID_SEVERITIES)}."

    # 3. Units validation
    if units not in VALID_UNITS:
        errors['temperatureUnit'] = f"Temperature unit must be one of: {', '.join(VALID_UNITS)}."

    # 4. Email validation
    email_enabled = False
    if isinstance(notification_methods, dict):
        email_enabled = bool(notification_methods.get('email'))
    
    clean_email = str(email).strip() if email else ''
    if email_enabled or clean_email:
        if not clean_email or not EMAIL_REGEX.match(clean_email):
            errors['emailAddress'] = 'Please provide a valid email address.'

    if errors:
        return jsonify({
            'error': 'Validation Failed',
            'message': 'One or more fields failed validation.',
            'errors': errors
        }), 400

    # Persist or update setting
    try:
        setting = Setting.query.first()
        if not setting:
            setting = Setting()
            db.session.add(setting)

        setting.default_city = default_city
        setting.severity_threshold = severity_threshold
        setting.units = units
        setting.notify_email = clean_email if clean_email else None
        setting.alert_types = json.dumps(alert_types) if isinstance(alert_types, dict) else str(alert_types)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Settings saved successfully.',
            'settings': setting.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': f"Failed to persist settings: {str(e)}"
        }), 500
