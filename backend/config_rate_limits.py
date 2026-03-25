"""
Rate Limiting Configuration for Production
生产环境限流配置

调优原则：
1. 保护AI服务 - 图片生成最严格
2. 保护数据库 - 导出操作限制
3. 用户体验 - 查询类接口宽松
4. 防刷 - 游客比登录用户更严格
"""

from services.rate_limiter import RateLimitConfig


class RateLimitPresets:
    """
    限流配置预设
    
    使用建议:
    - 小规模内测: DEBUG
    - 正式上线初期: CONSERVATIVE (推荐)
    - 稳定后: STANDARD
    - 大型活动: PROMOTION (活动期间临时切换)
    """
    
    # ===== 开发调试（几乎无限流）=====
    DEBUG = {
        "default": RateLimitConfig(
            requests_per_window=1000,
            window_seconds=60.0,
            burst_size=100
        ),
        "/api/generation": RateLimitConfig(
            requests_per_window=100,
            window_seconds=60.0,
            burst_size=20
        ),
        "/api/generation/images": RateLimitConfig(
            requests_per_window=50,
            window_seconds=60.0,
            burst_size=10
        ),
    }
    
    # ===== 保守模式（推荐上线初期使用）=====
    CONSERVATIVE = {
        "default": RateLimitConfig(
            requests_per_window=120,    # 普通API：2次/秒
            window_seconds=60.0,
            burst_size=20               # 允许突发20个请求
        ),
        
        # AI生成 - 严格限制（防止API费用暴增）
        "/api/generation": RateLimitConfig(
            requests_per_window=10,     # 10次/分钟
            window_seconds=60.0,
            burst_size=3                # 突发3个
        ),
        
        # 图片生成 - 最严格（最慢最贵）
        "/api/generation/images": RateLimitConfig(
            requests_per_window=5,      # 5次/分钟
            window_seconds=60.0,
            burst_size=2
        ),
        
        # 导出 - 中等限制（数据库压力）
        "/api/export": RateLimitConfig(
            requests_per_window=20,     # 20次/分钟
            window_seconds=60.0,
            burst_size=5
        ),
        
        # 监控 - 宽松（管理员使用）
        "/api/monitoring": RateLimitConfig(
            requests_per_window=300,    # 5次/秒
            window_seconds=60.0,
            burst_size=50
        ),
    }
    
    # ===== 标准模式（用户量稳定后）=====
    STANDARD = {
        "default": RateLimitConfig(
            requests_per_window=180,    # 3次/秒
            window_seconds=60.0,
            burst_size=30
        ),
        
        "/api/generation": RateLimitConfig(
            requests_per_window=20,     # 20次/分钟
            window_seconds=60.0,
            burst_size=5
        ),
        
        "/api/generation/images": RateLimitConfig(
            requests_per_window=10,     # 10次/分钟
            window_seconds=60.0,
            burst_size=3
        ),
        
        "/api/export": RateLimitConfig(
            requests_per_window=30,
            window_seconds=60.0,
            burst_size=10
        ),
        
        "/api/monitoring": RateLimitConfig(
            requests_per_window=600,    # 10次/秒
            window_seconds=60.0,
            burst_size=100
        ),
    }
    
    # ===== 活动模式（大促/限时活动）=====
    PROMOTION = {
        "default": RateLimitConfig(
            requests_per_window=60,     # 更严格，防止刷
            window_seconds=60.0,
            burst_size=10
        ),
        
        "/api/generation": RateLimitConfig(
            requests_per_window=5,      # 5次/分钟（保护AI配额）
            window_seconds=60.0,
            burst_size=2
        ),
        
        "/api/generation/images": RateLimitConfig(
            requests_per_window=3,      # 3次/分钟
            window_seconds=60.0,
            burst_size=1
        ),
        
        "/api/export": RateLimitConfig(
            requests_per_window=10,
            window_seconds=60.0,
            burst_size=3
        ),
    }


# ===== 按用户类型区分（可选增强）=====
class UserRateLimits:
    """
    不同用户类型的限流配置
    
    使用方法：
    1. 在 middleware 中判断用户类型
    2. 应用对应的配置乘数
    """
    
    # 登录用户乘数（更宽松）
    AUTHENTICATED_MULTIPLIER = 2.0    # 2倍额度
    
    # VIP用户乘数（更宽松）
    VIP_MULTIPLIER = 5.0              # 5倍额度
    
    # 游客限制（更严格）
    GUEST_MULTIPLIER = 0.5            # 一半额度
    
    @staticmethod
    def apply_multiplier(config: RateLimitConfig, multiplier: float) -> RateLimitConfig:
        """应用乘数调整配置"""
        return RateLimitConfig(
            requests_per_window=int(config.requests_per_window * multiplier),
            window_seconds=config.window_seconds,
            burst_size=int(config.burst_size * multiplier),
            key_prefix=config.key_prefix
        )


# ===== 生产环境推荐配置 =====
# 选择当前使用的预设
CURRENT_PRESET = RateLimitPresets.CONSERVATIVE  # 推荐上线初期使用

# 导出到 rate_limiter
DEFAULT_CONFIG = CURRENT_PRESET["default"]
ROUTE_CONFIGS = {k: v for k, v in CURRENT_PRESET.items() if k != "default"}


# ===== 动态调整配置（管理员API用）=====
class RateLimitManager:
    """
    运行时动态调整限流配置
    
    使用场景：
    - 发现某个端点被刷，临时收紧
    - 活动开始前统一放宽
    - 故障恢复后逐步放开
    """
    
    def __init__(self):
        self._emergency_mode = False
        self._custom_configs = {}
    
    def enable_emergency_mode(self):
        """
        紧急模式 - 全局收紧50%
        使用场景：AI服务故障、数据库压力大
        """
        self._emergency_mode = True
        
    def disable_emergency_mode(self):
        """关闭紧急模式"""
        self._emergency_mode = False
        
    def set_custom_limit(self, path: str, config: RateLimitConfig):
        """为特定路径设置临时配置"""
        self._custom_configs[path] = config
        
    def clear_custom_limit(self, path: str):
        """清除特定路径的临时配置"""
        if path in self._custom_configs:
            del self._custom_configs[path]
    
    def get_config(self, path: str, default_config: RateLimitConfig) -> RateLimitConfig:
        """获取当前生效的配置"""
        # 优先使用临时配置
        if path in self._custom_configs:
            return self._custom_configs[path]
        
        config = default_config
        
        # 紧急模式下收紧50%
        if self._emergency_mode:
            config = RateLimitConfig(
                requests_per_window=max(1, int(config.requests_per_window * 0.5)),
                window_seconds=config.window_seconds,
                burst_size=max(1, int(config.burst_size * 0.5)),
                key_prefix=config.key_prefix
            )
        
        return config


# 全局管理器实例
rate_limit_manager = RateLimitManager()
