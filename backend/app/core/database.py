"""Database configuration and session management."""

import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


def mask_password_in_url(url: str) -> str:
    """Mask password in database URL for safe logging.
    
    Args:
        url: Database URL string
        
    Returns:
        URL with password replaced by ****
    """
    import re
    # Match password in URL format: user:password@host
    return re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', url)


def log_database_config() -> None:
    """Log database configuration without exposing sensitive data.
    
    PASSWORD RESET INSTRUCTIONS:
    If connection fails with "password authentication failed":
    1. Edit: backend/.env and change POSTGRES_PASSWORD=Lazi200423
    2. Test with psql: /Applications/PostgreSQL\\ 16/bin/psql -U postgres -d ai_inventory_db
    3. Restart backend: uvicorn app.main:app --reload
    """
    logger.info("=" * 60)
    logger.info("DATABASE CONFIGURATION")
    logger.info("=" * 60)
    logger.info(f"Host:          {settings.POSTGRES_SERVER}")
    logger.info(f"Port:          {settings.POSTGRES_PORT}")
    logger.info(f"User:          {settings.POSTGRES_USER}")
    logger.info(f"Database:      {settings.POSTGRES_DB}")
    logger.info(f"Masked URL:    {mask_password_in_url(str(settings.DATABASE_URI))}")
    logger.info(f"SQLAlchemy:    {mask_password_in_url(str(settings.DATABASE_URI))}")
    logger.info(f"Engine Echo:   {settings.DEBUG}")
    logger.info("=" * 60)


# Create async engine
engine = create_async_engine(
    str(settings.DATABASE_URI),
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    poolclass=NullPool if settings.ENVIRONMENT == "test" else None,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions.
    
    Yields:
        AsyncSession: Database session
        
    Example:
        @app.get("/items/")
        async def read_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables.
    
    Creates all tables defined in models.
    Should be called on application startup in development.
    Use Alembic migrations in production.
    """
    log_database_config()
    
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise


async def close_db() -> None:
    """Close database connections.
    
    Should be called on application shutdown.
    """
    logger.info("Closing database connections...")
    await engine.dispose()
    logger.info("✅ Database connections closed")
