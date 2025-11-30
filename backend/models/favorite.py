"""
User favorites model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class UserFavorite(Base):
    """User favorite markets model"""

    __tablename__ = 'user_favorites'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    market_id = Column(String(100), nullable=False, index=True)
    debate_id = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationship to user
    user = relationship("User", backref="favorites")

    # Ensure a user can't favorite the same market/debate twice
    # Note: Unique constraints are handled by partial indexes in the database:
    # - uq_user_debate_favorite (user_id, debate_id) WHERE debate_id IS NOT NULL
    # - uq_user_market_favorite_generic (user_id, market_id) WHERE debate_id IS NULL

    def __repr__(self):
        return f"<UserFavorite(id={self.id}, user_id={self.user_id}, market_id='{self.market_id}', debate_id='{self.debate_id}')>"

    def to_dict(self):
        """Convert favorite to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'market_id': self.market_id,
            'debate_id': self.debate_id,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None
        }
