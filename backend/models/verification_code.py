"""
Verification code model for passwordless authentication
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
import enum


class CodeType(enum.Enum):
    """Type of verification code"""
    SIGNUP = "signup"
    LOGIN = "login"


class VerificationCode(Base):
    """Verification code model for email-based authentication"""

    __tablename__ = 'verification_codes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    email = Column(String(255), nullable=False, index=True)  # For signup codes before user exists
    name = Column(String(255), nullable=True)  # Store name for signup
    code_hash = Column(String(60), nullable=False)  # bcrypt hash of the verification code
    code_type = Column(SQLEnum(CodeType), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)  # For security logging

    # Relationship to user
    user = relationship("User", back_populates="verification_codes")

    def __repr__(self):
        return f"<VerificationCode(id={self.id}, email='{self.email}', type={self.code_type}, used={self.used_at is not None})>"

    def is_valid(self):
        """Check if code is still valid (not expired and not used)"""
        now = datetime.utcnow()
        return self.used_at is None and self.expires_at > now

    def mark_as_used(self):
        """Mark code as used"""
        self.used_at = datetime.utcnow()
