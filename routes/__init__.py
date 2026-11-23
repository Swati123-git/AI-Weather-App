from flask import Blueprint

api_bp = Blueprint('api', __name__, url_prefix='/api')

from . import weather_routes
from . import alert_routes
from . import settings_routes
