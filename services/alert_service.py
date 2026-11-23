import json
from datetime import datetime, timedelta, timezone
from flask import current_app
from flask_mail import Message
from models import db, City, Alert, Setting
from alert_engine import AlertEngine
from config import Config

class AlertService:
    @staticmethod
    def send_alert_email(alert_dict, recipient_email=None):
        """
        Send notification email for High and Critical alerts using Flask-Mail.
        Gracefully handles unconfigured SMTP or transient network issues.
        """
        mail = current_app.extensions.get('mail')
        if not mail:
            print("[AlertService] Flask-Mail extension not initialized. Skipping email.")
            return False

        # Determine recipient
        if not recipient_email:
            setting = Setting.query.first()
            if setting and setting.notify_email:
                recipient_email = setting.notify_email
            else:
                recipient_email = Config.NOTIFY_EMAIL

        if not recipient_email:
            print("[AlertService] No recipient email specified. Skipping notification.")
            return False

        # Check if SMTP credentials are configured
        if not current_app.config.get('MAIL_USERNAME'):
            print(f"[AlertService] SMTP credentials not configured in .env. Notification logged for {recipient_email}: [{alert_dict.get('severity')}] {alert_dict.get('message')}")
            return False

        severity = alert_dict.get('severity', 'Warning')
        city = alert_dict.get('city', 'Unknown City')
        subject = f"⚠️ [{severity.upper()}] Weather Alert: {alert_dict.get('message')}"
        tips = alert_dict.get('safety_tips', [])
        tips_html = "".join([f"<li>{tip}</li>" for tip in tips])
        tips_text = "\n".join([f"- {tip}" for tip in tips])

        body_text = (
            f"WEATHER ALERT NOTIFICATION\n"
            f"-----------------------------------------\n"
            f"Severity: {severity}\n"
            f"City: {city}\n"
            f"Alert: {alert_dict.get('message')}\n\n"
            f"Explanation:\n{alert_dict.get('explanation')}\n\n"
            f"Recommended Safety Measures:\n{tips_text}\n\n"
            f"Issued by AI-Based Weather Monitoring & Alert System\n"
            f"Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
        )

        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: {'#dc2626' if severity == 'Critical' else '#ea580c'}; margin-top: 0;">
                ⚠️ {severity.upper()} Weather Alert: {city}
            </h2>
            <p style="font-size: 16px; font-weight: bold; color: #1e293b;">
                {alert_dict.get('message')}
            </p>
            <p style="color: #475569; line-height: 1.5;">
                {alert_dict.get('explanation')}
            </p>
            <h4 style="color: #0f172a; margin-bottom: 8px;">Recommended Safety Measures:</h4>
            <ul style="color: #334155; line-height: 1.6;">
                {tips_html}
            </ul>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">
                AI-Based Weather Monitoring & Alert System &bull; Real-time Automated Broadcast
            </p>
        </div>
        """

        try:
            msg = Message(
                subject=subject,
                recipients=[recipient_email],
                body=body_text,
                html=body_html
            )
            mail.send(msg)
            print(f"[AlertService] Email alert sent to {recipient_email} for [{severity}] {alert_dict.get('message')}")
            return True
        except Exception as e:
            print(f"[AlertService] Failed to send email alert to {recipient_email}: {e}")
            return False

    @classmethod
    def evaluate_and_record_alerts(cls, city, weather_data, ml_prediction=None, custom_thresholds=None):
        """
        Evaluate candidate alerts, enforce 3-hour deduplication, persist in SQLite,
        and trigger email notifications for High & Critical severities.
        """
        candidates = AlertEngine.evaluate_thresholds(
            city.name, weather_data, ml_prediction, custom_thresholds=custom_thresholds
        )
        if not candidates:
            return []

        # Fetch recent alerts for this city within the last 3 hours to deduplicate
        three_hours_ago = datetime.now(timezone.utc) - timedelta(hours=3)
        recent_alerts = Alert.query.filter(
            Alert.city_id == city.id,
            Alert.created_at >= three_hours_ago
        ).all()

        new_alerts = []
        for cand in candidates:
            if AlertEngine.is_duplicate(recent_alerts, cand['type'], window_hours=3):
                # Duplicate within 3 hours - skip
                continue

            alert_obj = Alert(
                city_id=city.id,
                type=cand['type'],
                severity=cand['severity'],
                message=cand['message'],
                explanation=cand['explanation'],
                safety_tips=json.dumps(cand['safety_tips']),
                created_at=datetime.now(timezone.utc),
                is_read=False
            )
            db.session.add(alert_obj)
            db.session.flush() # Populate alert_obj.id

            alert_dict = alert_obj.to_dict()
            new_alerts.append(alert_dict)

            # Trigger email for High and Critical alerts
            if cand['severity'] in ('High', 'Critical'):
                cls.send_alert_email(alert_dict)

        if new_alerts:
            db.session.commit()
            print(f"[AlertService] Stored {len(new_alerts)} new alerts for {city.name}.")

        return new_alerts

    @staticmethod
    def get_alerts(city_name=None, severity=None, is_read=None, limit=100):
        """
        Retrieve alerts with optional city and severity filtering.
        """
        query = Alert.query.join(City)

        if city_name and city_name.lower() != 'all':
            query = query.filter(City.name.ilike(city_name.strip()))

        if severity and severity.lower() != 'all':
            query = query.filter(Alert.severity.ilike(severity.strip()))

        if is_read is not None:
            query = query.filter(Alert.is_read == is_read)

        alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
        return [a.to_dict() for a in alerts]

    @staticmethod
    def mark_alert_as_read(alert_id):
        """
        Mark a specific alert as read.
        """
        alert = Alert.query.get(alert_id)
        if not alert:
            return None
        alert.is_read = True
        db.session.commit()
        return alert.to_dict()
