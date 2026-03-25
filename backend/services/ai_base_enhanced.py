"""
Enhanced AI Base with Circuit Breaker and Concurrency Protection

这是对 services/ai/base.py 的增强版本，添加了:
- 熔断器保护
- 超时控制
- 增强的错误处理

使用方式：
1. 将 AIBase 的 generate_json 等方法替换为增强版本
2. 或在使用处添加保护装饰器
"""

from __future__ import annotations

import json
import logging
from typing import Any, Callable, TypeVar

from tenacity import retry, stop_after_attempt, retry_if_exception_type, wait_exponential

from services.circuit_breaker import circuit_breaker, CircuitBreakerOpenError
from services.ai_client_wrapper import (
    AIClientConfig,
    protected_ai_call,
    with_timeout,
)

logger = logging.getLogger(__name__)
T = TypeVar('T')


# 增强的装饰器组合
def protected_generate_json(max_attempts: int = 3):
    """
    受保护的 JSON 生成装饰器
    
    组合了:
    - 熔断器保护
    - 超时控制
    - 指数退避重试
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        # 应用熔断器保护
        cb_wrapped = circuit_breaker("text_generation")(func)
        
        # 应用超时
        timeout_wrapped = with_timeout(60.0, "JSON generation")(cb_wrapped)
        
        # 应用重试
        @retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=1, min=1, max=10),
            retry=retry_if_exception_type((json.JSONDecodeError, ValueError)),
            reraise=True
        )
        async def wrapper(*args, **kwargs) -> T:
            try:
                return await timeout_wrapped(*args, **kwargs)
            except CircuitBreakerOpenError:
                logger.error("Circuit breaker is open, skipping AI call")
                raise
        
        return wrapper
    return decorator


def protected_generate_image(max_attempts: int = 2):
    """受保护的图像生成装饰器"""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        # 应用熔断器保护（使用不同的熔断器）
        cb_wrapped = circuit_breaker("image_generation")(func)
        
        # 图像生成需要更长超时
        timeout_wrapped = with_timeout(120.0, "Image generation")(cb_wrapped)
        
        # 应用重试（图像生成重试次数较少）
        @retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=2, min=2, max=30),
            reraise=True
        )
        async def wrapper(*args, **kwargs) -> T:
            try:
                return await timeout_wrapped(*args, **kwargs)
            except CircuitBreakerOpenError:
                logger.error("Image generation circuit breaker is open")
                raise
        
        return wrapper
    return decorator


# 增强的 AI 调用辅助函数
async def safe_generate_json(
    provider,
    prompt: str,
    thinking_budget: int = 1000,
    timeout: float = 60.0
) -> dict | list:
    """
    安全地生成 JSON，带完整保护
    
    Args:
        provider: 文本生成 provider
        prompt: 提示词
        thinking_budget: 思考预算
        timeout: 超时时间（秒）
    
    Returns:
        解析后的 JSON 对象
    
    Raises:
        CircuitBreakerOpenError: 熔断器开启
        TimeoutError: 超时
        json.JSONDecodeError: JSON 解析失败
    """
    from services.ai_client_wrapper import get_ai_client
    
    client = await get_ai_client("text_generation")
    
    async def _generate():
        response_text = await provider.generate_text_async(
            prompt,
            thinking_budget=thinking_budget
        )
        # 使用 AIBase 的 JSON 解析逻辑
        from services.ai.base import AIBase
        cleaned_text = AIBase._normalize_json_text_for_parse(response_text)
        
        last_err = None
        for candidate in AIBase._build_json_parse_candidates(cleaned_text):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError as e:
                last_err = e
        
        raise last_err or json.JSONDecodeError("Failed to parse JSON", cleaned_text, 0)
    
    return await client.call(_generate)


async def safe_generate_image(
    provider,
    prompt: str,
    ref_images=None,
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    timeout: float = 120.0
):
    """
    安全地生成图像，带完整保护
    
    Args:
        provider: 图像生成 provider
        prompt: 提示词
        ref_images: 参考图像
        aspect_ratio: 宽高比
        resolution: 分辨率
        timeout: 超时时间（秒）
    
    Returns:
        生成的图像
    """
    from services.ai_client_wrapper import get_ai_client
    
    client = await get_ai_client("image_generation")
    
    async def _generate():
        return await provider.generate_image_async(
            prompt,
            ref_images=ref_images,
            aspect_ratio=aspect_ratio,
            resolution=resolution
        )
    
    return await client.call(_generate)


__all__ = [
    "protected_generate_json",
    "protected_generate_image",
    "safe_generate_json",
    "safe_generate_image",
]
