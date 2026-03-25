"""
Unit tests for Circuit Breaker implementation
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock

from services.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    CircuitState,
    circuit_breaker,
    get_circuit_breaker,
    reset_circuit_breaker,
)


class TestCircuitBreaker:
    """熔断器核心功能测试"""
    
    @pytest.fixture
    def config(self):
        return CircuitBreakerConfig(
            failure_threshold=3,
            failure_rate_threshold=0.5,
            recovery_timeout=0.1,  # 短超时便于测试
            half_open_max_calls=2,
            window_size=5,
            success_threshold=2,
        )
    
    @pytest.fixture
    def breaker(self, config):
        return CircuitBreaker("test", config)
    
    @pytest.mark.asyncio
    async def test_initial_state_is_closed(self, breaker):
        """初始状态应为 CLOSED"""
        assert breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_success_does_not_change_state(self, breaker):
        """成功调用不应改变状态"""
        await breaker.record_success()
        await breaker.record_success()
        assert breaker.state == CircuitState.CLOSED
        assert breaker._stats.consecutive_successes == 2
    
    @pytest.mark.asyncio
    async def test_failure_increments_counter(self, breaker):
        """失败应增加失败计数"""
        await breaker.record_failure()
        assert breaker._stats.failure_count == 1
        assert breaker._stats.consecutive_failures == 1
    
    @pytest.mark.asyncio
    async def test_opens_after_threshold_failures(self, breaker):
        """达到失败阈值后应开启熔断"""
        for _ in range(3):
            await breaker.record_failure()
        
        assert breaker.state == CircuitState.OPEN
    
    @pytest.mark.asyncio
    async def test_rejects_calls_when_open(self, breaker):
        """熔断开启时应拒绝调用"""
        # 开启熔断
        for _ in range(3):
            await breaker.record_failure()
        
        with pytest.raises(CircuitBreakerOpenError):
            async with breaker.call():
                pass
    
    @pytest.mark.asyncio
    async def test_transitions_to_half_open_after_timeout(self, breaker):
        """超时后应转换为半开状态"""
        # 开启熔断
        for _ in range(3):
            await breaker.record_failure()
        
        assert breaker.state == CircuitState.OPEN
        
        # 等待超时
        await asyncio.sleep(0.15)
        
        # 下次调用应允许（进入半开状态）
        async with breaker.call():
            pass
        
        assert breaker.state == CircuitState.HALF_OPEN
    
    @pytest.mark.asyncio
    async def test_closes_after_successes_in_half_open(self, breaker):
        """半开状态下连续成功应关闭熔断"""
        # 开启熔断
        for _ in range(3):
            await breaker.record_failure()
        
        # 等待超时
        await asyncio.sleep(0.15)
        
        # 连续成功2次
        async with breaker.call():
            pass
        async with breaker.call():
            pass
        
        assert breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_reopens_on_failure_in_half_open(self, breaker):
        """半开状态下失败应重新开启熔断"""
        # 开启熔断
        for _ in range(3):
            await breaker.record_failure()
        
        # 等待超时
        await asyncio.sleep(0.15)
        
        # 进入半开后失败
        try:
            async with breaker.call():
                raise ValueError("Test error")
        except ValueError:
            pass
        
        assert breaker.state == CircuitState.OPEN
    
    @pytest.mark.asyncio
    async def test_failure_rate_calculation(self, breaker):
        """失败率计算应正确"""
        # 5次调用，3次失败
        await breaker.record_success()
        await breaker.record_failure()
        await breaker.record_success()
        await breaker.record_failure()
        await breaker.record_failure()
        
        assert breaker._get_failure_rate() == 0.6
    
    @pytest.mark.asyncio
    async def test_opens_based_on_failure_rate(self, breaker):
        """基于失败率应开启熔断"""
        config = CircuitBreakerConfig(
            failure_threshold=10,  # 设置高阈值，确保不会触发
            failure_rate_threshold=0.5,
            window_size=5,
        )
        breaker = CircuitBreaker("test", config)
        
        # 5次调用，3次失败（60%失败率）
        await breaker.record_failure()
        await breaker.record_failure()
        await breaker.record_failure()
        await breaker.record_success()
        await breaker.record_success()
        
        # 达到失败率阈值，应开启熔断
        assert breaker.state == CircuitState.OPEN


class TestCircuitBreakerDecorator:
    """熔断器装饰器测试"""
    
    @pytest.mark.asyncio
    async def test_decorator_protects_function(self):
        """装饰器应保护函数调用"""
        # 使用唯一名称避免与其他测试冲突
        import uuid
        unique_name = f"test_decorator_{uuid.uuid4().hex}"
        
        call_count = 0
        
        @circuit_breaker(unique_name, CircuitBreakerConfig(failure_threshold=3, failure_rate_threshold=1.0))
        async def failing_function():
            nonlocal call_count
            call_count += 1
            raise ValueError("Always fails")
        
        # 前2次调用应该执行并失败
        for _ in range(2):
            try:
                await failing_function()
            except ValueError:
                pass
        
        # 第3次调用应该被熔断（不执行函数体）
        with pytest.raises(CircuitBreakerOpenError):
            await failing_function()
        
        assert call_count == 2  # 只实际执行了2次
    
    @pytest.mark.asyncio
    async def test_decorator_passes_through_success(self):
        """装饰器应允许成功的调用"""
        unique_name = f"test_success_{id(self)}"
        
        @circuit_breaker(unique_name)
        async def success_function():
            return "success"
        
        result = await success_function()
        assert result == "success"


class TestCircuitBreakerGlobals:
    """全局熔断器管理测试"""
    
    @pytest.mark.asyncio
    async def test_get_circuit_breaker_returns_same_instance(self):
        """相同名称应返回相同实例"""
        cb1 = await get_circuit_breaker("global_test")
        cb2 = await get_circuit_breaker("global_test")
        assert cb1 is cb2
    
    @pytest.mark.asyncio
    async def test_get_circuit_breaker_different_names(self):
        """不同名称应返回不同实例"""
        cb1 = await get_circuit_breaker("test1")
        cb2 = await get_circuit_breaker("test2")
        assert cb1 is not cb2
    
    @pytest.mark.asyncio
    async def test_reset_circuit_breaker(self):
        """重置熔断器应清除状态"""
        cb = await get_circuit_breaker("reset_test")
        
        # 开启熔断
        for _ in range(5):
            await cb.record_failure()
        assert cb.state == CircuitState.OPEN
        
        # 重置
        success = await reset_circuit_breaker("reset_test")
        assert success is True
        assert cb.state == CircuitState.CLOSED
        assert cb._stats.failure_count == 0
    
    @pytest.mark.asyncio
    async def test_reset_nonexistent_breaker(self):
        """重置不存在的熔断器应返回 False"""
        success = await reset_circuit_breaker("nonexistent")
        assert success is False


class TestCircuitBreakerConcurrency:
    """熔断器并发测试"""
    
    @pytest.mark.asyncio
    async def test_concurrent_calls_handled_correctly(self):
        """并发调用应正确处理"""
        # 使用唯一名称避免冲突
        import time
        unique_name = f"concurrent_{id(self)}_{time.time()}"
        # 设置 failure_rate_threshold=1.0 禁用基于失败率的熔断，只使用失败次数阈值
        breaker = CircuitBreaker(unique_name, CircuitBreakerConfig(failure_threshold=10, failure_rate_threshold=1.0))
        
        async def call_with_result(success: bool):
            try:
                async with breaker.call():
                    if not success:
                        raise ValueError("Failed")
                    return "success"
            except ValueError:
                return "failed"
        
        # 混合成功和失败
        results = await asyncio.gather(
            call_with_result(True),
            call_with_result(False),
            call_with_result(True),
            call_with_result(False),
        )
        
        success_count = sum(1 for r in results if r == "success")
        failure_count = sum(1 for r in results if r == "failed")
        
        assert success_count == 2
        assert failure_count == 2


class TestCircuitBreakerCallAsync:
    """异步调用包装测试"""
    
    @pytest.mark.asyncio
    async def test_call_async_success(self):
        """call_async 应正确处理成功"""
        breaker = CircuitBreaker("async_test")
        
        async def success_func():
            return "result"
        
        result = await breaker.call_async(success_func)
        assert result == "result"
    
    @pytest.mark.asyncio
    async def test_call_async_failure(self):
        """call_async 应正确处理失败"""
        breaker = CircuitBreaker("async_fail_test")
        
        async def fail_func():
            raise ValueError("Failed")
        
        with pytest.raises(ValueError):
            await breaker.call_async(fail_func)
        
        assert breaker._stats.failure_count == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
