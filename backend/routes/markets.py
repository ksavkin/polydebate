"""
Markets routes - Polymarket integration endpoints
"""
from flask import Blueprint, request, jsonify
from services.polymarket import polymarket_service
from models.debate import Debate

markets_bp = Blueprint('markets', __name__)


@markets_bp.route('/markets', methods=['GET'])
def get_markets():
    """GET /api/markets - Fetch markets list"""
    try:
        # Parse query parameters
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        category = request.args.get('category', None)  # New: category slug filter
        tag_id = request.args.get('tag_id', None)
        closed = request.args.get('closed', 'false').lower() == 'true'

        # Validate
        limit = min(limit, 100)
        offset = max(offset, 0)

        # Fetch markets
        result = polymarket_service.get_markets(
            limit=limit,
            offset=offset,
            category=category,
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


@markets_bp.route('/markets/<market_id>/debates', methods=['GET'])
def get_market_debates(market_id):
    """GET /api/markets/<market_id>/debates - Get debates for a specific market"""
    try:
        # Parse query parameters
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        status = request.args.get('status', 'all')

        # Validate
        limit = min(limit, 100)
        offset = max(offset, 0)

        # Get all debates and filter by market_id
        all_debates = Debate.list_all()
        market_debates = [d for d in all_debates if d.get('market_id') == market_id]

        # Filter by status if specified
        if status != 'all':
            market_debates = [d for d in market_debates if d.get('status') == status]

        # Apply pagination
        total = len(market_debates)
        paginated_debates = market_debates[offset:offset + limit]

        # Get market details
        try:
            market = polymarket_service.get_market(market_id)
            market_info = {
                'id': market_id,
                'question': market.get('question', ''),
                'current_odds': {
                    outcome['name']: outcome['price']
                    for outcome in market.get('outcomes', [])
                }
            }
        except:
            # If market not found in Polymarket, use basic info from debates
            market_info = {
                'id': market_id,
                'question': paginated_debates[0].get('market_question', '') if paginated_debates else '',
                'current_odds': {}
            }

        return jsonify({
            'market': market_info,
            'debates': paginated_debates,
            'total': total,
            'offset': offset,
            'limit': limit
        }), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': str(e)
            }
        }), 500


@markets_bp.route('/markets/<path>', methods=['GET'])
def get_market_or_category(path):
    """GET /api/markets/<path> - Fetch market details or category markets"""
    try:
        # Check if path is a category slug (non-numeric)
        if not path.isdigit():
            # Treat as category slug
            limit = request.args.get('limit', 100, type=int)
            offset = request.args.get('offset', 0, type=int)
            closed = request.args.get('closed', 'false').lower() == 'true'

            # Validate
            limit = min(limit, 100)
            offset = max(offset, 0)

            # Fetch markets by category
            result = polymarket_service.get_markets(
                limit=limit,
                offset=offset,
                category=path,
                tag_id=None,
                closed=closed
            )

            return jsonify(result), 200

        # Otherwise, treat as market ID
        market = polymarket_service.get_market(path)
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
