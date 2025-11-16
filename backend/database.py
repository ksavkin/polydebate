"""
Database connection and session management for SQLAlchemy + SQLite
"""
import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import StaticPool
import logging

logger = logging.getLogger(__name__)

# Base class for all ORM models
Base = declarative_base()

# Database engine and session globals
engine = None
SessionLocal = None


def init_db(database_url: str, echo: bool = False):
    """
    Initialize database connection

    Args:
        database_url: SQLite database URL (e.g., 'sqlite:///./storage/polydebate.db')
        echo: Whether to log SQL queries (for debugging)
    """
    global engine, SessionLocal

    # Create engine with SQLite-specific settings
    engine = create_engine(
        database_url,
        echo=echo,
        connect_args={
            "check_same_thread": False  # Allow multiple threads (needed for Flask)
        },
        poolclass=StaticPool  # Use static pool for SQLite
    )

    # Enable foreign keys for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create session factory
    SessionLocal = scoped_session(
        sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine
        )
    )

    logger.info(f"Database initialized: {database_url}")


def create_all_tables():
    """Create all tables in the database"""
    if engine is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    Base.metadata.create_all(bind=engine)
    logger.info("All database tables created")


def drop_all_tables():
    """Drop all tables (use with caution!)"""
    if engine is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    Base.metadata.drop_all(bind=engine)
    logger.warning("All database tables dropped")


def get_db():
    """
    Get database session (for use in Flask route handlers)

    Usage:
        db = get_db()
        try:
            # ... use db ...
            db.commit()
        except:
            db.rollback()
            raise
        finally:
            db.close()
    """
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    return SessionLocal()


def close_db():
    """Close database session"""
    if SessionLocal:
        SessionLocal.remove()
