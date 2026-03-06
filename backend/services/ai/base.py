"""
AI Base - Core AI capabilities and JSON parsing utilities.

Extracted from ai_service.py lines 1-399.
Contains: AIService.__init__, JSON parsing/cleanup, image download helpers,
           ProjectContext data class.

This is the foundation that all other AI service modules build upon.
"""
import json
import re
import logging
import asyncio
import inspect
import requests
from typing import List, Dict, Optional, Union, Any

from PIL import Image
from tenacity import retry, stop_after_attempt, retry_if_exception_type

from services.ai_providers import get_text_provider, get_image_provider, TextProvider, ImageProvider
from config_fastapi import settings as fastapi_settings
from services.runtime_state import get_config_value

logger = logging.getLogger(__name__)


class ProjectContext:
    """项目上下文数据类，统一管理 AI 需要的所有项目信息"""

    def __init__(self, project_or_dict, reference_files_content: Optional[List[Dict[str, str]]] = None):
        """
        Args:
            project_or_dict: 项目对象（Project model）或项目字典（project.to_dict()）
            reference_files_content: 参考文件内容列表
        """
        if hasattr(project_or_dict, 'idea_prompt'):
            self.idea_prompt = project_or_dict.idea_prompt
            self.outline_text = project_or_dict.outline_text
            self.description_text = project_or_dict.description_text
            self.creation_type = project_or_dict.creation_type or 'idea'
            self.scheme_id = getattr(project_or_dict, 'scheme_id', None) or 'edu_dark'
        else:
            self.idea_prompt = project_or_dict.get('idea_prompt')
            self.outline_text = project_or_dict.get('outline_text')
            self.description_text = project_or_dict.get('description_text')
            self.creation_type = project_or_dict.get('creation_type', 'idea')
            self.scheme_id = project_or_dict.get('scheme_id') or 'edu_dark'

        self.reference_files_content = reference_files_content or []

    def to_dict(self) -> Dict:
        return {
            'idea_prompt': self.idea_prompt,
            'outline_text': self.outline_text,
            'description_text': self.description_text,
            'creation_type': self.creation_type,
            'scheme_id': self.scheme_id,
            'reference_files_content': self.reference_files_content
        }


