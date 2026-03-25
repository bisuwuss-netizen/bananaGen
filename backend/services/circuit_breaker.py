"""
Circuit Breaker Pattern Implementation for AI Service Protection

提供熔断器保护，防止级联故障，支持:
- 三种状态: CLOSED(正常), OPEN(熔断), HALF_OPEN(半开)
- 失败率阈值触发熔断
- 自动恢复探测
- 多实例共享支持(通过数据库)
"""

from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional, TypeVar
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(Enum):
    """熔断器状态"""
    CLOSED = "closed"      # 正常状态，请求通过
    OPEN = "open"          # 熔断状态，请求快速失败
    HALF_OPEN = "half_open"  # 半开状态，允许探测请求


@dataclass
class CircuitBreakerConfig:
    """熔断器配置"""
    failure_threshold: int = 5           # 触发熔断的失败次数阈值
    failure_rate_threshold: float = 0.5  # 触发熔断的失败率阈值 (0.0-1.0)
    recovery_timeout: float = 60.0       # 熔断后自动恢复时间(秒)
    half_open_max_calls: int = 3         # 半开状态允许的探测请求数
    window_size: int = 10                # 滑动窗口大小，用于计算失败率
    success_threshold: int = 2           # 半开状态下成功次数阈值，达到后关闭熔断


@dataclass
class CircuitStats:
    """熔断器统计信息"""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[float] = None
    consecutive_successes: int = 0
    consecutive_failures: int = 0
    total_calls: int = 0
    total_failures: int = 0
    window_calls: list[bool] = field(default_factory=list)  # 滑动窗口记录


class CircuitBreaker:
    """
    熔断器实现
    
    使用示例:
        breaker = CircuitBreaker("openai", CircuitBreakerConfig())
        
        async with breaker.call():
            result = await ai_service.generate_text(prompt)
    """
    
    def __init__(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None,
        on_state_change: Optional[Callable[[CircuitState, CircuitState], None]] = None
    ):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self._stats = CircuitStats()
        self._lock = asyncio.Lock()
        self._on_state_change = on_state_change
        self._half_open_calls = 0
        
    @property
    def state(self) -> CircuitState:
        """获取当前状态"""
        return self._stats.state
    
    @property
    def stats(self) -> CircuitStats:
        """获取统计信息副本"""
        import copy
        return copy.deepcopy(self._stats)
    
    async def _transition_to(self, new_state: CircuitState) -> None:
        """状态转换"""
        old_state = self._stats.state
        if old_state != new_state:
            self._stats.state = new_state
            logger.warning(
                f"Circuit breaker '{self.name}' state changed: {old_state.value} -> {new_state.value}"
            )
            
            # 状态转换时重置计数器
            if new_state == CircuitState.OPEN:
                self._stats.consecutive_successes = 0
                # 注意：不要在这里重置 _half_open_calls，因为可能有进行中的探测请求
            elif new_state == CircuitState.HALF_OPEN:
                # 进入半开状态时重置计数器，但 _half_open_calls 会在 _can_execute 中管理
                self._half_open_calls = 0
                self._stats.consecutive_successes = 0
                self._stats.consecutive_failures = 0
            elif new_state == CircuitState.CLOSED:
                self._stats.failure_count = 0
                self._stats.consecutive_failures = 0
                self._half_open_calls = 0
            
            if self._on_state_change:
                try:
                    self._on_state_change(old_state, new_state)
                except Exception as e:
                    logger.error(f"State change callback error: {e}")
    
    def _update_window(self, success: bool) -> None:
        """更新滑动窗口"""
        self._stats.window_calls.append(success)
        if len(self._stats.window_calls) > self.config.window_size:
            self._stats.window_calls.pop(0)
    
    def _get_failure_rate(self) -> float:
        """计算当前失败率"""
        if not self._stats.window_calls:
            return 0.0
        failures = sum(1 for x in self._stats.window_calls if not x)
        return failures / len(self._stats.window_calls)
    
    async def _can_execute(self) -> bool:
        """检查是否允许执行请求"""
        async with self._lock:
            if self._stats.state == CircuitState.CLOSED:
                return True
            
            if self._stats.state == CircuitState.OPEN:
                # 检查是否达到恢复时间
                if self._stats.last_failure_time:
                    elapsed = time.monotonic() - self._stats.last_failure_time
                    if elapsed >= self.config.recovery_timeout:
                        await self._transition_to(CircuitState.HALF_OPEN)
                        # 在半开状态下，允许这个请求通过（作为探测请求）
                        self._half_open_calls += 1
                        return True
                return False
            
            if self._stats.state == CircuitState.HALF_OPEN:
                # 限制半开状态的并发请求数
                if self._half_open_calls < self.config.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
                return False
            
            return True
    
    async def record_success(self) -> None:
        """记录成功"""
        async with self._lock:
            self._stats.total_calls += 1
            self._stats.success_count += 1
            self._stats.consecutive_successes += 1
            self._stats.consecutive_failures = 0
            self._update_window(True)
            
            if self._stats.state == CircuitState.HALF_OPEN:
                # 减少半开状态计数
                self._half_open_calls = max(0, self._half_open_calls - 1)
                
                # 达到成功阈值，关闭熔断
                if self._stats.consecutive_successes >= self.config.success_threshold:
                    await self._transition_to(CircuitState.CLOSED)
    
    async def record_failure(self) -> None:
        """记录失败"""
        async with self._lock:
            self._stats.total_calls += 1
            self._stats.total_failures += 1
            self._stats.failure_count += 1
            self._stats.consecutive_failures += 1
            self._stats.consecutive_successes = 0
            self._stats.last_failure_time = time.monotonic()
            self._update_window(False)
            
            if self._stats.state == CircuitState.HALF_OPEN:
                # 减少半开状态计数
                self._half_open_calls = max(0, self._half_open_calls - 1)
                # 半开状态失败，重新打开熔断
                await self._transition_to(CircuitState.OPEN)
                return
            
            # 检查是否需要开启熔断
            should_open = (
                self._stats.consecutive_failures >= self.config.failure_threshold or
                self._get_failure_rate() >= self.config.failure_rate_threshold
            )
            
            if should_open and self._stats.state == CircuitState.CLOSED:
                await self._transition_to(CircuitState.OPEN)
    
    @asynccontextmanager
    async def call(self):
        """
        熔断器上下文管理器
        
        使用:
            async with breaker.call():
                result = await some_async_operation()
        """
        if not await self._can_execute():
            raise CircuitBreakerOpenError(f"Circuit breaker '{self.name}' is OPEN")
        
        try:
            yield
            await self.record_success()
        except CircuitBreakerOpenError:
            raise
        except Exception as e:
            await self.record_failure()
            raise
    
    async def call_async(self, func: Callable[..., asyncio.Coroutine[Any, Any, T]], *args, **kwargs) -> T:
        """
        包装异步函数调用
        
        使用:
            result = await breaker.call_async(ai_service.generate_text, prompt)
        """
        async with self.call():
            return await func(*args, **kwargs)
    
    def call_sync(self, func: Callable[..., T], *args, **kwargs) -> T:
        """
        包装同步函数调用
        
        使用:
            result = breaker.call_sync(ai_service.generate_text_sync, prompt)
        """
        if not asyncio.get_event_loop().is_running():
            # 非异步环境，直接检查状态
            if self.state == CircuitState.OPEN:
                # 检查是否可以恢复
                if self._stats.last_failure_time:
                    elapsed = time.monotonic() - self._stats.last_failure_time
                    if elapsed < self.config.recovery_timeout:
                        raise CircuitBreakerOpenError(f"Circuit breaker '{self.name}' is OPEN")
        
        try:
            result = func(*args, **kwargs)
            # 在同步环境中使用 create_task 记录成功
            asyncio.create_task(self.record_success())
            return result
        except Exception as e:
            asyncio.create_task(self.record_failure())
            raise


