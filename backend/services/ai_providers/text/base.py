"""
Abstract base class for text generation providers
"""
import asyncio
from abc import ABC, abstractmethod


class TextProvider(ABC):
    """Abstract base class for text generation"""
    
    @abstractmethod
    def generate_text(self, prompt: str, thinking_budget: int = 1000) -> str:
        """
        Generate text content from prompt
        
        Args:
            prompt: The input prompt for text generation
            thinking_budget: Budget for thinking/reasoning (provider-specific)
            
        Returns:
            Generated text content
        """
        pass

    async def generate_text_async(self, prompt: str, thinking_budget: int = 1000) -> str:
        """
        Async text generation entrypoint.

        Providers should override this with native async SDK calls. The default
        implementation exists only as a compatibility fallback.
        """
        return await asyncio.to_thread(
            self.generate_text,
            prompt,
            thinking_budget=thinking_budget,
        )
