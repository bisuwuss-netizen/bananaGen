"""
DashScope (阿里云百炼) Image Provider
使用通义万相 wanx-v1 模型生成图片
"""
import logging
import time
import base64
import requests
from typing import Optional, List
from PIL import Image
from io import BytesIO
from tenacity import retry, stop_after_attempt, wait_exponential
from .base import ImageProvider
from config import get_config

logger = logging.getLogger(__name__)


class DashScopeImageProvider(ImageProvider):
    """使用阿里云百炼 DashScope 的通义万相模型生成图片"""

    def __init__(
        self,
        api_key: str = None,
        api_base: str = None,
        model: str = "wanx-v1",
    ):
        """
        初始化 DashScope 图片生成提供商

        Args:
            api_key: DashScope API Key
            api_base: API Base URL (默认使用 dashscope 官方地址)
            model: 模型名称 (wanx-v1 或 wanx2.1-t2i-turbo 等)
        """
        config = get_config()
        self.api_key = api_key or config.DASHSCOPE_API_KEY or config.OPENAI_API_KEY or config.GOOGLE_API_KEY
        # 图片生成 API 必须使用原生 API 格式，不能使用 OpenAI 兼容格式
        # 强制使用原生 DashScope API 基地址，即使传入了 compatible-mode 格式的地址
        # compatible-mode 用于文本/对话 API，图片生成只支持原生格式
        NATIVE_API_BASE = "https://dashscope.aliyuncs.com/api/v1"
        if api_base and 'compatible-mode' not in api_base:
            self.api_base = api_base
        else:
            self.api_base = NATIVE_API_BASE
        self.model = model or config.IMAGE_MODEL or "wanx-v1"
        self.timeout = int(config.OPENAI_TIMEOUT or 300)
        
        logger.info(f"Initialized DashScope image provider with model: {self.model}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K",
        **kwargs
    ) -> Optional[Image.Image]:
        """
        使用 DashScope 生成图片

        Args:
            prompt: 图片生成提示词
            ref_images: 参考图片列表 (wanx-v1 支持参考图片)
            aspect_ratio: 图片比例
            resolution: 分辨率

        Returns:
            生成的 PIL Image 对象，失败返回 None
        """
        try:
            # 根据比例计算尺寸
            size = self._aspect_ratio_to_size(aspect_ratio, resolution)
            
            logger.debug(f"Generating image with DashScope: model={self.model}, size={size}")
            logger.debug(f"Prompt: {prompt[:100]}...")
            
            # 创建生成任务
            task_id = self._create_task(prompt, size, ref_images)
            
            if not task_id:
                raise ValueError("Failed to create image generation task")
            
            logger.debug(f"Created task: {task_id}")
            
            # 轮询获取结果
            image_url = self._poll_task_result(task_id)
            
            if not image_url:
                raise ValueError("Failed to get image from task")
            
            logger.debug(f"Got image URL: {image_url[:50]}...")
            
            # 下载图片
            image = self._download_image(image_url)
            
            return image

        except Exception as e:
            error_detail = f"Error generating image with DashScope: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e

    def _aspect_ratio_to_size(self, aspect_ratio: str, resolution: str) -> str:
        """
        将比例和分辨率转换为 wanx 支持的尺寸

        wanx-v1 支持的尺寸: 1024*1024, 720*1280, 1280*720 等
        """
        # 根据分辨率确定基准
        if resolution == "1K":
            sizes = {
                "16:9": "1280*720",
                "9:16": "720*1280", 
                "1:1": "1024*1024",
                "4:3": "1024*768",
                "3:4": "768*1024",
            }
        else:  # 2K 或更高
            sizes = {
                "16:9": "1280*720",  # wanx-v1 最大支持这个尺寸
                "9:16": "720*1280",
                "1:1": "1024*1024",
                "4:3": "1024*768",
                "3:4": "768*1024",
            }
        
        return sizes.get(aspect_ratio, "1280*720")

    def _create_task(
        self,
        prompt: str,
        size: str,
        ref_images: Optional[List[Image.Image]] = None
    ) -> Optional[str]:
        """创建图片生成任务"""
        
        url = f"{self.api_base}/services/aigc/text2image/image-synthesis"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable"  # 异步模式
        }
        
        payload = {
            "model": self.model,
            "input": {
                "prompt": prompt
            },
            "parameters": {
                "size": size,
                "n": 1,
                "style": "<auto>"  # 自动选择风格
            }
        }
        
        # 如果有参考图片，添加到请求中
        if ref_images and len(ref_images) > 0:
            # wanx-v1 支持 ref_img 参数
            ref_img = ref_images[0]
            buffered = BytesIO()
            ref_img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            payload["input"]["ref_img"] = f"data:image/png;base64,{img_base64}"
        
        try:
            logger.info(f"DashScope _create_task: url={url}, model={self.model}, size={size}, api_key_prefix={self.api_key[:8] if self.api_key else 'None'}...")
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"Create task failed: {response.status_code} - {response.text}")
                return None
            
            result = response.json()
            
            # 获取任务 ID
            task_id = result.get("output", {}).get("task_id")
            
            if not task_id:
                logger.error(f"No task_id in response: {result}")
            
            return task_id
            
        except Exception as e:
            logger.error(f"Create task request failed: {e}", exc_info=True)
            return None

    def _poll_task_result(self, task_id: str, max_wait: int = 120) -> Optional[str]:
        """轮询任务结果，获取图片 URL"""
        
        url = f"{self.api_base}/tasks/{task_id}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            try:
                response = requests.get(url, headers=headers, timeout=30)
                
                if response.status_code != 200:
                    logger.warning(f"Poll task failed: {response.status_code}")
                    time.sleep(2)
                    continue
                
                result = response.json()
                output = result.get("output", {})
                task_status = output.get("task_status")
                
                if task_status == "SUCCEEDED":
                    # 获取图片 URL
                    results = output.get("results", [])
                    if results and len(results) > 0:
                        return results[0].get("url")
                    return None
                    
                elif task_status == "FAILED":
                    error_msg = output.get("message", "Unknown error")
                    logger.error(f"Task failed: {error_msg}")
                    return None
                    
                elif task_status in ["PENDING", "RUNNING"]:
                    logger.debug(f"Task status: {task_status}, waiting...")
                    time.sleep(2)
                    
                else:
                    logger.warning(f"Unknown task status: {task_status}")
                    time.sleep(2)
                    
            except Exception as e:
                logger.error(f"Poll task request failed: {e}")
                time.sleep(2)
        
        logger.error(f"Task timeout after {max_wait} seconds")
        return None

    def _download_image(self, url: str) -> Optional[Image.Image]:
        """下载图片并返回 PIL Image"""
        
        try:
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"Download image failed: {response.status_code}")
                return None
            
            image = Image.open(BytesIO(response.content))
            return image
            
        except Exception as e:
            logger.error(f"Download image failed: {e}")
            return None
