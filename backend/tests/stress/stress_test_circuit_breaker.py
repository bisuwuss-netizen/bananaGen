"""
Stress tests for Circuit Breaker and Concurrency Control
压力测试：模拟高负载场景
"""

import asyncio
import random
import time
import statistics
from dataclasses import dataclass, field
from typing import List, Dict, Any
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class StressTestResult:
    """压力测试结果"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    circuit_open_rejections: int = 0
    timeout_errors: int = 0
    latencies: List[float] = field(default_factory=list)
    
    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.successful_requests / self.total_requests
    
    @property
    def average_latency(self) -> float:
        if not self.latencies:
            return 0.0
        return statistics.mean(self.latencies)
    
    @property
    def p95_latency(self) -> float:
        if not self.latencies:
            return 0.0
        return statistics.quantiles(self.latencies, n=20)[18] if len(self.latencies) > 1 else self.latencies[0]
    
    @property
    def p99_latency(self) -> float:
        if not self.latencies:
            return 0.0
        return statistics.quantiles(self.latencies, n=100)[98] if len(self.latencies) > 1 else self.latencies[0]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "circuit_open_rejections": self.circuit_open_rejections,
            "timeout_errors": self.timeout_errors,
            "success_rate": f"{self.success_rate:.2%}",
            "average_latency_ms": f"{self.average_latency * 1000:.2f}",
            "p95_latency_ms": f"{self.p95_latency * 1000:.2f}",
            "p99_latency_ms": f"{self.p99_latency * 1000:.2f}",
        }


async def stress_test_circuit_breaker(
    duration_seconds: float = 10.0,
    concurrent_clients: int = 50,
    failure_rate: float = 0.3,
    circuit_threshold: int = 5
) -> StressTestResult:
    """
    熔断器压力测试
    
    Args:
        duration_seconds: 测试持续时间
        concurrent_clients: 并发客户端数
        failure_rate: 模拟服务失败率
        circuit_threshold: 熔断阈值
    """
    import sys
    sys.path.insert(0, 'd:/banana-slides/backend')
    from services.circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    
    result = StressTestResult()
    breaker = CircuitBreaker(
        "stress_test",
        CircuitBreakerConfig(
            failure_threshold=circuit_threshold,
            recovery_timeout=10.0,
            window_size=20
        )
    )
    
    stop_event = asyncio.Event()
    
    async def client():
        while not stop_event.is_set():
            start_time = time.monotonic()
            
            try:
                async with breaker.call():
                    # 模拟服务调用
                    await asyncio.sleep(random.uniform(0.01, 0.05))
                    
                    # 模拟失败
                    if random.random() < failure_rate:
                        raise ConnectionError("Service unavailable")
                
                result.successful_requests += 1
                
            except ConnectionError:
                result.failed_requests += 1
            except Exception as e:
                if "OPEN" in str(e):
                    result.circuit_open_rejections += 1
                else:
                    result.failed_requests += 1
            
            latency = time.monotonic() - start_time
            result.latencies.append(latency)
            result.total_requests += 1
            
            # 小延迟避免 CPU 过载
            await asyncio.sleep(0.001)
    
    # 启动客户端
    clients = [asyncio.create_task(client()) for _ in range(concurrent_clients)]
    
    # 运行指定时间
    await asyncio.sleep(duration_seconds)
    stop_event.set()
    
    # 等待所有客户端完成
    await asyncio.gather(*clients, return_exceptions=True)
    
    return result


async def stress_test_concurrency_limits(
    duration_seconds: float = 10.0,
    total_operations: int = 1000,
    max_concurrent: int = 10,
    operation_time: float = 0.05
) -> StressTestResult:
    """
    并发限制压力测试
    
    Args:
        duration_seconds: 测试持续时间
        total_operations: 总操作数
        max_concurrent: 最大并发数
        operation_time: 每个操作耗时
    """
    import sys
    sys.path.insert(0, 'd:/banana-slides/backend')
    from services.concurrency_limits import SafeSemaphore
    
    result = StressTestResult()
    sem = SafeSemaphore(max_concurrent, "stress_sem")
    
    active_count = 0
    max_active = 0
    lock = asyncio.Lock()
    
    async def operation():
        nonlocal active_count, max_active
        
        start_time = time.monotonic()
        
        try:
            async with sem.acquire(timeout=5.0):
                async with lock:
                    active_count += 1
                    max_active = max(max_active, active_count)
                
                # 模拟操作
                await asyncio.sleep(operation_time)
                
                async with lock:
                    active_count -= 1
                
                result.successful_requests += 1
                
        except Exception as e:
            if "timeout" in str(e).lower():
                result.timeout_errors += 1
            result.failed_requests += 1
        
        latency = time.monotonic() - start_time
        result.latencies.append(latency)
        result.total_requests += 1
    
    # 执行所有操作
    await asyncio.gather(*[operation() for _ in range(total_operations)])
    
    logger.info(f"Max concurrent operations: {max_active}")
    logger.info(f"Expected max: {max_concurrent}")
    
    return result


async def stress_test_database_connections(
    duration_seconds: float = 10.0,
    concurrent_clients: int = 30,
    max_connections: int = 5
) -> StressTestResult:
    """
    数据库连接限制压力测试
    """
    import sys
    sys.path.insert(0, 'd:/banana-slides/backend')
    from services.concurrency_limits import DatabaseConnectionLimiter
    
    result = StressTestResult()
    limiter = DatabaseConnectionLimiter(max_connections, "stress_db")
    
    stop_event = asyncio.Event()
    
    async def client():
        while not stop_event.is_set():
            start_time = time.monotonic()
            
            try:
                async with limiter.limit(timeout=1.0):
                    # 模拟数据库操作
                    await asyncio.sleep(random.uniform(0.02, 0.08))
                    result.successful_requests += 1
                    
            except Exception as e:
                if "timeout" in str(e).lower():
                    result.timeout_errors += 1
                result.failed_requests += 1
            
            latency = time.monotonic() - start_time
            result.latencies.append(latency)
            result.total_requests += 1
            
            await asyncio.sleep(random.uniform(0.001, 0.01))
    
    # 启动客户端
    clients = [asyncio.create_task(client()) for _ in range(concurrent_clients)]
    
    await asyncio.sleep(duration_seconds)
    stop_event.set()
    
    await asyncio.gather(*clients, return_exceptions=True)
    
    return result


async def stress_test_full_pipeline(
    duration_seconds: float = 15.0,
    concurrent_requests: int = 100
) -> Dict[str, StressTestResult]:
    """
    完整管道压力测试
    模拟真实的 AI 生成场景，包含熔断器、并发限制、超时控制
    """
    import sys
    sys.path.insert(0, 'd:/banana-slides/backend')
    from services.quick_fixes import (
        SimpleCircuitBreaker,
        safe_semaphore,
        DBConnectionPool
    )
    
    results = {
        "text_generation": StressTestResult(),
        "image_generation": StressTestResult(),
    }
    
    # 不同的熔断器配置
    text_breaker = SimpleCircuitBreaker("text_gen", failure_threshold=5)
    image_breaker = SimpleCircuitBreaker("image_gen", failure_threshold=3)
    
    # 不同的并发限制
    text_sem = asyncio.Semaphore(10)
    image_sem = asyncio.Semaphore(3)  # 图片生成并发更低
    
    db_pool = DBConnectionPool(max_connections=5)
    
    stop_event = asyncio.Event()
    
    async def text_generation_client():
        """文本生成客户端"""
        while not stop_event.is_set():
            start = time.monotonic()
            
            try:
                async with safe_semaphore(text_sem, timeout=2.0):
                    async with text_breaker:
                        async with db_pool.acquire(timeout=1.0):
                            # 模拟文本生成
                            await asyncio.sleep(random.uniform(0.05, 0.15))
                            
                            # 10% 失败率
                            if random.random() < 0.1:
                                raise ConnectionError("Text service error")
                            
                            results["text_generation"].successful_requests += 1
                            
            except Exception as e:
                if "OPEN" in str(e):
                    results["text_generation"].circuit_open_rejections += 1
                elif "timeout" in str(e).lower():
                    results["text_generation"].timeout_errors += 1
                results["text_generation"].failed_requests += 1
            
            latency = time.monotonic() - start
            results["text_generation"].latencies.append(latency)
            results["text_generation"].total_requests += 1
            
            await asyncio.sleep(random.uniform(0.01, 0.05))
    
    async def image_generation_client():
        """图片生成客户端"""
        while not stop_event.is_set():
            start = time.monotonic()
            
            try:
                async with safe_semaphore(image_sem, timeout=5.0):
                    async with image_breaker:
                        async with db_pool.acquire(timeout=2.0):
                            # 模拟图片生成（更慢）
                            await asyncio.sleep(random.uniform(0.2, 0.5))
                            
                            # 20% 失败率（图片生成更不稳定）
                            if random.random() < 0.2:
                                raise ConnectionError("Image service error")
                            
                            results["image_generation"].successful_requests += 1
                            
            except Exception as e:
                if "OPEN" in str(e):
                    results["image_generation"].circuit_open_rejections += 1
                elif "timeout" in str(e).lower():
                    results["image_generation"].timeout_errors += 1
                results["image_generation"].failed_requests += 1
            
            latency = time.monotonic() - start
            results["image_generation"].latencies.append(latency)
            results["image_generation"].total_requests += 1
            
            await asyncio.sleep(random.uniform(0.05, 0.1))
    
    # 分配客户端比例（文本生成更多）
    text_clients = int(concurrent_requests * 0.7)
    image_clients = concurrent_requests - text_clients
    
    logger.info(f"Starting stress test with {text_clients} text clients and {image_clients} image clients")
    
    # 启动所有客户端
    clients = (
        [asyncio.create_task(text_generation_client()) for _ in range(text_clients)] +
        [asyncio.create_task(image_generation_client()) for _ in range(image_clients)]
    )
    
    await asyncio.sleep(duration_seconds)
    stop_event.set()
    
    await asyncio.gather(*clients, return_exceptions=True)
    
    return results


async def run_all_stress_tests():
    """运行所有压力测试"""
    print("=" * 80)
    print("CIRCUIT BREAKER & CONCURRENCY STRESS TESTS")
    print("=" * 80)
    
    # 测试 1: 熔断器压力测试
    print("\n[1/4] Testing Circuit Breaker under high load...")
    result = await stress_test_circuit_breaker(
        duration_seconds=10.0,
        concurrent_clients=50,
        failure_rate=0.2,
        circuit_threshold=20
    )
    print("Circuit Breaker Results:")
    for key, value in result.to_dict().items():
        print(f"  {key}: {value}")
    
    # 测试 2: 并发限制压力测试
    print("\n[2/4] Testing Concurrency Limits...")
    result = await stress_test_concurrency_limits(
        duration_seconds=5.0,
        total_operations=500,
        max_concurrent=10,
        operation_time=0.02
    )
    print("Concurrency Limits Results:")
    for key, value in result.to_dict().items():
        print(f"  {key}: {value}")
    
    # 测试 3: 数据库连接限制压力测试
    print("\n[3/4] Testing Database Connection Limits...")
    result = await stress_test_database_connections(
        duration_seconds=10.0,
        concurrent_clients=30,
        max_connections=5
    )
    print("Database Connection Results:")
    for key, value in result.to_dict().items():
        print(f"  {key}: {value}")
    
    # 测试 4: 完整管道压力测试
    print("\n[4/4] Testing Full Pipeline (Text + Image Generation)...")
    results = await stress_test_full_pipeline(
        duration_seconds=15.0,
        concurrent_requests=100
    )
    
    for pipeline_name, result in results.items():
        print(f"\n{pipeline_name.upper()} Results:")
        for key, value in result.to_dict().items():
            print(f"  {key}: {value}")
    
    print("\n" + "=" * 80)
    print("STRESS TESTS COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    # 运行压力测试
    asyncio.run(run_all_stress_tests())
