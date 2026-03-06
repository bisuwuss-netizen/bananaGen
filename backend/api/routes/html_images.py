"""HTML image generation SSE streaming route.

Migrated from project_controller.generate_html_images (Flask) to FastAPI
with StreamingResponse for Server-Sent Events.
"""
import base64
import json
import logging
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import RetryError

from config_fastapi import settings as app_settings
from deps import get_db
from models.project import Project
from services.runtime_state import load_runtime_config, runtime_context

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["html-images"])


class HtmlImageSlot(BaseModel):
    page_id: str = ""
    slot_path: str = ""
    prompt: str = ""
    context: dict[str, Any] | None = None


class GenerateHtmlImagesBody(BaseModel):
    slots: list[HtmlImageSlot]


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
    db: AsyncSession = Depends(get_db),
):
    # #region agent log
    _log_path = "/Users/bisuv/Desktop/02_今日处理中-Today/ai生成ppt项目/banana_ppt/.cursor/debug-3fe128.log"
    import time as _t
    def _dlog(msg, data=None, hyp="H1"):
        try:
            import json as _j
            with open(_log_path, "a") as _f:
                _f.write(_j.dumps({"sessionId":"3fe128","hypothesisId":hyp,"location":"html_images.py","message":msg,"data":data,"timestamp":int(_t.time()*1000)},ensure_ascii=False)+"\n")
        except Exception:
            pass
    _dlog("endpoint_reached", {"project_id": project_id, "slot_count": len(body.slots)}, "H1")
    # #endregion

    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, f"项目 {project_id} 不存在")

    if not body.slots:
        raise HTTPException(400, "slots 列表不能为空")

    slots_raw = [s.model_dump() for s in body.slots]

    runtime_cfg = load_runtime_config()

    # #region agent log
    _dlog("before_optimizer", {"slot_count": len(slots_raw), "runtime_cfg_keys": list(runtime_cfg.keys()) if runtime_cfg else []}, "H2")
    # #endregion
    try:
        from services.image_prompt_optimizer import optimize_html_image_slots
        with runtime_context(runtime_cfg):
            slots_raw = optimize_html_image_slots(slots_raw, project)
        # #region agent log
        _dlog("optimizer_ok", {"optimized_count": len(slots_raw)}, "H2")
        # #endregion
    except Exception as e:
        # #region agent log
        _dlog("optimizer_failed", {"error": str(e)}, "H2")
        # #endregion
        logger.warning("HTML 图片 prompt 优化失败，回退原始 prompt: %s", e, exc_info=True)

    image_model = runtime_cfg.get("IMAGE_MODEL") or app_settings.image_model
    default_aspect_ratio = runtime_cfg.get("DEFAULT_ASPECT_RATIO") or app_settings.default_aspect_ratio
    default_resolution = runtime_cfg.get("DEFAULT_RESOLUTION") or app_settings.default_resolution

    # #region agent log
    _dlog("before_provider_init", {"image_model": image_model, "aspect": default_aspect_ratio, "resolution": default_resolution}, "H3")
    # #endregion

    from services.ai_providers import get_image_provider
    try:
        with runtime_context(runtime_cfg):
            image_provider = get_image_provider(model=image_model)
        # #region agent log
        _dlog("provider_init_ok", {"provider_type": type(image_provider).__name__}, "H3")
        # #endregion
    except Exception as e:
        # #region agent log
        _dlog("provider_init_failed", {"error": str(e)}, "H3")
        # #endregion
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
