"""
Add summary_generating column to debates table if it doesn't exist
"""
import sys
import os
import sqlite3

# Add parent directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import config
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def add_summary_generating_column():
    """Add summary_generating column to debates table if it doesn't exist"""
    logger.info("Starting migration: Add summary_generating column")
    
    # Extract database path from DATABASE_URL
    # Format: sqlite:///path/to/db.db
    db_url = config.DATABASE_URL
    if db_url.startswith('sqlite:///'):
        db_path = db_url.replace('sqlite:///', '')
    else:
        logger.error(f"Unexpected database URL format: {db_url}")
        return
    
    logger.info(f"Database path: {db_path}")
    
    if not os.path.exists(db_path):
        logger.error(f"Database file not found: {db_path}")
        return
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(debates)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'summary_generating' in columns:
            logger.info("Column 'summary_generating' already exists, skipping migration")
            return
        
        # Add the column
        logger.info("Adding 'summary_generating' column to debates table...")
        cursor.execute("ALTER TABLE debates ADD COLUMN summary_generating BOOLEAN DEFAULT 0")
        conn.commit()
        logger.info("Successfully added 'summary_generating' column")
    except Exception as e:
        logger.error(f"Error during migration: {e}", exc_info=True)
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    try:
        add_summary_generating_column()
        logger.info("Migration completed successfully!")
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        sys.exit(1)

