"""
AI Providers factory module

Provides factory functions to get the appropriate text/image generation providers
based on environment configuration.

Configuration Priority (highest to lowest):
    1. Database settings (via Flask app.config)
    2. Environment variables (.env file)
    3. Default values

Environment Variables:
    AI_PROVIDER_FORMAT: "gemini" (default), "openai", or "vertex"

    For Gemini format (Google GenAI SDK):
        GOOGLE_API_KEY: API key
        GOOGLE_API_BASE: API base URL (e.g., https://aihubmix.com/gemini)

    For OpenAI format:
        OPENAI_API_KEY: API key
        OPENAI_API_BASE: API base URL (e.g., https://aihubmix.com/v1)

    For Vertex AI format (Google Cloud):
        VERTEX_PROJECT_ID: GCP project ID
        VERTEX_LOCATION: GCP region (default: us-central1)
        GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON file
"""
import os
import logging
from typing import Dict, Any

from .text import TextProvider, GenAITextProvider, OpenAITextProvider
from .image import ImageProvider, GenAIImageProvider, OpenAIImageProvider

logger = logging.getLogger(__name__)

__all__ = [
    'TextProvider', 'GenAITextProvider', 'OpenAITextProvider',
    'ImageProvider', 'GenAIImageProvider', 'OpenAIImageProvider',
    'get_text_provider', 'get_image_provider', 'get_provider_format'
]


def get_provider_format() -> str:
    """
    Get the configured AI provider format

    Priority:
        1. Flask app.config['AI_PROVIDER_FORMAT'] (from database settings)
        2. Environment variable AI_PROVIDER_FORMAT
        3. Default: 'gemini'

    Returns:
        "gemini", "openai", or "vertex"
    """
    # Try to get from Flask app config first (database settings)
    try:
        from flask import current_app
        if current_app and hasattr(current_app, 'config'):
            config_value = current_app.config.get('AI_PROVIDER_FORMAT')
            if config_value:
                return str(config_value).lower()
    except RuntimeError:
        # Not in Flask application context
        pass
    
    # Fallback to environment variable
    return os.getenv('AI_PROVIDER_FORMAT', 'gemini').lower()


def _get_config_value(key: str, default: str = None) -> str:
    """
    Helper to get config value with priority: app.config > env var > default
    """
    try:
        from flask import current_app
        if current_app and hasattr(current_app, 'config'):
            # Check if key exists in config (even if value is empty string)
            # This allows database settings to override env vars even with empty values
            if key in current_app.config:
                config_value = current_app.config.get(key)
                # Return the value even if it's empty string (user explicitly set it)
                if config_value is not None:
                    logger.debug(f"[CONFIG] Using {key} from app.config")
                    return str(config_value)
            else:
                logger.debug(f"[CONFIG] Key {key} not found in app.config, checking env var")
    except RuntimeError as e:
        # Not in Flask application context, fallback to env var
        logger.debug(f"[CONFIG] Not in Flask context for {key}: {e}")
    # Fallback to environment variable or default
    env_value = os.getenv(key)
    if env_value is not None:
        logger.debug(f"[CONFIG] Using {key} from environment")
        return env_value
    if default is not None:
        logger.debug(f"[CONFIG] Using {key} default: {default}")
        return default
    logger.debug(f"[CONFIG] No value found for {key}, returning None")
    return None


