"""
Qwen image generation provider (DashScope native API).

Qwen-Image text-to-image is served by DashScope native endpoint:
POST /api/v1/services/aigc/multimodal-generation/generation
"""
import base64
import asyncio
import logging
import time
from io import BytesIO
from typing import Optional, List

import httpx
import requests
from PIL import Image

from .base import ImageProvider
from config import get_config

logger = logging.getLogger(__name__)


class QwenImageProvider(ImageProvider):
    """Generate images with qwen-image* models via DashScope native API."""

    DEFAULT_API_BASE = "https://dashscope.aliyuncs.com/api/v1"

    def __init__(self, api_key: str = None, api_base: str = None, model: str = "qwen-image-2.0-pro"):
        cfg = get_config()
        self.api_key = api_key or cfg.DASHSCOPE_API_KEY or cfg.OPENAI_API_KEY
        self.api_base = self._normalize_api_base(
            api_base
            or cfg.DASHSCOPE_API_BASE
            or cfg.OPENAI_API_BASE
            or self.DEFAULT_API_BASE
        )
        self.model = model
        self.timeout = float(cfg.OPENAI_TIMEOUT or 300.0)
        self.max_retries = int(cfg.OPENAI_MAX_RETRIES or 2)
        self.rate_limit_backoff_seconds = float(
            getattr(cfg, "QWEN_IMAGE_MIN_INTERVAL_SECONDS", 8.0) or 8.0
        )

        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY / OPENAI_API_KEY is required for qwen-image models")

        logger.info(f"Initialized Qwen image provider with model: {self.model}, base: {self.api_base}")

    @classmethod
    def _normalize_api_base(cls, api_base: str) -> str:
        """
        Normalize base URL to DashScope native /api/v1 endpoint.
        Compatible-mode base is not valid for qwen-image native API.
        """
        base = (api_base or cls.DEFAULT_API_BASE).strip().rstrip("/")

        # Most common case: convert compatible-mode to native API.
        if "/compatible-mode/v1" in base:
            return base.replace("/compatible-mode/v1", "/api/v1")

        # If user passed OpenAI style /v1 on DashScope domain, normalize it.
        if "dashscope.aliyuncs.com" in base or "dashscope-intl.aliyuncs.com" in base:
            if base.endswith("/v1") and not base.endswith("/api/v1"):
                return base[:-3] + "/api/v1"

        return base

    @staticmethod
    def _size_for(aspect_ratio: str, resolution: str) -> str:
        """
        Map UI ratio/resolution to DashScope size string: "W*H".
        Keep values in qwen-image-2.0 supported range.
        """
        ratio = (aspect_ratio or "16:9").strip()
        hi_res = (resolution or "2K").upper() != "1K"

        if hi_res:
            sizes = {
                "16:9": "1792*1024",
                "9:16": "1024*1792",
                "1:1": "1536*1536",
                "4:3": "1536*1152",
                "3:4": "1152*1536",
            }
        else:
            sizes = {
                "16:9": "1280*720",
                "9:16": "720*1280",
                "1:1": "1024*1024",
                "4:3": "1024*768",
                "3:4": "768*1024",
            }

        return sizes.get(ratio, "1024*1024")

    def _build_payload(self, prompt: str, size: str) -> dict:
        return {
            "model": self.model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}],
                    }
                ]
            },
            "parameters": {
                "size": size,
                "n": 1,
                "watermark": False,
                "prompt_extend": True,
            },
        }

    @staticmethod
    def _extract_image_url(result: dict) -> Optional[str]:
        """
        Parse image URL from DashScope native response:
        output.choices[0].message.content[0].image
        """
        output = result.get("output") or {}
        choices = output.get("choices") or []
        if not choices:
            return None

        message = (choices[0] or {}).get("message") or {}
        content = message.get("content") or []
        for item in content:
            if isinstance(item, dict) and item.get("image"):
                return item["image"]
        return None

    def _download_image(self, image_url: str) -> Image.Image:
        # Some gateways may return data URL directly.
        if image_url.startswith("data:image"):
            b64 = image_url.split(",", 1)[1]
            image_data = base64.b64decode(b64)
            image = Image.open(BytesIO(image_data))
            image.load()
            return image

        response = requests.get(image_url, timeout=min(self.timeout, 120))
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        image.load()
        return image

    def _retry_delay_seconds(self, error: Exception, attempt: int) -> float:
        message = str(error or "").lower()
        if (
            "429" in message
            or "throttling.ratequota" in message
            or "rate limit" in message
            or "limit_requests" in message
        ):
            return max(1.0, self.rate_limit_backoff_seconds)
        return float(min(2 ** attempt, 5))

    async def _download_image_async(self, image_url: str) -> Image.Image:
        if image_url.startswith("data:image"):
            b64 = image_url.split(",", 1)[1]
            image_data = base64.b64decode(b64)
            image = Image.open(BytesIO(image_data))
            image.load()
            return image

        async with httpx.AsyncClient(timeout=min(self.timeout, 120), follow_redirects=True) as client:
            response = await client.get(image_url)
            response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        image.load()
        return image

    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K",
    ) -> Optional[Image.Image]:
        """
        Generate image through DashScope native qwen-image API.
        """
        if ref_images:
            logger.warning(
                f"{self.model} text-to-image path ignores reference images, received {len(ref_images)} refs."
            )

        url = f"{self.api_base}/services/aigc/multimodal-generation/generation"
        size = self._size_for(aspect_ratio, resolution)
        payload = self._build_payload(prompt=prompt, size=size)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                logger.info(f"Calling Qwen image API: model={self.model}, size={size}, attempt={attempt + 1}")
                resp = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=min(self.timeout, 180),
                )

                if resp.status_code != 200:
                    msg = resp.text
                    try:
                        err_json = resp.json()
                        err_info = err_json.get("error") or {}
                        if err_info:
                            msg = f"{err_info.get('code')}: {err_info.get('message')}"
                    except Exception:
                        pass
                    raise ValueError(f"Qwen image API failed: HTTP {resp.status_code}, {msg}")

                result = resp.json()
                image_url = self._extract_image_url(result)
                if not image_url:
                    raise ValueError(f"No image URL found in response: {result}")

                logger.info("Qwen image API succeeded, downloading image")
                return self._download_image(image_url)
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Qwen image API attempt {attempt + 1}/{self.max_retries + 1} failed: "
                    f"{type(e).__name__}: {e}"
                )
                if attempt < self.max_retries:
                    delay_seconds = self._retry_delay_seconds(e, attempt)
                    if delay_seconds > 0:
                        logger.info(
                            "Qwen image API retry cooling down for %.1fs before next attempt",
                            delay_seconds,
                        )
                        time.sleep(delay_seconds)

        raise Exception(f"Error generating image with Qwen provider (model={self.model}): {last_error}")

    async def generate_image_async(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K",
    ) -> Optional[Image.Image]:
        """
        Async image generation through DashScope native qwen-image API.
        """
        if ref_images:
            logger.warning(
                f"{self.model} text-to-image path ignores reference images, received {len(ref_images)} refs."
            )

        url = f"{self.api_base}/services/aigc/multimodal-generation/generation"
        size = self._size_for(aspect_ratio, resolution)
        payload = self._build_payload(prompt=prompt, size=size)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        last_error = None
        async with httpx.AsyncClient(timeout=min(self.timeout, 180), follow_redirects=True) as client:
            for attempt in range(self.max_retries + 1):
                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code != 200:
                        msg = resp.text
                        try:
                            err_json = resp.json()
                            err_info = err_json.get("error") or {}
                            if err_info:
                                msg = f"{err_info.get('code')}: {err_info.get('message')}"
                        except Exception:
                            pass
                        raise ValueError(f"Qwen image API failed: HTTP {resp.status_code}, {msg}")

                    result = resp.json()
                    image_url = self._extract_image_url(result)
                    if not image_url:
                        raise ValueError(f"No image URL found in response: {result}")
                    return await self._download_image_async(image_url)
                except Exception as e:
                    last_error = e
                    logger.warning(
                        f"Qwen image API attempt {attempt + 1}/{self.max_retries + 1} failed: "
                        f"{type(e).__name__}: {e}"
                    )
                    if attempt < self.max_retries:
                        delay_seconds = self._retry_delay_seconds(e, attempt)
                        if delay_seconds > 0:
                            logger.info(
                                "Qwen image API retry cooling down for %.1fs before next attempt",
                                delay_seconds,
                            )
                            await asyncio.sleep(delay_seconds)

        raise Exception(f"Error generating image with Qwen provider (model={self.model}): {last_error}")
