"""Runtime configuration and sync ORM access for the FastAPI migration."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from threading import Lock
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

from config_fastapi import settings as fastapi_settings
from models import db

_engine = create_engine(
    fastapi_settings.sqlalchemy_sync_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
)
_scoped_session = scoped_session(
    sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)
)
_install_lock = Lock()
_runtime_installed = False
_runtime_config_var: ContextVar[dict[str, Any] | None] = ContextVar(
    "runtime_config",
    default=None,
)


def install_runtime_orm() -> None:
    """Bind Flask-SQLAlchemy models to a standalone sync session."""
    global _runtime_installed
    if _runtime_installed:
        return

    with _install_lock:
        if _runtime_installed:
            return
        db.session = _scoped_session
        db.Model.query = _scoped_session.query_property()
        _runtime_installed = True


def get_sync_session():
    install_runtime_orm()
    return _scoped_session()


def _base_runtime_config() -> dict[str, Any]:
    return {
        "AI_PROVIDER_FORMAT": fastapi_settings.ai_provider_format,
        "GOOGLE_API_KEY": fastapi_settings.google_api_key,
        "GOOGLE_API_BASE": fastapi_settings.google_api_base,
        "GENAI_TIMEOUT": fastapi_settings.genai_timeout,
        "GENAI_MAX_RETRIES": fastapi_settings.genai_max_retries,
        "OPENAI_API_KEY": fastapi_settings.openai_api_key,
        "OPENAI_API_BASE": fastapi_settings.openai_api_base,
        "OPENAI_TIMEOUT": fastapi_settings.openai_timeout,
        "OPENAI_MAX_RETRIES": fastapi_settings.openai_max_retries,
        "DASHSCOPE_API_KEY": fastapi_settings.dashscope_api_key,
        "DASHSCOPE_API_BASE": fastapi_settings.dashscope_api_base,
        "VERTEX_PROJECT_ID": fastapi_settings.vertex_project_id,
        "VERTEX_LOCATION": fastapi_settings.vertex_location,
        "TEXT_MODEL": fastapi_settings.text_model,
        "IMAGE_MODEL": fastapi_settings.image_model,
        "IMAGE_CAPTION_MODEL": fastapi_settings.image_caption_model,
        "MINERU_TOKEN": fastapi_settings.mineru_token,
        "MINERU_API_BASE": fastapi_settings.mineru_api_base,
        "MAX_DESCRIPTION_WORKERS": fastapi_settings.max_description_workers,
        "DESCRIPTION_BATCH_SIZE": fastapi_settings.description_batch_size,
        "MAX_IMAGE_WORKERS": fastapi_settings.max_image_workers,
        "DEFAULT_ASPECT_RATIO": fastapi_settings.default_aspect_ratio,
        "DEFAULT_RESOLUTION": fastapi_settings.default_resolution,
        "OUTPUT_LANGUAGE": fastapi_settings.output_language,
        "UPLOAD_FOLDER": fastapi_settings.upload_folder,
        "HTML_CONTINUITY_MODE": fastapi_settings.html_continuity_mode,
        "HTML_DESCRIPTION_BATCH_SIZE": fastapi_settings.html_description_batch_size,
        "HTML_CHAPTER_PARALLELISM": fastapi_settings.html_chapter_parallelism,
        "HTML_FIRST_PASS_THINKING_BUDGET": fastapi_settings.html_first_pass_thinking_budget,
        "HTML_REWRITE_THINKING_BUDGET": fastapi_settings.html_rewrite_thinking_budget,
        "HTML_REWRITE_TIMEOUT_SECONDS": fastapi_settings.html_rewrite_timeout_seconds,
        "IMAGE_PROMPT_REWRITE_ENABLED": fastapi_settings.image_prompt_rewrite_enabled,
        "IMAGE_PROMPT_REWRITE_MODEL": fastapi_settings.image_prompt_rewrite_model,
        "IMAGE_PROMPT_REWRITE_MAX_SLOTS": fastapi_settings.image_prompt_rewrite_max_slots,
        "IMAGE_PROMPT_REWRITE_BATCH_SIZE": fastapi_settings.image_prompt_rewrite_batch_size,
        "IMAGE_PROMPT_REWRITE_THINKING_BUDGET": fastapi_settings.image_prompt_rewrite_thinking_budget,
        "INPAINTING_PROVIDER": fastapi_settings.inpainting_provider,
        "BAIDU_OCR_API_KEY": fastapi_settings.baidu_ocr_api_key,
        "BAIDU_OCR_API_SECRET": fastapi_settings.baidu_ocr_api_secret,
        "VOLCENGINE_ACCESS_KEY": fastapi_settings.volcengine_access_key,
        "VOLCENGINE_SECRET_KEY": fastapi_settings.volcengine_secret_key,
        "VOLCENGINE_INPAINTING_TIMEOUT": fastapi_settings.volcengine_inpainting_timeout,
        "VOLCENGINE_INPAINTING_MAX_RETRIES": fastapi_settings.volcengine_inpainting_max_retries,
    }


def load_runtime_config() -> dict[str, Any]:
    """Load env defaults plus DB-backed runtime overrides."""
    install_runtime_orm()
    config = _base_runtime_config()

    try:
        from models.settings import Settings as DbSettings

        row = _scoped_session().query(DbSettings).first()
    except Exception:
        _scoped_session.remove()
        return config

    if row:
        if row.ai_provider_format:
            config["AI_PROVIDER_FORMAT"] = row.ai_provider_format
        if row.api_base_url is not None:
            config["GOOGLE_API_BASE"] = row.api_base_url or ""
            config["OPENAI_API_BASE"] = row.api_base_url or ""
        if row.api_key is not None:
            config["GOOGLE_API_KEY"] = row.api_key or ""
            config["OPENAI_API_KEY"] = row.api_key or ""
        if row.image_resolution:
            config["DEFAULT_RESOLUTION"] = row.image_resolution
        if row.image_aspect_ratio:
            config["DEFAULT_ASPECT_RATIO"] = row.image_aspect_ratio
        if row.max_description_workers:
            config["MAX_DESCRIPTION_WORKERS"] = int(row.max_description_workers)
        if row.max_image_workers:
            config["MAX_IMAGE_WORKERS"] = int(row.max_image_workers)
        if row.text_model:
            config["TEXT_MODEL"] = row.text_model
        if row.image_model:
            config["IMAGE_MODEL"] = row.image_model
        if row.mineru_api_base:
            config["MINERU_API_BASE"] = row.mineru_api_base
        if row.mineru_token:
            config["MINERU_TOKEN"] = row.mineru_token
        if row.image_caption_model:
            config["IMAGE_CAPTION_MODEL"] = row.image_caption_model
        if row.output_language:
            config["OUTPUT_LANGUAGE"] = row.output_language

    _scoped_session.remove()
    return config


def get_runtime_config() -> dict[str, Any]:
    config = _runtime_config_var.get()
    if config is not None:
        return config
    return load_runtime_config()


def get_config_value(key: str, default: Any = None) -> Any:
    config = get_runtime_config()
    if key in config:
        return config[key]
    return default


@contextmanager
def runtime_context(config: dict[str, Any] | None = None):
    """Install thread-local session/config for sync background work."""
    install_runtime_orm()
    resolved_config = config or load_runtime_config()
    token = _runtime_config_var.set(resolved_config)
    try:
        yield resolved_config
    except Exception:
        _scoped_session.rollback()
        raise
    finally:
        _scoped_session.remove()
        _runtime_config_var.reset(token)
