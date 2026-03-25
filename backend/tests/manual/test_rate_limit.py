"""
Rate Limiting Manual Test
限流功能手动测试脚本

Usage:
    python test_rate_limit.py
"""

import asyncio
import aiohttp
import time
from datetime import datetime


BASE_URL = "http://localhost:5001"


async def test_rate_limit(endpoint: str, requests_count: int, description: str):
    """测试指定端点的限流"""
    print(f"\n{'='*60}")
    print(f"测试: {description}")
    print(f"端点: {endpoint}")
    print(f"请求数: {requests_count}")
    print(f"{'='*60}")
    
    results = {
        "success": 0,
        "rate_limited": 0,
        "errors": 0,
    }
    
    async with aiohttp.ClientSession() as session:
        for i in range(requests_count):
            try:
                async with session.get(f"{BASE_URL}{endpoint}") as resp:
                    remaining = resp.headers.get("X-RateLimit-Remaining", "N/A")
                    limit = resp.headers.get("X-RateLimit-Limit", "N/A")
                    reset = resp.headers.get("X-RateLimit-Reset", "N/A")
                    
                    if resp.status == 200:
                        results["success"] += 1
                        status = "✅ 成功"
                    elif resp.status == 429:
                        results["rate_limited"] += 1
                        retry_after = resp.headers.get("Retry-After", "N/A")
                        status = f"⛔ 限流 (Retry-After: {retry_after}s)"
                    else:
                        results["errors"] += 1
                        status = f"❌ 错误 ({resp.status})"
                    
                    if i < 5 or resp.status == 429:  # 只打印前5个和被限流的
                        print(f"  [{i+1:3d}] {status} | Remaining: {remaining}/{limit}")
                    
                    if i == 5 and results["success"] == 6:
                        print(f"  ... (跳过中间请求)")
                    
            except Exception as e:
                results["errors"] += 1
                print(f"  [{i+1:3d}] ❌ 异常: {e}")
    
    print(f"\n结果统计:")
    print(f"  成功: {results['success']}")
    print(f"  被限流: {results['rate_limited']}")
    print(f"  错误: {results['errors']}")


async def test_health_endpoint():
    """测试健康检查端点（应该不受限流影响）"""
    print(f"\n{'='*60}")
    print("测试: 健康检查端点 (应跳过限流)")
    print(f"{'='*60}")
    
    async with aiohttp.ClientSession() as session:
        for i in range(5):
            async with session.get(f"{BASE_URL}/health") as resp:
                remaining = resp.headers.get("X-RateLimit-Remaining", "N/A")
                print(f"  [{i+1}] Status: {resp.status} | Remaining: {remaining}")


async def test_concurrent_requests():
    """测试并发请求限流"""
    print(f"\n{'='*60}")
    print("测试: 并发请求 (10个同时请求 /api/monitoring/health)")
    print(f"{'='*60}")
    
    async def make_request(session, idx):
        async with session.get(f"{BASE_URL}/api/monitoring/health") as resp:
            remaining = resp.headers.get("X-RateLimit-Remaining", "N/A")
            limit = resp.headers.get("X-RateLimit-Limit", "N/A")
            status = "✅" if resp.status == 200 else "⛔"
            return f"  [{idx}] {status} Status: {resp.status} | Remaining: {remaining}/{limit}"
    
    async with aiohttp.ClientSession() as session:
        tasks = [make_request(session, i+1) for i in range(10)]
        results = await asyncio.gather(*tasks)
        for r in results:
            print(r)


async def main():
    print("\n" + "="*60)
    print("API Rate Limiting Test Suite")
    print("API 限流功能测试套件")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    
    # 测试1: 健康检查（应不受限流）
    await test_health_endpoint()
    
    # 测试2: 监控端点（受限流，默认60/分钟）
    await test_rate_limit(
        "/api/monitoring/health",
        requests_count=70,
        description="监控端点限流 (60请求/分钟)"
    )
    
    # 等待窗口重置
    print(f"\n{'='*60}")
    print("等待 10 秒...")
    print(f"{'='*60}")
    await asyncio.sleep(10)
    
    # 测试3: 并发请求
    await test_concurrent_requests()
    
    print(f"\n{'='*60}")
    print("测试完成!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n测试已取消")
    except Exception as e:
        print(f"\n测试出错: {e}")
        print("请确保后端服务已启动: python -m uvicorn app_fastapi:app --port 5001")