class CircuitBreakerOpenError(Exception):
    """熔断器开启异常"""
    pass


# 全局熔断器注册表
_circuit_breakers: dict[str, CircuitBreaker] = {}
_circuit_breakers_lock = asyncio.Lock()


async def get_circuit_breaker(
    name: str,
    config: Optional[CircuitBreakerConfig] = None
) -> CircuitBreaker:
    """获取或创建熔断器"""
    async with _circuit_breakers_lock:
        if name not in _circuit_breakers:
            _circuit_breakers[name] = CircuitBreaker(name, config)
        return _circuit_breakers[name]


def get_circuit_breaker_sync(
    name: str,
    config: Optional[CircuitBreakerConfig] = None
) -> CircuitBreaker:
    """同步获取熔断器（用于非异步上下文）"""
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(name, config)
    return _circuit_breakers[name]


def circuit_breaker(
    breaker_name: str,
    config: Optional[CircuitBreakerConfig] = None
):
    """
    熔断器装饰器
    
    使用:
        @circuit_breaker("openai")
        async def call_openai_api(prompt):
            return await openai_client.chat.completions.create(...)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            breaker = await get_circuit_breaker(breaker_name, config)
            return await breaker.call_async(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            breaker = get_circuit_breaker_sync(breaker_name, config)
            return breaker.call_sync(func, *args, **kwargs)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator


def get_all_circuit_breaker_stats() -> dict[str, dict]:
    """获取所有熔断器统计信息"""
    return {
        name: {
            "state": cb.state.value,
            "failure_count": cb._stats.failure_count,
            "success_count": cb._stats.success_count,
            "total_calls": cb._stats.total_calls,
            "successful_calls": cb._stats.success_count,
            "failed_calls": cb._stats.total_failures,
            "failure_rate": cb._get_failure_rate(),
            "consecutive_failures": cb._stats.consecutive_failures,
            "consecutive_successes": cb._stats.consecutive_successes,
        }
        for name, cb in _circuit_breakers.items()
    }


async def reset_circuit_breaker(name: str) -> bool:
    """手动重置熔断器状态"""
    async with _circuit_breakers_lock:
        if name in _circuit_breakers:
            cb = _circuit_breakers[name]
            async with cb._lock:
                cb._stats = CircuitStats()
                cb._half_open_calls = 0
            logger.info(f"Circuit breaker '{name}' has been manually reset")
            return True
        return False


__all__ = [
    "CircuitBreaker",
    "CircuitBreakerConfig",
    "CircuitBreakerOpenError",
    "CircuitState",
    "CircuitStats",
    "circuit_breaker",
    "get_circuit_breaker",
    "get_circuit_breaker_sync",
    "get_all_circuit_breaker_stats",
    "reset_circuit_breaker",
]
