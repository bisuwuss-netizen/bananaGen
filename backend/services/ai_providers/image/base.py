"""
Abstract base class for image generation providers
"""
import asyncio
from abc import ABC, abstractmethod
from typing import Optional, List
from PIL import Image


class ImageProvider(ABC):
    """Abstract base class for image generation"""
    
    @abstractmethod
    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        Generate image from prompt
        
        Args:
            prompt: The image generation prompt
            ref_images: Optional list of reference images (PIL Image objects)
            aspect_ratio: Image aspect ratio (e.g., "16:9", "1:1", "4:3")
            resolution: Image resolution ("1K", "2K", "4K") - note: OpenAI format only supports 1K
            
        Returns:
            Generated PIL Image object, or None if failed
        """
        pass

    async def generate_image_async(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        Async image generation entrypoint.

        Providers should override this with native async SDK calls. The default
        implementation exists only as a compatibility fallback.
        """
        return await asyncio.to_thread(
            self.generate_image,
            prompt,
            ref_images=ref_images,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
        )
