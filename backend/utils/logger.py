"""
Comprehensive logging system with rotation and privacy controls
"""
import logging
import json
import os
import hashlib
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import Optional, Dict, Any


class PrivacyFilter(logging.Filter):
    """Filter to mask sensitive data in logs"""

    def __init__(self, mask_emails=False, mask_ip=False):
        super().__init__()
        self.mask_emails = mask_emails
        self.mask_ip = mask_ip

    def filter(self, record):
        """Apply privacy filters to log record"""
        if self.mask_emails and hasattr(record, 'email'):
            record.email = self._hash_email(record.email)

        if self.mask_ip and hasattr(record, 'ip_address'):
            record.ip_address = self._anonymize_ip(record.ip_address)

        return True

    @staticmethod
    def _hash_email(email: str) -> str:
        """Hash email for privacy"""
        if not email:
            return ""
        hash_obj = hashlib.sha256(email.encode())
        return f"hashed_{hash_obj.hexdigest()[:12]}"

    @staticmethod
    def _anonymize_ip(ip: str) -> str:
        """Anonymize IP address"""
        if not ip:
            return ""
        parts = ip.split('.')
        if len(parts) == 4:  # IPv4
            return f"{parts[0]}.{parts[1]}.xxx.xxx"
        return "xxx.xxx.xxx.xxx"


class JSONFormatter(logging.Formatter):
    """Format logs as JSON"""

    def format(self, record):
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        # Add extra fields if present
        extra_fields = ['event', 'email', 'ip_address', 'user_id', 'request_id',
                        'attempt_number', 'limit', 'period', 'error', 'stack_trace']

        for field in extra_fields:
            if hasattr(record, field):
                log_data[field] = getattr(record, field)

        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_data)


class TextFormatter(logging.Formatter):
    """Format logs as human-readable text"""

    def format(self, record):
        """Format log record as text"""
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        base_msg = f"{timestamp} [{record.levelname}] {record.getMessage()}"

        # Add extra context if present
        extras = []
        if hasattr(record, 'email'):
            extras.append(f"email={record.email}")
        if hasattr(record, 'ip_address'):
            extras.append(f"ip={record.ip_address}")
        if hasattr(record, 'user_id'):
            extras.append(f"user_id={record.user_id}")
        if hasattr(record, 'event'):
            extras.append(f"event={record.event}")

        if extras:
            base_msg += f" ({', '.join(extras)})"

        # Add exception if present
        if record.exc_info:
            base_msg += "\n" + self.formatException(record.exc_info)

        return base_msg


class AppLogger:
    """Application logger with configurable output and rotation"""

    def __init__(self, name: str, config):
        """Initialize logger with configuration"""
        self.logger = logging.getLogger(name)
        self.config = config
        self.logger.setLevel(getattr(logging, config.LOG_LEVEL))
        self.logger.handlers = []  # Clear existing handlers

        # Choose formatter based on config
        if config.LOG_FORMAT == 'json':
            formatter = JSONFormatter()
        else:
            formatter = TextFormatter()

        # Add console handler
        if config.LOG_TO_CONSOLE:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)

        # Add file handler with rotation
        if config.LOG_TO_FILE:
            self._setup_file_handler(config.LOG_FILE, formatter)

        # Add security log handler if enabled
        if config.ENABLE_SECURITY_LOG and name == 'auth':
            self._setup_file_handler(config.SECURITY_LOG_FILE, formatter)

        # Add privacy filters
        privacy_filter = PrivacyFilter(
            mask_emails=config.MASK_EMAILS_IN_LOGS,
            mask_ip=config.MASK_IP_IN_LOGS
        )
        self.logger.addFilter(privacy_filter)

    def _setup_file_handler(self, log_file: str, formatter):
        """Setup rotating file handler"""
        # Ensure log directory exists
        log_dir = os.path.dirname(log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)

        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=self.config.LOG_MAX_BYTES,
            backupCount=self.config.LOG_BACKUP_COUNT
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)

    def log_event(self, level: str, event: str, message: str, **kwargs):
        """Log an event with extra context"""
        extra = {'event': event}
        extra.update(kwargs)

        log_func = getattr(self.logger, level.lower())
        log_func(message, extra=extra)

    # Convenience methods for common events
    def log_signup_attempt(self, email: str, ip: str, success: bool, **kwargs):
        """Log signup attempt"""
        event = 'user_signup_success' if success else 'user_signup_failed'
        level = 'INFO' if success else 'WARNING'
        message = f"User signup {'succeeded' if success else 'failed'}"
        self.log_event(level, event, message, email=email, ip_address=ip, **kwargs)

    def log_login_attempt(self, email: str, ip: str, success: bool, **kwargs):
        """Log login attempt"""
        event = 'user_login_success' if success else 'user_login_failed'
        level = 'INFO' if success else 'WARNING'
        message = f"User login {'succeeded' if success else 'failed'}"
        self.log_event(level, event, message, email=email, ip_address=ip, **kwargs)

    def log_code_request(self, email: str, ip: str, code_type: str, **kwargs):
        """Log verification code request"""
        self.log_event(
            'INFO',
            'code_request',
            f"Verification code requested for {code_type}",
            email=email,
            ip_address=ip,
            **kwargs
        )

    def log_code_verification(self, email: str, ip: str, success: bool, **kwargs):
        """Log code verification attempt"""
        event = 'code_verification_success' if success else 'code_verification_failed'
        level = 'INFO' if success else 'WARNING'
        message = f"Code verification {'succeeded' if success else 'failed'}"
        self.log_event(level, event, message, email=email, ip_address=ip, **kwargs)

    def log_rate_limit(self, email: str, ip: str, limit: int, period: str, **kwargs):
        """Log rate limit exceeded"""
        self.log_event(
            'WARNING',
            'rate_limit_exceeded',
            f"Rate limit exceeded ({limit} requests per {period})",
            email=email,
            ip_address=ip,
            limit=limit,
            period=period,
            **kwargs
        )

    def log_email_sent(self, email: str, success: bool, error: Optional[str] = None, **kwargs):
        """Log email sending attempt"""
        event = 'email_send_success' if success else 'email_send_failed'
        level = 'INFO' if success else 'ERROR'
        message = f"Email {'sent successfully' if success else 'failed to send'}"
        extra = {'email': email, **kwargs}
        if error:
            extra['error'] = error
        self.log_event(level, event, message, **extra)

    def log_security_event(self, event: str, message: str, **kwargs):
        """Log security-related event"""
        self.log_event('WARNING', event, message, **kwargs)

    # Standard logging methods
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self.logger.debug(message, extra=kwargs)

    def info(self, message: str, **kwargs):
        """Log info message"""
        self.logger.info(message, extra=kwargs)

    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.logger.warning(message, extra=kwargs)

    def error(self, message: str, **kwargs):
        """Log error message"""
        self.logger.error(message, extra=kwargs)

    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self.logger.critical(message, extra=kwargs)

    def exception(self, message: str, **kwargs):
        """Log exception with traceback"""
        self.logger.exception(message, extra=kwargs)


# Global logger instances
_loggers: Dict[str, AppLogger] = {}


def get_logger(name: str = 'app') -> AppLogger:
    """Get or create logger instance"""
    if name not in _loggers:
        from config import config
        _loggers[name] = AppLogger(name, config)
    return _loggers[name]


# Convenience function to get auth logger
def get_auth_logger() -> AppLogger:
    """Get authentication logger"""
    return get_logger('auth')
