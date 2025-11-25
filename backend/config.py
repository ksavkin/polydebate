"""
Configuration management for PolyDebate backend
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Application configuration"""

    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    ENV = os.getenv('FLASK_ENV', 'development')

    # Server
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))

    # CORS
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    CORS_ORIGINS = [FRONTEND_URL, 'http://localhost:3003', 'http://localhost:3004']  # Support multiple ports

    # API Keys
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
    ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')

    # External APIs
    POLYMARKET_API_URL = 'https://gamma-api.polymarket.com'
    OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'

    # Cache TTL (in seconds)
    CACHE_MARKETS_TTL = int(os.getenv('CACHE_MARKETS_TTL', 300))  # 5 minutes
    CACHE_MARKET_DETAILS_TTL = int(os.getenv('CACHE_MARKET_DETAILS_TTL', 120))  # 2 minutes
    CACHE_CATEGORIES_TTL = int(os.getenv('CACHE_CATEGORIES_TTL', 600))  # 10 minutes
    CACHE_MODELS_TTL = int(os.getenv('CACHE_MODELS_TTL', 3600))  # 1 hour

    # Debate Settings
    MAX_MODELS_PER_DEBATE = int(os.getenv('MAX_MODELS_PER_DEBATE', 10))
    MAX_ROUNDS = int(os.getenv('MAX_ROUNDS', 10))
    MODEL_TIMEOUT_SECONDS = int(os.getenv('MODEL_TIMEOUT_SECONDS', 30))

    # Allowed AI Models (comma-separated list)
    ALLOWED_MODELS = os.getenv(
        'ALLOWED_MODELS',
        'openai/gpt-5.1-chat,anthropic/claude-haiku-4.5,google/gemini-2.5-flash-lite,x-ai/grok-4-fast,qwen/qwen-turbo,deepseek/deepseek-chat-v3.1'
    ).split(',')
    ALLOWED_MODELS = [m.strip() for m in ALLOWED_MODELS if m.strip()]  # Clean whitespace

    # Storage paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STORAGE_DIR = os.path.join(BASE_DIR, 'storage')
    DEBATES_DIR = os.path.join(STORAGE_DIR, 'debates')
    AUDIO_DIR = os.path.join(STORAGE_DIR, 'audio')
    AVATAR_DIR = os.path.join(STORAGE_DIR, 'avatars')
    LOGS_DIR = os.path.join(BASE_DIR, 'logs')

    # ========================================
    # AUTHENTICATION SETTINGS
    # ========================================

    # Database
    DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "polydebate.db")}')

    # JWT Settings
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-key-min-32-characters-CHANGE-THIS')
    JWT_EXPIRATION_MINUTES = int(os.getenv('JWT_EXPIRATION_MINUTES', 43200))  # 30 days

    # Code Settings
    CODE_LENGTH = int(os.getenv('CODE_LENGTH', 6))
    CODE_TYPE = os.getenv('CODE_TYPE', 'numeric')  # 'numeric' or 'alphanumeric'
    CODE_EXPIRATION_MINUTES = int(os.getenv('CODE_EXPIRATION_MINUTES', 15))

    # Rate Limiting
    MAX_CODE_REQUESTS_PER_HOUR = int(os.getenv('MAX_CODE_REQUESTS_PER_HOUR', 5))
    MAX_VERIFICATION_ATTEMPTS = int(os.getenv('MAX_VERIFICATION_ATTEMPTS', 5))

    # Application Settings
    APP_NAME = os.getenv('APP_NAME', 'PolyDebate')
    APP_URL = os.getenv('APP_URL', 'http://localhost:3000')
    SUPPORT_EMAIL = os.getenv('SUPPORT_EMAIL', 'support@polydebate.com')

    # Email Service Configuration
    EMAIL_SERVICE = os.getenv('EMAIL_SERVICE', 'mock')  # 'gmail', 'sendgrid', 'smtp', 'mock'
    EMAIL_FROM_ADDRESS = os.getenv('EMAIL_FROM_ADDRESS', 'noreply@polydebate.com')
    EMAIL_FROM_NAME = os.getenv('EMAIL_FROM_NAME', 'PolyDebate')
    EMAIL_FALLBACK_TO_CONSOLE = os.getenv('EMAIL_FALLBACK_TO_CONSOLE', 'true').lower() == 'true'

    # Gmail SMTP Settings (Recommended)
    GMAIL_USER = os.getenv('GMAIL_USER', '')
    GMAIL_APP_PASSWORD = os.getenv('GMAIL_APP_PASSWORD', '')
    SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'

    # SendGrid Settings (Optional)
    SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY', '')

    # Generic SMTP Settings (Optional)
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')

    # Email Template Settings
    USE_TEMPLATE_FILES = os.getenv('USE_TEMPLATE_FILES', 'true').lower() == 'true'
    TEMPLATE_DIRECTORY = os.getenv('TEMPLATE_DIRECTORY', os.path.join(BASE_DIR, 'templates'))
    SIGNUP_EMAIL_SUBJECT = os.getenv('SIGNUP_EMAIL_SUBJECT', 'Welcome to {app_name}! Verify your email')
    LOGIN_EMAIL_SUBJECT = os.getenv('LOGIN_EMAIL_SUBJECT', 'Your login code for {app_name}')

    # Logging Settings
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    LOG_FORMAT = os.getenv('LOG_FORMAT', 'text')  # 'json' or 'text'
    LOG_FILE = os.getenv('LOG_FILE', os.path.join(LOGS_DIR, 'app.log'))
    LOG_TO_CONSOLE = os.getenv('LOG_TO_CONSOLE', 'true').lower() == 'true'
    LOG_TO_FILE = os.getenv('LOG_TO_FILE', 'true').lower() == 'true'
    LOG_MAX_BYTES = int(os.getenv('LOG_MAX_BYTES', 10485760))  # 10MB
    LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', 5))
    MASK_EMAILS_IN_LOGS = os.getenv('MASK_EMAILS_IN_LOGS', 'false').lower() == 'true'
    MASK_IP_IN_LOGS = os.getenv('MASK_IP_IN_LOGS', 'false').lower() == 'true'
    ENABLE_SECURITY_LOG = os.getenv('ENABLE_SECURITY_LOG', 'false').lower() == 'true'
    SECURITY_LOG_FILE = os.getenv('SECURITY_LOG_FILE', os.path.join(LOGS_DIR, 'security.log'))
    LOG_REQUEST_ID = os.getenv('LOG_REQUEST_ID', 'true').lower() == 'true'

    # Database
    DB_PATH = os.path.join(STORAGE_DIR, 'polydebate.db')
    # SQLite URL format: sqlite:/// for relative, sqlite:///C:/path for Windows absolute, sqlite:////path for Unix/Mac absolute
    # Using pathlib for cross-platform compatibility
    import sys
    if os.getenv('DATABASE_URL'):
        DATABASE_URL = os.getenv('DATABASE_URL')
    else:
        abs_db_path = os.path.abspath(DB_PATH)
        # On Windows, convert backslashes to forward slashes and handle drive letters
        if sys.platform == 'win32':
            abs_db_path = abs_db_path.replace('\\', '/')
        DATABASE_URL = f'sqlite:///{abs_db_path}'

    @classmethod
    def validate(cls):
        """Validate that required configuration is present"""
        errors = []

        # Original validations (optional for now)
        # if not cls.OPENROUTER_API_KEY:
        #     errors.append("OPENROUTER_API_KEY is required")

        # Authentication validations
        if len(cls.JWT_SECRET_KEY) < 32:
            errors.append("JWT_SECRET_KEY must be at least 32 characters long")

        if cls.CODE_LENGTH < 4 or cls.CODE_LENGTH > 8:
            errors.append("CODE_LENGTH must be between 4 and 8")

        if cls.CODE_TYPE not in ['numeric', 'alphanumeric']:
            errors.append("CODE_TYPE must be 'numeric' or 'alphanumeric'")

        if cls.EMAIL_SERVICE not in ['gmail', 'sendgrid', 'smtp', 'mock']:
            errors.append("EMAIL_SERVICE must be one of: gmail, sendgrid, smtp, mock")

        # Email service specific validations
        if cls.EMAIL_SERVICE == 'gmail':
            if not cls.GMAIL_USER or not cls.GMAIL_APP_PASSWORD:
                errors.append("GMAIL_USER and GMAIL_APP_PASSWORD are required when using Gmail")

        if cls.EMAIL_SERVICE == 'sendgrid':
            if not cls.SENDGRID_API_KEY:
                errors.append("SENDGRID_API_KEY is required when using SendGrid")

        if cls.EMAIL_SERVICE == 'smtp':
            if not cls.SMTP_HOST or not cls.SMTP_USERNAME or not cls.SMTP_PASSWORD:
                errors.append("SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD are required when using generic SMTP")

        if cls.LOG_LEVEL not in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
            errors.append("LOG_LEVEL must be one of: DEBUG, INFO, WARNING, ERROR, CRITICAL")

        if errors:
            raise ValueError(f"Configuration errors: {', '.join(errors)}")

        return True

    @classmethod
    def ensure_directories(cls):
        """Ensure storage directories exist"""
        os.makedirs(cls.DEBATES_DIR, exist_ok=True)
        os.makedirs(cls.AUDIO_DIR, exist_ok=True)
        os.makedirs(cls.AVATAR_DIR, exist_ok=True)
        os.makedirs(cls.LOGS_DIR, exist_ok=True)
        if cls.USE_TEMPLATE_FILES:
            os.makedirs(cls.TEMPLATE_DIRECTORY, exist_ok=True)


# Create config instance
config = Config()
