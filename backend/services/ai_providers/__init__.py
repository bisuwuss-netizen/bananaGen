"""AI provider factory (OpenAI-first runtime)."""

from __future__ import annotations

import os
import logging

from services.runtime_state import get_config_value

from .text import TextProvider, OpenAITextProvider
from .image import (
    ImageProvider,
    OpenAIImageProvider,
    DashScopeImageProvider,
    QwenImageProvider,
)

logger = logging.getLogger(__name__)

__all__ = [
    "TextProvider",
    "OpenAITextProvider",
    "ImageProvider",
    "OpenAIImageProvider",
    "DashScopeImageProvider",
    "QwenImageProvider",
    "get_text_provider",
    "get_image_provider",
    "get_provider_format",
]


def get_provider_format() -> str:
    """Provider format is fixed to OpenAI-compatible mode."""
    return "openai"


def _cfg(key: str, default: str | None = None) -> str | None:
    value = get_config_value(key, None)
    if value is None:
        return default
    return str(value)


def _openai_key() -> str:
    api_key = _cfg("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is required")
    return api_key


def get_text_provider(model: str = "gpt-4.1-mini") -> TextProvider:
    """Create OpenAI text provider."""
    api_key = _openai_key()
    api_base = _cfg("OPENAI_API_BASE", os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1"))
    logger.info("Using OpenAI text provider, model=%s", model)
    return OpenAITextProvider(api_key=api_key, api_base=api_base, model=model)


def get_image_provider(model: str = "wanx-v1") -> ImageProvider:
    """Create image provider based on model family."""
    model_lower = (model or "").lower()
    api_base = _cfg("OPENAI_API_BASE", os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1"))

    if model_lower.startswith("qwen-image"):
        api_key = _cfg("DASHSCOPE_API_KEY") or _cfg("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("DASHSCOPE_API_KEY or OPENAI_API_KEY is required for qwen-image models")
        dashscope_base = _cfg("DASHSCOPE_API_BASE", os.getenv("DASHSCOPE_API_BASE", "https://dashscope.aliyuncs.com/api/v1"))
        return QwenImageProvider(api_key=api_key, api_base=dashscope_base, model=model)

    if model_lower.startswith("wanx"):
        api_key = _cfg("DASHSCOPE_API_KEY") or _cfg("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("DASHSCOPE_API_KEY or OPENAI_API_KEY is required for wanx models")
        dashscope_base = _cfg("DASHSCOPE_API_BASE", os.getenv("DASHSCOPE_API_BASE", "https://dashscope.aliyuncs.com/api/v1"))
        return DashScopeImageProvider(api_key=api_key, api_base=dashscope_base, model=model)

    api_key = _openai_key()
    logger.info("Using OpenAI image provider, model=%s", model)
    return OpenAIImageProvider(api_key=api_key, api_base=api_base, model=model)
