"""HTML image generation SSE streaming route.

Migrated from project_controller.generate_html_images (Flask) to FastAPI
with StreamingResponse for Server-Sent Events.
"""
import base64
import json
import logging
import time
from datetime import datetime
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import RetryError
from PIL import Image

from config_fastapi import settings as app_settings
from deps import CurrentUser, get_db, get_project_for_user, require_current_user
from models.project import Project
from models.page import Page
from schemas.common import SuccessResponse
from services.image_request_policy import get_shared_image_request_gate
from services.runtime_state import load_runtime_config, runtime_context
from services.file_service import FileService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["html-images"])


class HtmlImageSlot(BaseModel):
    page_id: str = ""
    slot_path: str = ""
    prompt: str = ""
    context: dict[str, Any] | None = None


class GenerateHtmlImagesBody(BaseModel):
    slots: list[HtmlImageSlot]


class SaveHtmlImageRequest(BaseModel):
    page_id: str
    slot_path: str
    image_base64: str  # data:image/webp;base64,... or data:image/png;base64,...


def _friendly_error(err: Exception) -> str:
    msg = str(err) if err else "图片生成失败"

    if isinstance(err, RetryError):
        try:
            last_err = err.last_attempt.exception()
            if last_err:
                msg = str(last_err)
        except Exception:
            msg = "模型请求重试后仍失败"

    low = msg.lower()
    if "limit_requests" in low or "429" in low:
        return "请求过于频繁（429限流），请稍后重试"
    if "api key" in low or "invalid api" in low or "authentication" in low:
        return "图片服务鉴权失败，请检查 API Key 配置"
    if "timeout" in low or "timed out" in low:
        return "图片生成超时，请稍后重试"
    if "retryerror" in low:
        return "模型请求重试后仍失败，请稍后重试"
    return msg


@router.post("/{project_id}/html-images/generate")
async def generate_html_images_sse(
    project_id: str,
    body: GenerateHtmlImagesBody,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)

    if not body.slots:
        raise HTTPException(400, "slots 列表不能为空")

    slots_raw = [s.model_dump() for s in body.slots]

    runtime_cfg = load_runtime_config()
    try:
        from services.image_prompt_optimizer import optimize_html_image_slots
        with runtime_context(runtime_cfg):
            slots_raw = optimize_html_image_slots(slots_raw, project)
    except Exception as e:
        logger.warning("HTML 图片 prompt 优化失败，回退原始 prompt: %s", e, exc_info=True)

    image_model = runtime_cfg.get("IMAGE_MODEL") or app_settings.image_model
    default_aspect_ratio = runtime_cfg.get("DEFAULT_ASPECT_RATIO") or app_settings.default_aspect_ratio
    default_resolution = runtime_cfg.get("DEFAULT_RESOLUTION") or app_settings.default_resolution
    image_request_gate = get_shared_image_request_gate(
        image_model=image_model,
        runtime_config=runtime_cfg,
    )

    from services.ai_providers import get_image_provider
    try:
        with runtime_context(runtime_cfg):
            image_provider = get_image_provider(model=image_model)
    except Exception as e:
        logger.error("初始化图片生成器失败: model=%s, error=%s", image_model, e, exc_info=True)
        raise HTTPException(503, f"初始化图片生成器失败: {e}")

    logger.info("开始为 HTML 模式生成 %s 张图片 (SSE): 项目 %s", len(slots_raw), project_id)

    async def event_generator():
        total = len(slots_raw)
        success_count = 0
        error_count = 0

        for i, slot in enumerate(slots_raw):
            page_id = slot.get("page_id", "")
            slot_path = slot.get("slot_path", "")
            prompt = slot.get("prompt", "")

            progress_event = {
                "type": "progress",
                "current": i + 1,
                "total": total,
                "page_id": page_id,
                "slot_path": slot_path,
            }
            yield f"data: {json.dumps(progress_event, ensure_ascii=False)}\n\n"

            if not prompt:
                error_event = {
                    "type": "error",
                    "page_id": page_id,
                    "slot_path": slot_path,
                    "error": "缺少 prompt",
                }
                yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
                error_count += 1
                continue

            try:
                logger.info("正在生成图片 %s/%s: page_id=%s, slot_path=%s", i + 1, total, page_id, slot_path)

                has_async = hasattr(image_provider, "generate_image_async")
                async with image_request_gate.acquire():
                    if has_async:
                        image = await image_provider.generate_image_async(
                            prompt=prompt,
                            aspect_ratio=default_aspect_ratio,
                            resolution=default_resolution,
                        )
                    else:
                        import asyncio
                        image = await asyncio.to_thread(
                            image_provider.generate_image,
                            prompt=prompt,
                            aspect_ratio=default_aspect_ratio,
                            resolution=default_resolution,
                        )

                if image is None:
                    error_event = {
                        "type": "error",
                        "page_id": page_id,
                        "slot_path": slot_path,
                        "error": "图片生成失败",
                    }
                    yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
                    error_count += 1
                    continue

                buffered = BytesIO()
                image.save(buffered, format="WEBP", quality=85)
                img_base64 = base64.b64encode(buffered.getvalue()).decode()

                image_event = {
                    "type": "image",
                    "page_id": page_id,
                    "slot_path": slot_path,
                    "image_base64": f"data:image/webp;base64,{img_base64}",
                }
                yield f"data: {json.dumps(image_event, ensure_ascii=False)}\n\n"
                success_count += 1
                logger.info("图片生成成功 %s/%s", i + 1, total)

            except Exception as e:
                logger.error("生成图片失败: %s", e)
                error_event = {
                    "type": "error",
                    "page_id": page_id,
                    "slot_path": slot_path,
                    "error": _friendly_error(e),
                }
                yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
                error_count += 1

        complete_event = {
            "type": "complete",
            "summary": {
                "total": total,
                "success": success_count,
                "error": error_count,
            },
        }
        yield f"data: {json.dumps(complete_event, ensure_ascii=False)}\n\n"
        logger.info("HTML 图片生成完成 (SSE): 成功 %s, 失败 %s", success_count, error_count)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/{project_id}/html-images/save", response_model=SuccessResponse)
