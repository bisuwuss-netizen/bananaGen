"""
Unit tests for Concurrency Limits implementation
"""

import asyncio
import pytest
import time

from services.concurrency_limits import (
    SafeSemaphore,
    DatabaseConnectionLimiter,
    get_concurrency_manager,
    with_timeout,
    with_concurrency_limit,
    ConcurrencyTimeoutError,
    db_session_with_limit,
)


class TestSafeSemaphore:
    """SafeSemaphore 测试"""
    
    @pytest.mark.asyncio
    async def test_initial_state(self):
        """初始状态应正确"""
        sem = SafeSemaphore(5, "test")
        assert sem.max_value == 5
        assert sem.available == 5
    
    @pytest.mark.asyncio
    async def test_acquire_decreases_available(self):
        """获取信号量应减少可用数"""
        sem = SafeSemaphore(5, "test")
        
        async with sem.acquire():
            assert sem.available == 4
        
        # 释放后应恢复
        assert sem.available == 5
    
    @pytest.mark.asyncio
    async def test_exception_releases_semaphore(self):
        """异常时应正确释放信号量"""
        sem = SafeSemaphore(1, "test")
        
        try:
            async with sem.acquire():
                assert sem.available == 0
                raise ValueError("Test error")
        except ValueError:
            pass
        
        # 异常后信号量应被释放
        assert sem.available == 1
    
    @pytest.mark.asyncio
    async def test_timeout_raises_error(self):
        """超时应抛出 ConcurrencyTimeoutError"""
        sem = SafeSemaphore(1, "test")
        
        # 先占用信号量
        async with sem.acquire():
            # 再尝试获取，应该超时
            with pytest.raises(ConcurrencyTimeoutError):
                async with sem.acquire(timeout=0.1):
                    pass
    
    @pytest.mark.asyncio
    async def test_concurrent_access_limited(self):
        """并发访问应被限制"""
        sem = SafeSemaphore(2, "test")
        current_concurrent = 0
        max_concurrent = 0
        
        async def worker():
            nonlocal current_concurrent, max_concurrent
            async with sem.acquire():
                current_concurrent += 1
                max_concurrent = max(max_concurrent, current_concurrent)
                await asyncio.sleep(0.05)
                current_concurrent -= 1
        
        # 启动5个并发任务
        await asyncio.gather(*[worker() for _ in range(5)])
        
        assert max_concurrent <= 2
    
    @pytest.mark.asyncio
    async def test_stats_tracking(self):
        """统计信息应正确跟踪"""
        sem = SafeSemaphore(2, "test")
        
        async with sem.acquire():
            pass
        
        stats = sem.stats
        assert stats.total_acquired == 1
        assert stats.total_released == 1
        assert stats.active_count == 0
    
    @pytest.mark.asyncio
    async def test_stats_max_concurrent(self):
        """最大并发数应正确记录"""
        sem = SafeSemaphore(3, "test")
        
        async def worker():
            async with sem.acquire():
                await asyncio.sleep(0.05)
        
        await asyncio.gather(*[worker() for _ in range(5)])
        
        stats = sem.stats
        assert stats.max_concurrent == 3


class TestWithTimeout:
    """超时装饰器测试"""
    
    @pytest.mark.asyncio
    async def test_function_completes_within_timeout(self):
        """函数在超时内完成应正常返回"""
        @with_timeout(1.0, "test")
        async def quick_function():
            return "result"
        
        result = await quick_function()
        assert result == "result"
    
    @pytest.mark.asyncio
    async def test_function_exceeds_timeout_raises_error(self):
        """函数超时应抛出 TimeoutError"""
        @with_timeout(0.1, "slow_test")
        async def slow_function():
            await asyncio.sleep(1.0)
            return "result"
        
        with pytest.raises(TimeoutError) as exc_info:
            await slow_function()
        
        assert "slow_test" in str(exc_info.value)
        assert "0.1s" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_timeout_does_not_affect_other_calls(self):
        """超时不应影响其他调用"""
        call_count = 0
        
        @with_timeout(0.1, "test")
        async def sometimes_slow():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                await asyncio.sleep(0.5)
            return "ok"
        
        # 第一次调用超时
        with pytest.raises(TimeoutError):
            await sometimes_slow()
        
        # 第二次调用应成功
        result = await sometimes_slow()
        assert result == "ok"


class TestWithConcurrencyLimit:
    """并发限制装饰器测试"""
    
    @pytest.mark.asyncio
    async def test_limits_concurrent_calls(self):
        """应限制并发调用数"""
        current_concurrent = 0
        max_concurrent = 0
        
        @with_concurrency_limit("test_limit", max_concurrent=2)
        async def limited_function():
            nonlocal current_concurrent, max_concurrent
            current_concurrent += 1
            max_concurrent = max(max_concurrent, current_concurrent)
            await asyncio.sleep(0.05)
            current_concurrent -= 1
        
        await asyncio.gather(*[limited_function() for _ in range(5)])
        
        assert max_concurrent <= 2
    
    @pytest.mark.asyncio
    async def test_timeout_on_acquire(self):
        """获取许可超时应抛出错误"""
        @with_concurrency_limit("test_timeout", max_concurrent=1, timeout=0.1)
        async def slow_function():
            await asyncio.sleep(1.0)
        
        # 第一次调用占用许可
        task1 = asyncio.create_task(slow_function())
        await asyncio.sleep(0.01)  # 确保 task1 先获取许可
        
        # 第二次调用应超时
        with pytest.raises(ConcurrencyTimeoutError):
            await slow_function()
        
        # 清理
        try:
            await task1
        except Exception:
            pass


