"""
Concurrency Limiting and Resource Protection

提供增强的并发控制:
- 数据库连接池保护
- 信号量异常安全包装
- 超时控制装饰器
- 资源使用追踪
"""

from __future__ import annotations

import asyncio
import functools
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, TypeVar, cast

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class ResourceStats:
    """资源使用统计"""
    active_count: int = 0
    total_acquired: int = 0
    total_released: int = 0
    total_timeouts: int = 0
    total_errors: int = 0
    max_concurrent: int = 0
    wait_times: list[float] = field(default_factory=list)
    
    @property
    def average_wait_time(self) -> float:
        if not self.wait_times:
            return 0.0
        return sum(self.wait_times) / len(self.wait_times)


class SafeSemaphore:
    """
    异常安全的信号量
    
    标准 asyncio.Semaphore 的问题:
    - 如果 acquire() 后发生异常，信号量可能无法释放
    - 没有统计和监控能力
    
    SafeSemaphore 解决:
    - 使用 asynccontextmanager 确保信号量正确释放
    - 提供详细的统计信息
    - 支持超时和优先级
    """
    
    def __init__(self, max_value: int, name: str = "unnamed"):
        self._semaphore = asyncio.Semaphore(max_value)
        self._max_value = max_value
        self._name = name
        self._stats = ResourceStats()
        self._stats_lock = asyncio.Lock()
        
    @property
    def max_value(self) -> int:
        return self._max_value
    
    @property
    def available(self) -> int:
        """当前可用许可数"""
        # Semaphore._value 是内部变量，但这是获取可用数的唯一方式
        return self._semaphore._value
    
    @property
    def stats(self) -> ResourceStats:
        """获取统计信息副本"""
        import copy
        return copy.deepcopy(self._stats)
    
    @asynccontextmanager
    async def acquire(self, timeout: Optional[float] = None):
        """
        异常安全地获取信号量
        
        Args:
            timeout: 等待超时时间（秒），None 表示无限等待
        """
        start_time = time.monotonic()
        acquired = False
        
        try:
            # 尝试获取信号量
            if timeout is not None:
                try:
                    await asyncio.wait_for(self._semaphore.acquire(), timeout=timeout)
                    acquired = True
                except asyncio.TimeoutError:
                    async with self._stats_lock:
                        self._stats.total_timeouts += 1
                    raise ConcurrencyTimeoutError(
                        f"Timeout waiting for semaphore '{self._name}' after {timeout}s"
                    )
            else:
                await self._semaphore.acquire()
                acquired = True
            
            # 记录统计
            wait_time = time.monotonic() - start_time
            async with self._stats_lock:
                self._stats.total_acquired += 1
                self._stats.active_count += 1
                self._stats.max_concurrent = max(
                    self._stats.max_concurrent, 
                    self._stats.active_count
                )
                self._stats.wait_times.append(wait_time)
                # 限制历史记录大小
                if len(self._stats.wait_times) > 1000:
                    self._stats.wait_times = self._stats.wait_times[-500:]
            
            yield
            
        except Exception as e:
            async with self._stats_lock:
                self._stats.total_errors += 1
            raise
        finally:
            if acquired:
                self._semaphore.release()
                async with self._stats_lock:
                    self._stats.active_count -= 1
                    self._stats.total_released += 1


class DatabaseConnectionLimiter:
    """
    数据库连接池保护
    
    限制并发数据库操作数量，防止连接池耗尽
    """
    
    def __init__(self, max_connections: int = 10, name: str = "db"):
        self._semaphore = SafeSemaphore(max_connections, f"db_{name}")
        self._max_connections = max_connections
        
    @asynccontextmanager
    async def limit(self, timeout: Optional[float] = 30.0):
        """
        限制数据库操作并发数
        
        Args:
            timeout: 等待可用连接的超市时间
        """
        async with self._semaphore.acquire(timeout=timeout):
            yield
    
    @property
    def stats(self) -> ResourceStats:
        return self._semaphore.stats


class GlobalConcurrencyManager:
    """
    全局并发管理器
    
    统一管理所有并发资源
    """
    
    def __init__(self):
        self._semaphores: dict[str, SafeSemaphore] = {}
        self._db_limiters: dict[str, DatabaseConnectionLimiter] = {}
        self._lock = asyncio.Lock()
    
    async def get_semaphore(self, name: str, max_value: int) -> SafeSemaphore:
        """获取或创建信号量"""
        async with self._lock:
            if name not in self._semaphores:
                self._semaphores[name] = SafeSemaphore(max_value, name)
            return self._semaphores[name]
    
    async def get_db_limiter(self, name: str, max_connections: int) -> DatabaseConnectionLimiter:
        """获取或创建数据库连接限制器"""
        async with self._lock:
            if name not in self._db_limiters:
                self._db_limiters[name] = DatabaseConnectionLimiter(max_connections, name)
            return self._db_limiters[name]
    
    def get_all_stats(self) -> dict[str, dict]:
        """获取所有资源统计信息"""
        return {
            "semaphores": {
                name: {
                    "max": sem.max_value,
                    "available": sem.available,
                    "active": sem.stats.active_count,
                    "total_acquired": sem.stats.total_acquired,
                    "total_timeouts": sem.stats.total_timeouts,
                    "avg_wait_time": sem.stats.average_wait_time,
                }
                for name, sem in self._semaphores.items()
            },
            "db_limiters": {
                name: {
                    "max": limiter._max_connections,
                    "stats": {
                        "active": limiter.stats.active_count,
                        "total_acquired": limiter.stats.total_acquired,
                        "total_timeouts": limiter.stats.total_timeouts,
                    }
                }
                for name, limiter in self._db_limiters.items()
            }
        }


