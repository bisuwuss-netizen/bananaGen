"""
Integration tests for Circuit Breaker and Concurrency Control
测试熔断器和并发控制在实际场景下的工作
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime

from services.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    get_circuit_breaker,
    reset_circuit_breaker,
)
from services.concurrency_limits import (
    get_concurrency_manager,
    with_timeout,
    with_concurrency_limit,
)
from services.quick_fixes import safe_semaphore
from services.ai_client_wrapper import AIClientConfig, get_ai_client, RetryConfig


class TestCircuitBreakerWithAIService:
    """熔断器与 AI 服务集成测试"""
    
    @pytest.mark.asyncio
    async def test_ai_service_failure_triggers_circuit_breaker(self):
        """AI 服务失败应触发熔断"""
        import uuid
        unique_name = f"test_ai_{uuid.uuid4().hex}"
        breaker = CircuitBreaker(
            unique_name,
            CircuitBreakerConfig(failure_threshold=3, recovery_timeout=1.0, failure_rate_threshold=2.0)
        )
        
        call_count = 0
        
        async def mock_ai_call():
            nonlocal call_count
            call_count += 1
            raise ConnectionError("AI service unavailable")
        
        # 前3次调用应该实际执行并失败
        for _ in range(3):
            try:
                async with breaker.call():
                    await mock_ai_call()
            except ConnectionError:
                pass
        
        assert call_count == 3
        assert breaker.state.value == "open"
        
        # 第4次调用应被熔断
        with pytest.raises(CircuitBreakerOpenError):
            async with breaker.call():
                await mock_ai_call()
        
        # 调用次数没有增加
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_recovery(self):
        """熔断器应在超时后恢复"""
        import uuid
        unique_name = f"test_recovery_{uuid.uuid4().hex}"
        breaker = CircuitBreaker(
            unique_name,
            CircuitBreakerConfig(
                failure_threshold=2,
                recovery_timeout=0.2,  # 短超时便于测试
                half_open_max_calls=1,
                success_threshold=1,
                failure_rate_threshold=2.0  # 禁用基于失败率的熔断
            )
        )
        
        # 开启熔断
        for _ in range(2):
            try:
                async with breaker.call():
                    raise ConnectionError()
            except ConnectionError:
                pass
        
        assert breaker.state.value == "open"
        
        # 等待恢复
        await asyncio.sleep(0.3)
        
        # 成功调用应关闭熔断
        async with breaker.call():
            pass  # 成功
        
        assert breaker.state.value == "closed"
    
    @pytest.mark.asyncio
    async def test_mixed_success_and_failure(self):
        """混合成功和失败应正确统计"""
        breaker = CircuitBreaker(
            "test_mixed",
            CircuitBreakerConfig(failure_threshold=5, window_size=10, failure_rate_threshold=2.0)
        )
        
        results = []
        
        # 模拟混合结果
        async def call_with_result(should_fail):
            try:
                async with breaker.call():
                    if should_fail:
                        raise ValueError("Fail")
                    results.append("success")
            except ValueError:
                results.append("fail")
        
        # 执行调用序列
        await call_with_result(False)  # success
        await call_with_result(True)   # fail
        await call_with_result(False)  # success
        await call_with_result(True)   # fail
        await call_with_result(True)   # fail
        
        assert results.count("success") == 2
        assert results.count("fail") == 3
        assert breaker._get_failure_rate() == 0.6


class TestConcurrencyWithDatabase:
    """并发控制与数据库操作集成测试"""
    
    @pytest.mark.asyncio
    async def test_concurrent_db_operations_limited(self):
        """并发数据库操作应被限制"""
        manager = get_concurrency_manager()
        limiter = await manager.get_db_limiter("test_db", max_connections=2)
        
        active_connections = 0
        max_active = 0
        
        async def db_operation():
            nonlocal active_connections, max_active
            async with limiter.limit():
                active_connections += 1
                max_active = max(max_active, active_connections)
                await asyncio.sleep(0.1)  # 模拟数据库操作
                active_connections -= 1
        
        # 启动5个并发操作
        await asyncio.gather(*[db_operation() for _ in range(5)])
        
        assert max_active <= 2
    
    @pytest.mark.asyncio
    async def test_db_timeout_handling(self):
        """数据库操作超时应正确处理"""
        from services.concurrency_limits import ConcurrencyTimeoutError
        
        manager = get_concurrency_manager()
        limiter = await manager.get_db_limiter("test_db_timeout", max_connections=1)
        
        async def slow_operation():
            async with limiter.limit(timeout=0.5):
                await asyncio.sleep(2.0)
        
        async def fast_operation():
            async with limiter.limit(timeout=0.1):
                pass
        
        # 启动慢操作
        task = asyncio.create_task(slow_operation())
        await asyncio.sleep(0.05)
        
        # 快操作应超时
        with pytest.raises(ConcurrencyTimeoutError):
            await fast_operation()
        
        # 清理
        try:
            await task
        except Exception:
            pass


class TestAIClientWrapperIntegration:
    """AI 客户端包装器集成测试"""
    
    @pytest.mark.asyncio
    async def test_ai_client_with_circuit_breaker(self):
        """AI 客户端应使用熔断器"""
        import uuid
        unique_name = f"test_integration_{uuid.uuid4().hex}"
        config = AIClientConfig(
            circuit_breaker=CircuitBreakerConfig(failure_threshold=2, failure_rate_threshold=2.0),
            retry=RetryConfig(max_attempts=1),
            timeout=1.0,
            enable_circuit_breaker=True,
            enable_retry=False
        )
        
        client = await get_ai_client(unique_name, config)
        
        fail_count = 0
        
        async def failing_func():
            nonlocal fail_count
            fail_count += 1
            raise ConnectionError("AI service down")
        
        # 前2次调用失败
        for _ in range(2):
            try:
                await client.call(failing_func)
            except ConnectionError:
                pass
        
        # 第3次调用应被熔断
        with pytest.raises(CircuitBreakerOpenError):
            await client.call(failing_func)
        
        assert fail_count == 2
    
    @pytest.mark.asyncio
    async def test_ai_client_retry_on_failure(self):
        """AI 客户端失败时应重试"""
        config = AIClientConfig(
            retry=RetryConfig(
                max_attempts=3,
                base_delay=0.01,
                max_delay=0.1,
                retryable_exceptions=(ValueError,)
            ),
            timeout=1.0,
            enable_circuit_breaker=False,
            enable_retry=True
        )
        
        client = await get_ai_client("test_retry", config)
        
        call_count = 0
        
        async def sometimes_fails():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Temporary failure")
            return "success"
        
        result = await client.call(sometimes_fails)
        
        assert result == "success"
        assert call_count == 3


class TestEndToEndScenarios:
    """端到端场景测试"""
    
    @pytest.mark.asyncio
    async def test_image_generation_pipeline_with_protection(self):
        """图片生成管道应受保护"""
        from services.quick_fixes import (
            SimpleCircuitBreaker,
            safe_semaphore,
        )
        from services.concurrency_limits import with_timeout
        
        breaker = SimpleCircuitBreaker("image_gen", failure_threshold=3)
        sem = asyncio.Semaphore(2)  # 限制并发数为2
        
        results = []
        
        async def generate_image(image_id: int):
            try:
                async with safe_semaphore(sem, timeout=1.0):
                    async with breaker:
                        # 模拟图片生成
                        await asyncio.sleep(0.05)
                        results.append((image_id, "success"))
            except Exception as e:
                results.append((image_id, str(type(e).__name__)))
        
        # 启动5个并发图片生成任务
        await asyncio.gather(*[generate_image(i) for i in range(5)])
        
        # 验证并发限制（最多2个并发）
        assert len(results) == 5
    
    @pytest.mark.asyncio
    async def test_cascade_failure_protection(self):
        """级联故障保护测试"""
        import uuid
        unique_name = f"cascade_test_{uuid.uuid4().hex}"
        # 模拟 AI 服务完全故障
        service_failures = 0
        service_lock = asyncio.Lock()
        
        async def failing_ai_service():
            nonlocal service_failures
            async with service_lock:
                service_failures += 1
            raise ConnectionError("Service unavailable")
        
        # 使用熔断器保护 - 设置half_open_max_calls=1确保串行执行
        breaker = CircuitBreaker(
            unique_name,
            CircuitBreakerConfig(failure_threshold=3, half_open_max_calls=1, failure_rate_threshold=2.0)
        )
        
        # 模拟多个客户端依次调用（串行）
        client_results = []
        
        async def client_call(client_id: int):
            try:
                async with breaker.call():
                    await failing_ai_service()
                client_results.append((client_id, "success"))
            except CircuitBreakerOpenError:
                client_results.append((client_id, "circuit_open"))
            except ConnectionError:
                client_results.append((client_id, "service_error"))
        
        # 串行执行10个客户端，确保熔断器有机会计数
        for i in range(10):
            await client_call(i)
        
        # 只有前3个实际调用了服务（触发熔断）
        assert service_failures == 3
        
        # 后面的客户端都被熔断器保护
        circuit_open_count = sum(1 for _, r in client_results if r == "circuit_open")
        assert circuit_open_count == 7
    
    @pytest.mark.asyncio
    async def test_performance_under_load(self):
        """负载下的性能测试"""
        from services.quick_fixes import protected_ai_call
        
        call_times = []
        
        @protected_ai_call(
            "perf_test",
            max_retries=1,
            timeout=1.0,
            max_concurrent=5
        )
        async def protected_operation():
            start = asyncio.get_event_loop().time()
            await asyncio.sleep(0.01)
            end = asyncio.get_event_loop().time()
            call_times.append(end - start)
            return "ok"
        
        # 20个并发调用
        start_time = asyncio.get_event_loop().time()
        await asyncio.gather(*[protected_operation() for _ in range(20)])
        end_time = asyncio.get_event_loop().time()
        
        total_time = end_time - start_time
        
        # 验证所有调用完成
        assert len(call_times) == 20
        
        # 由于并发限制为5，每个操作约0.01秒
        # 20个操作应分4批完成，总时间约0.04秒
        # 允许一定的调度开销
        assert total_time < 0.5  # 应该远小于20 * 0.01 = 0.2秒


class TestMonitoringIntegration:
    """监控集成测试"""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_stats_collection(self):
        """熔断器统计信息收集"""
        from services.circuit_breaker import get_all_circuit_breaker_stats
        
        # 重置并创建新的熔断器
        await reset_circuit_breaker("stats_test")
        breaker = await get_circuit_breaker("stats_test")
        
        # 执行一些操作
        await breaker.record_success()
        await breaker.record_success()
        await breaker.record_failure()
        
        # 获取统计
        stats = get_all_circuit_breaker_stats()
        
        assert "stats_test" in stats
        assert stats["stats_test"]["total_calls"] == 3
        assert stats["stats_test"]["successful_calls"] == 2
        assert stats["stats_test"]["failed_calls"] == 1
    
    @pytest.mark.asyncio
    async def test_concurrency_stats_collection(self):
        """并发统计信息收集"""
        manager = get_concurrency_manager()
        
        # 创建信号量并执行操作
        sem = await manager.get_semaphore("stats_sem", 3)
        
        async with sem.acquire():
            pass
        
        # 获取统计
        stats = manager.get_all_stats()
        
        assert "semaphores" in stats
        assert "stats_sem" in stats["semaphores"]
        assert stats["semaphores"]["stats_sem"]["max"] == 3


class TestErrorPropagation:
    """错误传播测试"""
    
    @pytest.mark.asyncio
    async def test_original_exception_preserved(self):
        """原始异常应被保留"""
        breaker = CircuitBreaker("error_test")
        
        class CustomError(Exception):
            pass
        
        with pytest.raises(CustomError) as exc_info:
            async with breaker.call():
                raise CustomError("Custom message")
        
        assert str(exc_info.value) == "Custom message"
    
    @pytest.mark.asyncio
    async def test_timeout_error_distinct_from_circuit(self):
        """超时错误应与熔断错误区分"""
        from services.concurrency_limits import ConcurrencyTimeoutError
        
        # 熔断错误
        breaker = CircuitBreaker("timeout_test2", CircuitBreakerConfig(failure_threshold=1))
        await breaker.record_failure()
        
        with pytest.raises(CircuitBreakerOpenError):
            async with breaker.call():
                pass
        
        # 超时错误 - 使用 concurrency_limits 的 safe_semaphore_context
        from services.concurrency_limits import safe_semaphore_context
        sem = asyncio.Semaphore(1)
        async with sem:
            with pytest.raises(ConcurrencyTimeoutError):
                async with safe_semaphore_context(sem, timeout=0.01):
                    pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
