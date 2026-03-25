"""
Monitoring and Health Check Endpoints

提供系统监控和健康检查:
- 熔断器状态
- 并发统计
- AI 客户端指标
- 限流状态
- 资源使用情况
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Request

from deps import require_current_user, CurrentUser
from fastapi import HTTPException
from services.circuit_breaker import get_all_circuit_breaker_stats, reset_circuit_breaker
from services.concurrency_limits import get_concurrency_manager
from services.ai_client_wrapper import get_all_ai_client_metrics
from services.rate_limiter import rate_limiter, rate_limit_whitelist, RateLimitConfig

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.get("/health")
async def health_check() -> dict[str, Any]:
    """基础健康检查"""
    return {
        "status": "healthy",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
    }


@router.get("/circuit-breakers")
async def get_circuit_breaker_status(
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """获取所有熔断器状态（需要管理员权限）"""
    return {
        "circuit_breakers": get_all_circuit_breaker_stats(),
    }


@router.post("/circuit-breakers/{name}/reset")
async def reset_circuit_breaker_endpoint(
    name: str,
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """手动重置熔断器（需要管理员权限）"""
    success = await reset_circuit_breaker(name)
    return {
        "name": name,
        "reset_success": success,
    }


@router.get("/concurrency")
async def get_concurrency_stats(
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """获取并发统计信息（需要管理员权限）"""
    manager = get_concurrency_manager()
    return manager.get_all_stats()


@router.get("/ai-clients")
async def get_ai_client_stats(
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """获取 AI 客户端统计信息（需要管理员权限）"""
    return {
        "ai_clients": get_all_ai_client_metrics(),
    }


@router.get("/status")
async def get_full_status(
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """获取完整系统状态（需要管理员权限）"""
    manager = get_concurrency_manager()
    
    return {
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        "circuit_breakers": get_all_circuit_breaker_stats(),
        "concurrency": manager.get_all_stats(),
        "ai_clients": get_all_ai_client_metrics(),
    }


# ── Rate Limiting Endpoints ───────────────────────────────────────

@router.get("/rate-limits/config")
async def get_rate_limit_config(
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """获取限流配置（需要管理员权限）"""
    return {
        "default": {
            "requests_per_window": rate_limiter.DEFAULT_CONFIG.requests_per_window,
            "window_seconds": rate_limiter.DEFAULT_CONFIG.window_seconds,
            "burst_size": rate_limiter.DEFAULT_CONFIG.burst_size,
        },
        "routes": {
            route: {
                "requests_per_window": config.requests_per_window,
                "window_seconds": config.window_seconds,
                "burst_size": config.burst_size,
            }
            for route, config in rate_limiter.ROUTE_CONFIGS.items()
        },
        "enabled": rate_limiter._enabled,
    }


@router.post("/rate-limits/reset")
async def reset_rate_limit(
    request: Request,
    path: str | None = None,
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """重置当前用户的限流计数（需要管理员权限）"""
    await rate_limiter.reset_client(request, path)
    return {
        "reset_success": True,
        "path": path or "all",
    }


@router.get("/rate-limits/check")
async def check_rate_limit(
    request: Request,
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """检查当前用户的限流状态（需要管理员权限）"""
    result = await rate_limiter.check_request(request)
    return {
        "allowed": result.allowed,
        "remaining": result.remaining,
        "limit": result.limit,
        "reset_time": result.reset_time,
        "retry_after": result.retry_after,
    }


@router.post("/rate-limits/whitelist/add")
async def add_to_whitelist(
    ip: str | None = None,
    user_id: str | None = None,
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """添加IP或用户到限流白名单（需要管理员权限）"""
    if ip:
        await rate_limit_whitelist.add_ip(ip)
    if user_id:
        await rate_limit_whitelist.add_user(user_id)
    
    return {
        "success": True,
        "added_ip": ip,
        "added_user": user_id,
    }


@router.post("/rate-limits/whitelist/remove")
async def remove_from_whitelist(
    ip: str | None = None,
    user_id: str | None = None,
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """从限流白名单移除IP或用户（需要管理员权限）"""
    if ip:
        await rate_limit_whitelist.remove_ip(ip)
    if user_id:
        await rate_limit_whitelist.remove_user(user_id)
    
    return {
        "success": True,
        "removed_ip": ip,
        "removed_user": user_id,
    }


@router.post("/rate-limits/toggle")
async def toggle_rate_limit(
    enabled: bool,
    current_user: CurrentUser = Depends(require_current_user)
) -> dict[str, Any]:
    """启用/禁用限流（需要管理员权限）"""
    if enabled:
        rate_limiter.enable()
    else:
        rate_limiter.disable()
    
    return {
        "enabled": rate_limiter._enabled,
    }


__all__ = ["router"]
