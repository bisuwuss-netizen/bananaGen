"""
Enhanced AI Client Wrapper with Circuit Breaker and Concurrency Control

为 AI 服务调用提供统一的保护:
- 熔断器保护
- 并发限制
- 超时控制
- 重试机制
- 指标收集
"""

from __future__ import annotations

import asyncio
import functools
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, TypeVar, Union

from services.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    get_circuit_breaker,
)
from services.concurrency_limits import (
    get_concurrency_manager,
    with_timeout,
)

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class RetryConfig:
    """重试配置"""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0
    exponential_base: float = 2.0
    retryable_exceptions: tuple = (Exception,)
    
    def get_delay(self, attempt: int) -> float:
        """计算第 attempt 次重试的延迟时间"""
        import random
        delay = self.base_delay * (self.exponential_base ** attempt)
        # 添加 jitter 避免惊群
        delay = delay * (0.5 + random.random() * 0.5)
        return min(delay, self.max_delay)


@dataclass
class AIClientConfig:
    """AI 客户端配置"""
    # 熔断器配置
    circuit_breaker: CircuitBreakerConfig = field(default_factory=CircuitBreakerConfig)
    # 重试配置
    retry: RetryConfig = field(default_factory=RetryConfig)
    # 并发限制
    max_concurrent: int = 5
    # 超时配置
    timeout: float = 60.0
    # 是否启用熔断
    enable_circuit_breaker: bool = True
    # 是否启用重试
    enable_retry: bool = True


@dataclass
class CallMetrics:
    """调用指标"""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    circuit_breaker_rejections: int = 0
    timeout_errors: int = 0
    retry_attempts: int = 0
    total_latency: float = 0.0
    
    @property
    def average_latency(self) -> float:
        if self.total_calls == 0:
            return 0.0
        return self.total_latency / self.total_calls
    
    @property
    def success_rate(self) -> float:
        if self.total_calls == 0:
            return 0.0
        return self.successful_calls / self.total_calls


class AIClientWrapper:
    """
    AI 客户端包装器
    
    为 AI 服务调用提供全面的保护和监控
    """
    
    def __init__(
        self,
        name: str,
        config: Optional[AIClientConfig] = None
    ):
        self.name = name
        self.config = config or AIClientConfig()
        self._metrics = CallMetrics()
        self._metrics_lock = asyncio.Lock()
        
    @property
    def metrics(self) -> CallMetrics:
        """获取指标副本"""
        import copy
        return copy.deepcopy(self._metrics)
    
    async def _update_metrics(
        self,
        success: bool,
        latency: float,
        circuit_rejected: bool = False,
        timeout: bool = False,
        retry_count: int = 0
    ) -> None:
        """更新指标"""
        async with self._metrics_lock:
            self._metrics.total_calls += 1
            self._metrics.total_latency += latency
            if success:
                self._metrics.successful_calls += 1
            else:
                self._metrics.failed_calls += 1
            if circuit_rejected:
                self._metrics.circuit_breaker_rejections += 1
            if timeout:
                self._metrics.timeout_errors += 1
            self._metrics.retry_attempts += retry_count
    
    async def call(
        self,
        func: Callable[..., asyncio.Coroutine[Any, Any, T]],
        *args,
        **kwargs
    ) -> T:
        """
        执行受保护的 AI 调用
        
        执行流程:
        1. 检查熔断器状态
        2. 获取并发许可
        3. 执行带超时的调用
        4. 失败时重试
        5. 记录指标
        """
        start_time = time.monotonic()
        retry_count = 0
        
        # 获取熔断器
        breaker = None
        if self.config.enable_circuit_breaker:
            breaker = await get_circuit_breaker(
                self.name, 
                self.config.circuit_breaker
            )
        
        # 获取并发管理器
        concurrency_manager = get_concurrency_manager()
        semaphore = await concurrency_manager.get_semaphore(
            f"ai_client_{self.name}",
            self.config.max_concurrent
        )
        
        last_error = None
        
        async with semaphore.acquire(timeout=self.config.timeout):
            for attempt in range(self.config.retry.max_attempts if self.config.enable_retry else 1):
                try:
                    # 检查熔断器
                    if breaker and breaker.state.value == "open":
                        await self._update_metrics(
                            success=False,
                            latency=time.monotonic() - start_time,
                            circuit_rejected=True
                        )
                        raise CircuitBreakerOpenError(
                            f"Circuit breaker for '{self.name}' is OPEN"
                        )
                    
                    # 执行调用
                    if breaker:
                        async with breaker.call():
                            result = await asyncio.wait_for(
                                func(*args, **kwargs),
                                timeout=self.config.timeout
                            )
                    else:
                        result = await asyncio.wait_for(
                            func(*args, **kwargs),
                            timeout=self.config.timeout
                        )
                    
                    # 成功，更新指标
                    latency = time.monotonic() - start_time
                    await self._update_metrics(
                        success=True,
                        latency=latency,
                        retry_count=retry_count
                    )
                    
                    return result
                    
                except asyncio.TimeoutError:
                    last_error = TimeoutError(f"AI call timed out after {self.config.timeout}s")
                    retry_count += 1
                    
                    if attempt < self.config.retry.max_attempts - 1 and self.config.enable_retry:
                        delay = self.config.retry.get_delay(attempt)
                        logger.warning(
                            f"AI call '{self.name}' timed out, retrying in {delay:.2f}s (attempt {attempt + 1})"
                        )
                        await asyncio.sleep(delay)
                    else:
                        latency = time.monotonic() - start_time
                        await self._update_metrics(
                            success=False,
                            latency=latency,
                            timeout=True,
                            retry_count=retry_count
                        )
                        raise last_error
                        
                except CircuitBreakerOpenError:
                    raise
                    
                except Exception as e:
                    # 检查是否是可重试的异常
                    if not self.config.enable_retry:
                        raise
                    
                    # 检查异常类型是否在可重试列表中
                    retryable = self.config.retry.retryable_exceptions
                    if not isinstance(e, retryable):
                        raise
                    
                    last_error = e
                    retry_count += 1
                    
                    if attempt < self.config.retry.max_attempts - 1:
                        delay = self.config.retry.get_delay(attempt)
                        logger.warning(
                            f"AI call '{self.name}' failed: {e}, retrying in {delay:.2f}s (attempt {attempt + 1})"
                        )
                        await asyncio.sleep(delay)
                    else:
                        latency = time.monotonic() - start_time
                        await self._update_metrics(
                            success=False,
                            latency=latency,
                            retry_count=retry_count
                        )
                        raise last_error
        
        # 不应该执行到这里
        raise last_error or Exception("Unknown error")

    def call_sync(
        self,
        func: Callable[..., T],
        *args,
        **kwargs
    ) -> T:
        """同步版本的调用"""
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(self.call(func, *args, **kwargs))


