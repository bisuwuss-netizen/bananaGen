"""
Quick Fixes for Circuit Breaker and Concurrency Issues

这是可以立即应用到现有代码的快速修复，无需大幅重构
"""

from __future__ import annotations

import asyncio
import functools
import logging
from contextlib import asynccontextmanager
from typing import Any, Callable, Optional, TypeVar

logger = logging.getLogger(__name__)
T = TypeVar('T')


# ============================================================================
# 修复 1: 异常安全的信号量包装
# ============================================================================

@asynccontextmanager
async def safe_semaphore(sem: asyncio.Semaphore, timeout: Optional[float] = None):
    """
    异常安全的信号量获取
    
    使用方式:
        sem = asyncio.Semaphore(5)
        async with safe_semaphore(sem, timeout=30.0):
            await do_work()
    """
    acquired = False
    try:
        if timeout:
            await asyncio.wait_for(sem.acquire(), timeout=timeout)
        else:
            await sem.acquire()
        acquired = True
        yield
    finally:
        if acquired:
            sem.release()


# ============================================================================
# 修复 2: 带超时的重试装饰器
# ============================================================================

def with_retry_and_timeout(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    timeout: float = 60.0,
    exceptions: tuple = (Exception,)
):
    """
    带超时和指数退避的重试装饰器
    
    使用方式:
        @with_retry_and_timeout(max_retries=3, timeout=60.0)
        async def generate_image(prompt):
            return await ai_service.generate_image(prompt)
    """
    def decorator(func: Callable[..., asyncio.Coroutine[Any, Any, T]]) -> Callable[..., asyncio.Coroutine[Any, Any, T]]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            import random
            
            last_error = None
            for attempt in range(max_retries):
                try:
                    return await asyncio.wait_for(
                        func(*args, **kwargs),
                        timeout=timeout
                    )
                except asyncio.TimeoutError:
                    last_error = TimeoutError(f"Operation timed out after {timeout}s")
                    logger.warning(f"Timeout on attempt {attempt + 1}/{max_retries}")
                except exceptions as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        delay = min(base_delay * (2 ** attempt) * (0.5 + random.random()), max_delay)
                        logger.warning(f"Error on attempt {attempt + 1}/{max_retries}: {e}, retrying in {delay:.2f}s")
                        await asyncio.sleep(delay)
                    else:
                        raise
            
            raise last_error or Exception("Max retries exceeded")
        
        return wrapper
    return decorator


# ============================================================================
# 修复 3: 简单的熔断器实现（轻量级）
# ============================================================================

