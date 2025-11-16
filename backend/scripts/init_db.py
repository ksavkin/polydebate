"""
Initialize SQLite database schema

This script creates all tables in the database.
Run this before migrating data from JSON files.

Usage:
    cd backend
    python scripts/init_db.py
"""
import sys
import os

# Add parent directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import config
from database import init_db, create_all_tables
from models.db_models import DebateDB, DebateModelDB, DebateOutcomeDB, MessageDB, MessagePredictionDB
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Initialize database"""
    logger.info("Starting database initialization...")

    # Ensure storage directory exists
    os.makedirs(config.STORAGE_DIR, exist_ok=True)

    # Initialize database connection
    logger.info(f"Database URL: {config.DATABASE_URL}")
    init_db(config.DATABASE_URL, echo=True)

    # Create all tables
    logger.info("Creating database tables...")
    create_all_tables()

    logger.info("Database initialization completed successfully!")
    logger.info(f"Database file created at: {config.DATABASE_PATH}")

    # Show created tables
    logger.info("\nCreated tables:")
    logger.info("  1. debates - Main debate records")
    logger.info("  2. debate_models - AI models in debates")
    logger.info("  3. debate_outcomes - Market outcomes")
    logger.info("  4. messages - Debate messages")
    logger.info("  5. message_predictions - Message predictions")


if __name__ == '__main__':
    main()