def _get_provider_config() -> Dict[str, Any]:
    """
    Get provider configuration based on AI_PROVIDER_FORMAT

    Priority for API keys/base URLs:
        1. Flask app.config (from database settings)
        2. Environment variables
        3. Default values

    Returns:
        Dict with keys:
            - format: "gemini", "openai", or "vertex"
            - For gemini/openai: api_key, api_base
            - For vertex: project_id, location

    Raises:
        ValueError: If required configuration is not set
    """
    provider_format = get_provider_format()

    if provider_format == 'vertex':
        # Vertex AI format
        project_id = _get_config_value('VERTEX_PROJECT_ID')
        location = _get_config_value('VERTEX_LOCATION', 'us-central1')

        if not project_id:
            raise ValueError(
                "VERTEX_PROJECT_ID is required when AI_PROVIDER_FORMAT=vertex. "
                "Also ensure GOOGLE_APPLICATION_CREDENTIALS is set to point to your service account JSON file."
            )

        logger.info(f"Provider config - format: vertex, project: {project_id}, location: {location}")

        return {
            'format': 'vertex',
            'project_id': project_id,
            'location': location,
        }

    elif provider_format == 'openai':
        api_key = _get_config_value('OPENAI_API_KEY') or _get_config_value('GOOGLE_API_KEY')
        api_base = _get_config_value('OPENAI_API_BASE', 'https://aihubmix.com/v1')

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY or GOOGLE_API_KEY (from database settings or environment) is required when AI_PROVIDER_FORMAT=openai."
            )

        logger.info(f"Provider config - format: openai, api_base: {api_base}")

        return {
            'format': 'openai',
            'api_key': api_key,
            'api_base': api_base,
        }

    else:
        # Gemini format (default)
        api_key = _get_config_value('GOOGLE_API_KEY')
        api_base = _get_config_value('GOOGLE_API_BASE')

        logger.info(f"Provider config - format: gemini, api_base: {api_base}, api_key: {'***' if api_key else 'None'}")

        if not api_key:
            raise ValueError("GOOGLE_API_KEY (from database settings or environment) is required")

        return {
            'format': 'gemini',
            'api_key': api_key,
            'api_base': api_base,
        }


def get_text_provider(model: str = "gemini-3-flash-preview") -> TextProvider:
    """
    Factory function to get text generation provider based on configuration

    Args:
        model: Model name to use

    Returns:
        TextProvider instance (GenAITextProvider or OpenAITextProvider)
    """
    config = _get_provider_config()
    provider_format = config['format']

    if provider_format == 'openai':
        logger.info(f"Using OpenAI format for text generation, model: {model}")
        return OpenAITextProvider(api_key=config['api_key'], api_base=config['api_base'], model=model)
    elif provider_format == 'vertex':
        logger.info(f"Using Vertex AI for text generation, model: {model}, project: {config['project_id']}")
        return GenAITextProvider(
            model=model,
            vertexai=True,
            project_id=config['project_id'],
            location=config['location']
        )
    else:
        logger.info(f"Using Gemini format for text generation, model: {model}")
        return GenAITextProvider(api_key=config['api_key'], api_base=config['api_base'], model=model)


def get_image_provider(model: str = "gemini-3-pro-image-preview") -> ImageProvider:
    """
    Factory function to get image generation provider based on configuration

    Args:
        model: Model name to use

    Returns:
        ImageProvider instance (GenAIImageProvider, OpenAIImageProvider, or QwenImageProvider)

    Note:
        - If IMAGE_PROVIDER=qwen, uses Aliyun DashScope QwenImageProvider
        - OpenAI format does NOT support 4K resolution, only 1K is available.
        - If you need higher resolution images, use Gemini or Vertex AI format.
    """
    # #region agent log - Check IMAGE_PROVIDER env
    image_provider_type = _get_config_value('IMAGE_PROVIDER', 'auto').lower()
    logger.info(f"[IMAGE_PROVIDER] Configured type: {image_provider_type}")
    # #endregion
    
    # 优先检查 IMAGE_PROVIDER 环境变量，支持独立的图片生成服务
    if image_provider_type == 'qwen':
        logger.info(f"Using Aliyun DashScope QwenImageProvider for image generation")
        # 使用适配器包装 QwenImageProvider
        return QwenImageProviderAdapter()
    elif image_provider_type == 'mock':
        logger.info(f"Using MockImageProvider for testing")
        return MockImageProviderAdapter()
    
    # 默认使用原来的逻辑
    config = _get_provider_config()
    provider_format = config['format']

    if provider_format == 'openai':
        logger.info(f"Using OpenAI format for image generation, model: {model}")
        logger.warning("OpenAI format only supports 1K resolution, 4K is not available")
        return OpenAIImageProvider(api_key=config['api_key'], api_base=config['api_base'], model=model)
    elif provider_format == 'vertex':
        logger.info(f"Using Vertex AI for image generation, model: {model}, project: {config['project_id']}")
        return GenAIImageProvider(
            model=model,
            vertexai=True,
            project_id=config['project_id'],
            location=config['location']
        )
    else:
        logger.info(f"Using Gemini format for image generation, model: {model}")
        return GenAIImageProvider(api_key=config['api_key'], api_base=config['api_base'], model=model)


