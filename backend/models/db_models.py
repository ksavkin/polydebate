"""
SQLAlchemy ORM models for database
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class DebateDB(Base):
    """Main debate table"""
    __tablename__ = 'debates'

    # Primary key
    debate_id = Column(String(36), primary_key=True)

    # Status and metadata
    status = Column(String(20), nullable=False, index=True)  # 'initialized', 'in_progress', 'paused', 'completed', 'stopped'
    paused = Column(Boolean, default=False)

    # Market information
    market_id = Column(String(100), nullable=False, index=True)
    market_question = Column(Text, nullable=False)
    market_description = Column(Text)

    # Polymarket odds (stored as JSON)
    polymarket_odds = Column(JSON)

    # Debate configuration
    rounds = Column(Integer, nullable=False)
    current_round = Column(Integer, default=0)

    # Final results (stored as JSON)
    final_summary = Column(JSON, nullable=True)
    final_predictions = Column(JSON, nullable=True)

    # Summary generation lock
    summary_generating = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(String(30), nullable=False)
    completed_at = Column(String(30), nullable=True)

    # Relationships
    models = relationship("DebateModelDB", back_populates="debate", cascade="all, delete-orphan")
    outcomes = relationship("DebateOutcomeDB", back_populates="debate", cascade="all, delete-orphan")
    messages = relationship("MessageDB", back_populates="debate", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<DebateDB(debate_id={self.debate_id}, status={self.status}, question={self.market_question[:50]}...)>"


class DebateModelDB(Base):
    """Models participating in a debate"""
    __tablename__ = 'debate_models'

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign key
    debate_id = Column(String(36), ForeignKey('debates.debate_id', ondelete='CASCADE'), nullable=False, index=True)

    # Model information
    model_id = Column(String(200), nullable=False)
    model_name = Column(String(200), nullable=False)
    provider = Column(String(100), nullable=False)

    # Relationship
    debate = relationship("DebateDB", back_populates="models")

    def __repr__(self):
        return f"<DebateModelDB(id={self.id}, model_id={self.model_id}, model_name={self.model_name})>"


class DebateOutcomeDB(Base):
    """Market outcomes for a debate"""
    __tablename__ = 'debate_outcomes'

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign key
    debate_id = Column(String(36), ForeignKey('debates.debate_id', ondelete='CASCADE'), nullable=False, index=True)

    # Outcome information
    name = Column(String(200), nullable=False)
    price = Column(Float, nullable=False)

    # Relationship
    debate = relationship("DebateDB", back_populates="outcomes")

    def __repr__(self):
        return f"<DebateOutcomeDB(id={self.id}, name={self.name}, price={self.price})>"


class MessageDB(Base):
    """Messages in a debate"""
    __tablename__ = 'messages'

    # Primary key
    message_id = Column(String(36), primary_key=True)

    # Foreign key
    debate_id = Column(String(36), ForeignKey('debates.debate_id', ondelete='CASCADE'), nullable=False, index=True)

    # Message metadata
    round = Column(Integer, nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    model_id = Column(String(200), nullable=False)
    model_name = Column(String(200), nullable=False)
    message_type = Column(String(20), nullable=False)  # 'initial', 'debate', 'final'

    # Message content
    text = Column(Text, nullable=False)

    # Audio (optional)
    audio_url = Column(String(500), nullable=True)
    audio_duration = Column(Float, nullable=True)

    # Timestamp
    timestamp = Column(String(30), nullable=False, index=True)

    # Relationships
    debate = relationship("DebateDB", back_populates="messages")
    predictions = relationship("MessagePredictionDB", back_populates="message", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<MessageDB(message_id={self.message_id}, round={self.round}, model={self.model_name})>"


class MessagePredictionDB(Base):
    """Predictions within a message"""
    __tablename__ = 'message_predictions'

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign key
    message_id = Column(String(36), ForeignKey('messages.message_id', ondelete='CASCADE'), nullable=False, index=True)

    # Prediction data
    outcome_name = Column(String(200), nullable=False)
    percentage = Column(Integer, nullable=False)  # 0-100

    # Relationship
    message = relationship("MessageDB", back_populates="predictions")

    def __repr__(self):
        return f"<MessagePredictionDB(id={self.id}, outcome={self.outcome_name}, percentage={self.percentage})>"
