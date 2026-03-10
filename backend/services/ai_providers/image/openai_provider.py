"""
OpenAI SDK implementation for image generation
"""
import logging
import base64
import re
import requests
from io import BytesIO
from typing import Optional, List
import httpx
from openai import AsyncOpenAI, OpenAI
from PIL import Image
from .base import ImageProvider
from config import get_config

logger = logging.getLogger(__name__)


class OpenAIImageProvider(ImageProvider):
    """Image generation using OpenAI SDK."""
    
    def __init__(self, api_key: str, api_base: str = None, model: str = "gpt-image-1"):
        """
        Initialize OpenAI image provider
        
        Args:
            api_key: API key
            api_base: API base URL (e.g., https://aihubmix.com/v1)
            model: Model name to use
        """
        timeout = get_config().OPENAI_TIMEOUT
        max_retries = get_config().OPENAI_MAX_RETRIES
        self.client = OpenAI(
            api_key=api_key,
            base_url=api_base,
            timeout=timeout,
            max_retries=max_retries,
        )
        self.async_client = AsyncOpenAI(
            api_key=api_key,
            base_url=api_base,
            timeout=timeout,
            max_retries=max_retries,
        )
        self.model = model

    def _is_qwen_image_model(self) -> bool:
        """Whether current model is Qwen image generation family."""
        return "qwen-image" in (self.model or "").lower()

    def _aspect_ratio_to_size(self, aspect_ratio: str) -> str:
        """
        Map aspect ratio to OpenAI Images API size.
        Most providers in OpenAI-compatible mode accept these standard sizes.
        """
        ratio = (aspect_ratio or "").strip()
        if ratio == "16:9":
            return "1792x1024"
        if ratio == "9:16":
            return "1024x1792"
        return "1024x1024"

    @staticmethod
    def _get_field(item, key: str):
        """Read field from dict/object payload safely."""
        if isinstance(item, dict):
            return item.get(key)
        return getattr(item, key, None)

    def _generate_via_images_api(self, prompt: str, aspect_ratio: str) -> Optional[Image.Image]:
        """
        Generate image via OpenAI Images API.
        This path is more compatible with Qwen image models than chat.completions.
        """
        size = self._aspect_ratio_to_size(aspect_ratio)
        logger.info(f"Using Images API for image generation, model={self.model}, size={size}")

        response = None
        last_error = None

        # Prefer b64_json first (no external URL fetch dependency), fallback to default response.
        for kwargs in (
            {"response_format": "b64_json"},
            {},
        ):
            try:
                response = self.client.images.generate(
                    model=self.model,
                    prompt=prompt,
                    size=size,
                    **kwargs
                )
                break
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Images API call failed with args={kwargs}: {type(e).__name__}: {e}"
                )

        if response is None:
            raise Exception(f"Images API generation failed: {last_error}")

        data = self._get_field(response, "data")
        if not data:
            raise ValueError("Images API returned empty data")

        first = data[0]
        b64_json = self._get_field(first, "b64_json")
        if b64_json:
            image_data = base64.b64decode(b64_json)
            image = Image.open(BytesIO(image_data))
            image.load()
            return image

        image_url = self._get_field(first, "url")
        if image_url:
            resp = requests.get(image_url, timeout=60)
            resp.raise_for_status()
            image = Image.open(BytesIO(resp.content))
            image.load()
            return image

        raise ValueError("Images API returned neither b64_json nor url")

    async def _download_image_async(self, image_url: str) -> Image.Image:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
        image = Image.open(BytesIO(resp.content))
        image.load()
        return image

    async def _generate_via_images_api_async(self, prompt: str, aspect_ratio: str) -> Optional[Image.Image]:
        """
        Async Images API path using AsyncOpenAI.
        """
        size = self._aspect_ratio_to_size(aspect_ratio)
        logger.info(f"Using async Images API for image generation, model={self.model}, size={size}")

        response = None
        last_error = None
        for kwargs in (
            {"response_format": "b64_json"},
            {},
        ):
            try:
                response = await self.async_client.images.generate(
                    model=self.model,
                    prompt=prompt,
                    size=size,
                    **kwargs
                )
                break
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Async Images API call failed with args={kwargs}: {type(e).__name__}: {e}"
                )

        if response is None:
            raise Exception(f"Async Images API generation failed: {last_error}")

        data = self._get_field(response, "data")
        if not data:
            raise ValueError("Images API returned empty data")

        first = data[0]
        b64_json = self._get_field(first, "b64_json")
        if b64_json:
            image_data = base64.b64decode(b64_json)
            image = Image.open(BytesIO(image_data))
            image.load()
            return image

        image_url = self._get_field(first, "url")
        if image_url:
            return await self._download_image_async(image_url)

        raise ValueError("Images API returned neither b64_json nor url")
    
    def _encode_image_to_base64(self, image: Image.Image) -> str:
        """
        Encode PIL Image to base64 string
        
        Args:
            image: PIL Image object
            
        Returns:
            Base64 encoded string
        """
        buffered = BytesIO()
        # Convert to RGB if necessary (e.g., RGBA images)
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        image.save(buffered, format="JPEG", quality=95)
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        Generate image using OpenAI SDK
        
        Note: OpenAI format does NOT support 4K images, defaults to 1K
        
        Args:
            prompt: The image generation prompt
            ref_images: Optional list of reference images
            aspect_ratio: Image aspect ratio
            resolution: Image resolution (only 1K supported, parameter ignored)
            
        Returns:
            Generated PIL Image object, or None if failed
        """
        try:
            # Qwen image models are more stable through Images API in OpenAI-compatible gateways.
            # If reference images are provided, we currently ignore them in this path.
            if self._is_qwen_image_model():
                if ref_images:
                    logger.warning(
                        f"Model {self.model} does not use reference images in Images API path; "
                        f"received {len(ref_images)} references and ignored them."
                    )
                try:
                    return self._generate_via_images_api(prompt, aspect_ratio)
                except Exception as images_api_error:
                    logger.warning(
                        f"Images API failed for model {self.model}, fallback to chat.completions: "
                        f"{type(images_api_error).__name__}: {images_api_error}"
                    )

            # Build message content
            content = []
            
            # Add reference images first (if any)
            if ref_images:
                for ref_img in ref_images:
                    base64_image = self._encode_image_to_base64(ref_img)
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    })
            
            # Add text prompt
            content.append({"type": "text", "text": prompt})
            
            logger.debug(f"Calling OpenAI API for image generation with {len(ref_images) if ref_images else 0} reference images...")
            logger.debug(f"Config - aspect_ratio: {aspect_ratio} (resolution ignored, OpenAI format only supports 1K)")
            
            # Note: resolution is not supported in OpenAI format, only aspect_ratio via system message
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": f"aspect_ratio={aspect_ratio}"},
                    {"role": "user", "content": content},
                ],
                modalities=["text", "image"]
            )
            
            logger.debug("OpenAI API call completed")
            
            # Extract image from response - handle different response formats
            message = response.choices[0].message
            
            # Debug: log available attributes
            logger.debug(f"Response message attributes: {dir(message)}")
            
            # Try multi_mod_content first (custom format from some proxies)
            if hasattr(message, 'multi_mod_content') and message.multi_mod_content:
                parts = message.multi_mod_content
                for part in parts:
                    if "text" in part:
                        logger.debug(f"Response text: {part['text'][:100] if len(part['text']) > 100 else part['text']}")
                    if "inline_data" in part:
                        image_data = base64.b64decode(part["inline_data"]["data"])
                        image = Image.open(BytesIO(image_data))
                        logger.debug(f"Successfully extracted image: {image.size}, {image.mode}")
                        return image
            
            # Try standard OpenAI content format (list of content parts)
            if hasattr(message, 'content') and message.content:
                # If content is a list (multimodal response)
                if isinstance(message.content, list):
                    for part in message.content:
                        if isinstance(part, dict):
                            # Handle image_url type
                            if part.get('type') == 'image_url':
                                image_url = part.get('image_url', {}).get('url', '')
                                if image_url.startswith('data:image'):
                                    # Extract base64 data from data URL
                                    base64_data = image_url.split(',', 1)[1]
                                    image_data = base64.b64decode(base64_data)
                                    image = Image.open(BytesIO(image_data))
                                    logger.debug(f"Successfully extracted image from content: {image.size}, {image.mode}")
                                    return image
                            # Handle text type
                            elif part.get('type') == 'text':
                                text = part.get('text', '')
                                if text:
                                    logger.debug(f"Response text: {text[:100] if len(text) > 100 else text}")
                        elif hasattr(part, 'type'):
                            # Handle as object with attributes
                            if part.type == 'image_url':
                                image_url = getattr(part, 'image_url', {})
                                if isinstance(image_url, dict):
                                    url = image_url.get('url', '')
                                else:
                                    url = getattr(image_url, 'url', '')
                                if url.startswith('data:image'):
                                    base64_data = url.split(',', 1)[1]
                                    image_data = base64.b64decode(base64_data)
                                    image = Image.open(BytesIO(image_data))
                                    logger.debug(f"Successfully extracted image from content object: {image.size}, {image.mode}")
                                    return image
                # If content is a string, try to extract image from it
                elif isinstance(message.content, str):
                    content_str = message.content
                    logger.debug(f"Response content (string): {content_str[:200] if len(content_str) > 200 else content_str}")
                    
                    # Try to extract Markdown image URL: ![...](url)
                    markdown_pattern = r'!\[.*?\]\((https?://[^\s\)]+)\)'
                    markdown_matches = re.findall(markdown_pattern, content_str)
                    if markdown_matches:
                        image_url = markdown_matches[0]  # Use the first image URL found
                        logger.debug(f"Found Markdown image URL: {image_url}")
                        try:
                            response = requests.get(image_url, timeout=30, stream=True)
                            response.raise_for_status()
                            image = Image.open(BytesIO(response.content))
                            image.load()  # Ensure image is fully loaded
                            logger.debug(f"Successfully downloaded image from Markdown URL: {image.size}, {image.mode}")
                            return image
                        except Exception as download_error:
                            logger.warning(f"Failed to download image from Markdown URL: {download_error}")
                    
                    # Try to extract plain URL (not in Markdown format)
                    url_pattern = r'(https?://[^\s\)\]]+\.(?:png|jpg|jpeg|gif|webp|bmp)(?:\?[^\s\)\]]*)?)'
                    url_matches = re.findall(url_pattern, content_str, re.IGNORECASE)
                    if url_matches:
                        image_url = url_matches[0]
                        logger.debug(f"Found plain image URL: {image_url}")
                        try:
                            response = requests.get(image_url, timeout=30, stream=True)
                            response.raise_for_status()
                            image = Image.open(BytesIO(response.content))
                            image.load()
                            logger.debug(f"Successfully downloaded image from plain URL: {image.size}, {image.mode}")
                            return image
                        except Exception as download_error:
                            logger.warning(f"Failed to download image from plain URL: {download_error}")
                    
                    # Try to extract base64 data URL from string
                    base64_pattern = r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)'
                    base64_matches = re.findall(base64_pattern, content_str)
                    if base64_matches:
                        base64_data = base64_matches[0]
                        logger.debug(f"Found base64 image data in string")
                        try:
                            image_data = base64.b64decode(base64_data)
                            image = Image.open(BytesIO(image_data))
                            logger.debug(f"Successfully extracted base64 image from string: {image.size}, {image.mode}")
                            return image
                        except Exception as decode_error:
                            logger.warning(f"Failed to decode base64 image from string: {decode_error}")
            
            # Log raw response for debugging
            logger.warning(f"Unable to extract image. Raw message type: {type(message)}")
            logger.warning(f"Message content type: {type(getattr(message, 'content', None))}")
            logger.warning(f"Message content: {getattr(message, 'content', 'N/A')}")
            
            raise ValueError("No valid multimodal response received from OpenAI API")
            
        except Exception as e:
            error_detail = f"Error generating image with OpenAI (model={self.model}): {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e

    async def generate_image_async(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        Generate image using AsyncOpenAI SDK.
        """
        try:
            if self._is_qwen_image_model():
                if ref_images:
                    logger.warning(
                        f"Model {self.model} does not use reference images in Images API path; "
                        f"received {len(ref_images)} references and ignored them."
                    )
                try:
                    return await self._generate_via_images_api_async(prompt, aspect_ratio)
                except Exception as images_api_error:
                    logger.warning(
                        f"Async Images API failed for model {self.model}, fallback to chat.completions: "
                        f"{type(images_api_error).__name__}: {images_api_error}"
                    )

            content = []
            if ref_images:
                for ref_img in ref_images:
                    base64_image = self._encode_image_to_base64(ref_img)
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    })
            content.append({"type": "text", "text": prompt})

            response = await self.async_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": f"aspect_ratio={aspect_ratio}"},
                    {"role": "user", "content": content},
                ],
                modalities=["text", "image"]
            )

            message = response.choices[0].message
            if hasattr(message, 'multi_mod_content') and message.multi_mod_content:
                for part in message.multi_mod_content:
                    if "inline_data" in part:
                        image_data = base64.b64decode(part["inline_data"]["data"])
                        image = Image.open(BytesIO(image_data))
                        image.load()
                        return image

            if hasattr(message, 'content') and message.content:
                if isinstance(message.content, list):
                    for part in message.content:
                        part_type = part.get('type') if isinstance(part, dict) else getattr(part, 'type', None)
                        if part_type != 'image_url':
                            continue
                        image_url = part.get('image_url', {}).get('url', '') if isinstance(part, dict) else getattr(getattr(part, 'image_url', {}), 'url', '')
                        if image_url.startswith('data:image'):
                            image_data = base64.b64decode(image_url.split(',', 1)[1])
                            image = Image.open(BytesIO(image_data))
                            image.load()
                            return image
                elif isinstance(message.content, str):
                    content_str = message.content
                    markdown_match = re.findall(r'!\[.*?\]\((https?://[^\s\)]+)\)', content_str)
                    if markdown_match:
                        return await self._download_image_async(markdown_match[0])
                    url_match = re.findall(r'(https?://[^\s\)\]]+\.(?:png|jpg|jpeg|gif|webp|bmp)(?:\?[^\s\)\]]*)?)', content_str, re.IGNORECASE)
                    if url_match:
                        return await self._download_image_async(url_match[0])
                    base64_match = re.findall(r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)', content_str)
                    if base64_match:
                        image_data = base64.b64decode(base64_match[0])
                        image = Image.open(BytesIO(image_data))
                        image.load()
                        return image

            raise ValueError("No valid multimodal response received from OpenAI API")
        except Exception as e:
            error_detail = f"Error generating image with OpenAI (model={self.model}): {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e
