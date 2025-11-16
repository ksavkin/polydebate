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
    CORS_ORIGINS = [FRONTEND_URL]

    # API Keys
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
    ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

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

    # Storage paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STORAGE_DIR = os.path.join(BASE_DIR, 'storage')
    DEBATES_DIR = os.path.join(STORAGE_DIR, 'debates')
    AUDIO_DIR = os.path.join(STORAGE_DIR, 'audio')

    @classmethod
    def validate(cls):
        """Validate that required configuration is present"""
        errors = []

        if not cls.OPENROUTER_API_KEY:
            errors.append("OPENROUTER_API_KEY is required")

        # ElevenLabs and Gemini are optional for initial testing
        # if not cls.ELEVENLABS_API_KEY:
        #     errors.append("ELEVENLABS_API_KEY is required")
        # if not cls.GEMINI_API_KEY:
        #     errors.append("GEMINI_API_KEY is required")

        if errors:
            raise ValueError(f"Configuration errors: {', '.join(errors)}")

        return True

    @classmethod
    def ensure_directories(cls):
        """Ensure storage directories exist"""
        os.makedirs(cls.DEBATES_DIR, exist_ok=True)
        os.makedirs(cls.AUDIO_DIR, exist_ok=True)


# Create config instance
config = Config()
