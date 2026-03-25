"""
Manual API Testing Script
手动 API 测试脚本 - 用于验证熔断器和并发控制的实际效果
"""

import asyncio
import aiohttp
import json
import time
from typing import Optional
import argparse


class CircuitBreakerAPITester:
    """熔断器 API 测试工具"""
    
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()
    
    async def check_health(self):
        """健康检查"""
        try:
            async with self.session.get(f"{self.base_url}/api/monitoring/health") as resp:
                data = await resp.json()
                print(f"✅ Health: {data}")
                return True
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False
    
    async def get_circuit_breaker_status(self):
        """获取熔断器状态"""
        try:
            async with self.session.get(
                f"{self.base_url}/api/monitoring/circuit-breakers"
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print(f"\n📊 Circuit Breaker Status:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                    return data
                else:
                    print(f"❌ Failed to get status: {resp.status}")
                    return None
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    async def reset_circuit_breaker(self, name: str):
        """重置熔断器"""
        try:
            async with self.session.post(
                f"{self.base_url}/api/monitoring/circuit-breakers/{name}/reset"
            ) as resp:
                data = await resp.json()
                print(f"🔄 Reset {name}: {data}")
                return data
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    async def get_concurrency_stats(self):
        """获取并发统计"""
        try:
            async with self.session.get(
                f"{self.base_url}/api/monitoring/concurrency"
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print(f"\n📈 Concurrency Stats:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                    return data
                else:
                    print(f"❌ Failed: {resp.status}")
                    return None
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    async def get_full_status(self):
        """获取完整状态"""
        try:
            async with self.session.get(
                f"{self.base_url}/api/monitoring/status"
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print(f"\n📋 Full System Status:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                    return data
                else:
                    print(f"❌ Failed: {resp.status}")
                    return None
        except Exception as e:
            print(f"❌ Error: {e}")
            return None


async def test_circuit_breaker_scenario():
    """测试熔断器场景"""
    print("\n" + "=" * 60)
    print("SCENARIO: Circuit Breaker Test")
    print("=" * 60)
    
    async with CircuitBreakerAPITester() as tester:
        # 1. 检查健康状态
        await tester.check_health()
        
        # 2. 获取初始状态
        print("\n--- Initial Status ---")
        await tester.get_circuit_breaker_status()
        
        # 3. 模拟生成任务触发熔断器
        # 注意：这需要实际的项目和任务，这里仅展示监控接口
        
        # 4. 获取熔断后的状态
        print("\n--- After Operations ---")
        await tester.get_full_status()
        
        # 5. 重置熔断器
        print("\n--- Resetting Circuit Breakers ---")
        await tester.reset_circuit_breaker("text_generation")
        await tester.reset_circuit_breaker("image_generation")
        
        # 6. 验证重置
        print("\n--- After Reset ---")
        await tester.get_circuit_breaker_status()


async def simulate_load_test(
    num_requests: int = 100,
    concurrent: int = 10,
    endpoint: str = "/api/monitoring/health"
):
    """模拟负载测试"""
    print("\n" + "=" * 60)
    print(f"LOAD TEST: {num_requests} requests, {concurrent} concurrent")
    print("=" * 60)
    
    base_url = "http://localhost:5000"
    results = {
        "success": 0,
        "failure": 0,
        "latencies": []
    }
    
    async def make_request(session: aiohttp.ClientSession):
        start = time.time()
        try:
            async with session.get(f"{base_url}{endpoint}") as resp:
                await resp.text()
                latency = time.time() - start
                results["success"] += 1
                results["latencies"].append(latency)
        except Exception as e:
            results["failure"] += 1
            print(f"❌ Request failed: {e}")
    
    async with aiohttp.ClientSession() as session:
        semaphore = asyncio.Semaphore(concurrent)
        
        async def bounded_request():
            async with semaphore:
                await make_request(session)
        
        # 执行所有请求
        tasks = [bounded_request() for _ in range(num_requests)]
        await asyncio.gather(*tasks)
    
    # 统计结果
    avg_latency = sum(results["latencies"]) / len(results["latencies"]) if results["latencies"] else 0
    
    print(f"\n📊 Results:")
    print(f"  Total: {num_requests}")
    print(f"  Success: {results['success']}")
    print(f"  Failure: {results['failure']}")
    print(f"  Success Rate: {results['success']/num_requests*100:.2f}%")
    print(f"  Avg Latency: {avg_latency*1000:.2f}ms")
    
    if results["latencies"]:
        sorted_latencies = sorted(results["latencies"])
        p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
        p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]
        print(f"  P95 Latency: {p95*1000:.2f}ms")
        print(f"  P99 Latency: {p99*1000:.2f}ms")


async def interactive_mode():
    """交互式测试模式"""
    print("\n" + "=" * 60)
    print("Interactive Circuit Breaker & Concurrency Test")
    print("=" * 60)
    print("\nCommands:")
    print("  1 - Check health")
    print("  2 - Get circuit breaker status")
    print("  3 - Get concurrency stats")
    print("  4 - Get full status")
    print("  5 - Reset circuit breaker")
    print("  6 - Run load test")
    print("  q - Quit")
    
    async with CircuitBreakerAPITester() as tester:
        while True:
            print("\n" + "-" * 40)
            try:
                cmd = input("Enter command: ").strip().lower()
            except EOFError:
                break
            
            if cmd == 'q':
                break
            elif cmd == '1':
                await tester.check_health()
            elif cmd == '2':
                await tester.get_circuit_breaker_status()
            elif cmd == '3':
                await tester.get_concurrency_stats()
            elif cmd == '4':
                await tester.get_full_status()
            elif cmd == '5':
                try:
                    name = input("Enter circuit breaker name (e.g., 'text_generation'): ").strip()
                    await tester.reset_circuit_breaker(name)
                except EOFError:
                    pass
            elif cmd == '6':
                try:
                    num_input = input("Number of requests [100]: ").strip()
                    num = int(num_input) if num_input else 100
                    conc_input = input("Concurrent requests [10]: ").strip()
                    conc = int(conc_input) if conc_input else 10
                    await simulate_load_test(num, conc)
                except ValueError:
                    print("❌ Invalid input")
                except EOFError:
                    pass
            else:
                print("❌ Unknown command")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="Circuit Breaker & Concurrency API Tester")
    parser.add_argument(
        "--mode",
        choices=["scenario", "load", "interactive"],
        default="interactive",
        help="Test mode"
    )
    parser.add_argument("--requests", type=int, default=100, help="Number of requests for load test")
    parser.add_argument("--concurrent", type=int, default=10, help="Concurrent requests for load test")
    
    args = parser.parse_args()
    
    if args.mode == "scenario":
        asyncio.run(test_circuit_breaker_scenario())
    elif args.mode == "load":
        asyncio.run(simulate_load_test(args.requests, args.concurrent))
    else:
        asyncio.run(interactive_mode())


if __name__ == "__main__":
    main()