# 全局实例
_concurrency_manager: Optional[GlobalConcurrencyManager] = None


def get_concurrency_manager() -> GlobalConcurrencyManager:
    """获取全局并发管理器"""
    global _concurrency_manager
    if _concurrency_manager is None:
        _concurrency_manager = GlobalConcurrencyManager()
    return _concurrency_manager


class ConcurrencyTimeoutError(Exception):
    """并发等待超时异常"""
    pass


class AsyncTimeout:
    """
    异步超时上下文管理器
    
    使用示例:
        async with AsyncTimeout(10.0, "AI generation"):
            result = await ai_service.generate_text(prompt)
    """
    
    def __init__(self, timeout: float, operation_name: str = "operation"):
        self.timeout = timeout
        self.operation_name = operation_name
        self._task: Optional[asyncio.Task] = None
        self._timeout_task: Optional[asyncio.Task] = None
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._timeout_task and not self._timeout_task.done():
            self._timeout_task.cancel()
            try:
                await self._timeout_task
            except asyncio.CancelledError:
                pass
    
    async def run(self, coro: asyncio.Coroutine[Any, Any, T]) -> T:
        """运行协程并添加超时"""
        try:
            return await asyncio.wait_for(coro, timeout=self.timeout)
        except asyncio.TimeoutError:
            raise TimeoutError(
                f"Operation '{self.operation_name}' timed out after {self.timeout}s"
            )


def with_timeout(timeout: float, operation_name: str = "operation"):
    """
    超时装饰器
    
    使用示例:
        @with_timeout(30.0, "AI text generation")
        async def generate_text(prompt):
            return await ai_service.generate_text(prompt)
    """
    def decorator(func: Callable[..., asyncio.Coroutine[Any, Any, T]]) -> Callable[..., asyncio.Coroutine[Any, Any, T]]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
            except asyncio.TimeoutError:
                raise TimeoutError(
                    f"Operation '{operation_name}' timed out after {timeout}s"
                )
        return wrapper
    return decorator


def with_concurrency_limit(
    semaphore_name: str,
    max_concurrent: int,
    timeout: Optional[float] = None
):
    """
    并发限制装饰器
    
    使用示例:
        @with_concurrency_limit("image_gen", max_concurrent=5, timeout=30.0)
        async def generate_image(prompt):
            return await ai_service.generate_image(prompt)
    """
    def decorator(func: Callable[..., asyncio.Coroutine[Any, Any, T]]) -> Callable[..., asyncio.Coroutine[Any, Any, T]]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            manager = get_concurrency_manager()
            sem = await manager.get_semaphore(semaphore_name, max_concurrent)
            async with sem.acquire(timeout=timeout):
                return await func(*args, **kwargs)
        return wrapper
    return decorator


def with_db_connection_limit(
    limiter_name: str = "default",
    max_connections: int = 10,
    timeout: float = 30.0
):
    """
    数据库连接限制装饰器
    
    使用示例:
        @with_db_connection_limit(max_connections=5)
        async def fetch_data():
            async with async_session_factory() as session:
                return await session.execute(query)
    """
    def decorator(func: Callable[..., asyncio.Coroutine[Any, Any, T]]) -> Callable[..., asyncio.Coroutine[Any, Any, T]]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            manager = get_concurrency_manager()
            limiter = await manager.get_db_limiter(limiter_name, max_connections)
            async with limiter.limit(timeout=timeout):
                return await func(*args, **kwargs)
        return wrapper
    return decorator


@asynccontextmanager
async def db_session_with_limit(
    session_factory,
    limiter_name: str = "default",
    max_connections: int = 10,
    timeout: float = 30.0
):
    """
    带并发限制的数据库会话上下文
    
    使用示例:
        async with db_session_with_limit(async_session_factory) as session:
            result = await session.execute(query)
    """
    manager = get_concurrency_manager()
    limiter = await manager.get_db_limiter(limiter_name, max_connections)
    
    async with limiter.limit(timeout=timeout):
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise


# 兼容性导入
@asynccontextmanager
async def safe_semaphore_context(sem: asyncio.Semaphore, timeout: Optional[float] = None):
    """
    为标准 asyncio.Semaphore 提供异常安全包装
    
    这是一个兼容性包装，推荐使用 SafeSemaphore
    """
    acquired = False
    try:
        if timeout:
            try:
                await asyncio.wait_for(sem.acquire(), timeout=timeout)
            except asyncio.TimeoutError:
                raise ConcurrencyTimeoutError(
                    f"Timeout waiting for semaphore after {timeout}s"
                )
        else:
            await sem.acquire()
        acquired = True
        yield
    finally:
        if acquired:
            sem.release()


__all__ = [
    "SafeSemaphore",
    "DatabaseConnectionLimiter",
    "GlobalConcurrencyManager",
    "get_concurrency_manager",
    "ConcurrencyTimeoutError",
    "AsyncTimeout",
    "with_timeout",
    "with_concurrency_limit",
    "with_db_connection_limit",
    "db_session_with_limit",
    "safe_semaphore_context",
]
