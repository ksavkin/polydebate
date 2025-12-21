"""
Models routes - AI models endpoints
"""
from flask import Blueprint, jsonify
from services.openrouter import openrouter_service

models_bp = Blueprint('models', __name__)


@models_bp.route('/models', methods=['GET'])
def get_models():
    """GET /api/models - Fetch available AI models"""
    try:
        result = openrouter_service.get_available_models(max_price_per_million=15.0)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'external_api_error',
                'message': str(e)
            }
        }), 503
