"""
Rate limiting for authentication endpoints
"""
from datetime import datetime, timedelta
from typing import Dict, Tuple
from utils.logger import get_auth_logger

logger = get_auth_logger()


class RateLimiter:
    """
    Simple in-memory rate limiter
    For production, consider using Redis or a database-backed solution
    """

    def __init__(self, config):
        """Initialize rate limiter with configuration"""
        self.config = config
        # Store: {key: [(timestamp, count)]}
        self._requests: Dict[str, list] = {}
        # Store: {key: attempt_count}
        self._verification_attempts: Dict[str, int] = {}
        # Store: {key: timestamp} for cleanup
        self._last_cleanup = datetime.utcnow()

    def check_code_request_limit(self, email: str, ip: str) -> Tuple[bool, int]:
        """
        Check if email/IP has exceeded code request limit

        Args:
            email: User email
            ip: IP address

        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        key = f"code_request:{email}:{ip}"
        limit = self.config.MAX_CODE_REQUESTS_PER_HOUR
        window = timedelta(hours=1)

        allowed, remaining = self._check_limit(key, limit, window)

        if not allowed:
            logger.log_rate_limit(
                email=email,
                ip=ip,
                limit=limit,
                period="1 hour",
                event='code_request_rate_limit'
            )

        return allowed, remaining

    def check_verification_attempt_limit(self, email: str, ip: str) -> Tuple[bool, int]:
        """
        Check if email/IP has exceeded verification attempt limit

        Args:
            email: User email
            ip: IP address

        Returns:
            Tuple of (is_allowed, remaining_attempts)
        """
        key = f"verify_attempt:{email}:{ip}"
        limit = self.config.MAX_VERIFICATION_ATTEMPTS

        current_attempts = self._verification_attempts.get(key, 0)
        remaining = max(0, limit - current_attempts)

        if current_attempts >= limit:
            logger.log_rate_limit(
                email=email,
                ip=ip,
                limit=limit,
                period="per code request",
                event='verification_attempt_rate_limit',
                attempt_number=current_attempts
            )
            return False, 0

        return True, remaining

    def record_code_request(self, email: str, ip: str):
        """Record a code request"""
        key = f"code_request:{email}:{ip}"
        self._record_request(key)

        # Reset verification attempts when new code is requested
        verify_key = f"verify_attempt:{email}:{ip}"
        self._verification_attempts[verify_key] = 0

        logger.debug(f"Recorded code request for {email} from {ip}")

    def record_verification_attempt(self, email: str, ip: str, success: bool):
        """
        Record a verification attempt

        Args:
            email: User email
            ip: IP address
            success: Whether verification was successful
        """
        key = f"verify_attempt:{email}:{ip}"

        if success:
            # Reset on successful verification
            self._verification_attempts[key] = 0
            logger.debug(f"Verification successful for {email}, resetting attempts")
        else:
            # Increment failed attempts
            self._verification_attempts[key] = self._verification_attempts.get(key, 0) + 1
            logger.debug(
                f"Verification failed for {email}, attempt {self._verification_attempts[key]}"
            )

    def _check_limit(self, key: str, limit: int, window: timedelta) -> Tuple[bool, int]:
        """
        Check if key has exceeded rate limit

        Args:
            key: Rate limit key
            limit: Maximum requests allowed
            window: Time window

        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        now = datetime.utcnow()
        cutoff = now - window

        # Clean up old requests periodically
        if (now - self._last_cleanup).total_seconds() > 3600:  # Every hour
            self._cleanup_old_requests()

        # Get requests within window
        if key not in self._requests:
            self._requests[key] = []

        # Filter out old requests
        self._requests[key] = [
            timestamp for timestamp in self._requests[key]
            if timestamp > cutoff
        ]

        current_count = len(self._requests[key])
        remaining = max(0, limit - current_count)

        return current_count < limit, remaining

    def _record_request(self, key: str):
        """Record a request timestamp"""
        now = datetime.utcnow()

        if key not in self._requests:
            self._requests[key] = []

        self._requests[key].append(now)

    def _cleanup_old_requests(self):
        """Clean up old request records to prevent memory bloat"""
        now = datetime.utcnow()
        cutoff = now - timedelta(hours=2)  # Keep last 2 hours

        # Clean up request timestamps
        for key in list(self._requests.keys()):
            self._requests[key] = [
                timestamp for timestamp in self._requests[key]
                if timestamp > cutoff
            ]
            # Remove empty keys
            if not self._requests[key]:
                del self._requests[key]

        # Clean up old verification attempts (older than 2 hours)
        cleanup_keys = []
        for key in self._verification_attempts:
            # Extract email from key for checking last request
            if key.startswith('verify_attempt:'):
                email_ip = ':'.join(key.split(':')[1:])
                request_key = f"code_request:{email_ip}"
                # If no recent code requests, clean up verification attempts
                if request_key not in self._requests:
                    cleanup_keys.append(key)

        for key in cleanup_keys:
            del self._verification_attempts[key]

        self._last_cleanup = now
        logger.debug(f"Rate limiter cleanup completed at {now}")

    def reset_limits(self, email: str, ip: str):
        """
        Reset all limits for email/IP (useful for testing or admin actions)

        Args:
            email: User email
            ip: IP address
        """
        keys_to_remove = [
            f"code_request:{email}:{ip}",
            f"verify_attempt:{email}:{ip}"
        ]

        for key in keys_to_remove:
            if key in self._requests:
                del self._requests[key]
            if key in self._verification_attempts:
                del self._verification_attempts[key]

        logger.info(f"Rate limits reset for {email} from {ip}")


# Global rate limiter instance
_rate_limiter = None


def get_rate_limiter():
    """Get or create rate limiter instance"""
    global _rate_limiter
    if _rate_limiter is None:
        from config import config
        _rate_limiter = RateLimiter(config)
    return _rate_limiter
