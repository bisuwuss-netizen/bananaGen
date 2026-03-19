"""Database session and dependency injection for FastAPI."""
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from config_fastapi import settings

logger = logging.getLogger(__name__)


def _async_engine_kwargs() -> dict:
    if settings.sqlalchemy_database_url.startswith("sqlite"):
        return {
            "echo": False,
            "connect_args": {"check_same_thread": False},
        }
    return {
        "echo": False,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "pool_size": 10,
        "max_overflow": 20,
    }


engine = create_async_engine(settings.sqlalchemy_database_url, **_async_engine_kwargs())

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db():
    await engine.dispose()
    logger.info("Database engine disposed")
