"""
FastAPI error handling and CORS middleware.
"""
import logging
import traceback
from sqlalchemy import select
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config_fastapi import settings
from deps import async_session_factory, get_optional_current_user, is_auth_enabled
from models.project import Project

# Rate limiting imports
from services.rate_limiter import rate_limiter, rate_limit_whitelist

logger = logging.getLogger(__name__)

_PROJECT_FILE_BUCKETS = {"exports", "pages", "template", "materials"}


def _extract_project_file_scope(path: str) -> tuple[str | None, str | None]:
    if not path.startswith("/files/"):
        return None, None

    relative = path[len("/files/"):].strip("/")
    if not relative:
        return None, None

    parts = relative.split("/", 2)
    if len(parts) < 2:
        return None, None

    project_id, bucket = parts[0], parts[1]
    if bucket not in _PROJECT_FILE_BUCKETS:
        return None, None

    return project_id, bucket


def setup_middleware(app: FastAPI) -> None:
    """Configure all middleware for the FastAPI app."""

    # ── CORS ─────────────────────────────────────────────────────
    origins = settings.cors_origin_list
    if "*" in origins:
        # Allow all origins
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.middleware("http")
    async def protect_project_files(request: Request, call_next):
        project_id, bucket = _extract_project_file_scope(request.url.path)
        if not project_id or not bucket or not is_auth_enabled():
            return await call_next(request)

        current_user = get_optional_current_user(request)
        if current_user is None:
            return JSONResponse(
                status_code=401,
                content={"status": "error", "error": {"message": "Authentication required", "code": 401}},
            )

        async with async_session_factory() as session:
            result = await session.execute(
                select(Project.id).where(
                    Project.id == project_id,
                    Project.user_id == current_user.user_id,
                )
            )
            owned_project_id = result.scalar_one_or_none()

        if owned_project_id is None:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "error": {"message": "Resource not found", "code": 404}},
            )

        return await call_next(request)

    # ── Rate Limiting Middleware ────────────────────────────────
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        """
        全局限流中间件
        
        根据路径自动应用不同限流策略：
        - AI生成接口：更严格
        - 普通API：标准限制
        - 监控/健康检查：较宽松
        """
        # 跳过静态文件和特定路径
        path = request.url.path
        skip_paths = {
            "/", "/docs", "/openapi.json", "/health",
            "/favicon.ico", "/robots.txt"
        }
        if path in skip_paths or path.startswith("/static"):
            return await call_next(request)
        
        # 检查白名单
        if await rate_limit_whitelist.is_whitelisted(request):
            return await call_next(request)
        
        # 检查限流
        result = await rate_limiter.check_request(request)
        
        if not result.allowed:
            logger.warning(f"Rate limit exceeded for {path} by {rate_limiter._get_client_key(request)}")
            return JSONResponse(
                status_code=429,
                content={
                    "status": "error",
                    "error": {
                        "message": f"Rate limit exceeded. Please try again after {int(result.retry_after)} seconds.",
                        "code": 429,
                        "retry_after": int(result.retry_after)
                    }
                },
                headers=result.to_headers()
            )
        
        # 继续处理请求
        response = await call_next(request)
        
        # 添加限流响应头
        if hasattr(response, 'headers'):
            response.headers.update(result.to_headers())
        
        return response

    # ── Global Exception Handler ────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Catch-all exception handler returning structured error JSON."""
        logger.error(f"Unhandled exception: {exc}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error": {
                    "message": str(exc),
                    "code": 500,
                },
            },
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=404,
            content={
                "status": "error",
                "error": {
                    "message": "Resource not found",
                    "code": 404,
                },
            },
        )
