"""
JWT authentication utilities
"""
import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from typing import Optional, Dict, Any
from database import get_db
from models import User
from utils.logger import get_auth_logger

logger = get_auth_logger()


class AuthError(Exception):
    """Custom authentication error"""
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class JWTAuth:
    """JWT authentication handler"""

    def __init__(self, config):
        """Initialize JWT auth with configuration"""
        self.config = config
        self.secret_key = config.JWT_SECRET_KEY
        self.expiration_minutes = config.JWT_EXPIRATION_MINUTES
        self.algorithm = 'HS256'

    def generate_token(self, user: User) -> str:
        """
        Generate JWT token for user

        Args:
            user: User object

        Returns:
            JWT token string
        """
        now = datetime.utcnow()
        expiration = now + timedelta(minutes=self.expiration_minutes)

        payload = {
            'user_id': user.id,
            'email': user.email,
            'name': user.name,
            'iat': now,
            'exp': expiration
        }

        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

        logger.info(
            "JWT token generated",
            user_id=user.id,
            email=user.email,
            event='token_generated'
        )

        return token

    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify JWT token and return payload

        Args:
            token: JWT token string

        Returns:
            Token payload

        Raises:
            AuthError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload

        except jwt.ExpiredSignatureError:
            logger.warning("Token verification failed: expired", event='token_expired')
            raise AuthError("Token has expired", 401)

        except jwt.InvalidTokenError as e:
            logger.warning(f"Token verification failed: {str(e)}", event='token_invalid')
            raise AuthError("Invalid token", 401)

    def get_user_from_token(self, token: str) -> Optional[User]:
        """
        Get user from JWT token

        Args:
            token: JWT token string

        Returns:
            User object or None
        """
        try:
            payload = self.verify_token(token)
            user_id = payload.get('user_id')

            if not user_id:
                return None

            db = get_db()
            try:
                user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
                return user
            finally:
                db.close()

        except AuthError:
            return None


def get_client_ip() -> str:
    """Get client IP address from request"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr or 'unknown'


def get_token_from_header() -> Optional[str]:
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization', '')

    if auth_header.startswith('Bearer '):
        return auth_header[7:]  # Remove 'Bearer ' prefix

    return None


def require_auth(f):
    """
    Decorator to protect routes that require authentication

    Usage:
        @app.route('/api/protected')
        @require_auth
        def protected_route(current_user):
            return jsonify({'user': current_user.to_dict()})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from config import config

        # Get token from header
        token = get_token_from_header()

        if not token:
            logger.warning(
                "Authentication failed: no token provided",
                ip_address=get_client_ip(),
                event='auth_no_token'
            )
            return jsonify({
                'error': {
                    'code': 'unauthorized',
                    'message': 'No authentication token provided'
                }
            }), 401

        # Verify token and get user
        try:
            jwt_auth = JWTAuth(config)
            user = jwt_auth.get_user_from_token(token)

            if not user:
                logger.warning(
                    "Authentication failed: user not found",
                    ip_address=get_client_ip(),
                    event='auth_user_not_found'
                )
                return jsonify({
                    'error': {
                        'code': 'unauthorized',
                        'message': 'Invalid or expired token'
                    }
                }), 401

            # Pass user to route function
            return f(current_user=user, *args, **kwargs)

        except AuthError as e:
            logger.warning(
                f"Authentication failed: {e.message}",
                ip_address=get_client_ip(),
                event='auth_failed'
            )
            return jsonify({
                'error': {
                    'code': 'unauthorized',
                    'message': e.message
                }
            }), e.status_code

        except Exception as e:
            logger.error(
                f"Authentication error: {str(e)}",
                ip_address=get_client_ip(),
                event='auth_error'
            )
            return jsonify({
                'error': {
                    'code': 'internal_error',
                    'message': 'Authentication failed'
                }
            }), 500

    return decorated_function


def optional_auth(f):
    """
    Decorator for routes where authentication is optional

    If token is provided, user will be passed to route.
    If no token or invalid token, current_user will be None.

    Usage:
        @app.route('/api/public')
        @optional_auth
        def public_route(current_user=None):
            if current_user:
                return jsonify({'message': f'Hello {current_user.name}'})
            return jsonify({'message': 'Hello guest'})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from config import config

        token = get_token_from_header()

        if token:
            try:
                jwt_auth = JWTAuth(config)
                user = jwt_auth.get_user_from_token(token)
                return f(current_user=user, *args, **kwargs)
            except:
                pass

        return f(current_user=None, *args, **kwargs)

    return decorated_function


# =============================================================================
# Verification Code Hashing Utilities
# =============================================================================

def hash_verification_code(code: str) -> str:
    """
    Hash a verification code using bcrypt

    Args:
        code: Plain text verification code

    Returns:
        Hashed code as a string
    """
    # Convert code to bytes
    code_bytes = code.encode('utf-8')

    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(code_bytes, salt)

    # Return as string
    return hashed.decode('utf-8')


def verify_verification_code(code: str, code_hash: str) -> bool:
    """
    Verify a verification code against its hash

    Args:
        code: Plain text verification code to verify
        code_hash: Hashed code from database

    Returns:
        True if code matches hash, False otherwise
    """
    try:
        code_bytes = code.encode('utf-8')
        hash_bytes = code_hash.encode('utf-8')
        return bcrypt.checkpw(code_bytes, hash_bytes)
    except Exception as e:
        logger.error(f"Error verifying code: {str(e)}", event='code_verification_error')
        return False
