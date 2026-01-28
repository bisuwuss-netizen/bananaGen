# backend/services/image_providers.py
"""
图片生成提供者 - 支持阿里云百炼、Gemini 等多种 API
所有配置均从环境变量读取，拒绝硬编码
"""

import os
import hashlib
import logging
from abc import ABC, abstractmethod
from typing import Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class ImageProvider(ABC):
    """图片生成提供者抽象基类"""

    @abstractmethod
    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        size: str = None
    ) -> Dict:
        """
        生成图片
        
        Args:
            prompt: 正向提示词
            negative_prompt: 负向提示词
            size: 图片尺寸
        
        Returns:
            包含 status 和 image_url 的字典
        """
        pass

    @abstractmethod
    def get_name(self) -> str:
        """提供者名称"""
        pass


class QwenImageProvider(ImageProvider):
    """阿里云百炼图片生成（支持 qwen-image-plus 等模型）"""

    def __init__(self):
        # 所有配置从环境变量读取
        self.api_key = os.getenv("DASHSCOPE_API_KEY")
        self.model = os.getenv("DASHSCOPE_IMAGE_MODEL", "qwen-image-plus")
        self.base_url = os.getenv(
            "DASHSCOPE_API_BASE", 
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
        )
        self.task_api_base = os.getenv(
            "DASHSCOPE_TASK_API_BASE",
            "https://dashscope.aliyuncs.com/api/v1/tasks"
        )
        self.default_size = os.getenv("DASHSCOPE_DEFAULT_SIZE", "1792*1024")
        self.timeout = int(os.getenv("DASHSCOPE_TIMEOUT", "30"))
        self.max_poll_wait = int(os.getenv("DASHSCOPE_MAX_POLL_WAIT", "120"))

    def get_name(self) -> str:
        return self.model

    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        size: str = None
    ) -> Dict:
        """调用百炼 API 生成图片"""
        import requests

        if not self.api_key:
            logger.error("[QwenImageProvider] DASHSCOPE_API_KEY 未配置")
            return {"status": "failed", "error": "API key 未配置"}

        # 构建请求头
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable"  # 异步模式
        }

        # 尺寸处理：支持 "1792x1024" 或 "1792*1024" 格式
        if size:
            # 统一转换为 DashScope 格式（使用 *）
            final_size = size.replace("x", "*")
        else:
            final_size = self.default_size

        payload = {
            "model": self.model,
            "input": {
                "prompt": prompt,
                "negative_prompt": negative_prompt or self._get_default_negative()
            },
            "parameters": {
                "size": final_size,
                "n": 1
            }
        }

        try:
            # 提交任务
            response = requests.post(self.base_url, json=payload, headers=headers, timeout=self.timeout)
            result = response.json()

            if "output" in result and "task_id" in result["output"]:
                task_id = result["output"]["task_id"]
                # 轮询获取结果
                return self._poll_result(task_id, headers)
            else:
                logger.error(f"[QwenImageProvider] API 错误: {result}")
                return {"status": "failed", "error": str(result)}

        except Exception as e:
            logger.error(f"[QwenImageProvider] 图片生成失败: {e}")
            return {"status": "failed", "error": str(e)}

    def _poll_result(self, task_id: str, headers: Dict) -> Dict:
        """轮询获取结果"""
        import requests
        import time

        status_url = f"{self.task_api_base}/{task_id}"
        poll_interval = int(os.getenv("DASHSCOPE_POLL_INTERVAL", "2"))

        for _ in range(self.max_poll_wait // poll_interval):
            time.sleep(poll_interval)
            try:
                response = requests.get(status_url, headers=headers, timeout=10)
                result = response.json()

                status = result.get("output", {}).get("task_status")
                if status == "SUCCEEDED":
                    image_url = result["output"]["results"][0]["url"]
                    return {"status": "done", "image_url": image_url}
                elif status == "FAILED":
                    return {"status": "failed", "error": result.get("output", {}).get("message")}
            except Exception as e:
                logger.warning(f"[QwenImageProvider] 轮询失败: {e}")

        return {"status": "timeout", "error": "任务超时"}

    def _get_default_negative(self) -> str:
        """默认负向提示词（可通过环境变量覆盖）"""
        default = (
            "nsfw, distorted text, incorrect text, watermark, logo, "
            "blurry, low quality, distorted hands, extra fingers, "
            "anatomically incorrect, broken machinery"
        )
        return os.getenv("DASHSCOPE_NEGATIVE_PROMPT", default)


class GeminiImageProvider(ImageProvider):
    """Google Gemini 图片生成（使用现有的 AI Provider）"""

    def __init__(self):
        self.model = os.getenv("IMAGE_MODEL", "gemini-2.0-flash-exp")

    def get_name(self) -> str:
        return self.model

    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        size: str = None
    ) -> Dict:
        """使用 Gemini 生成图片"""
        try:
            # 导入现有的 AI 服务
            from services.ai_service_manager import get_ai_service_manager
            
            manager = get_ai_service_manager()
            image_provider = manager.get_image_provider()
            
            if not image_provider:
                return {"status": "failed", "error": "图片生成服务不可用"}

            # 构建完整提示词
            full_prompt = prompt
            if negative_prompt:
                full_prompt += f"\n\n避免: {negative_prompt}"

            # 调用生成
            result = image_provider.generate_image(
                prompt=full_prompt,
                model=self.model
            )

            if result and result.get("image_path"):
                return {
                    "status": "done",
                    "image_url": result["image_path"],
                    "image_path": result["image_path"]
                }
            else:
                return {"status": "failed", "error": result.get("error", "生成失败")}

        except Exception as e:
            logger.error(f"[GeminiImageProvider] 图片生成失败: {e}")
            return {"status": "failed", "error": str(e)}


class MockImageProvider(ImageProvider):
    """模拟图片生成（用于测试）"""

    def __init__(self):
        self.placeholder_base = os.getenv("MOCK_PLACEHOLDER_BASE", "https://via.placeholder.com")
        self.placeholder_size = os.getenv("MOCK_PLACEHOLDER_SIZE", "800x450")

    def get_name(self) -> str:
        return "mock"

    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        size: str = None
    ) -> Dict:
        """返回模拟结果"""
        # 生成一个基于 prompt 的唯一标识
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
        
        return {
            "status": "done",
            "image_url": f"{self.placeholder_base}/{self.placeholder_size}?text={prompt_hash}",
            "mock": True
        }


def get_image_provider(provider_name: Optional[str] = None) -> ImageProvider:
    """
    获取图片生成提供者
    
    Args:
        provider_name: 提供者名称，可选值: qwen, gemini, mock
    
    Returns:
        ImageProvider 实例
    """
    provider = provider_name or os.getenv("IMAGE_PROVIDER", "qwen")
    default_provider = os.getenv("IMAGE_PROVIDER_DEFAULT", "qwen")

    providers = {
        "qwen": QwenImageProvider,
        "dashscope": QwenImageProvider,  # 别名
        "gemini": GeminiImageProvider,
        "google": GeminiImageProvider,   # 别名
        "mock": MockImageProvider,
        "test": MockImageProvider,       # 别名
    }

    provider_class = providers.get(provider.lower())
    if not provider_class:
        logger.warning(f"[ImageProvider] 未知提供者: {provider}，使用默认: {default_provider}")
        provider_class = providers.get(default_provider, QwenImageProvider)

    return provider_class()
