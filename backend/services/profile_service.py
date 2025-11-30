"""
Profile service - Helper functions for profile management
"""
import os
import time
import logging
from werkzeug.utils import secure_filename
from sqlalchemy import func
from config import config
from models.db_models import DebateDB
from models.favorite import UserFavorite

logger = logging.getLogger(__name__)


def handle_avatar_upload(file, user_id):
    """
    Upload and process avatar image

    Args:
        file: FileStorage object from Flask request
        user_id: User ID for filename

    Returns:
        str: Avatar URL path or None if failed
    """
    try:
        # Validate file type
        allowed_extensions = {'jpg', 'jpeg', 'png', 'gif'}
        filename = secure_filename(file.filename)

        if not filename or '.' not in filename:
            logger.error("Invalid filename")
            return None

        ext = filename.rsplit('.', 1)[1].lower()

        if ext not in allowed_extensions:
            logger.error(f"Invalid file extension: {ext}")
            return None

        # Check file size (5MB max)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > 5 * 1024 * 1024:  # 5MB
            logger.error(f"File too large: {file_size} bytes")
            return None

        # Generate unique filename
        timestamp = int(time.time())
        new_filename = f"user{user_id}_{timestamp}.{ext}"
        filepath = os.path.join(config.AVATAR_DIR, new_filename)

        # Ensure avatar directory exists
        os.makedirs(config.AVATAR_DIR, exist_ok=True)

        # Save and resize image
        try:
            from PIL import Image

            image = Image.open(file)

            # Convert to RGB if necessary (for PNG with transparency)
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background

            # Resize to 256x256
            image = image.resize((256, 256), Image.LANCZOS)
            image.save(filepath, quality=90, optimize=True)

            return f"/uploads/avatars/{new_filename}"

        except ImportError:
            logger.warning("PIL not installed, saving without resize")
            file.save(filepath)
            return f"/uploads/avatars/{new_filename}"

    except Exception as e:
        logger.error(f"Avatar upload failed: {e}", exc_info=True)
        return None


def get_favorite_models(db, user_id, limit=3):
    """
    Get user's most used AI models

    Args:
        db: Database session
        user_id: User ID
        limit: Maximum number of models to return

    Returns:
        list: List of favorite models with usage counts
    """
    try:
        from models.db_models import DebateModelDB

        # Query model usage directly from debate_models table
        model_usage = db.query(
            DebateModelDB.model_id,
            DebateModelDB.model_name,
            func.count(DebateModelDB.id).label('usage_count')
        ).join(
            DebateDB, DebateModelDB.debate_id == DebateDB.debate_id
        ).filter(
            DebateDB.user_id == user_id,
            DebateDB.is_deleted == False
        ).group_by(
            DebateModelDB.model_id,
            DebateModelDB.model_name
        ).order_by(
            func.count(DebateModelDB.id).desc()
        ).limit(limit).all()

        return [
            {
                'model_id': model_id,
                'model_name': model_name,
                'usage_count': usage_count
            }
            for model_id, model_name, usage_count in model_usage
        ]

    except Exception as e:
        logger.error(f"Error getting favorite models: {e}", exc_info=True)
        return []


def get_favorite_categories(db, user_id, limit=3):
    """
    Get user's most debated categories

    Args:
        db: Database session
        user_id: User ID
        limit: Maximum number of categories to return

    Returns:
        list: List of favorite categories with counts
    """
    try:
        categories = db.query(
            DebateDB.market_category,
            func.count(DebateDB.debate_id).label('count')
        ).filter(
            DebateDB.user_id == user_id,
            DebateDB.is_deleted == False,
            DebateDB.market_category.isnot(None)
        ).group_by(
            DebateDB.market_category
        ).order_by(
            func.count(DebateDB.debate_id).desc()
        ).limit(limit).all()

        return [
            {'category': cat, 'count': count}
            for cat, count in categories
        ]

    except Exception as e:
        logger.error(f"Error getting favorite categories: {e}", exc_info=True)
        return []


def format_debate_summary(db, debate):
    """
    Format debate for list view

    Args:
        db: Database session
        debate: DebateDB object

    Returns:
        dict: Formatted debate summary
    """
    try:
        from models.db_models import DebateModelDB

        # Check if the debate's market is favorited
        # Check if the debate is favorited
        is_favorite = False
        if debate.user_id:
            # Check specific debate favorite
            fav = db.query(UserFavorite).filter_by(
                user_id=debate.user_id,
                debate_id=debate.debate_id
            ).first()
            
            if fav:
                is_favorite = True
            elif debate.market_id:
                # Fallback: Check if generic market is favorited (where debate_id is NULL)
                # This maintains backward compatibility if we want to support "favoriting a market" generally
                # But for now, let's prioritize specific debate favorites.
                # Actually, if we want "unique by id", we should strictly check debate_id if we are listing debates.
                # However, if the user favorited the MARKET via some other UI, maybe we should show it?
                # The user said "it has to be unique yk by id". So let's stick to debate_id.
                pass

        # Count models using a query instead of accessing the relationship
        models_count = db.query(DebateModelDB).filter_by(
            debate_id=debate.debate_id
        ).count()

        return {
            'debate_id': debate.debate_id,
            'market_id': debate.market_id,
            'market_question': debate.market_question,
            'market_category': debate.market_category,
            'status': debate.status,
            'rounds': debate.rounds,
            'models_count': models_count,
            'total_tokens_used': debate.total_tokens_used or 0,
            'created_at': debate.created_at,
            'completed_at': debate.completed_at,
            'is_favorite': is_favorite
        }

    except Exception as e:
        logger.error(f"Error formatting debate summary: {e}", exc_info=True)
        return None
