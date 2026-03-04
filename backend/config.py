"""
Backend configuration file
"""
import os
import sys
from datetime import timedelta

# Safe env int parser to avoid startup/runtime crashes from malformed values.
def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(str(raw).strip())
    except (TypeError, ValueError):
        return default

# 基础配置 - 使用更可靠的路径计算方式
# 在模块加载时立即计算并固定路径
_current_file = os.path.realpath(__file__)  # 使用realpath解析所有符号链接
BASE_DIR = os.path.dirname(_current_file)
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# Flask配置
class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
    
    # 数据库配置
    # MySQL 配置（优先使用环境变量）
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = os.getenv('MYSQL_PORT', '3306')
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '12345678')
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'banana_slides')
    MYSQL_CHARSET = os.getenv('MYSQL_CHARSET', 'utf8mb4')
    
    # 如果设置了 DATABASE_URL，优先使用（支持完整连接字符串）
    # 否则根据 MySQL 配置构建连接字符串
    if os.getenv('DATABASE_URL'):
        SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    else:
        # 构建 MySQL 连接字符串
        # 格式: mysql+pymysql://user:password@host:port/database?charset=utf8mb4
        # 注意：不在连接字符串中设置时区，而是在应用层面处理时区转换
        SQLALCHEMY_DATABASE_URI = (
            f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@'
            f'{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset={MYSQL_CHARSET}'
        )
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # MySQL 连接池配置
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,  # 连接前检查，自动重连
        'pool_recycle': 3600,  # 1小时回收连接
        'pool_size': 10,  # 连接池大小
        'max_overflow': 20,  # 最大溢出连接数
        'echo': False,  # 是否打印SQL语句（生产环境设为False）
    }
    
    # 文件存储配置
    UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, 'uploads')
    MAX_CONTENT_LENGTH = 200 * 1024 * 1024  # 200MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ALLOWED_REFERENCE_FILE_EXTENSIONS = {'pdf', 'docx', 'pptx', 'doc', 'ppt', 'xlsx', 'xls', 'csv', 'txt', 'md'}
    
    # AI服务配置
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
    GOOGLE_API_BASE = os.getenv('GOOGLE_API_BASE', '')
    
    # AI Provider 格式配置: "gemini" (Google GenAI SDK), "openai" (OpenAI SDK), "vertex" (Vertex AI)
    AI_PROVIDER_FORMAT = os.getenv('AI_PROVIDER_FORMAT', 'gemini')

    # Vertex AI 专用配置（当 AI_PROVIDER_FORMAT=vertex 时使用）
    VERTEX_PROJECT_ID = os.getenv('VERTEX_PROJECT_ID', '')
    VERTEX_LOCATION = os.getenv('VERTEX_LOCATION', 'us-central1')
    
    # GenAI (Gemini) 格式专用配置
    GENAI_TIMEOUT = float(os.getenv('GENAI_TIMEOUT', '300.0'))  # Gemini 超时时间（秒）
    GENAI_MAX_RETRIES = int(os.getenv('GENAI_MAX_RETRIES', '2'))  # Gemini 最大重试次数（应用层实现）
    
    # OpenAI 格式专用配置（当 AI_PROVIDER_FORMAT=openai 时使用）
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')  # 当 AI_PROVIDER_FORMAT=openai 时必须设置
    OPENAI_API_BASE = os.getenv('OPENAI_API_BASE', 'https://aihubmix.com/v1')
    OPENAI_TIMEOUT = float(os.getenv('OPENAI_TIMEOUT', '300.0'))  # 增加到 5 分钟（生成清洁背景图需要很长时间）
    OPENAI_MAX_RETRIES = int(os.getenv('OPENAI_MAX_RETRIES', '2'))  # 减少重试次数，避免过多重试导致累积超时
    
    # AI 模型配置
    TEXT_MODEL = os.getenv('TEXT_MODEL', 'gemini-3-flash-preview')
    IMAGE_MODEL = os.getenv('IMAGE_MODEL', 'wanx-v1')

    # DashScope（百炼）配置
    DASHSCOPE_API_KEY = os.getenv('DASHSCOPE_API_KEY', '')
    DASHSCOPE_API_BASE = os.getenv('DASHSCOPE_API_BASE', 'https://dashscope.aliyuncs.com/api/v1')

    # MinerU 文件解析服务配置
    MINERU_TOKEN = os.getenv('MINERU_TOKEN', '')
    MINERU_API_BASE = os.getenv('MINERU_API_BASE', 'https://mineru.net')
    
    # 图片识别模型配置
    IMAGE_CAPTION_MODEL = os.getenv('IMAGE_CAPTION_MODEL', 'gemini-3-flash-preview')
    
    # 并发配置
    MAX_DESCRIPTION_WORKERS = int(os.getenv('MAX_DESCRIPTION_WORKERS', '5'))
    # 描述生成批次大小（image 模式下每次请求生成多少页）
    # 默认关闭批量（=1）以优先保证稳定性；需要提速时可手动调到 2-4。
    DESCRIPTION_BATCH_SIZE = _env_int('DESCRIPTION_BATCH_SIZE', 1)
    MAX_IMAGE_WORKERS = int(os.getenv('MAX_IMAGE_WORKERS', '8'))
    
    # 图片生成配置
    DEFAULT_ASPECT_RATIO = "16:9"
    DEFAULT_RESOLUTION = "2K"

    # HTML 图片 prompt 优化配置（规则 + 小模型改写）
    IMAGE_PROMPT_REWRITE_ENABLED = os.getenv('IMAGE_PROMPT_REWRITE_ENABLED', 'true').lower() in ('1', 'true', 'yes', 'on')
    IMAGE_PROMPT_REWRITE_MODEL = os.getenv('IMAGE_PROMPT_REWRITE_MODEL', '')  # 为空则复用 TEXT_MODEL
    IMAGE_PROMPT_REWRITE_MAX_SLOTS = int(os.getenv('IMAGE_PROMPT_REWRITE_MAX_SLOTS', '24'))
    IMAGE_PROMPT_REWRITE_BATCH_SIZE = int(os.getenv('IMAGE_PROMPT_REWRITE_BATCH_SIZE', '8'))
    IMAGE_PROMPT_REWRITE_THINKING_BUDGET = int(os.getenv('IMAGE_PROMPT_REWRITE_THINKING_BUDGET', '400'))
    
    # 日志配置
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # CORS配置
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # 输出语言配置
    # 可选值: 'zh' (中文), 'ja' (日本語), 'en' (English), 'auto' (自动)
    OUTPUT_LANGUAGE = os.getenv('OUTPUT_LANGUAGE', 'zh')
    
    # 火山引擎配置
    VOLCENGINE_ACCESS_KEY = os.getenv('VOLCENGINE_ACCESS_KEY', '')
    VOLCENGINE_SECRET_KEY = os.getenv('VOLCENGINE_SECRET_KEY', '')
    VOLCENGINE_INPAINTING_TIMEOUT = int(os.getenv('VOLCENGINE_INPAINTING_TIMEOUT', '60'))  # Inpainting 超时时间（秒）
    VOLCENGINE_INPAINTING_MAX_RETRIES = int(os.getenv('VOLCENGINE_INPAINTING_MAX_RETRIES', '3'))  # 最大重试次数

    # Inpainting Provider 配置（用于 InpaintingService 的单张图片修复）
    # 可选值: 'volcengine' (火山引擎), 'gemini' (Google Gemini)
    # 注意: 可编辑PPTX导出功能使用 ImageEditabilityService，其中 HybridInpaintProvider 会结合百度重绘和生成式质量增强
    INPAINTING_PROVIDER = os.getenv('INPAINTING_PROVIDER', 'gemini')  # 默认使用 Gemini
    
    # 百度 API 配置（用于 OCR 和图像修复）
    BAIDU_OCR_API_KEY = os.getenv('BAIDU_OCR_API_KEY', '')
    BAIDU_OCR_API_SECRET = os.getenv('BAIDU_OCR_API_SECRET', '')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


# 根据环境变量选择配置
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment"""
    env = os.getenv('FLASK_ENV', 'development')
    return config_map.get(env, DevelopmentConfig)
