from datetime import datetime, timedelta, timezone

class AlertEngine:
    """
    Core Atmospheric & Machine Learning Weather Alert Evaluation Engine.
    Evaluates physical sensor thresholds and ML predictions to generate structured alerts.
    """

    # Standard safety tips library
    SAFETY_TIPS = {
        'Heatwave': [
            'Drink cool water or electrolytes regularly even before feeling thirsty.',
            'Avoid strenuous outdoor physical exposure between 11:00 AM and 4:30 PM.',
            'Wear lightweight, loose-fitting, light-colored clothing and apply sunscreen.'
        ],
        'Cold Wave': [
            'Wear multiple layers of warm windproof garments and cover extremities.',
            'Protect outdoor water piping from freezing and bursting.',
            'Check on vulnerable family members, neighbors, and keep pets sheltered indoors.'
        ],
        'Heavy Rain': [
            'Do not attempt to drive or walk through flooded roadways or underpasses.',
            'Clear perimeter storm gutters and secure loose outdoor equipment.',
            'Move critical electronics and valuables away from basement level.'
        ],
        'High Wind': [
            'Fasten outdoor furniture, signs, umbrellas, and temporary structures securely.',
            'Exercise extra caution while driving high-profile vehicles across open bridges.',
            'Stay clear of solitary tall trees, utility poles, and decaying power cables.'
        ],
        'Poor AQI': [
            'Wear certified N95 or particulate filtration masks outdoors.',
            'Run indoor HEPA air purifiers and keep residential windows sealed.',
            'Sensitive individuals, children, and seniors should avoid intense outdoor exertion.'
        ],
        'Thunderstorm': [
            'Seek immediate shelter inside a sturdy building or enclosed metal vehicle.',
            'Unplug sensitive electronics and avoid contact with plumbing during lightning.',
            'Stay clear of open water, swimming pools, metallic fences, and elevated ground.'
        ]
    }

    # Configurable default physical thresholds
    HEATWAVE_THRESHOLD = 42.0
    HEATWAVE_CRITICAL = 45.0
    COLDWAVE_THRESHOLD = 5.0
    COLDWAVE_CRITICAL = 0.0
    HEAVY_RAIN_THRESHOLD = 15.0
    HEAVY_RAIN_CRITICAL = 25.0
    HIGH_WIND_THRESHOLD = 60.0
    HIGH_WIND_CRITICAL = 85.0
    POOR_AQI_THRESHOLD = 200.0
    POOR_AQI_CRITICAL = 300.0

    @classmethod
    def evaluate_thresholds(cls, city_name, weather_data, ml_prediction=None, custom_thresholds=None):
        """
        Evaluate weather observations and ML forecasts against alert threshold rules.
        Supports optional custom_thresholds dictionary for simulation and testing.
        Returns a list of alert dictionaries.
        """
        alerts = []
        if not weather_data:
            return alerts

        custom_thresholds = custom_thresholds or {}
        heatwave_limit = custom_thresholds.get('heatwave', cls.HEATWAVE_THRESHOLD)
        heatwave_crit = custom_thresholds.get('heatwave_critical', cls.HEATWAVE_CRITICAL)

        temp = weather_data.get('temperature')
        wind = weather_data.get('windSpeed') or weather_data.get('wind_speed', 0)
        precip = weather_data.get('precipitation', 0.0)
        code = weather_data.get('weatherCode') or weather_data.get('weather_code', 0)
        aqi_obj = weather_data.get('aqi', {})
        aqi = aqi_obj.get('value') if isinstance(aqi_obj, dict) else weather_data.get('aqi')

        # 1. Heatwave Rule (> high-temp threshold)
        if temp is not None and temp > heatwave_limit:
            severity = 'Critical' if temp >= heatwave_crit else 'High'
            alerts.append({
                'type': 'Heatwave',
                'severity': severity,
                'message': f"Extreme Heatwave Alert for {city_name} ({temp:.1f}°C)",
                'explanation': f"Ambient surface temperature reached {temp:.1f}°C, exceeding the safety threshold of {heatwave_limit:.1f}°C.",
                'safety_tips': cls.SAFETY_TIPS['Heatwave']
            })

        # 2. Cold Wave Rule (< 5°C)
        if temp is not None and temp < 5.0:
            severity = 'Critical' if temp <= 0.0 else 'High'
            alerts.append({
                'type': 'Cold Wave',
                'severity': severity,
                'message': f"Freezing Cold Wave Advisory for {city_name} ({temp:.1f}°C)",
                'explanation': f"Surface temperature plummeted to {temp:.1f}°C, dropping below the 5.0°C cold wave threshold.",
                'safety_tips': cls.SAFETY_TIPS['Cold Wave']
            })

        # 3. Heavy Rain Rule (> 80% probability or > 15 mm/h precip)
        # Check current precipitation
        if precip is not None and precip > 15.0:
            severity = 'Critical' if precip >= 25.0 else 'High'
            alerts.append({
                'type': 'Heavy Rain',
                'severity': severity,
                'message': f"Heavy Rainfall & Inundation Warning for {city_name} ({precip:.1f} mm/h)",
                'explanation': f"Instantaneous liquid precipitation reached {precip:.1f} mm/h, surpassing the 15.0 mm/h heavy rain mark.",
                'safety_tips': cls.SAFETY_TIPS['Heavy Rain']
            })

        # 4. High Wind Rule (> 60 km/h)
        if wind is not None and wind > 60.0:
            severity = 'Critical' if wind >= 85.0 else 'High'
            alerts.append({
                'type': 'High Wind',
                'severity': severity,
                'message': f"Gale Force High Wind Advisory for {city_name} ({wind:.1f} km/h)",
                'explanation': f"Sustained 10-meter wind speed accelerated to {wind:.1f} km/h, exceeding the 60.0 km/h threshold.",
                'safety_tips': cls.SAFETY_TIPS['High Wind']
            })

        # 5. Poor AQI Rule (> 200)
        if aqi is not None and aqi > 200:
            severity = 'Critical' if aqi >= 300 else 'High'
            alerts.append({
                'type': 'Poor AQI',
                'severity': severity,
                'message': f"Unhealthy Air Quality Hazard for {city_name} (AQI {aqi})",
                'explanation': f"Air Quality Index elevated to {aqi}, crossing the dangerous threshold of 200.",
                'safety_tips': cls.SAFETY_TIPS['Poor AQI']
            })

        # 6. Thunderstorm WMO Weather Codes (95, 96, 99)
        if code in (95, 96, 99):
            severity = 'Critical' if code == 99 else 'High'
            storm_desc = "Damaging hail and severe squalls" if code == 99 else "Active lightning and convective squalls"
            alerts.append({
                'type': 'Thunderstorm',
                'severity': severity,
                'message': f"Severe Thunderstorm Warning for {city_name}",
                'explanation': f"Synoptic radar detected WMO code {code} ({storm_desc}) impacting the city airspace.",
                'safety_tips': cls.SAFETY_TIPS['Thunderstorm']
            })

        # 7. Machine Learning Predictive Thresholds
        if ml_prediction:
            pred_temp = ml_prediction.get('next_hour_temperature')
            pred_rain_prob = ml_prediction.get('rain_probability')

            # ML Heatwave prediction
            if pred_temp is not None and pred_temp > 42.0:
                severity = 'Critical' if pred_temp >= 45.0 else 'High'
                alerts.append({
                    'type': 'Heatwave',
                    'severity': severity,
                    'message': f"AI Projected Heatwave Surge for {city_name} ({pred_temp:.1f}°C in next hour)",
                    'explanation': f"Random Forest regressor forecasts thermal escalation to {pred_temp:.1f}°C within the next 60 minutes.",
                    'safety_tips': cls.SAFETY_TIPS['Heatwave']
                })

            # ML Cold Wave prediction
            if pred_temp is not None and pred_temp < 5.0:
                severity = 'Critical' if pred_temp <= 0.0 else 'High'
                alerts.append({
                    'type': 'Cold Wave',
                    'severity': severity,
                    'message': f"AI Projected Cold Wave Onset for {city_name} ({pred_temp:.1f}°C in next hour)",
                    'explanation': f"Predictive model indicates rapid downdraft cooling to {pred_temp:.1f}°C in the next hour.",
                    'safety_tips': cls.SAFETY_TIPS['Cold Wave']
                })

            # ML Heavy Rain Probability prediction (> 80%)
            if pred_rain_prob is not None and pred_rain_prob > 80:
                severity = 'Critical' if pred_rain_prob >= 90 else 'High'
                alerts.append({
                    'type': 'Heavy Rain',
                    'severity': severity,
                    'message': f"AI Heavy Rain Warning for {city_name} ({pred_rain_prob}% rain probability)",
                    'explanation': f"Random Forest classifier computed a {pred_rain_prob}% probability of imminent downpours.",
                    'safety_tips': cls.SAFETY_TIPS['Heavy Rain']
                })

        return alerts

    @staticmethod
    def is_duplicate(recent_alerts, alert_type, window_hours=3):
        """
        Check if an alert of the same type was issued for the city within the given window (default 3 hours).
        recent_alerts is a collection of existing alert objects or dicts.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)
        for a in recent_alerts:
            # Handle both model instances and dicts
            a_type = getattr(a, 'type', None) or a.get('type')
            created_at = getattr(a, 'created_at', None) or a.get('created_at')

            if a_type == alert_type and created_at:
                if isinstance(created_at, str):
                    try:
                        created_dt = datetime.fromisoformat(created_at)
                    except Exception:
                        continue
                else:
                    created_dt = created_at

                # Make timezone-aware if naive
                if created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)

                if created_dt >= cutoff:
                    return True
        return False
