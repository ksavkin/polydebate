"""
Favorites routes - User bookmarks for markets
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
from utils.auth import require_auth, optional_auth
from utils.logger import get_auth_logger
from database import get_db
from models.favorite import UserFavorite
from sqlalchemy.exc import IntegrityError

# Create blueprint
favorites_bp = Blueprint('favorites', __name__)
logger = get_auth_logger()


@favorites_bp.route('/favorites', methods=['GET'])
@require_auth
def get_user_favorites(current_user):
    """
    GET /api/favorites - Get all favorites for authenticated user

    Returns list of market_ids that user has bookmarked
    """
    try:
        db = get_db()
        try:
            # Get all favorites for this user
            favorites = db.query(UserFavorite).filter(
                UserFavorite.user_id == current_user.id
            ).order_by(UserFavorite.created_at.desc()).all()

            # Return list of favorites with full data
            favorites_list = [{
                'id': fav.id,
                'market_id': fav.market_id,
                'created_at': fav.created_at.isoformat() + 'Z'
            } for fav in favorites]

            return jsonify({
                'success': True,
                'data': {
                    'favorites': favorites_list,
                    'total': len(favorites_list)
                }
            }), 200

        finally:
            db.close()

    except Exception as e:
        logger.exception(f"Error getting favorites: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'Failed to retrieve favorites'
            }
        }), 500


@favorites_bp.route('/favorites', methods=['POST'])
@require_auth
def add_favorite(current_user):
    """
    POST /api/favorites - Add market to favorites

    Request body:
    {
        "market_id": "string"
    }
    """
    try:
        data = request.get_json()
        market_id = data.get('market_id')

        if not market_id:
            return jsonify({
                'error': {
                    'code': 'validation_error',
                    'message': 'market_id is required'
                }
            }), 400

        db = get_db()
        try:
            # Check if already favorited
            existing = db.query(UserFavorite).filter(
                UserFavorite.user_id == current_user.id,
                UserFavorite.market_id == market_id
            ).first()

            if existing:
                return jsonify({
                    'success': True,
                    'message': 'Market already in favorites',
                    'data': existing.to_dict()
                }), 200

            # Create new favorite
            new_favorite = UserFavorite(
                user_id=current_user.id,
                market_id=market_id,
                created_at=datetime.utcnow()
            )

            db.add(new_favorite)
            db.commit()
            db.refresh(new_favorite)

            logger.info(
                f"Market added to favorites",
                user_id=current_user.id,
                market_id=market_id,
                event='favorite_added'
            )

            return jsonify({
                'success': True,
                'message': 'Market added to favorites',
                'data': new_favorite.to_dict()
            }), 201

        except IntegrityError:
            db.rollback()
            return jsonify({
                'error': {
                    'code': 'already_exists',
                    'message': 'Market already in favorites'
                }
            }), 400

        finally:
            db.close()

    except Exception as e:
        logger.exception(f"Error adding favorite: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'Failed to add favorite'
            }
        }), 500


@favorites_bp.route('/favorites/<market_id>', methods=['DELETE'])
@require_auth
def remove_favorite(current_user, market_id):
    """
    DELETE /api/favorites/<market_id> - Remove market from favorites
    """
    try:
        db = get_db()
        try:
            # Find favorite
            favorite = db.query(UserFavorite).filter(
                UserFavorite.user_id == current_user.id,
                UserFavorite.market_id == market_id
            ).first()

            if not favorite:
                return jsonify({
                    'error': {
                        'code': 'not_found',
                        'message': 'Market not in favorites'
                    }
                }), 404

            # Delete favorite
            db.delete(favorite)
            db.commit()

            logger.info(
                f"Market removed from favorites",
                user_id=current_user.id,
                market_id=market_id,
                event='favorite_removed'
            )

            return jsonify({
                'success': True,
                'message': 'Market removed from favorites'
            }), 200

        finally:
            db.close()

    except Exception as e:
        logger.exception(f"Error removing favorite: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'Failed to remove favorite'
            }
        }), 500


@favorites_bp.route('/favorites/check/<market_id>', methods=['GET'])
@optional_auth
def check_favorite(current_user, market_id):
    """
    GET /api/favorites/check/<market_id> - Check if market is in favorites

    Returns:
    {
        "is_favorited": boolean
    }

    If user not authenticated, returns is_favorited: false
    """
    try:
        # If no user authenticated, return false
        if not current_user:
            return jsonify({
                'success': True,
                'data': {
                    'is_favorited': False,
                    'authenticated': False
                }
            }), 200

        db = get_db()
        try:
            # Check if favorite exists
            favorite = db.query(UserFavorite).filter(
                UserFavorite.user_id == current_user.id,
                UserFavorite.market_id == market_id
            ).first()

            return jsonify({
                'success': True,
                'data': {
                    'is_favorited': favorite is not None,
                    'authenticated': True
                }
            }), 200

        finally:
            db.close()

    except Exception as e:
        logger.exception(f"Error checking favorite: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'Failed to check favorite status'
            }
        }), 500


@favorites_bp.route('/favorites/markets', methods=['POST'])
@require_auth
def get_favorites_with_details(current_user):
    """
    POST /api/favorites/markets - Get favorites with market details from Polymarket

    Request body (optional):
    {
        "limit": 50,
        "offset": 0
    }

    This endpoint returns the list of favorited market IDs.
    The frontend should then fetch market details from Polymarket API.
    """
    try:
        data = request.get_json() or {}
        limit = min(data.get('limit', 50), 100)  # Max 100
        offset = max(data.get('offset', 0), 0)

        db = get_db()
        try:
            # Get paginated favorites
            query = db.query(UserFavorite).filter(
                UserFavorite.user_id == current_user.id
            ).order_by(UserFavorite.created_at.desc())

            total = query.count()
            favorites = query.limit(limit).offset(offset).all()

            # Return market IDs and metadata
            favorites_list = [{
                'id': fav.id,
                'market_id': fav.market_id,
                'created_at': fav.created_at.isoformat() + 'Z'
            } for fav in favorites]

            return jsonify({
                'success': True,
                'data': {
                    'favorites': favorites_list,
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            }), 200

        finally:
            db.close()

    except Exception as e:
        logger.exception(f"Error getting favorites with details: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'Failed to retrieve favorites'
            }
        }), 500
