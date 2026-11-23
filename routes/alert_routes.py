from flask import request, jsonify
from . import api_bp
from services.alert_service import AlertService
from models import db, Alert

@api_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """
    GET /api/alerts?severity=&city=
    Retrieves active alerts filtered by severity or city.
    """
    severity = request.args.get('severity')
    city = request.args.get('city')
    is_read_param = request.args.get('is_read')

    is_read = None
    if is_read_param is not None:
        is_read = is_read_param.lower() in ('true', '1')

    try:
        alerts = AlertService.get_alerts(city_name=city, severity=severity, is_read=is_read)
        return jsonify(alerts), 200
    except Exception as e:
        return jsonify({
            'error': 'Internal Server Error',
            'message': f"Failed to retrieve alerts: {str(e)}"
        }), 500


@api_bp.route('/alerts/<alert_id>/read', methods=['PATCH'])
def mark_alert_read(alert_id):
    """
    PATCH /api/alerts/<id>/read
    Marks an alert as read. Accepts both integer IDs (e.g. 1) and prefixed IDs (e.g. 'alt-001').
    """
    # Clean ID
    clean_id = alert_id.strip()
    if clean_id.lower().startswith('alt-'):
        clean_id = clean_id.split('-')[-1].lstrip('0') or '0'

    try:
        numeric_id = int(clean_id)
    except ValueError:
        return jsonify({
            'error': 'Bad Request',
            'message': f"Invalid alert ID format: '{alert_id}'."
        }), 400

    alert = db.session.get(Alert, numeric_id)
    if not alert:
        return jsonify({
            'error': 'Not Found',
            'message': f"Alert with ID '{alert_id}' not found."
        }), 404

    try:
        alert.is_read = True
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f"Alert {alert_id} marked as read.",
            'alert': alert.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': f"Failed to mark alert as read: {str(e)}"
        }), 500
