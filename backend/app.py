"""
PolyDebate Backend - Flask Application
"""
import sys
import asyncio

# Fix for aiohttp on Windows - requires SelectorEventLoop instead of ProactorEventLoop
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
import logging

from config import config
from database import init_db, create_all_tables

# Setup logging
logging.basicConfig(
    level=logging.DEBUG if config.DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app():
    """Application factory"""
    app = Flask(__name__)
    app.config.from_object(config)

    # Setup CORS - Allow all origins for development
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Ensure storage directories exist
    config.ensure_directories()

    # Initialize database
    try:
        logger.info(f"Initializing database: {config.DATABASE_URL}")
        init_db(config.DATABASE_URL, echo=config.DEBUG)
        create_all_tables()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # Continue anyway for development

    # Validate configuration
    try:
        config.validate()
        logger.info("Configuration validated successfully")
    except ValueError as e:
        logger.error(f"Configuration validation failed: {e}")
        # Continue anyway for development

    # Register routes
    register_routes(app)

    # Register error handlers
    register_error_handlers(app)

    logger.info("Flask app created successfully")
    return app


def register_routes(app):
    """Register all application routes"""

    # Import blueprints
    from routes.markets import markets_bp
    from routes.auth import auth_bp
    from routes.debate import debate_bp
    from routes.models import models_bp

    # Register blueprints
    app.register_blueprint(markets_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(debate_bp, url_prefix='/api')
    app.register_blueprint(models_bp, url_prefix='/api')

    @app.route('/api/health', methods=['GET'])
    def health():
        """Health check endpoint"""
        return jsonify({
            'status': 'ok',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'version': '1.0.0',
            'environment': config.ENV
        }), 200

    @app.route('/', methods=['GET'])
    def root():
        """Root endpoint"""
        return jsonify({
            'name': 'PolyDebate API',
            'version': '1.0.0',
            'documentation': '/api/health',
            'endpoints': {
                'health': '/api/health',
                'markets': '/api/markets',
                'categories': '/api/categories',
                'models': '/api/models',
                'debates': '/api/debates',
                'auth': {
                    'signup': '/api/auth/signup/request-code',
                    'login': '/api/auth/login/request-code',
                    'me': '/api/auth/me'
                }
            }
        }), 200

    @app.route('/api/audio/<filename>', methods=['GET'])
    def serve_audio(filename):
        """Serve audio files"""
        from flask import send_from_directory
        import os

        # Security: validate filename
        if not filename.endswith('.mp3') or '..' in filename or '/' in filename:
            return jsonify({
                'error': {
                    'code': 'invalid_filename',
                    'message': 'Invalid audio filename'
                }
            }), 400

        audio_path = os.path.join(config.AUDIO_DIR, filename)

        if not os.path.exists(audio_path):
            return jsonify({
                'error': {
                    'code': 'audio_not_found',
                    'message': f'Audio file {filename} not found'
                }
            }), 404

        return send_from_directory(config.AUDIO_DIR, filename, mimetype='audio/mpeg')


def register_error_handlers(app):
    """Register error handlers"""

    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        return jsonify({
            'error': {
                'code': 'not_found',
                'message': 'Resource not found',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        logger.error(f"Internal server error: {error}")
        return jsonify({
            'error': {
                'code': 'internal_server_error',
                'message': 'An internal server error occurred',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }), 500

    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle all other exceptions"""
        logger.error(f"Unhandled exception: {error}", exc_info=True)
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': str(error) if config.DEBUG else 'An error occurred',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }), 500


# Create app instance
app = create_app()


if __name__ == '__main__':
    logger.info(f"Starting PolyDebate backend on {config.HOST}:{config.PORT}")
    logger.info(f"Environment: {config.ENV}")
    logger.info(f"Debug mode: {config.DEBUG}")
    logger.info(f"CORS enabled for: {config.CORS_ORIGINS}")

    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
