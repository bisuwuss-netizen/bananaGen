"""
OpenAI SDK implementation for text generation
"""
import logging
from openai import AsyncOpenAI, OpenAI
from .base import TextProvider
from config import get_config

logger = logging.getLogger(__name__)


class OpenAITextProvider(TextProvider):
    """Text generation using OpenAI SDK."""
    
    def __init__(self, api_key: str, api_base: str = None, model: str = "gpt-4.1-mini"):
        """
        Initialize OpenAI text provider
        
        Args:
            api_key: API key
            api_base: API base URL (e.g., https://aihubmix.com/v1)
            model: Model name to use
        """
        try:
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
        except Exception as e:
            raise
        self.model = model
    
    def generate_text(self, prompt: str, thinking_budget: int = 1000) -> str:
        """
        Generate text using OpenAI SDK
        
        Args:
            prompt: The input prompt
            thinking_budget: Not used in OpenAI format, kept for interface compatibility
            
        Returns:
            Generated text
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                extra_body={"enable_thinking": False},
            )
            return response.choices[0].message.content
        except Exception as e:
            raise

    async def generate_text_async(self, prompt: str, thinking_budget: int = 1000) -> str:
        """
        Generate text using AsyncOpenAI SDK.
        """
        try:
            response = await self.async_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                extra_body={"enable_thinking": False},
            )
            return response.choices[0].message.content
        except Exception as e:
            raise
