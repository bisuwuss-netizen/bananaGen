"""
Banana Slides Backend Configuration (Pydantic Settings)

Replaces the old config.py class-based Config with type-safe Pydantic Settings.
All env vars are automatically loaded from .env and validated at startup.
"""
import os
from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Path constants
_CURRENT_FILE = Path(__file__).resolve()
BASE_DIR = _CURRENT_FILE.parent
PROJECT_ROOT = BASE_DIR.parent

# Pre-load .env file with error handling to avoid UnicodeDecodeError in pydantic_settings
# This ensures environment variables are set before Settings() initialization
_env_path = PROJECT_ROOT / ".env"
if _env_path.exists() and not os.environ.get("_ENV_PRELOADED"):
    try:
        # Try UTF-8 first
        with open(_env_path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        # Fallback to UTF-8 with error replacement
        try:
            with open(_env_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            content = ""
    except Exception:
        content = ""
    
    # Manually parse and set environment variables
    if content:
        for line in content.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()
                # Only set if not already set (don't override existing env vars)
                if key and key not in os.environ:
                    os.environ[key] = value
    
    # Mark as preloaded to avoid duplicate processing
    os.environ["_ENV_PRELOADED"] = "1"


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All fields have defaults matching the original config.py.
    Type conversion is automatic (e.g. PORT string -> int).
    Misspelled env var names will use defaults instead of silently failing.
    """
    model_config = SettingsConfigDict(
        # env_file is disabled because we pre-load .env with error handling above
        # This avoids UnicodeDecodeError when pydantic_settings tries to read the file
        # Environment variables are already set from the pre-loaded .env file
        env_file=None,  # Disable automatic .env file reading
        extra="ignore",  # Ignore unknown env vars
    )

    # --- Server ---
    secret_key: str = "your-secret-key-change-this"
    port: int = 5001
    debug: bool = False
    log_level: str = "INFO"
    in_docker: str = "0"

    # --- Database ---
    database_url: Optional[str] = None
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = "12345678"
    mysql_database: str = "banana_slides"
    mysql_charset: str = "utf8mb4"

    # --- CORS ---
    cors_origins: str = "http://localhost:3000"

    # --- AI Provider ---
    ai_provider_format: str = "openai"

    # --- OpenAI Format ---
    openai_api_key: str = ""
    openai_api_base: str = "https://aihubmix.com/v1"
    openai_timeout: float = 300.0
    openai_max_retries: int = 2

    # --- DashScope ---
    dashscope_api_key: str = ""
    dashscope_api_base: str = "https://dashscope.aliyuncs.com/api/v1"

    # --- Model Names ---
    text_model: str = "gpt-4.1-mini"
    image_model: str = "wanx-v1"
    image_caption_model: str = "gpt-4.1-mini"

    # --- Concurrency ---
    max_description_workers: int = 5
    description_batch_size: int = 1
    max_image_workers: int = 8
    max_global_task_workers: int = 12
    html_continuity_mode: str = "fast"
    html_description_batch_size: int = 3
    html_chapter_parallelism: int = 5
    html_first_pass_thinking_budget: int = 280
    html_rewrite_thinking_budget: int = 850
    html_rewrite_timeout_seconds: int = 210

    # --- Image Generation ---
    default_aspect_ratio: str = "16:9"
    default_resolution: str = "2K"
    image_request_min_interval_seconds: float = 0.0
    qwen_image_min_interval_seconds: float = 8.0
    qwen_image_max_workers: int = 1
    image_prompt_rewrite_enabled: bool = True
    image_prompt_rewrite_model: str = ""
    image_prompt_rewrite_max_slots: int = 24
    image_prompt_rewrite_batch_size: int = 8
    image_prompt_rewrite_thinking_budget: int = 400

    # --- File Upload ---
    max_content_length: int = 200 * 1024 * 1024  # 200MB

    # --- Output Language ---
    output_language: str = "zh"

    # --- Volcengine ---
    volcengine_access_key: str = ""
    volcengine_secret_key: str = ""
    volcengine_inpainting_timeout: int = 60
    volcengine_inpainting_max_retries: int = 3

    # --- Inpainting ---
    inpainting_provider: str = "volcengine"

    # --- Baidu OCR ---
    baidu_ocr_api_key: str = ""
    baidu_ocr_api_secret: str = ""

    # --- Computed Properties ---

    @property
    def sqlalchemy_database_url(self) -> str:
        """Build database URL from components or use provided DATABASE_URL"""
        if self.database_url:
            # Convert sync URL to async URL for SQLAlchemy async
            url = self.database_url
            if url.startswith("mysql+pymysql://"):
                return url.replace("mysql+pymysql://", "mysql+aiomysql://")
            if url.startswith("sqlite://"):
                return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
            return url
        return (
            f"mysql+aiomysql://{self.mysql_user}:{self.mysql_password}@"
            f"{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            f"?charset={self.mysql_charset}"
        )

    @property
    def sqlalchemy_sync_url(self) -> str:
        """Sync database URL for Alembic migrations"""
        if self.database_url:
            if self.database_url.startswith("mysql+aiomysql://"):
                return self.database_url.replace("mysql+aiomysql://", "mysql+pymysql://")
            if self.database_url.startswith("sqlite+aiosqlite://"):
                return self.database_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
            return self.database_url
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}@"
            f"{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            f"?charset={self.mysql_charset}"
        )

    @property
    def upload_folder(self) -> str:
        return str(PROJECT_ROOT / "uploads")

    @property
    def cors_origin_list(self) -> list[str]:
        origins = self.cors_origins.split(",")
        return [o.strip() for o in origins if o.strip()]


# Global singleton - created once at import time
settings = Settings()
