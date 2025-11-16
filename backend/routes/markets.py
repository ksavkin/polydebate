"""
Markets routes - Polymarket integration endpoints
"""
from flask import Blueprint, request, jsonify
from services.polymarket import polymarket_service

markets_bp = Blueprint('markets', __name__)


@markets_bp.route('/markets', methods=['GET'])
def get_markets():
    """GET /api/markets - Fetch markets list"""
    try:
        # Parse query parameters
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        tag_id = request.args.get('tag_id', None)
        closed = request.args.get('closed', 'false').lower() == 'true'

        # Validate
        limit = min(limit, 100)
        offset = max(offset, 0)

        # Fetch markets
        result = polymarket_service.get_markets(
            limit=limit,
            offset=offset,
            tag_id=tag_id,
            closed=closed
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'external_api_error',
                'message': str(e)
            }
        }), 503


@markets_bp.route('/markets/<market_id>', methods=['GET'])
def get_market(market_id):
    """GET /api/markets/<market_id> - Fetch market details"""
    try:
        market = polymarket_service.get_market(market_id)
        return jsonify(market), 200

    except Exception as e:
        error_msg = str(e)
        if 'not found' in error_msg.lower():
            return jsonify({
                'error': {
                    'code': 'market_not_found',
                    'message': error_msg
                }
            }), 404

        return jsonify({
            'error': {
                'code': 'external_api_error',
                'message': error_msg
            }
        }), 503


@markets_bp.route('/categories', methods=['GET'])
def get_categories():
    """GET /api/categories - Fetch categories/tags"""
    try:
        categories = polymarket_service.get_categories()
        return jsonify({'categories': categories}), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'external_api_error',
                'message': str(e)
            }
        }), 503
