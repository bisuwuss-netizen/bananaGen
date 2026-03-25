"""
API Rate Limiting Service
API 限流服务 - 基于滑动窗口算法

Features:
- 按用户ID/IP限流
- 滑动窗口计数
- 路由级配置
- 分布式Redis支持（可选）
"""

import time
import asyncio
from typing import Optional, Callable, Dict, Tuple
from dataclasses import dataclass, field
from functools import wraps
import hashlib
import logging

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """限流配置"""
    requests_per_window: int = 60      # 窗口期内最大请求数
    window_seconds: float = 60.0       # 窗口期（秒）
    burst_size: int = 10               # 突发请求容量
    key_prefix: str = "ratelimit"      # 缓存键前缀
    
    def __post_init__(self):
        # 确保突发容量不超过窗口限制
        self.burst_size = min(self.burst_size, self.requests_per_window)


@dataclass
class RateLimitResult:
    """限流检查结果"""
    allowed: bool                      # 是否允许请求
    remaining: int                     # 剩余可用请求数
    reset_time: float                  # 重置时间戳
    retry_after: Optional[float] = None  # 建议重试等待时间（秒）
    limit: int = 0                     # 总限制数
    
    def to_headers(self) -> Dict[str, str]:
        """转换为HTTP响应头"""
        headers = {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(max(0, self.remaining)),
            "X-RateLimit-Reset": str(int(self.reset_time)),
        }
        if not self.allowed and self.retry_after:
            headers["Retry-After"] = str(int(self.retry_after))
        return headers


class SlidingWindowRateLimiter:
    """
    滑动窗口限流器（内存版）
    
    适用于单机部署，多实例部署需要使用Redis版
    """
    
    def __init__(self):
        # 存储结构: {key: [(timestamp1, count1), (timestamp2, count2), ...]}
        self._windows: Dict[str, list] = {}
        self._lock = asyncio.Lock()
        self._cleanup_interval = 300  # 5分钟清理一次过期数据
        self._last_cleanup = time.time()
        
    async def _cleanup_expired(self, current_time: float):
        """清理过期数据"""
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
            
        async with self._lock:
            keys_to_remove = []
            for key, windows in self._windows.items():
                # 保留最近5分钟的数据
                cutoff = current_time - 300
                self._windows[key] = [(ts, cnt) for ts, cnt in windows if ts > cutoff]
                if not self._windows[key]:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self._windows[key]
                
        self._last_cleanup = current_time
    
    async def check_rate_limit(
        self,
        key: str,
        config: RateLimitConfig
    ) -> RateLimitResult:
        """
        检查是否超过限流阈值
        
        Args:
            key: 限流键（如 user_id 或 IP）
            config: 限流配置
            
        Returns:
            RateLimitResult: 检查结果
        """
        current_time = time.time()
        await self._cleanup_expired(current_time)
        
        async with self._lock:
            if key not in self._windows:
                self._windows[key] = []
            
            window = self._windows[key]
            window_start = current_time - config.window_seconds
            
            # 计算当前窗口内的请求总数
            current_count = sum(
                cnt for ts, cnt in window 
                if ts > window_start
            )
            
            # 计算下一个重置时间
            if window:
                oldest_ts = min(ts for ts, _ in window)
                reset_time = oldest_ts + config.window_seconds
            else:
                reset_time = current_time + config.window_seconds
            
            limit = config.requests_per_window
            remaining = limit - current_count
            
            # 检查是否允许（考虑突发容量）
            if current_count < limit:
                # 允许请求，记录
                window.append((current_time, 1))
                return RateLimitResult(
                    allowed=True,
                    remaining=remaining - 1,
                    reset_time=reset_time,
                    limit=limit
                )
            else:
                # 超过限制
                retry_after = reset_time - current_time
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=reset_time,
                    retry_after=max(0, retry_after),
                    limit=limit
                )
    
    async def reset(self, key: str):
        """重置指定键的限流计数"""
        async with self._lock:
            if key in self._windows:
                del self._windows[key]