# ============================================================================
# 适配器类：让新的图片生成提供者符合原有的 ImageProvider 接口
# ============================================================================

class QwenImageProviderAdapter(ImageProvider):
    """
    适配器：将 QwenImageProvider 适配到原有的 ImageProvider 接口
    """
    
    def __init__(self):
        # image_providers.py 在 services/ 目录下
        import sys
        from pathlib import Path
        services_dir = Path(__file__).parent.parent
        if str(services_dir) not in sys.path:
            sys.path.insert(0, str(services_dir))
        from image_providers import QwenImageProvider as QwenProvider
        self._provider = QwenProvider()
    
    def generate_image(
        self,
        prompt: str,
        ref_images = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K",
        enable_thinking: bool = False,
        thinking_budget: int = 0
    ):
        """
        生成图片，适配原有接口
        """
        import requests
        from PIL import Image
        from io import BytesIO
        
        # 将分辨率和宽高比转换为尺寸
        size = self._get_size_from_params(aspect_ratio, resolution)
        
        logger.info(f"[QwenAdapter] Generating image with size={size}")
        
        # 调用底层 provider
        result = self._provider.generate(prompt=prompt, size=size)
        
        if result.get("status") == "success" and result.get("image_url"):
            # 下载图片并返回 PIL Image
            try:
                response = requests.get(result["image_url"], timeout=60)
                response.raise_for_status()
                return Image.open(BytesIO(response.content))
            except Exception as e:
                logger.error(f"[QwenAdapter] Failed to download image: {e}")
                return None
        else:
            logger.error(f"[QwenAdapter] Image generation failed: {result.get('error')}")
            return None
    
    def _get_size_from_params(self, aspect_ratio: str, resolution: str) -> str:
        """根据宽高比和分辨率计算尺寸"""
        # 百炼支持的尺寸
        size_map = {
            "16:9": {"2K": "1792*1024", "1K": "1280*720", "4K": "1792*1024"},
            "9:16": {"2K": "1024*1792", "1K": "720*1280", "4K": "1024*1792"},
            "1:1": {"2K": "1024*1024", "1K": "1024*1024", "4K": "1024*1024"},
            "4:3": {"2K": "1365*1024", "1K": "1024*768", "4K": "1365*1024"},
            "3:4": {"2K": "1024*1365", "1K": "768*1024", "4K": "1024*1365"},
        }
        
        ratio_sizes = size_map.get(aspect_ratio, size_map["16:9"])
        return ratio_sizes.get(resolution, ratio_sizes["2K"])


class MockImageProviderAdapter(ImageProvider):
    """
    Mock 适配器：用于测试，返回占位图片
    """
    
    def generate_image(
        self,
        prompt: str,
        ref_images = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K",
        enable_thinking: bool = False,
        thinking_budget: int = 0
    ):
        """返回一个灰色占位图片"""
        from PIL import Image
        
        # 创建一个灰色占位图片
        size_map = {
            "16:9": (1920, 1080),
            "9:16": (1080, 1920),
            "1:1": (1024, 1024),
            "4:3": (1600, 1200),
        }
        size = size_map.get(aspect_ratio, (1920, 1080))
        
        # 创建灰色图片
        img = Image.new('RGB', size, color=(128, 128, 128))
        logger.info(f"[MockAdapter] Generated placeholder image {size}")
        return img
