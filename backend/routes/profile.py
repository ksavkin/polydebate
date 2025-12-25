"""
Profile routes - User profile management
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
import logging
from sqlalchemy import func
from database import get_db
from models.user import User
from models.db_models import DebateDB
from models.favorite import UserFavorite
from utils.auth import require_auth
from services.profile_service import (
    handle_avatar_upload,
    get_favorite_models,
    get_favorite_categories,
    format_debate_summary
)

# Create blueprint
profile_bp = Blueprint('profile', __name__)
logger = logging.getLogger(__name__)


@profile_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile(current_user):
    """
    Get current user's profile with statistics

    Returns:
        200: User profile and statistics
        404: User not found
        500: Server error
    """
    db = None
    try:
        user_id = current_user.id
        db = get_db()

        # Get user
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({
                'error': {
                    'code': 'user_not_found',
                    'message': 'User not found'
                }
            }), 404

        # Get statistics using scalar subqueries for reliability
        total_debates = db.query(func.count(DebateDB.debate_id)).filter(
            DebateDB.user_id == user_id,
            DebateDB.is_deleted == False
        ).scalar() or 0

        total_favorites = db.query(func.count(UserFavorite.id)).filter(
            UserFavorite.user_id == user_id
        ).scalar() or 0

        # Get favorite models
        favorite_models = get_favorite_models(db, user_id, limit=3)

        # Get favorite categories
        favorite_categories = get_favorite_categories(db, user_id, limit=3)

        return jsonify({
            'user': user.to_dict(),
            'statistics': {
                'total_debates': total_debates,
                'total_favorites': total_favorites,
                'favorite_models': favorite_models,
                'favorite_categories': favorite_categories
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting profile: {e}", exc_info=True)
        return jsonify({
            'error': {
                'code': 'server_error',
                'message': 'An error occurred while fetching profile'
            }
        }), 500
    finally:
        if db:
            db.close()


@profile_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile(current_user):
    """
    Update user profile (name and avatar)

    Request:
        Form data with optional fields:
        - name: New name
        - avatar: Avatar file upload

    Returns:
        200: Updated user profile
        400: Invalid input
        404: User not found
        500: Server error
    """
    try:
        user_id = current_user.id
        db = get_db()

        # Get user
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({
                'error': {
                    'code': 'user_not_found',
                    'message': 'User not found'
                }
            }), 404

        # Update name if provided
        if 'name' in request.form:
            name = request.form['name'].strip()
            if not name:
                return jsonify({
                    'error': {
                        'code': 'invalid_name',
                        'message': 'Name cannot be empty'
                    }
                }), 400

            if len(name) < 2:
                return jsonify({
                    'error': {
                        'code': 'invalid_name',
                        'message': 'Name must be at least 2 characters'
                    }
                }), 400

            user.name = name

        # Update avatar if provided
        if 'avatar' in request.files:
            file = request.files['avatar']
            if file and file.filename:
                avatar_url = handle_avatar_upload(file, user_id)
                if avatar_url:
                    user.avatar_url = avatar_url
                else:
                    return jsonify({
                        'error': {
                            'code': 'upload_failed',
                            'message': 'Avatar upload failed. Please ensure the file is a valid image (JPG, PNG, or GIF) under 5MB.'
                        }
                    }), 400

        # Save changes
        db.commit()

        logger.info(f"Profile updated for user {user_id}")

        return jsonify({'user': user.to_dict()}), 200

    except Exception as e:
        logger.error(f"Error updating profile: {e}", exc_info=True)
        db.rollback()
        return jsonify({
            'error': {
                'code': 'server_error',
                'message': 'An error occurred while updating profile'
            }
        }), 500


@profile_bp.route('/debates', methods=['GET'])
@require_auth
def get_user_debates(current_user):
    """
    Get user's debate history with filters and pagination

    Query Parameters:
        - limit: Number of debates per page (default: 12)
        - offset: Pagination offset (default: 0)
        - category: Filter by market category
        - status: Filter by status
        - sort: Sort by 'recent' or 'rounds'
        - date_from: ISO date string
        - date_to: ISO date string

    Returns:
        200: List of debates with pagination info
        500: Server error
    """
    try:
        user_id = current_user.id
        db = get_db()

        # Parse query parameters
        limit = min(int(request.args.get('limit', 12)), 50)  # Max 50
        offset = int(request.args.get('offset', 0))
        category = request.args.get('category')
        status = request.args.get('status')
        sort = request.args.get('sort', 'recent')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        # Build query
        query = db.query(DebateDB).filter_by(
            user_id=user_id,
            is_deleted=False
        )

        # Apply filters
        if category:
            query = query.filter_by(market_category=category)

        if status:
            query = query.filter_by(status=status)

        if date_from:
            query = query.filter(DebateDB.created_at >= date_from)

        if date_to:
            query = query.filter(DebateDB.created_at <= date_to)

        # Apply sorting
        if sort == 'recent':
            query = query.order_by(DebateDB.created_at.desc())
        elif sort == 'rounds':
            query = query.order_by(DebateDB.rounds.desc())
        else:
            query = query.order_by(DebateDB.created_at.desc())

        # Get total count
        total = query.count()

        # Apply pagination
        debates = query.limit(limit).offset(offset).all()

        # Format debates
        formatted_debates = []
        for debate in debates:
            summary = format_debate_summary(db, debate)
            if summary:
                formatted_debates.append(summary)

        return jsonify({
            'debates': formatted_debates,
            'pagination': {
                'total': total,
                'limit': limit,
                'offset': offset,
                'has_more': offset + limit < total
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting user debates: {e}", exc_info=True)
        return jsonify({
            'error': {
                'code': 'server_error',
                'message': 'An error occurred while fetching debates'
            }
        }), 500


@profile_bp.route('/debates/top', methods=['GET'])
@require_auth
def get_top_debates(current_user):
    """
    Get user's top debates (recent or favorites)

    Query Parameters:
        - type: 'recent' or 'favorites' (default: 'recent')
        - limit: Number of debates to return (default: 5)

    Returns:
        200: List of top debates
        500: Server error
    """
    try:
        user_id = current_user.id
        db = get_db()

        debate_type = request.args.get('type', 'recent')
        limit = min(int(request.args.get('limit', 5)), 20)  # Max 20

        if debate_type == 'favorites':
            # Get favorite debates
            favorites = db.query(UserFavorite).filter_by(
                user_id=user_id
            ).all()

            debate_ids = [f.debate_id for f in favorites if f.debate_id]
            
            if not debate_ids:
                return jsonify({
                    'type': debate_type,
                    'debates': []
                }), 200

            debates = db.query(DebateDB).filter(
                DebateDB.debate_id.in_(debate_ids),
                DebateDB.user_id == user_id,
                DebateDB.is_deleted == False
            ).order_by(DebateDB.created_at.desc()).limit(limit).all()

        else:
            # Get recent debates
            debates = db.query(DebateDB).filter_by(
                user_id=user_id,
                is_deleted=False
            ).order_by(DebateDB.created_at.desc()).limit(limit).all()

        # Format debates
        formatted_debates = []
        for debate in debates:
            summary = format_debate_summary(db, debate)
            if summary:
                formatted_debates.append(summary)

        return jsonify({
            'type': debate_type,
            'debates': formatted_debates
        }), 200

    except Exception as e:
        logger.error(f"Error getting top debates: {e}", exc_info=True)
        return jsonify({
            'error': {
                'code': 'server_error',
                'message': 'An error occurred while fetching top debates'
            }
        }), 500


@profile_bp.route('/upload-avatar', methods=['POST'])
@require_auth
def upload_avatar(current_user):
    """
    Upload profile picture

    Request:
        Form data with 'avatar' file

    Returns:
        200: Avatar uploaded successfully
        400: Invalid file
        500: Server error
    """
    try:
        user_id = current_user.id
        db = get_db()

        if 'avatar' not in request.files:
            return jsonify({
                'error': {
                    'code': 'no_file',
                    'message': 'No avatar file provided'
                }
            }), 400

        file = request.files['avatar']

        if not file or not file.filename:
            return jsonify({
                'error': {
                    'code': 'no_file',
                    'message': 'No avatar file provided'
                }
            }), 400

        # Upload avatar
        avatar_url = handle_avatar_upload(file, user_id)

        if not avatar_url:
            return jsonify({
                'error': {
                    'code': 'upload_failed',
                    'message': 'Avatar upload failed. Please ensure the file is a valid image (JPG, PNG, or GIF) under 5MB.'
                }
            }), 400

        # Update user
        user = db.query(User).filter_by(id=user_id).first()
        if user:
            user.avatar_url = avatar_url
            db.commit()

        logger.info(f"Avatar uploaded for user {user_id}: {avatar_url}")

        return jsonify({
            'avatar_url': avatar_url,
            'message': 'Avatar uploaded successfully'
        }), 200

    except Exception as e:
        logger.error(f"Error uploading avatar: {e}", exc_info=True)
        db.rollback()
        return jsonify({
            'error': {
                'code': 'server_error',
                'message': 'An error occurred while uploading avatar'
            }
        }), 500
