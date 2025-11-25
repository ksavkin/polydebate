#!/usr/bin/env python3
"""
Migration script to backfill market_category for existing debates
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, get_db
from models.db_models import DebateDB
from services.polymarket import polymarket_service
from config import config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def backfill_categories():
    """Backfill market_category for all debates that don't have it"""
    # Initialize database
    init_db(config.DATABASE_URL)
    db = get_db()

    try:
        # Get all debates without category
        debates = db.query(DebateDB).filter(
            DebateDB.market_category.is_(None),
            DebateDB.is_deleted == False
        ).all()

        logger.info(f"Found {len(debates)} debates without category")

        updated_count = 0
        failed_count = 0

        for debate in debates:
            try:
                # Fetch market details from Polymarket
                logger.info(f"Fetching category for debate {debate.debate_id} (market {debate.market_id})...")
                market = polymarket_service.get_market(debate.market_id)

                category = market.get('category')
                if category:
                    debate.market_category = category
                    logger.info(f"  → Set category to: {category}")
                    updated_count += 1
                else:
                    logger.warning(f"  → No category found in market data")
                    failed_count += 1

            except Exception as e:
                logger.error(f"  → Failed to fetch market {debate.market_id}: {e}")
                failed_count += 1

        # Commit all changes
        db.commit()

        logger.info(f"\n✅ Migration complete!")
        logger.info(f"   Updated: {updated_count} debates")
        logger.info(f"   Failed: {failed_count} debates")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    backfill_categories()
