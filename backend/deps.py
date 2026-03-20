"""Database session and dependency injection for FastAPI."""
import logging
import os
from dataclasses import dataclass
from typing import Any
from typing import AsyncGenerator
from itsdangerous import BadSignature, URLSafeSerializer
from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from config_fastapi import settings
from models.project import Project

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


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    username: str
    auth_enabled: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "auth_enabled": self.auth_enabled,
        }


def get_auth_accounts() -> dict[str, dict[str, str]]:
    raw = (os.getenv("AUTH_USERS") or settings.auth_users or "").strip()
    if not raw:
        return {}

    accounts: dict[str, dict[str, str]] = {}
    for entry in raw.split(","):
        item = entry.strip()
        if not item:
            continue
        parts = [part.strip() for part in item.split(":")]
        if len(parts) < 2 or not parts[0] or not parts[1]:
            logger.warning("Skip invalid AUTH_USERS entry: %s", item)
            continue
        username, password = parts[0], parts[1]
        user_id = parts[2] if len(parts) >= 3 and parts[2] else username
        accounts[username] = {
            "username": username,
            "password": password,
            "user_id": str(user_id),
        }
    return accounts


def is_auth_enabled() -> bool:
    return bool(get_auth_accounts())


def get_auth_account(username: str) -> dict[str, str] | None:
    if not username:
        return None
    return get_auth_accounts().get(username)


def _get_auth_serializer() -> URLSafeSerializer:
    return URLSafeSerializer(settings.secret_key, salt="banana-auth-session")


def create_auth_cookie_value(user: CurrentUser) -> str:
    return _get_auth_serializer().dumps(
        {
            "user_id": user.user_id,
            "username": user.username,
        }
    )


def _parse_auth_cookie_value(cookie_value: str | None) -> CurrentUser | None:
    if not cookie_value:
        return None

    try:
        payload = _get_auth_serializer().loads(cookie_value)
    except BadSignature:
        return None

    user_id = str(payload.get("user_id") or "").strip()
    username = str(payload.get("username") or "").strip()
    if not user_id or not username:
        return None

    account = get_auth_account(username)
    if not account or account["user_id"] != user_id:
        return None

    return CurrentUser(user_id=user_id, username=username, auth_enabled=True)


def get_optional_current_user(request: Request) -> CurrentUser | None:
    if not is_auth_enabled():
        return CurrentUser(user_id="1", username="legacy", auth_enabled=False)

    cookie_value = request.cookies.get(settings.auth_cookie_name)
    return _parse_auth_cookie_value(cookie_value)


def require_current_user(request: Request) -> CurrentUser:
    current_user = get_optional_current_user(request)
    if current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return current_user


async def get_project_for_user(
    db: AsyncSession,
    project_id: str,
    current_user: CurrentUser,
    *options: Any,
) -> Project:
    query = select(Project).where(Project.id == project_id)
    if current_user.auth_enabled:
        query = query.where(Project.user_id == current_user.user_id)
    if options:
        query = query.options(*options)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return project
