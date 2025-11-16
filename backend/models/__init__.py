"""
Models package
"""
from database import Base, get_db
from models.user import User
from models.verification_code import VerificationCode, CodeType

# Import debate models so they're registered with SQLAlchemy
from models.db_models import (
    DebateDB,
    DebateModelDB,
    DebateOutcomeDB,
    MessageDB,
    MessagePredictionDB
)

__all__ = [
    'Base',
    'get_db',
    'User',
    'VerificationCode',
    'CodeType',
    'DebateDB',
    'DebateModelDB',
    'DebateOutcomeDB',
    'MessageDB',
    'MessagePredictionDB'
]