class TestDatabaseConnectionLimiter:
    """数据库连接限制器测试"""
    
    @pytest.mark.asyncio
    async def test_limits_connections(self):
        """应限制并发连接数"""
        limiter = DatabaseConnectionLimiter(max_connections=2, name="test")
        current_connections = 0
        max_connections = 0
        
        async def use_connection():
            nonlocal current_connections, max_connections
            async with limiter.limit():
                current_connections += 1
                max_connections = max(max_connections, current_connections)
                await asyncio.sleep(0.05)
                current_connections -= 1
        
        await asyncio.gather(*[use_connection() for _ in range(5)])
        
        assert max_connections <= 2
    
    @pytest.mark.asyncio
    async def test_timeout_on_limit(self):
        """连接获取超时应抛出错误"""
        limiter = DatabaseConnectionLimiter(max_connections=1, name="test")
        
        async def slow_connection():
            async with limiter.limit(timeout=0.1):
                await asyncio.sleep(1.0)
        
        # 第一次调用占用连接
        task1 = asyncio.create_task(slow_connection())
        await asyncio.sleep(0.01)
        
        # 第二次调用应超时
        with pytest.raises(ConcurrencyTimeoutError):
            async with limiter.limit(timeout=0.1):
                pass
        
        # 清理
        try:
            await task1
        except Exception:
            pass


class TestConcurrencyManager:
    """全局并发管理器测试"""
    
    @pytest.mark.asyncio
    async def test_returns_existing_semaphore(self):
        """应返回已存在的信号量"""
        manager = get_concurrency_manager()
        sem1 = await manager.get_semaphore("test_sem", 5)
        sem2 = await manager.get_semaphore("test_sem", 10)
        
        # 应返回同一个实例
        assert sem1 is sem2
        # 应使用初始配置
        assert sem1.max_value == 5
    
    @pytest.mark.asyncio
    async def test_get_all_stats(self):
        """应返回所有统计信息"""
        manager = get_concurrency_manager()
        
        # 创建一些信号量
        await manager.get_semaphore("stats_test1", 3)
        await manager.get_semaphore("stats_test2", 5)
        
        stats = manager.get_all_stats()
        
        assert "semaphores" in stats
        assert "stats_test1" in stats["semaphores"]
        assert "stats_test2" in stats["semaphores"]
    
    def test_singleton_pattern(self):
        """应为单例模式"""
        manager1 = get_concurrency_manager()
        manager2 = get_concurrency_manager()
        assert manager1 is manager2


class TestDbSessionWithLimit:
    """数据库会话限制测试"""
    
    @pytest.mark.asyncio
    async def test_session_acquisition_limited(self):
        """会话获取应被限制"""
        # 模拟 session factory - 返回一个实现了异步上下文管理器的对象
        class MockSession:
            def __init__(self):
                self.committed = False
                self.rolled_back = False
            
            async def __aenter__(self):
                return self
            
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                if exc_type:
                    self.rolled_back = True
                else:
                    self.committed = True
                return False
            
            async def commit(self):
                self.committed = True
            
            async def rollback(self):
                self.rolled_back = True
        
        class MockSessionFactory:
            """实现异步上下文管理器的工厂"""
            def __init__(self):
                self.session = MockSession()
            
            async def __aenter__(self):
                return self.session
            
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                if exc_type:
                    self.session.rolled_back = True
                else:
                    self.session.committed = True
                return False
        
        def mock_factory():
            return MockSessionFactory()
        
        # 测试正常提交
        async with db_session_with_limit(
            mock_factory,
            max_connections=1,
            timeout=1.0
        ) as session:
            assert session is not None
        
        # 验证会话被正确提交
        assert session.committed is True
        assert session.rolled_back is False


class TestEdgeCases:
    """边界情况测试"""
    
    @pytest.mark.asyncio
    async def test_semaphore_zero_timeout(self):
        """极短超时应立即失败或成功"""
        sem = SafeSemaphore(1, "test")
        
        # 空闲时应立即成功（使用小超时而不是0）
        async with sem.acquire(timeout=0.001):
            pass
        
        # 占用时应立即失败（使用极短超时）
        async with sem.acquire():
            with pytest.raises(ConcurrencyTimeoutError):
                async with sem.acquire(timeout=0.001):
                    pass
    
    @pytest.mark.asyncio
    async def test_nested_semaphores(self):
        """嵌套信号量应正确工作"""
        sem1 = SafeSemaphore(2, "outer")
        sem2 = SafeSemaphore(2, "inner")
        
        async with sem1.acquire():
            async with sem2.acquire():
                assert sem1.available == 1
                assert sem2.available == 1
        
        assert sem1.available == 2
        assert sem2.available == 2
    
    @pytest.mark.asyncio
    async def test_concurrent_timeout_handling(self):
        """并发超时处理应正确"""
        sem = SafeSemaphore(1, "test")
        timeout_count = 0
        
        async def try_acquire():
            nonlocal timeout_count
            try:
                async with sem.acquire(timeout=0.05):
                    await asyncio.sleep(0.1)
            except ConcurrencyTimeoutError:
                timeout_count += 1
        
        # 第一个获取成功，其他的超时
        await asyncio.gather(*[try_acquire() for _ in range(3)])
        
        assert timeout_count == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
