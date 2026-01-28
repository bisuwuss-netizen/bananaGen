# backend/services/image_slot_service.py
"""
图片插槽服务 - 管理配图的异步生成和状态跟踪
"""

import os
import hashlib
import logging
from pathlib import Path
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from .render_schemas import ImageSlotRequest
from .image_providers import get_image_provider

logger = logging.getLogger(__name__)

# 职教场景负向提示词
VOCATIONAL_NEGATIVE_PROMPTS = (
    "nsfw, distorted text, incorrect text, watermark, logo, "
    "blurry, low quality, distorted hands, extra fingers, "
    "impossible physics, surrealism, cartoon style, "
    "anatomically incorrect, broken machinery, "
    "childish, unprofessional"
)


class ImageSlotService:
    """图片插槽生成服务"""

    def __init__(self, cache_dir: str = None):
        if cache_dir is None:
            from config import Config
            cache_dir = os.path.join(Config.UPLOAD_FOLDER, "image_cache")
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.provider = get_image_provider()
        self.results: Dict[str, Dict] = {}

    def build_prompt(self, slot: ImageSlotRequest, subject: str = "职业教育") -> str:
        """
        构建图片生成提示词
        
        Args:
            slot: 图片插槽请求
            subject: 学科/专业领域
        
        Returns:
            提示词字符串
        """

        # 视觉风格映射
        style_hints = {
            "photo": "真实照片风格，高清专业",
            "schematic": "技术示意图，清晰线条，专业标注",
            "diagram": "图表风格，数据可视化",
            "icon": "简洁图标风格，扁平化设计",
            "illustration": "插画风格，教育配图",
        }

        style_hint = style_hints.get(slot.visual_style, "专业教学配图")

        prompt = f"""
为高职教育课件生成配图：

主题：{slot.theme}
关键词：{', '.join(slot.keywords)}
上下文：{slot.context}
视觉风格：{style_hint}

要求：
1. 专业、清晰、适合教学展示
2. {slot.aspect_ratio} 宽高比
3. 无文字水印
4. 风格统一，适合PPT使用
5. 背景简洁，主体突出
6. 符合{subject}专业特点
"""
        return prompt.strip()

    def generate_single(self, slot: ImageSlotRequest, subject: str = "职业教育") -> Dict:
        """
        生成单张图片
        
        Args:
            slot: 图片插槽请求
            subject: 学科/专业领域
        
        Returns:
            生成结果字典
        """
        prompt = self.build_prompt(slot, subject)

        # 检查缓存
        cache_key = hashlib.md5(prompt.encode()).hexdigest()
        cache_path = self.cache_dir / f"{cache_key}.png"

        if cache_path.exists():
            logger.info(f"[ImageSlot] 缓存命中: {slot.slot_id}")
            return {
                "slot_id": slot.slot_id,
                "status": "done",
                "image_path": str(cache_path),
                "image_url": f"/files/image_cache/{cache_key}.png",
                "cache_hit": True
            }

        try:
            # 调用图片生成
            logger.info(f"[ImageSlot] 开始生成: {slot.slot_id}")
            result = self.provider.generate(
                prompt=prompt,
                negative_prompt=VOCATIONAL_NEGATIVE_PROMPTS,
                size="1792x1024"
            )

            if result.get("status") == "done":
                # 处理结果
                image_url = result.get("image_url") or result.get("image_path")
                
                if image_url:
                    # 如果是远程 URL，下载到缓存
                    if image_url.startswith("http"):
                        self._download_image(image_url, cache_path)
                        final_path = str(cache_path)
                        final_url = f"/files/image_cache/{cache_key}.png"
                    else:
                        # 本地路径
                        final_path = image_url
                        final_url = image_url
                    
                    logger.info(f"[ImageSlot] 生成成功: {slot.slot_id}")
                    return {
                        "slot_id": slot.slot_id,
                        "status": "done",
                        "image_path": final_path,
                        "image_url": final_url,
                        "prompt": prompt
                    }
                else:
                    return {
                        "slot_id": slot.slot_id,
                        "status": "failed",
                        "error": "未获取到图片路径"
                    }
            else:
                return {
                    "slot_id": slot.slot_id,
                    "status": "failed",
                    "error": result.get("error", "未知错误")
                }

        except Exception as e:
            logger.error(f"[ImageSlot] 生成失败: {slot.slot_id}, {e}")
            return {
                "slot_id": slot.slot_id,
                "status": "failed",
                "error": str(e)
            }

    def generate_batch(
        self,
        slots: List[ImageSlotRequest],
        subject: str = "职业教育",
        max_workers: int = 3,
        progress_callback=None
    ) -> Dict[str, Dict]:
        """
        批量生成图片（并发）
        
        Args:
            slots: 图片插槽请求列表
            subject: 学科/专业领域
            max_workers: 最大并发数
            progress_callback: 进度回调函数 (done, total, status_text)
        
        Returns:
            生成结果字典 {slot_id: result}
        """
        total = len(slots)
        done = 0

        logger.info(f"[ImageSlot] 批量生成开始: {total} 张图片")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self.generate_single, slot, subject): slot
                for slot in slots
            }

            for future in as_completed(futures):
                slot = futures[future]
                try:
                    result = future.result(timeout=180)
                    self.results[slot.slot_id] = result
                except Exception as e:
                    self.results[slot.slot_id] = {
                        "slot_id": slot.slot_id,
                        "status": "failed",
                        "error": str(e)
                    }

                done += 1
                if progress_callback:
                    status = f"正在生成 ({done}/{total})"
                    progress_callback(done, total, status)

        logger.info(f"[ImageSlot] 批量生成完成: {done}/{total}")
        return self.results

    def _download_image(self, url: str, save_path: Path):
        """下载图片到本地"""
        import requests
        
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            with open(save_path, "wb") as f:
                f.write(response.content)
            logger.debug(f"[ImageSlot] 图片已下载: {save_path}")
        except Exception as e:
            logger.error(f"[ImageSlot] 图片下载失败: {e}")
            raise

    def get_status(self) -> Dict:
        """获取当前生成状态"""
        total = len(self.results)
        done = sum(1 for r in self.results.values() if r.get("status") == "done")
        failed = sum(1 for r in self.results.values() if r.get("status") == "failed")

        return {
            "total": total,
            "done": done,
            "failed": failed,
            "pending": total - done - failed,
            "images": self.results
        }

    def clear_cache(self, older_than_days: int = 7):
        """清理过期缓存"""
        import time
        
        now = time.time()
        max_age = older_than_days * 24 * 3600

        for file_path in self.cache_dir.glob("*.png"):
            if now - file_path.stat().st_mtime > max_age:
                try:
                    file_path.unlink()
                    logger.debug(f"[ImageSlot] 清理缓存: {file_path}")
                except Exception as e:
                    logger.warning(f"[ImageSlot] 清理缓存失败: {e}")
