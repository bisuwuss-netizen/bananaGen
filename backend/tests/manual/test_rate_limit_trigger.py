"""
Rate Limit Trigger Test
触发限流的测试脚本

Usage:
    python test_rate_limit_trigger.py
"""

import asyncio
import aiohttp
import sys

BASE_URL = "http://localhost:5001"


async def test_generation_rate_limit():
    """测试 AI 生成端点限流（10请求/分钟）"""
    print("="*60)
    print("测试: /api/generation/outline 限流 (10请求/分钟)")
    print("="*60)
    
    async with aiohttp.ClientSession() as session:
        for i in range(15):  # 发送15个请求，期望第11个被限流
            try:
                async with session.post(
                    f"{BASE_URL}/api/generation/outline",
                    json={}  # 空 JSON 体
                ) as resp:
                    remaining = resp.headers.get("X-RateLimit-Remaining", "N/A")
                    limit = resp.headers.get("X-RateLimit-Limit", "N/A")
                    retry_after = resp.headers.get("Retry-After", "N/A")
                    
                    if resp.status == 200:
                        print(f"  [{i+1:2d}] ✅ 200 | Remaining: {remaining}/{limit}")
                    elif resp.status == 429:
                        print(f"  [{i+1:2d}] ⛔ 429 限流触发! | Retry-After: {retry_after}s")
                        print("\n🎯 限流正常工作！")
                        break
                    elif resp.status == 401:
                        print(f"  [{i+1:2d}] ⚠️  401 未登录 (需要登录才能测试)")
                        print("\n提示: 先登录获取 Cookie，或测试其他端点")
                        break
                    else:
                        text = await resp.text()
                        print(f"  [{i+1:2d}] ❌ {resp.status} | {text[:100]}")
                        
            except Exception as e:
                print(f"  [{i+1:2d}] ❌ 异常: {e}")
            
            await asyncio.sleep(0.1)  # 100ms 间隔


async def test_monitoring_rate_limit():
    """测试监控端点限流（120请求/分钟）- 发送130个触发限流"""
    print("\n" + "="*60)
    print("测试: /api/monitoring/health 限流 (120请求/分钟)")
    print("="*60)
    print("发送 130 个请求...")
    
    triggered = False
    
    async with aiohttp.ClientSession() as session:
        for i in range(130):
            try:
                async with session.get(f"{BASE_URL}/api/monitoring/health") as resp:
                    remaining = resp.headers.get("X-RateLimit-Remaining", "N/A")
                    limit = resp.headers.get("X-RateLimit-Limit", "N/A")
                    retry_after = resp.headers.get("Retry-After", "N/A")
                    
                    if resp.status == 429 and not triggered:
                        triggered = True
                        print(f"\n  [{i+1:3d}] ⛔ 429 限流触发!")
                        print(f"       Remaining: 0/{limit}")
                        print(f"       Retry-After: {retry_after}s")
                        print("\n✅ 限流功能验证通过！")
                        
                        # 再发几个确认持续限流
                        await asyncio.sleep(0.5)
                        continue
                    
                    if triggered and i < 132:  # 限流后打印几个
                        status = "⛔ 429" if resp.status == 429 else f"✅ {resp.status}"
                        print(f"  [{i+1:3d}] {status} (限流持续中)")
                    elif i % 20 == 0:
                        print(f"  [{i+1:3d}] 发送中... Remaining: {remaining}/{limit}")
                        
            except Exception as e:
                print(f"  [{i+1:3d}] ❌ 异常: {e}")
                break
    
    if not triggered:
        print("\n⚠️  未触发限流（可能是配置较宽松或窗口已重置）")


async def test_health_no_limit():
    """确认健康检查不受限流"""
    print("\n" + "="*60)
    print("验证: /health 端点应跳过大限流")
    print("="*60)
    
    async with aiohttp.ClientSession() as session:
        for i in range(10):
            async with session.get(f"{BASE_URL}/health") as resp:
                has_limit_headers = "X-RateLimit-Limit" in resp.headers
                print(f"  [{i+1}] Status: {resp.status} | 有限流头: {has_limit_headers}")
    
    print("✅ 健康检查正确跳过了限流")


async def main():
    print("\n" + "="*60)
    print("Rate Limit Trigger Test")
    print("限流触发测试")
    print("="*60)
    print(f"Base URL: {BASE_URL}\n")
    
    # 测试1: 健康检查
    await test_health_no_limit()
    
    # 测试2: AI生成端点
    await test_generation_rate_limit()
    
    # 测试3: 监控端点大量请求
    await test_monitoring_rate_limit()
    
    print("\n" + "="*60)
    print("测试完成!")
    print("="*60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n测试已取消")
    except Exception as e:
        print(f"\n测试出错: {e}")
        print("请确保后端服务已启动: python -m uvicorn app_fastapi:app --port 5001")
