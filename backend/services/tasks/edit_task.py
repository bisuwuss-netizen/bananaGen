"""Page image edit background task."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import List

from models import Page, Task
from services.runtime_state import load_runtime_config, runtime_context

from .utils import save_image_with_version

from deps import async_session_factory

logger = logging.getLogger(__name__)


async def edit_page_image_task(
    task_id: str,
    project_id: str,
    page_id: str,
    edit_instruction: str,
    ai_service_unused,
    file_service,
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    original_description: str = None,
    additional_ref_images: List[str] = None,
    temp_dir: str = None,
    runtime_config: dict | None = None,
):
    """Background task for editing a page image."""
    resolved_runtime_config = runtime_config or load_runtime_config()
    from services.ai_service_manager import get_ai_service_async

    with runtime_context(resolved_runtime_config):
        async with async_session_factory() as session:
            try:
                task = await session.get(Task, task_id)
                if not task:
                    return

                task.status = "PROCESSING"
                await session.commit()

                page = await session.get(Page, page_id)
                if not page or page.project_id != project_id:
                    raise ValueError(f"Page {page_id} not found")
                if not page.generated_image_path:
                    raise ValueError("Page must have generated image first")

                page.status = "GENERATING"
                await session.commit()

                ai_service = await get_ai_service_async()
                current_image_path = file_service.get_absolute_path(page.generated_image_path)
                logger.info("Editing image for page %s...", page_id)
                try:
                    image = await ai_service.call_async(
                        "edit_image",
                        edit_instruction,
                        current_image_path,
                        aspect_ratio,
                        resolution,
                        original_description=original_description,
                        additional_ref_images=additional_ref_images if additional_ref_images else None,
                    )
                finally:
                    if temp_dir:
                        import shutil
                        from pathlib import Path

                        temp_path = Path(temp_dir)
                        if temp_path.exists():
                            shutil.rmtree(temp_dir)

                if not image:
                    raise ValueError("Failed to edit image")

                await save_image_with_version(session, image, project_id, page_id, file_service, page_obj=page)
                
                # Fetch task again to avoid stale object caching 
                task = await session.get(Task, task_id)
                if task:
                    task.status = "COMPLETED"
                    task.completed_at = datetime.utcnow()
                    task.set_progress({"total": 1, "completed": 1, "failed": 0})
                await session.commit()
            except Exception as exc:
                import traceback

                logger.error("Task %s FAILED: %s", task_id, traceback.format_exc())
                if temp_dir:
                    import shutil
                    from pathlib import Path

                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir)

                task = await session.get(Task, task_id)
                if task:
                    task.status = "FAILED"
                    task.error_message = str(exc)
                    task.completed_at = datetime.now()

                page = await session.get(Page, page_id)
                if page:
                    page.status = "FAILED"
                await session.commit()


__all__ = ["edit_page_image_task"]
