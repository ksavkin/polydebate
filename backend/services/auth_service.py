"""
Authentication service with code generation and validation
"""
import random
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple
from database import get_db
from models import User, VerificationCode, CodeType
from utils.logger import get_auth_logger
from utils.auth import JWTAuth, hash_verification_code, verify_verification_code
from services.email_service import EmailService

logger = get_auth_logger()


class AuthService:
    """Service for handling authentication operations"""

    def __init__(self, config):
        """Initialize auth service with configuration"""
        self.config = config
        self.jwt_auth = JWTAuth(config)
        self.email_service = EmailService(config)

    def generate_code(self) -> str:
        """
        Generate verification code

        Returns:
            Verification code string
        """
        length = self.config.CODE_LENGTH
        code_type = self.config.CODE_TYPE.lower()

        if code_type == 'alphanumeric':
            chars = string.ascii_uppercase + string.digits
        else:  # numeric
            chars = string.digits

        code = ''.join(random.choice(chars) for _ in range(length))
        return code

    def request_signup_code(self, email: str, name: str, ip: str) -> Tuple[bool, str, Optional[str]]:
        """
        Request verification code for signup

        Args:
            email: User email
            name: User name
            ip: IP address

        Returns:
            Tuple of (success, message, error_code)
        """
        db = get_db()
        try:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                logger.log_signup_attempt(email, ip, False, error='email_already_exists')
                return False, 'Email address is already registered', 'email_exists'

            # Generate code
            code = self.generate_code()
            code_hash = hash_verification_code(code)  # Hash the code before storing
            expires_at = datetime.utcnow() + timedelta(minutes=self.config.CODE_EXPIRATION_MINUTES)

            # Invalidate any existing signup codes for this email
            db.query(VerificationCode).filter(
                VerificationCode.email == email,
                VerificationCode.code_type == CodeType.SIGNUP,
                VerificationCode.used_at.is_(None)
            ).update({'used_at': datetime.utcnow()})

            # Create verification code (store name for later)
            verification_code = VerificationCode(
                email=email,
                name=name,
                code_hash=code_hash,  # Store hashed code
                code_type=CodeType.SIGNUP,
                expires_at=expires_at,
                ip_address=ip
            )
            db.add(verification_code)
            db.commit()

            # Send email with plain code (not the hash)
            email_sent = self.email_service.send_verification_email(
                to_email=email,
                code=code,  # Send plain code to user
                code_type='signup',
                user_name=name
            )

            if not email_sent and not self.config.EMAIL_FALLBACK_TO_CONSOLE:
                return False, 'Failed to send verification email', 'email_send_failed'

            logger.log_code_request(email, ip, 'signup')

            return True, 'Verification code sent to your email', None

        except Exception as e:
            db.rollback()
            logger.error(f"Error requesting signup code: {str(e)}", email=email, ip_address=ip)
            return False, 'An error occurred while processing your request', 'internal_error'

        finally:
            db.close()

    def verify_signup_code(self, email: str, code: str, ip: str) -> Tuple[bool, str, Optional[dict], Optional[str]]:
        """
        Verify signup code and create user account

        Args:
            email: User email
            code: Verification code
            ip: IP address

        Returns:
            Tuple of (success, message, user_data_with_token, error_code)
        """
        db = get_db()
        try:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                logger.log_signup_attempt(email, ip, False, error='email_already_exists')
                return False, 'Email address is already registered', None, 'email_exists'

            # Find all unused signup codes for this email (we'll verify hash below)
            verification_codes = db.query(VerificationCode).filter(
                VerificationCode.email == email,
                VerificationCode.code_type == CodeType.SIGNUP,
                VerificationCode.used_at.is_(None)
            ).all()

            # Try to find a code that matches the hash
            verification_code = None
            for vc in verification_codes:
                if verify_verification_code(code, vc.code_hash):
                    verification_code = vc
                    break

            if not verification_code:
                logger.log_code_verification(email, ip, False, error='invalid_code')
                return False, 'Invalid verification code', None, 'invalid_code'

            # Check if code is expired
            if not verification_code.is_valid():
                logger.log_code_verification(email, ip, False, error='code_expired')
                return False, 'Verification code has expired', None, 'code_expired'

            # Create user account using name from verification code
            user = User(
                email=email,
                name=verification_code.name,  # Use name from request-code step
                created_at=datetime.utcnow(),
                last_login=datetime.utcnow(),
                is_active=True
            )
            db.add(user)

            # Mark code as used
            verification_code.mark_as_used()

            db.commit()

            # Generate JWT token
            token = self.jwt_auth.generate_token(user)

            user_data = {
                'user': user.to_dict(),
                'token': token
            }

            logger.log_signup_attempt(email, ip, True, user_id=user.id)

            return True, 'Account created successfully', user_data, None

        except Exception as e:
            db.rollback()
            logger.error(f"Error verifying signup code: {str(e)}", email=email, ip_address=ip)
            return False, 'An error occurred while processing your request', None, 'internal_error'

        finally:
            db.close()

    def request_login_code(self, email: str, ip: str) -> Tuple[bool, str, Optional[str]]:
        """
        Request verification code for login

        Args:
            email: User email
            ip: IP address

        Returns:
            Tuple of (success, message, error_code)
        """
        db = get_db()
        try:
            # Check if user exists
            user = db.query(User).filter(User.email == email).first()
            if not user:
                logger.log_login_attempt(email, ip, False, error='user_not_found')
                return False, 'No account found with this email address', 'user_not_found'

            if not user.is_active:
                logger.log_login_attempt(email, ip, False, error='account_inactive', user_id=user.id)
                return False, 'Account is inactive', 'account_inactive'

            # Generate code
            code = self.generate_code()
            code_hash = hash_verification_code(code)  # Hash the code before storing
            expires_at = datetime.utcnow() + timedelta(minutes=self.config.CODE_EXPIRATION_MINUTES)

            # Invalidate any existing login codes for this user
            db.query(VerificationCode).filter(
                VerificationCode.user_id == user.id,
                VerificationCode.code_type == CodeType.LOGIN,
                VerificationCode.used_at.is_(None)
            ).update({'used_at': datetime.utcnow()})

            # Create verification code
            verification_code = VerificationCode(
                user_id=user.id,
                email=email,
                code_hash=code_hash,  # Store hashed code
                code_type=CodeType.LOGIN,
                expires_at=expires_at,
                ip_address=ip
            )
            db.add(verification_code)
            db.commit()

            # Send email with plain code (not the hash)
            email_sent = self.email_service.send_verification_email(
                to_email=email,
                code=code,  # Send plain code to user
                code_type='login',
                user_name=user.name
            )

            if not email_sent and not self.config.EMAIL_FALLBACK_TO_CONSOLE:
                return False, 'Failed to send verification email', 'email_send_failed'

            logger.log_code_request(email, ip, 'login', user_id=user.id)

            return True, 'Verification code sent to your email', None

        except Exception as e:
            db.rollback()
            logger.error(f"Error requesting login code: {str(e)}", email=email, ip_address=ip)
            return False, 'An error occurred while processing your request', 'internal_error'

        finally:
            db.close()

    def verify_login_code(self, email: str, code: str, ip: str) -> Tuple[bool, str, Optional[dict], Optional[str]]:
        """
        Verify login code and authenticate user

        Args:
            email: User email
            code: Verification code
            ip: IP address

        Returns:
            Tuple of (success, message, user_data_with_token, error_code)
        """
        db = get_db()
        try:
            # Find user
            user = db.query(User).filter(User.email == email).first()
            if not user:
                logger.log_login_attempt(email, ip, False, error='user_not_found')
                return False, 'Invalid email or verification code', None, 'invalid_credentials'

            # Find all unused login codes for this user (we'll verify hash below)
            verification_codes = db.query(VerificationCode).filter(
                VerificationCode.user_id == user.id,
                VerificationCode.code_type == CodeType.LOGIN,
                VerificationCode.used_at.is_(None)
            ).all()

            # Try to find a code that matches the hash
            verification_code = None
            for vc in verification_codes:
                if verify_verification_code(code, vc.code_hash):
                    verification_code = vc
                    break

            if not verification_code:
                logger.log_code_verification(email, ip, False, error='invalid_code', user_id=user.id)
                return False, 'Invalid verification code', None, 'invalid_code'

            # Check if code is expired
            if not verification_code.is_valid():
                logger.log_code_verification(email, ip, False, error='code_expired', user_id=user.id)
                return False, 'Verification code has expired', None, 'code_expired'

            # Update last login
            user.last_login = datetime.utcnow()

            # Mark code as used
            verification_code.mark_as_used()

            db.commit()

            # Generate JWT token
            token = self.jwt_auth.generate_token(user)

            user_data = {
                'user': user.to_dict(),
                'token': token
            }

            logger.log_login_attempt(email, ip, True, user_id=user.id)

            return True, 'Login successful', user_data, None

        except Exception as e:
            db.rollback()
            logger.error(f"Error verifying login code: {str(e)}", email=email, ip_address=ip)
            return False, 'An error occurred while processing your request', None, 'internal_error'

        finally:
            db.close()