# 预定义的 AI 客户端配置
AI_CLIENT_PRESETS = {
    "openai_text": AIClientConfig(
        circuit_breaker=CircuitBreakerConfig(
            failure_threshold=5,
            recovery_timeout=60.0,
        ),
        retry=RetryConfig(
            max_attempts=3,
            base_delay=1.0,
            retryable_exceptions=(Exception,),
        ),
        max_concurrent=10,
        timeout=60.0,
    ),
    "openai_image": AIClientConfig(
        circuit_breaker=CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=120.0,
        ),
        retry=RetryConfig(
            max_attempts=2,
            base_delay=2.0,
            retryable_exceptions=(Exception,),
        ),
        max_concurrent=5,
        timeout=120.0,
    ),
    "qwen_text": AIClientConfig(
        circuit_breaker=CircuitBreakerConfig(
            failure_threshold=5,
            recovery_timeout=60.0,
        ),
        retry=RetryConfig(
            max_attempts=3,
            base_delay=1.0,
        ),
        max_concurrent=8,
        timeout=60.0,
    ),
    "qwen_image": AIClientConfig(
        circuit_breaker=CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=180.0,
        ),
        retry=RetryConfig(
            max_attempts=2,
            base_delay=3.0,
        ),
        max_concurrent=3,
        timeout=180.0,
    ),
}


# 全局客户端缓存
_clients: dict[str, AIClientWrapper] = {}
_clients_lock = asyncio.Lock()


async def get_ai_client(
    name: str,
    config: Optional[AIClientConfig] = None
) -> AIClientWrapper:
    """获取或创建 AI 客户端"""
    async with _clients_lock:
        if name not in _clients:
            preset = AI_CLIENT_PRESETS.get(name)
            final_config = config or preset or AIClientConfig()
            _clients[name] = AIClientWrapper(name, final_config)
        return _clients[name]


def protected_ai_call(
    client_name: str,
    config: Optional[AIClientConfig] = None
):
    """
    AI 调用保护装饰器
    
    使用示例:
        @protected_ai_call("openai_text")
        async def generate_text(prompt: str) -> str:
            return await openai_client.chat.completions.create(...)
    """
    def decorator(func: Callable[..., asyncio.Coroutine[Any, Any, T]]) -> Callable[..., asyncio.Coroutine[Any, Any, T]]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            client = await get_ai_client(client_name, config)
            return await client.call(func, *args, **kwargs)
        return wrapper
    return decorator


def get_all_ai_client_metrics() -> dict[str, dict]:
    """获取所有 AI 客户端指标"""
    return {
        name: {
            "total_calls": client.metrics.total_calls,
            "successful_calls": client.metrics.successful_calls,
            "failed_calls": client.metrics.failed_calls,
            "success_rate": client.metrics.success_rate,
            "average_latency": client.metrics.average_latency,
            "circuit_breaker_rejections": client.metrics.circuit_breaker_rejections,
            "timeout_errors": client.metrics.timeout_errors,
            "retry_attempts": client.metrics.retry_attempts,
        }
        for name, client in _clients.items()
    }


__all__ = [
    "AIClientConfig",
    "AIClientWrapper",
    "CallMetrics",
    "RetryConfig",
    "AI_CLIENT_PRESETS",
    "get_ai_client",
    "protected_ai_call",
    "get_all_ai_client_metrics",
]
