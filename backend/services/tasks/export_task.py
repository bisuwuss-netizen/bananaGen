"""Editable PPT export background task."""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from deps import async_session_factory
from models import Task, Page, Project
from services.runtime_state import load_runtime_config, runtime_context

logger = logging.getLogger(__name__)


async def export_editable_pptx_with_recursive_analysis_task(
    task_id: str,
    project_id: str,
    filename: str,
    file_service,
    page_ids: list = None,
    max_depth: int = 2,
    max_workers: int = 4,
    export_extractor_method: str = "hybrid",
    export_inpaint_method: str = "hybrid",
    runtime_config: dict | None = None,
):
    """Export editable PPTX with recursive analysis."""
    logger.info(
        "Task %s started: export_editable_pptx_with_recursive_analysis (project=%s, depth=%s, workers=%s, extractor=%s, inpaint=%s)",
        task_id,
        project_id,
        max_depth,
        max_workers,
        export_extractor_method,
        export_inpaint_method,
    )

    resolved_runtime_config = runtime_config or load_runtime_config()

    with runtime_context(resolved_runtime_config):
        import os
        from datetime import datetime

        from PIL import Image

        from services.presentation.export_service import ExportService
        from services.image_editability import TextAttributeExtractorFactory

        async with async_session_factory() as session:
            try:
                project = await session.get(Project, project_id)
                if not project:
                    raise ValueError(f"Project {project_id} not found")

                query = select(Page).where(Page.project_id == project_id)
                if page_ids:
                    query = query.where(Page.id.in_(page_ids))
                query = query.order_by(Page.numeric_order())
                
                result = await session.execute(query)
                pages = result.scalars().all()
                
                if not pages:
                    raise ValueError("No pages found for project")

                image_paths = []
                for page in pages:
                    if page.generated_image_path:
                        img_path = file_service.get_absolute_path(page.generated_image_path)
                        if os.path.exists(img_path):
                            image_paths.append(img_path)

                if not image_paths:
                    raise ValueError("No generated images found for project")

                task = await session.get(Task, task_id)
                if task:
                    task.set_progress(
                        {
                            "total": 100,
                            "completed": 0,
                            "failed": 0,
                            "current_step": "准备中...",
                            "percent": 0,
                            "messages": ["🚀 开始导出可编辑PPTX..."],
                        }
                    )
                    await session.commit()

                progress_messages = ["🚀 开始导出可编辑PPTX..."]
                max_messages = 10

                # Define a thread-safe async progress callback setter
                def sync_progress_callback(step: str, message: str, percent: int):
                    # We create an async task to update the DB, because this callback
                    # is going to be invoked from the ThreadPool executing the Sync ExportService.
                    
                    async def update_db():
                        # We use a completely new localized session since we are in a background thread span
                        async with async_session_factory() as update_session:
                            try:
                                t = await update_session.get(Task, task_id)
                                if t:
                                    nonlocal progress_messages
                                    progress_messages.append(f"[{step}] {message}")
                                    if len(progress_messages) > max_messages:
                                        progress_messages = progress_messages[-max_messages:]
                                    
                                    t.set_progress(
                                        {
                                            "total": 100,
                                            "completed": percent,
                                            "failed": 0,
                                            "current_step": message,
                                            "percent": percent,
                                            "messages": progress_messages.copy(),
                                        }
                                    )
                                    await update_session.commit()
                            except Exception as exc:
                                logger.warning("更新进度失败: %s", exc)

                    # Safely schedule the update
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        asyncio.run_coroutine_threadsafe(update_db(), loop)

                exports_dir = os.path.join(resolved_runtime_config["UPLOAD_FOLDER"], project_id, "exports")
                os.makedirs(exports_dir, exist_ok=True)

                if not filename.endswith(".pptx"):
                    filename += ".pptx"

                output_path = os.path.join(exports_dir, filename)
                if os.path.exists(output_path):
                    base_name = filename.rsplit(".", 1)[0]
                    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                    filename = f"{base_name}_{timestamp}.pptx"
                    output_path = os.path.join(exports_dir, filename)

                first_img = Image.open(image_paths[0])
                slide_width, slide_height = first_img.size
                first_img.close()

                sync_progress_callback("准备", f"找到 {len(image_paths)} 张幻灯片图片", 2)
                sync_progress_callback("准备", f"幻灯片尺寸: {slide_width}×{slide_height}", 3)

                text_attribute_extractor = TextAttributeExtractorFactory.create_caption_model_extractor()
                sync_progress_callback("准备", "文字属性提取器已初始化", 5)
                sync_progress_callback("配置", f"提取方法: {export_extractor_method}, 背景修复: {export_inpaint_method}", 6)

                # ExportService is fully synchronous and computationally heavy. We must offload it to a thread
                def run_export():
                    return ExportService.create_editable_pptx_with_recursive_analysis(
                        image_paths=image_paths,
                        output_file=output_path,
                        slide_width_pixels=slide_width,
                        slide_height_pixels=slide_height,
                        max_depth=max_depth,
                        max_workers=max_workers,
                        text_attribute_extractor=text_attribute_extractor,
                        progress_callback=sync_progress_callback,
                        export_extractor_method=export_extractor_method,
                        export_inpaint_method=export_inpaint_method,
                    )
                    
                _, export_warnings = await asyncio.to_thread(run_export)

                download_path = f"/files/{project_id}/exports/{filename}"
                progress_messages.append("✅ 导出完成！")
                warning_messages = []
                if export_warnings and export_warnings.has_warnings():
                    warning_messages = export_warnings.to_summary()
                    progress_messages.extend(warning_messages)

                task = await session.get(Task, task_id)
                if task:
                    task.status = "COMPLETED"
                    task.completed_at = datetime.now()
                    task.set_progress(
                        {
                            "total": 100,
                            "completed": 100,
                            "failed": 0,
                            "current_step": "✓ 导出完成",
                            "percent": 100,
                            "messages": progress_messages,
                            "download_url": download_path,
                            "filename": filename,
                            "method": "recursive_analysis",
                            "max_depth": max_depth,
                            "warnings": warning_messages,
                            "warning_details": export_warnings.to_dict() if export_warnings else {},
                        }
                    )
                    await session.commit()
            except Exception as exc:
                import traceback

                logger.error("任务 %s 失败: %s", task_id, traceback.format_exc())
                task = await session.get(Task, task_id)
                if task:
                    task.status = "FAILED"
                    task.error_message = str(exc)
                    task.completed_at = datetime.now()
                    await session.commit()


__all__ = ["export_editable_pptx_with_recursive_analysis_task"]
