"""
SQLAlchemy base model and database configuration
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from config import config

# Create declarative base
Base = declarative_base()

# Create engine
engine = create_engine(
    config.DATABASE_URL,
    echo=config.DEBUG,
    pool_pre_ping=True,
    pool_recycle=3600
)

# Create session factory
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)


def init_db():
    """Initialize database and create all tables"""
    # Import all models here to ensure they're registered
    from models.user import User
    from models.verification_code import VerificationCode

    Base.metadata.create_all(engine)


def get_db():
    """Get database session (for use in routes)"""
    db = Session()
    try:
        yield db
    finally:
        db.close()
