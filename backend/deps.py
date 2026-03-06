"""
Database session and dependency injection for FastAPI.

Provides:
- AsyncSession for database operations via `get_db` dependency
- Engine setup and lifecycle management
"""
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from config_fastapi import settings

logger = logging.getLogger(__name__)


# ── SQLAlchemy Async Engine ──────────────────────────────────────

engine = create_async_engine(
    settings.sqlalchemy_database_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Declarative Base ────────────────────────────────────────────

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass


# ── Dependency Injection ────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async database session.
    
    Usage in routes:
        @router.get("/projects")
        async def list_projects(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Project))
            ...
    
    The session is automatically committed on success and rolled back on error.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Lifecycle ───────────────────────────────────────────────────

async def init_db():
    """Initialize database tables (development only)"""
    async with engine.begin() as conn:
        # Import all models so they are registered with Base.metadata
        # This is done here to avoid circular imports
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized")


async def close_db():
    """Cleanup database engine on shutdown"""
    await engine.dispose()
    logger.info("Database engine disposed")