async def save_html_image(
    project_id: str,
    body: SaveHtmlImageRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """保存HTML模式的图片到文件系统并更新html_model"""
    project = await get_project_for_user(db, project_id, current_user)
    
    page = await db.get(Page, body.page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, f"页面 {body.page_id} 不存在")
    
    # 解析base64图片数据
    try:
        # 支持 data:image/webp;base64,... 或 data:image/png;base64,... 格式
        if body.image_base64.startswith("data:image/"):
            header, data = body.image_base64.split(",", 1)
            # 提取格式
            format_part = header.split(";")[0].split("/")[1].upper()
            if format_part == "WEBP":
                image_format = "WEBP"
            elif format_part == "PNG":
                image_format = "PNG"
            elif format_part == "JPEG" or format_part == "JPG":
                image_format = "JPEG"
            else:
                image_format = "WEBP"  # 默认
        else:
            # 如果没有data URI前缀，假设是纯base64
            data = body.image_base64
            image_format = "WEBP"
        
        # 解码base64
        image_data = base64.b64decode(data)
        image = Image.open(BytesIO(image_data))
        
        # 保存图片到文件系统
        file_service = FileService(app_settings.upload_folder)
        # 使用slot_path作为文件名的一部分，确保唯一性
        timestamp = int(time.time() * 1000)
        slot_safe = body.slot_path.replace(".", "_").replace("/", "_")
        filename = f"{body.page_id}_{slot_safe}_{timestamp}.webp"
        
        # 保存为WEBP格式
        pages_dir = file_service._get_pages_dir(project_id)
        filepath = pages_dir / filename
        image.save(str(filepath), format="WEBP", quality=85)
        
        # 获取相对路径
        relative_path = filepath.relative_to(file_service.upload_folder).as_posix()
        
        # 构建前端可访问的URL
        image_url = f"/files/{project_id}/pages/{filename}"
        
        # 更新html_model中的图片路径
        html_model = page.get_html_model() or {}
        if not isinstance(html_model, dict):
            html_model = {}
        
        # 根据slot_path更新对应的字段
        # slot_path格式如: "image.src", "left.image_src", "background_image" 等
        def set_nested_path(obj: dict, path: str, value: str):
            """递归设置嵌套路径的值"""
            parts = path.split(".")
            current = obj
            for i, part in enumerate(parts[:-1]):
                if part not in current:
                    current[part] = {}
                elif not isinstance(current[part], dict):
                    current[part] = {}
                current = current[part]
            current[parts[-1]] = value
        
        set_nested_path(html_model, body.slot_path, image_url)
        
        # 保存更新后的html_model
        page.set_html_model(html_model)
        page.updated_at = datetime.now()
        
        if project:
            project.updated_at = datetime.now()
        
        await db.flush()
        
        logger.info(f"HTML图片已保存: page_id={body.page_id}, slot_path={body.slot_path}, path={relative_path}")
        
        return SuccessResponse(data={
            "image_path": relative_path,
            "image_url": image_url,
            "page_id": body.page_id,
            "slot_path": body.slot_path,
        })
        
    except Exception as e:
        logger.error(f"保存HTML图片失败: {e}", exc_info=True)
        raise HTTPException(500, f"保存图片失败: {str(e)}")
