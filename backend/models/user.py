"""
User model for authentication
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """User model for passwordless authentication"""

    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Profile fields
    avatar_url = Column(String(500), nullable=True)
    tokens_remaining = Column(Integer, default=100000)
    total_debates = Column(Integer, default=0)

    # Relationship to verification codes
    verification_codes = relationship(
        "VerificationCode",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # Relationship to debates
    debates = relationship(
        "DebateDB",
        back_populates="user",
        foreign_keys="DebateDB.user_id"
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"

    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'avatar_url': self.avatar_url,
            'tokens_remaining': self.tokens_remaining,
            'total_debates': self.total_debates,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'last_login': self.last_login.isoformat() + 'Z' if self.last_login else None,
            'is_active': self.is_active
        }
