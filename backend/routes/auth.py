"""
Authentication routes with separate signup and login flows
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from services.auth_service import AuthService
from utils.auth import require_auth, get_client_ip
from utils.rate_limiter import get_rate_limiter
from utils.logger import get_auth_logger
from config import config

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Initialize services
auth_service = AuthService(config)
rate_limiter = get_rate_limiter()
logger = get_auth_logger()


# Pydantic models for validation
class SignupRequestSchema(BaseModel):
    email: EmailStr
    name: str

    @validator('name')
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v.strip()


class SignupVerifySchema(BaseModel):
    email: EmailStr
    code: str

    @validator('code')
    def code_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Verification code cannot be empty')
        return v.strip()


class LoginRequestSchema(BaseModel):
    email: EmailStr


class LoginVerifySchema(BaseModel):
    email: EmailStr
    code: str

    @validator('code')
    def code_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Verification code cannot be empty')
        return v.strip()


class UpdateUserSchema(BaseModel):
    name: Optional[str] = None

    @validator('name')
    def name_not_empty(cls, v):
        if v is not None:
            if not v.strip():
                raise ValueError('Name cannot be empty')
            if len(v.strip()) < 2:
                raise ValueError('Name must be at least 2 characters')
            return v.strip()
        return v


# Helper functions
def validate_request_data(schema_class, data):
    """Validate request data using Pydantic schema"""
    try:
        validated = schema_class(**data)
        return True, validated.dict(), None
    except Exception as e:
        errors = str(e)
        return False, None, errors


# Signup endpoints
@auth_bp.route('/signup/request-code', methods=['POST'])
def signup_request_code():
    """Request verification code for signup"""
    try:
        data = request.get_json()
        ip = get_client_ip()

        # Validate input
        valid, validated_data, errors = validate_request_data(SignupRequestSchema, data)
        if not valid:
            return jsonify({
                'error': {
                    'code': 'validation_error',
                    'message': 'Invalid input data',
                    'details': errors
                }
            }), 400

        email = validated_data['email']
        name = validated_data['name']

        # Check rate limit
        allowed, remaining = rate_limiter.check_code_request_limit(email, ip)
        if not allowed:
            return jsonify({
                'error': {
                    'code': 'rate_limit_exceeded',
                    'message': 'Too many verification code requests. Please try again later.',
                    'remaining': remaining
                }
            }), 429

        # Request code
        success, message, error_code = auth_service.request_signup_code(email, name, ip)

        if not success:
            return jsonify({
                'error': {
                    'code': error_code or 'signup_failed',
                    'message': message
                }
            }), 400 if error_code == 'email_exists' else 500

        # Record request for rate limiting
        rate_limiter.record_code_request(email, ip)

        return jsonify({
            'success': True,
            'message': message,
            'expiry_minutes': config.CODE_EXPIRATION_MINUTES
        }), 200

    except Exception as e:
        logger.exception(f"Error in signup_request_code: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'An error occurred while processing your request'
            }
        }), 500


@auth_bp.route('/signup/verify-code', methods=['POST'])
def signup_verify_code():
    """Verify code and create user account"""
    try:
        data = request.get_json()
        ip = get_client_ip()

        # Validate input
        valid, validated_data, errors = validate_request_data(SignupVerifySchema, data)
        if not valid:
            return jsonify({
                'error': {
                    'code': 'validation_error',
                    'message': 'Invalid input data',
                    'details': errors
                }
            }), 400

        email = validated_data['email']
        code = validated_data['code']

        # Check verification attempt limit
        allowed, remaining = rate_limiter.check_verification_attempt_limit(email, ip)
        if not allowed:
            return jsonify({
                'error': {
                    'code': 'too_many_attempts',
                    'message': 'Too many failed verification attempts. Please request a new code.',
                    'remaining': remaining
                }
            }), 429

        # Verify code (name will be taken from stored verification code)
        success, message, user_data, error_code = auth_service.verify_signup_code(
            email, code, ip
        )

        # Record attempt
        rate_limiter.record_verification_attempt(email, ip, success)

        if not success:
            return jsonify({
                'error': {
                    'code': error_code or 'verification_failed',
                    'message': message
                }
            }), 400

        return jsonify({
            'success': True,
            'message': message,
            'data': user_data
        }), 201

    except Exception as e:
        logger.exception(f"Error in signup_verify_code: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'An error occurred while processing your request'
            }
        }), 500


# Login endpoints
@auth_bp.route('/login/request-code', methods=['POST'])
def login_request_code():
    """Request verification code for login"""
    try:
        data = request.get_json()
        ip = get_client_ip()

        # Validate input
        valid, validated_data, errors = validate_request_data(LoginRequestSchema, data)
        if not valid:
            return jsonify({
                'error': {
                    'code': 'validation_error',
                    'message': 'Invalid input data',
                    'details': errors
                }
            }), 400

        email = validated_data['email']

        # Check rate limit
        allowed, remaining = rate_limiter.check_code_request_limit(email, ip)
        if not allowed:
            return jsonify({
                'error': {
                    'code': 'rate_limit_exceeded',
                    'message': 'Too many verification code requests. Please try again later.',
                    'remaining': remaining
                }
            }), 429

        # Request code
        success, message, error_code = auth_service.request_login_code(email, ip)

        if not success:
            return jsonify({
                'error': {
                    'code': error_code or 'login_failed',
                    'message': message
                }
            }), 400 if error_code == 'user_not_found' else 500

        # Record request for rate limiting
        rate_limiter.record_code_request(email, ip)

        return jsonify({
            'success': True,
            'message': message,
            'expiry_minutes': config.CODE_EXPIRATION_MINUTES
        }), 200

    except Exception as e:
        logger.exception(f"Error in login_request_code: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'An error occurred while processing your request'
            }
        }), 500


@auth_bp.route('/login/verify-code', methods=['POST'])
def login_verify_code():
    """Verify code and authenticate user"""
    try:
        data = request.get_json()
        ip = get_client_ip()

        # Validate input
        valid, validated_data, errors = validate_request_data(LoginVerifySchema, data)
        if not valid:
            return jsonify({
                'error': {
                    'code': 'validation_error',
                    'message': 'Invalid input data',
                    'details': errors
                }
            }), 400

        email = validated_data['email']
        code = validated_data['code']

        # Check verification attempt limit
        allowed, remaining = rate_limiter.check_verification_attempt_limit(email, ip)
        if not allowed:
            return jsonify({
                'error': {
                    'code': 'too_many_attempts',
                    'message': 'Too many failed verification attempts. Please request a new code.',
                    'remaining': remaining
                }
            }), 429

        # Verify code
        success, message, user_data, error_code = auth_service.verify_login_code(
            email, code, ip
        )

        # Record attempt
        rate_limiter.record_verification_attempt(email, ip, success)

        if not success:
            return jsonify({
                'error': {
                    'code': error_code or 'verification_failed',
                    'message': message
                }
            }), 400

        return jsonify({
            'success': True,
            'message': message,
            'data': user_data
        }), 200

    except Exception as e:
        logger.exception(f"Error in login_verify_code: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'An error occurred while processing your request'
            }
        }), 500


# Protected endpoints
@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user(current_user):
    """Get current authenticated user"""
    return jsonify({
        'success': True,
        'data': {
            'user': current_user.to_dict()
        }
    }), 200


@auth_bp.route('/me', methods=['PUT'])
@require_auth
def update_current_user(current_user):
    """Update current authenticated user"""
    try:
        from database import get_db

        data = request.get_json()

        # Validate input
        valid, validated_data, errors = validate_request_data(UpdateUserSchema, data)
        if not valid:
            return jsonify({
                'error': {
                    'code': 'validation_error',
                    'message': 'Invalid input data',
                    'details': errors
                }
            }), 400

        db = get_db()
        try:
            # Update user fields
            if validated_data.get('name'):
                current_user.name = validated_data['name']

            db.commit()

            logger.info(
                f"User profile updated",
                user_id=current_user.id,
                email=current_user.email,
                event='user_updated'
            )

            return jsonify({
                'success': True,
                'message': 'Profile updated successfully',
                'data': {
                    'user': current_user.to_dict()
                }
            }), 200

        finally:
            db.close()

    except Exception as e:
        logger.exception(f"Error in update_current_user: {str(e)}")
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': 'An error occurred while updating your profile'
            }
        }), 500