class SimpleCircuitBreaker:
    """
    简化版熔断器，适合快速集成
    
    使用方式:
        breaker = SimpleCircuitBreaker("openai", failure_threshold=5)
        
        async with breaker:
            result = await ai_service.generate_text(prompt)
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        half_open_max_calls: int = 3
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        
        self._state = "closed"  # closed, open, half_open
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = None
        self._half_open_calls = 0
        self._lock = asyncio.Lock()
    
    @property
    def state(self) -> str:
        return self._state
    
    async def _can_execute(self) -> bool:
        async with self._lock:
            if self._state == "closed":
                return True
            
            if self._state == "open":
                import time
                if self._last_failure_time:
                    elapsed = time.monotonic() - self._last_failure_time
                    if elapsed >= self.recovery_timeout:
                        self._state = "half_open"
                        self._half_open_calls = 0
                        self._success_count = 0
                        logger.info(f"Circuit breaker '{self.name}' entering half-open state")
                        return True
                return False
            
            if self._state == "half_open":
                if self._half_open_calls < self.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
                return False
            
            return True
    
    async def _record_success(self):
        async with self._lock:
            if self._state == "half_open":
                self._success_count += 1
                if self._success_count >= 2:  # 连续成功2次关闭熔断
                    self._state = "closed"
                    self._failure_count = 0
                    logger.info(f"Circuit breaker '{self.name}' closed")
    
    async def _record_failure(self):
        async with self._lock:
            import time
            self._failure_count += 1
            self._last_failure_time = time.monotonic()
            
            if self._state == "half_open":
                self._state = "open"
                logger.warning(f"Circuit breaker '{self.name}' opened (failure in half-open)")
            elif self._failure_count >= self.failure_threshold:
                self._state = "open"
                logger.warning(f"Circuit breaker '{self.name}' opened ({self._failure_count} failures)")
    
    async def __aenter__(self):
        if not await self._can_execute():
            raise CircuitBreakerOpen(f"Circuit breaker '{self.name}' is OPEN")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            await self._record_success()
        else:
            await self._record_failure()


class CircuitBreakerOpen(Exception):
    pass


# ============================================================================
# 修复 4: 数据库会话包装器（带连接限制）
# ============================================================================

class DBConnectionPool:
    """
    简单的数据库连接池限制器
    
    使用方式:
        db_pool = DBConnectionPool(max_connections=5)
        
        async with db_pool.acquire(timeout=30.0):
            async with async_session_factory() as session:
                ...
    """
    
    _instance = None
    _lock = asyncio.Lock()
    
    def __new__(cls, max_connections: int = 10):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._semaphore = asyncio.Semaphore(max_connections)
            cls._instance._max_connections = max_connections
        return cls._instance
    
    @asynccontextmanager
    async def acquire(self, timeout: Optional[float] = None):
        async with safe_semaphore(self._semaphore, timeout=timeout):
            yield


def get_db_pool(max_connections: int = 10) -> DBConnectionPool:
    """获取全局数据库连接池限制器"""
    return DBConnectionPool(max_connections)


# ============================================================================
# 修复 5: 组合保护装饰器（一键应用所有保护）
# ============================================================================

def protected_ai_call(
    name: str,
    max_retries: int = 3,
    timeout: float = 60.0,
    circuit_failure_threshold: int = 5,
    max_concurrent: int = 5
):
    """
    组合所有保护机制的装饰器
    
    使用方式:
        @protected_ai_call("openai_text", max_retries=3, timeout=60.0)
        async def generate_text(prompt):
            return await provider.generate_text(prompt)
    """
    def decorator(func: Callable[..., asyncio.Coroutine[Any, Any, T]]) -> Callable[..., asyncio.Coroutine[Any, Any, T]]:
        # 创建熔断器
        breaker = SimpleCircuitBreaker(name, failure_threshold=circuit_failure_threshold)
        
        # 创建信号量
        semaphore = asyncio.Semaphore(max_concurrent)
        
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # 1. 检查熔断器
            async with breaker:
                # 2. 获取并发许可
                async with safe_semaphore(semaphore, timeout=timeout):
                    # 3. 执行带重试和超时的调用
                    @with_retry_and_timeout(max_retries=max_retries, timeout=timeout)
                    async def _call():
                        return await func(*args, **kwargs)
                    
                    return await _call()
        
        return wrapper
    return decorator


# ============================================================================
# 快速应用到现有代码的示例
# ============================================================================

"""
应用到 image_task.py:

修改前:
    semaphore = asyncio.Semaphore(image_policy.max_workers)
    
    async def generate_single_image(page_id, page_data, page_index):
        async with semaphore:
            image = await ai_service.call_async("generate_image", ...)

修改后:
    from services.quick_fixes import safe_semaphore, protected_ai_call
    
    sem = asyncio.Semaphore(image_policy.max_workers)
    
    @protected_ai_call("image_generation", max_retries=2, timeout=120.0, max_concurrent=5)
    async def do_generate_image(prompt, ...):
        return await ai_service.call_async("generate_image", prompt, ...)
    
    async def generate_single_image(page_id, page_data, page_index):
        async with safe_semaphore(sem, timeout=60.0):
            image = await do_generate_image(prompt, ...)


应用到 ai/base.py:

修改前:
    async def generate_json_async(self, prompt, thinking_budget=1000):
        response_text = await self.text_provider.generate_text_async(prompt)
        return json.loads(response_text)

修改后:
    from services.quick_fixes import protected_ai_call
    
    @protected_ai_call("text_generation", max_retries=3, timeout=60.0)
    async def generate_json_async(self, prompt, thinking_budget=1000):
        response_text = await self.text_provider.generate_text_async(prompt)
        return json.loads(response_text)
"""


__all__ = [
    "safe_semaphore",
    "with_retry_and_timeout",
    "SimpleCircuitBreaker",
    "CircuitBreakerOpen",
    "DBConnectionPool",
    "get_db_pool",
    "protected_ai_call",
]