class RateLimiter:
    """
    限流器管理类
    
    支持：
    - 全局默认限流
    - 路由级自定义限流
    - 按用户/IP区分
    """
    
    # 默认配置
    DEFAULT_CONFIG = RateLimitConfig(
        requests_per_window=120,   # 每分钟120个请求（放宽）
        window_seconds=60.0,
        burst_size=20
    )
    
    # 路由特定配置（路径前缀匹配）
    # 生产环境配置在 config_rate_limits.py 中管理
    ROUTE_CONFIGS: Dict[str, RateLimitConfig] = {
        # AI生成接口 - 严格限制（防止API费用暴增）
        "/api/generation": RateLimitConfig(
            requests_per_window=20,    # 每分钟20次
            window_seconds=60.0,
            burst_size=5
        ),
        # 图片生成 - 最严格（最慢最贵）
        "/api/generation/images": RateLimitConfig(
            requests_per_window=10,     # 每分钟10次
            window_seconds=60.0,
            burst_size=5
        ),
        # 导出接口 - 中等限制（数据库压力）
        "/api/export": RateLimitConfig(
            requests_per_window=20,    # 每分钟20次
            window_seconds=60.0,
            burst_size=5
        ),
        # 监控接口 - 宽松（管理员使用）
        "/api/monitoring": RateLimitConfig(
            requests_per_window=120,   # 每分钟120次
            window_seconds=60.0,
            burst_size=20
        ),
    }
    
    def __init__(self):
        self._limiter = SlidingWindowRateLimiter()
        self._enabled = True
        
    def disable(self):
        """禁用限流（调试用）"""
        self._enabled = False
        
    def enable(self):
        """启用限流"""
        self._enabled = True
    
    def _get_client_key(self, request) -> str:
        """
        获取客户端标识键
        
        优先级：
        1. 已登录用户的 user_id
        2. IP地址（未登录用户）
        """
        # 尝试获取用户ID
        if hasattr(request.state, 'user') and request.state.user:
            user_id = getattr(request.state.user, 'user_id', None)
            if user_id:
                return f"user:{user_id}"
        
        # 回退到IP地址
        client_ip = self._get_client_ip(request)
        return f"ip:{client_ip}"
    
    def _get_client_ip(self, request) -> str:
        """获取客户端真实IP"""
        # 优先从代理头获取
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-Ip")
        if real_ip:
            return real_ip
        
        # 直接连接IP
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"
    
    def _get_route_config(self, path: str) -> RateLimitConfig:
        """获取路由特定的限流配置"""
        for route_prefix, config in self.ROUTE_CONFIGS.items():
            if path.startswith(route_prefix):
                return config
        return self.DEFAULT_CONFIG
    
    async def check_request(
        self,
        request,
        custom_config: Optional[RateLimitConfig] = None
    ) -> RateLimitResult:
        """
        检查请求是否超过限流
        
        Args:
            request: FastAPI Request 对象
            custom_config: 可选的自定义配置
            
        Returns:
            RateLimitResult: 检查结果
        """
        if not self._enabled:
            return RateLimitResult(
                allowed=True,
                remaining=9999,
                reset_time=time.time() + 3600,
                limit=9999
            )
        
        # 获取限流键
        client_key = self._get_client_key(request)
        
        # 获取配置
        if custom_config:
            config = custom_config
        else:
            config = self._get_route_config(request.url.path)
        
        # 构建完整限流键
        route_key = f"{config.key_prefix}:{client_key}:{request.url.path}"
        
        return await self._limiter.check_rate_limit(route_key, config)
    
    async def reset_client(self, request, path: Optional[str] = None):
        """重置指定客户端的限流计数"""
        client_key = self._get_client_key(request)
        if path:
            route_key = f"{self.DEFAULT_CONFIG.key_prefix}:{client_key}:{path}"
        else:
            # 重置所有路径
            route_key = f"{self.DEFAULT_CONFIG.key_prefix}:{client_key}"
        
        # 这里简化处理，实际应该匹配所有路径
        await self._limiter.reset(route_key)


# 全局限流器实例
rate_limiter = RateLimiter()


# 装饰器版（用于特定端点）
def rate_limit(
    requests_per_window: int = 60,
    window_seconds: float = 60.0,
    burst_size: int = 10,
    key_func: Optional[Callable] = None
):
    """
    限流装饰器
    
    用法:
        @app.get("/api/sensitive")
        @rate_limit(requests_per_window=5, window_seconds=60)
        async def sensitive_endpoint(request: Request):
            return {"data": "secret"}
    """
    config = RateLimitConfig(
        requests_per_window=requests_per_window,
        window_seconds=window_seconds,
        burst_size=burst_size
    )
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从参数中找到 request
            request = kwargs.get('request')
            if not request and args:
                for arg in args:
                    if hasattr(arg, 'url') and hasattr(arg, 'client'):
                        request = arg
                        break
            
            if not request:
                logger.warning("Rate limit decorator: request object not found")
                return await func(*args, **kwargs)
            
            # 使用自定义key函数或默认
            if key_func:
                client_key = key_func(request)
            else:
                client_key = rate_limiter._get_client_key(request)
            
            route_key = f"{config.key_prefix}:{client_key}:{request.url.path}"
            result = await rate_limiter._limiter.check_rate_limit(route_key, config)
            
            if not result.allowed:
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=429,
                    content={
                        "status": "error",
                        "error": {
                            "message": "Rate limit exceeded. Please try again later.",
                            "code": 429,
                            "retry_after": result.retry_after
                        }
                    },
                    headers=result.to_headers()
                )
            
            # 执行原函数
            response = await func(*args, **kwargs)
            
            # 添加限流头到响应
            if hasattr(response, 'headers'):
                response.headers.update(result.to_headers())
            
            return response
        
        return wrapper
    return decorator


# 白名单支持（可选）
class RateLimitWhitelist:
    """限流白名单管理"""
    
    def __init__(self):
        self._ips: set = set()
        self._users: set = set()
        self._lock = asyncio.Lock()
    
    async def add_ip(self, ip: str):
        async with self._lock:
            self._ips.add(ip)
    
    async def remove_ip(self, ip: str):
        async with self._lock:
            self._ips.discard(ip)
    
    async def add_user(self, user_id: str):
        async with self._lock:
            self._users.add(user_id)
    
    async def remove_user(self, user_id: str):
        async with self._lock:
            self._users.discard(user_id)
    
    async def is_whitelisted(self, request) -> bool:
        """检查请求是否在白名单中"""
        # 检查IP
        client_ip = rate_limiter._get_client_ip(request)
        if client_ip in self._ips:
            return True
        
        # 检查用户
        if hasattr(request.state, 'user') and request.state.user:
            user_id = getattr(request.state.user, 'user_id', None)
            if user_id and user_id in self._users:
                return True
        
        return False


# 全局白名单实例
rate_limit_whitelist = RateLimitWhitelist()
