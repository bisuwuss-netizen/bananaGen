"""
Compatibility config shim.

The FastAPI runtime uses `config_fastapi.py` as source of truth.
This module is kept only for legacy imports like:
  from config import Config, get_config
"""

from __future__ import annotations

from pathlib import Path

try:
    # Preferred when running with `cwd=backend` (e.g. uvicorn app_fastapi:app)
    from config_fastapi import settings
except ModuleNotFoundError:  # pragma: no cover - import path compatibility
    # Fallback when importing as package module (e.g. `import backend.config`)
    from backend.config_fastapi import settings


_CURRENT_FILE = Path(__file__).resolve()
BASE_DIR = str(_CURRENT_FILE.parent)
PROJECT_ROOT = str(_CURRENT_FILE.parent.parent)


class Config:
    """Legacy-compatible view of settings for remaining old imports."""

    SECRET_KEY = settings.secret_key
    LOG_LEVEL = settings.log_level
    CORS_ORIGINS = settings.cors_origin_list

    OPENAI_API_KEY = settings.openai_api_key
    OPENAI_API_BASE = settings.openai_api_base
    OPENAI_TIMEOUT = settings.openai_timeout
    OPENAI_MAX_RETRIES = settings.openai_max_retries

    DASHSCOPE_API_KEY = settings.dashscope_api_key
    DASHSCOPE_API_BASE = settings.dashscope_api_base

    TEXT_MODEL = settings.text_model
    IMAGE_MODEL = settings.image_model
    IMAGE_CAPTION_MODEL = settings.image_caption_model

    MAX_DESCRIPTION_WORKERS = settings.max_description_workers
    MAX_IMAGE_WORKERS = settings.max_image_workers
    DEFAULT_ASPECT_RATIO = settings.default_aspect_ratio
    DEFAULT_RESOLUTION = settings.default_resolution
    IMAGE_REQUEST_MIN_INTERVAL_SECONDS = settings.image_request_min_interval_seconds
    QWEN_IMAGE_MIN_INTERVAL_SECONDS = settings.qwen_image_min_interval_seconds
    QWEN_IMAGE_MAX_WORKERS = settings.qwen_image_max_workers
    OUTPUT_LANGUAGE = settings.output_language

    UPLOAD_FOLDER = settings.upload_folder
    ALLOWED_REFERENCE_FILE_EXTENSIONS = {
        "pdf",
        "docx",
        "pptx",
        "doc",
        "ppt",
        "xlsx",
        "xls",
        "csv",
        "txt",
        "md",
    }

    INPAINTING_PROVIDER = settings.inpainting_provider
    VOLCENGINE_ACCESS_KEY = settings.volcengine_access_key
    VOLCENGINE_SECRET_KEY = settings.volcengine_secret_key
    VOLCENGINE_INPAINTING_TIMEOUT = settings.volcengine_inpainting_timeout
    VOLCENGINE_INPAINTING_MAX_RETRIES = settings.volcengine_inpainting_max_retries
    BAIDU_OCR_API_KEY = settings.baidu_ocr_api_key
    BAIDU_OCR_API_SECRET = settings.baidu_ocr_api_secret


def get_config():
    """Legacy helper kept for old provider/service modules."""
    return Config