class AIBase:
    """
    Core AI capabilities shared by all service modules.

    Provides:
    - Provider initialization (text + image)
    - JSON generation with retry and robust parsing
    - Image download and markdown image helpers
    """

    def __init__(self, text_provider: TextProvider = None, image_provider: ImageProvider = None):
        self.text_model = get_config_value("TEXT_MODEL", fastapi_settings.text_model)
        self.image_model = get_config_value("IMAGE_MODEL", fastapi_settings.image_model)

        self.text_provider = text_provider or get_text_provider(model=self.text_model)
        self.image_provider = image_provider or get_image_provider(model=self.image_model)

    async def run_in_thread(self, method_name: str, *args, **kwargs):
        """Async wrapper for sync AI methods during the migration."""
        method = getattr(self, method_name)
        return await asyncio.to_thread(method, *args, **kwargs)

    async def call_async(self, method_name: str, *args, **kwargs):
        """
        Invoke an async-aware AI service method.

        Resolution order:
        1. `<method_name>_async`
        2. coroutine function stored under `method_name`
        3. synchronous fallback in a worker thread
        """
        async_method = getattr(self, f"{method_name}_async", None)
        if async_method is not None:
            return await async_method(*args, **kwargs)

        method = getattr(self, method_name)
        if inspect.iscoroutinefunction(method):
            return await method(*args, **kwargs)
        return await asyncio.to_thread(method, *args, **kwargs)

    # ── JSON Parsing Utilities ───────────────────────────────────

    @staticmethod
    def _strip_markdown_json_fence(text: str) -> str:
        """Remove optional ```json ... ``` wrappers."""
        if not text:
            return ""
        value = text.strip()
        fenced = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", value, flags=re.IGNORECASE)
        if fenced:
            return fenced.group(1).strip()
        return value

    @staticmethod
    def _extract_json_segment(text: str) -> str:
        """Extract the most likely JSON segment from model output."""
        if not text:
            return ""
        value = text.strip()
        first_obj = value.find('{')
        first_arr = value.find('[')
        starts = [idx for idx in (first_obj, first_arr) if idx >= 0]
        if not starts:
            return value
        start = min(starts)
        end_obj = value.rfind('}')
        end_arr = value.rfind(']')
        end = max(end_obj, end_arr)
        if end >= start:
            return value[start:end + 1].strip()
        return value[start:].strip()

    @staticmethod
    def _escape_json_control_chars_in_string(raw_json: str) -> str:
        """Escape raw control chars inside JSON strings (LLM formatting fix)."""
        if not raw_json:
            return raw_json
        result = []
        in_string = False
        escaped = False
        for ch in raw_json:
            if escaped:
                result.append(ch)
                escaped = False
                continue
            if ch == '\\':
                result.append(ch)
                escaped = True
                continue
            if ch == '"':
                result.append(ch)
                in_string = not in_string
                continue
            if in_string and ch == '\n':
                result.append('\\n')
                continue
            if in_string and ch == '\r':
                result.append('\\r')
                continue
            if in_string and ch == '\t':
                result.append('\\t')
                continue
            result.append(ch)
        return ''.join(result)

    @classmethod
    def _normalize_json_text_for_parse(cls, text: str) -> str:
        """Normalize model output to maximize one-shot JSON parse success."""
        value = cls._strip_markdown_json_fence(text)
        value = cls._extract_json_segment(value)
        value = cls._escape_json_control_chars_in_string(value)
        value = re.sub(r',(\s*[}\]])', r'\1', value)
        return value.strip()

    @staticmethod
    def _build_json_parse_candidates(normalized_text: str) -> List[str]:
        """Build a short candidate list for tolerant JSON parsing."""
        candidates = [normalized_text]
        brace_fixed = normalized_text.replace('{{', '{').replace('}}', '}')
        if brace_fixed != normalized_text:
            candidates.append(brace_fixed)
        return candidates

    # ── JSON Generation (with retry) ────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((json.JSONDecodeError, ValueError, Exception)),
        reraise=True
    )
    def generate_json(self, prompt: str, thinking_budget: int = 1000) -> Union[Dict, List]:
        """Generate and parse JSON with automatic retry on parse failure."""
        response_text = self.text_provider.generate_text(prompt, thinking_budget=thinking_budget)
        cleaned_text = self._normalize_json_text_for_parse(response_text)

        last_err = None
        for candidate in self._build_json_parse_candidates(cleaned_text):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError as e:
                last_err = e

        logger.warning(f"JSON解析失败，将重新生成。原始文本: {cleaned_text[:200]}... 错误: {str(last_err)}")
        raise last_err

    @retry(
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((json.JSONDecodeError, ValueError, Exception)),
        reraise=True
    )
    async def generate_json_async(self, prompt: str, thinking_budget: int = 1000) -> Union[Dict, List]:
        """Async JSON generation using provider-native async text calls."""
        response_text = await self.text_provider.generate_text_async(
            prompt,
            thinking_budget=thinking_budget,
        )
        cleaned_text = self._normalize_json_text_for_parse(response_text)

        last_err = None
        for candidate in self._build_json_parse_candidates(cleaned_text):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError as e:
                last_err = e

        logger.warning(f"JSON解析失败，将重新生成。原始文本: {cleaned_text[:200]}... 错误: {str(last_err)}")
        raise last_err

    @retry(
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((json.JSONDecodeError, ValueError, Exception)),
        reraise=True
    )
    def generate_json_with_image(self, prompt: str, image_path: str, thinking_budget: int = 1000) -> Union[Dict, List]:
        """Generate and parse JSON with image input and automatic retry."""
        if hasattr(self.text_provider, 'generate_with_image'):
            response_text = self.text_provider.generate_with_image(
                prompt=prompt, image_path=image_path, thinking_budget=thinking_budget
            )
        elif hasattr(self.text_provider, 'generate_text_with_images'):
            response_text = self.text_provider.generate_text_with_images(
                prompt=prompt, images=[image_path], thinking_budget=thinking_budget
            )
        else:
            raise ValueError("text_provider 不支持图片输入")

        cleaned_text = self._normalize_json_text_for_parse(response_text)

        last_err = None
        for candidate in self._build_json_parse_candidates(cleaned_text):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError as e:
                last_err = e

        logger.warning(f"JSON解析失败（带图片），将重新生成。原始文本: {cleaned_text[:200]}... 错误: {str(last_err)}")
        raise last_err

    @retry(
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((json.JSONDecodeError, ValueError, Exception)),
        reraise=True
    )
    async def generate_json_with_image_async(self, prompt: str, image_path: str, thinking_budget: int = 1000) -> Union[Dict, List]:
        """Async multimodal JSON generation using provider-native async calls."""
        if hasattr(self.text_provider, 'generate_with_image_async'):
            response_text = await self.text_provider.generate_with_image_async(
                prompt=prompt, image_path=image_path, thinking_budget=thinking_budget
            )
        elif hasattr(self.text_provider, 'generate_text_with_images_async'):
            response_text = await self.text_provider.generate_text_with_images_async(
                prompt=prompt, images=[image_path], thinking_budget=thinking_budget
            )
        else:
            raise ValueError("text_provider 不支持图片输入")

        cleaned_text = self._normalize_json_text_for_parse(response_text)

        last_err = None
        for candidate in self._build_json_parse_candidates(cleaned_text):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError as e:
                last_err = e

        logger.warning(f"JSON解析失败（带图片），将重新生成。原始文本: {cleaned_text[:200]}... 错误: {str(last_err)}")
        raise last_err

    # ── Image & Markdown Helpers ────────────────────────────────

    @staticmethod
    def _convert_mineru_path_to_local(mineru_path: str) -> Optional[str]:
        """Convert /files/mineru/... URL to local filesystem path."""
        from utils.path_utils import find_mineru_file_with_prefix
        matched_path = find_mineru_file_with_prefix(mineru_path)
        return str(matched_path) if matched_path else None

    @staticmethod
    def download_image_from_url(url: str) -> Optional[Image.Image]:
        """Download image from URL and return PIL Image object."""
        try:
            logger.debug(f"Downloading image from URL: {url}")
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            image = Image.open(response.raw)
            image.load()
            logger.debug(f"Successfully downloaded image: {image.size}, {image.mode}")
            return image
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {str(e)}")
            return None

    @staticmethod
    def extract_image_urls_from_markdown(text: str) -> List[str]:
        """Extract image URLs from markdown text."""
        if not text:
            return []
        pattern = r'!\[.*?\]\((.*?)\)'
        matches = re.findall(pattern, text)
        urls = []
        for url in matches:
            url = url.strip()
            if url and (url.startswith('http://') or url.startswith('https://') or url.startswith('/files/')):
                urls.append(url)
        return urls

    @staticmethod
    def remove_markdown_images(text: str) -> str:
        """Remove markdown image links, keeping alt text."""
        if not text:
            return text

        def replace_image(match):
            alt_text = match.group(1).strip()
            return alt_text if alt_text else ''

        pattern = r'!\[(.*?)\]\([^\)]+\)'
        cleaned_text = re.sub(pattern, replace_image, text)
        cleaned_text = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned_text)
        return cleaned_text
