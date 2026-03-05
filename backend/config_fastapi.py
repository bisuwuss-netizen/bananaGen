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


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All fields have defaults matching the original config.py.
    Type conversion is automatic (e.g. PORT string -> int).
    Misspelled env var names will use defaults instead of silently failing.
    """
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore unknown env vars
    )

    # --- Server ---
    secret_key: str = "your-secret-key-change-this"
    port: int = 5000
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
    ai_provider_format: str = "gemini"
    google_api_key: str = ""
    google_api_base: str = ""
    genai_timeout: float = 300.0
    genai_max_retries: int = 2

    # --- OpenAI Format ---
    openai_api_key: str = ""
    openai_api_base: str = "https://aihubmix.com/v1"
    openai_timeout: float = 300.0
    openai_max_retries: int = 2

    # --- DashScope ---
    dashscope_api_key: str = ""
    dashscope_api_base: str = "https://dashscope.aliyuncs.com/api/v1"

    # --- Vertex AI ---
    vertex_project_id: str = ""
    vertex_location: str = "us-central1"

    # --- Model Names ---
    text_model: str = "gemini-3-flash-preview"
    image_model: str = "wanx-v1"
    image_caption_model: str = "gemini-3-flash-preview"

    # --- MinerU ---
    mineru_token: str = ""
    mineru_api_base: str = "https://mineru.net"

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
    inpainting_provider: str = "gemini"

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
