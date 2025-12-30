from flask import Blueprint, request, jsonify
from config import config
from utils.auth import JWTAuth, get_client_ip, require_admin
from utils.rate_limiter import get_rate_limiter
from database import get_db
from models.user import User
from models.db_models import DebateDB, MessageDB
from sqlalchemy import func
from utils.logger import get_logger
import logging

logger = get_logger('admin')
admin_bp = Blueprint('admin', __name__)
rate_limiter = get_rate_limiter()

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """
    Authenticate admin with password
    Returns JWT token if successful
    """
    try:
        data = request.get_json()
        password = data.get('password')
        email = data.get('email')
        ip = get_client_ip()

        if not password or not email:
            return jsonify({
                'error': {
                    'code': 'missing_credentials',
                    'message': 'Email and password are required'
                }
            }), 400

        # Check rate limit
        allowed, remaining = rate_limiter.check_admin_login_limit(email, ip)
        if not allowed:
            return jsonify({
                'error': {
                    'code': 'rate_limit_exceeded',
                    'message': 'Too many login attempts. Please try again in 15 minutes.'
                }
            }), 429

        # Record attempt
        rate_limiter.record_admin_login_attempt(email, ip)

        # Check password against config
        if password != config.ADMIN_PASSWORD:
            logger.warning(
                "Failed admin login attempt",
                email=email,
                ip_address=get_client_ip(),
                event='admin_login_failed'
            )
            return jsonify({
                'error': {
                    'code': 'invalid_credentials',
                    'message': 'Invalid admin password'
                }
            }), 401

        # Find or create admin user in DB
        db = get_db()
        try:
            user = db.query(User).filter(User.email == email).first()
            
            if not user:
                # Create user as admin if it doesn't exist
                user = User(
                    email=email,
                    name="System Admin",
                    is_admin=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            elif not user.is_admin:
                # Upgrade existing user to admin
                user.is_admin = True
                db.commit()
                db.refresh(user)

            # Generate token
            jwt_auth = JWTAuth(config)
            token = jwt_auth.generate_token(user)

            logger.info(
                "Admin logged in successfully",
                user_id=user.id,
                email=user.email,
                event='admin_login_success'
            )

            return jsonify({
                'success': True,
                'token': token,
                'user': user.to_dict()
            }), 200

        finally:
            db.close()

    except Exception as e:
        logger.exception(f"Error in admin_login: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'An error occurred during admin login'
            }
        }), 500

@admin_bp.route('/users', methods=['GET'])
@require_admin
def list_users(current_user):
    """List all users with basic info"""
    db = get_db()
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        return jsonify({
            'success': True,
            'data': [u.to_dict() for u in users]
        }), 200
    finally:
        db.close()

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@require_admin
def delete_user(current_user, user_id):
    """Soft delete user or deactivate"""
    db = get_db()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({'error': {'code': 'not_found', 'message': 'User not found'}}), 404
        
        user.is_active = False
        db.commit()
        return jsonify({'success': True, 'message': 'User deactivated'}), 200
    finally:
        db.close()

@admin_bp.route('/debates', methods=['GET'])
@require_admin
def list_debates(current_user):
    """List all debates with summary info"""
    db = get_db()
    try:
        debates = db.query(DebateDB).order_by(DebateDB.created_at.desc()).limit(100).all()
        return jsonify({
            'success': True,
            'data': [{
                'id': d.id,
                'slug': d.market_slug,
                'title': d.market_title,
                'user_id': d.user_id,
                'status': d.status,
                'created_at': d.created_at.isoformat() + 'Z' if d.created_at else None
            } for d in debates]
        }), 200
    finally:
        db.close()

@admin_bp.route('/analytics', methods=['GET'])
@require_admin
def get_analytics(current_user):
    """Aggregate analytics for dashboard"""
    db = get_db()
    try:
        total_users = db.query(func.count(User.id)).scalar()
        total_debates = db.query(func.count(DebateDB.id)).scalar()
        total_messages = db.query(func.count(MessageDB.id)).scalar()
        
        # Debates in last 24h
        from datetime import datetime, timedelta
        day_ago = datetime.utcnow() - timedelta(days=1)
        recent_debates = db.query(func.count(DebateDB.id)).filter(DebateDB.created_at >= day_ago).scalar()

        return jsonify({
            'success': True,
            'data': {
                'total_users': total_users,
                'total_debates': total_debates,
                'total_messages': total_messages,
                'recent_debates_24h': recent_debates
            }
        }), 200
    finally:
        db.close()

@admin_bp.route('/debug', methods=['GET'])
@require_admin
def debug_info(current_user):
    """System debug info"""
    import os
    import sys
    
    return jsonify({
        'success': True,
        'data': {
            'python_version': sys.version,
            'env': os.getenv('FLASK_ENV', 'development'),
            'storage_status': {
                'db_exists': os.path.exists(config.DB_PATH),
                'audio_dir_exists': os.path.exists(config.AUDIO_DIR)
            }
        }
    }), 200
