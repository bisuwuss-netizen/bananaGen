"""Image generation background tasks."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, List

from sqlalchemy import select

from deps import async_session_factory
from models import Material, Page, Task
from services.image_request_policy import (
    get_shared_image_request_gate,
    resolve_image_request_policy,
)
from services.runtime_state import load_runtime_config, runtime_context

from .manager import task_manager
from .utils import finalize_generation_task, save_image_with_version

logger = logging.getLogger(__name__)


async def _publish_image_task_progress(
    session,
    task: Task,
    *,
    total: int,
    completed: int,
    failed: int,
    completed_page_ids: set[str],
    failed_page_ids: set[str],
    current_page_id: str | None = None,
    current_page_status: str | None = None,
) -> None:
    progress: dict[str, Any] = task.get_progress() if hasattr(task, "get_progress") else {}
    progress.update(
        {
            "total": total,
            "completed": completed,
            "failed": failed,
            "completed_page_ids": sorted(completed_page_ids),
            "failed_page_ids": sorted(failed_page_ids),
        }
    )
    if current_page_id:
        progress["current_page_id"] = current_page_id
    if current_page_status:
        progress["current_page_status"] = current_page_status
    task.set_progress(progress)
    await session.commit()
    await task_manager.publish_task_update(task.id, task.to_dict())


async def generate_images_task(
    task_id: str,
    project_id: str,
    ai_service,
    file_service,
    outline: List[dict],
    use_template: bool = True,
    max_workers: int = 4,
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    runtime_config: dict | None = None,
    extra_requirements: str = None,
    language: str = None,
    page_ids: list = None,
):
    """Generate all requested page images in the background."""
    resolved_runtime_config = runtime_config or load_runtime_config()
    from services.ai_service_manager import get_ai_service_async

    with runtime_context(resolved_runtime_config):
        async with async_session_factory() as session:
            try:
                task = await session.get(Task, task_id)
                if not task:
                    return
                task.status = "PROCESSING"
                ai_service = await get_ai_service_async()
                image_model = resolved_runtime_config.get("IMAGE_MODEL")
                image_policy = resolve_image_request_policy(
                    requested_workers=max_workers,
                    image_model=image_model,
                    runtime_config=resolved_runtime_config,
                )
                image_request_gate = get_shared_image_request_gate(
                    image_model=image_model,
                    runtime_config=resolved_runtime_config,
                )

                query = select(Page).where(Page.project_id == project_id)
                if page_ids:
                    query = query.where(Page.id.in_(page_ids))
                query = query.order_by(Page.numeric_order())
                
                result = await session.execute(query)
                pages = result.scalars().all()
                
                pages_data = ai_service.flatten_outline(outline)
                page_data_by_order = {
                    int(index): page_data
                    for index, page_data in enumerate(pages_data)
                }
                total_pages = len(pages)
                completed_page_ids: set[str] = set()
                failed_page_ids: set[str] = set()
                await _publish_image_task_progress(
                    session,
                    task,
                    total=total_pages,
                    completed=0,
                    failed=0,
                    completed_page_ids=completed_page_ids,
                    failed_page_ids=failed_page_ids,
                )

                completed = 0
                failed = 0
                semaphore = asyncio.Semaphore(image_policy.max_workers)
                progress_lock = asyncio.Lock()

                async def generate_single_image(page_id, page_data, page_index):
                    nonlocal completed, failed
                    async with semaphore:
                        with runtime_context(resolved_runtime_config):
                            async with async_session_factory() as thread_session:
                                try:
                                    page_obj = await thread_session.get(Page, page_id)
                                    if not page_obj:
                                        raise ValueError(f"Page {page_id} not found")

                                    page_obj.status = "GENERATING"
                                    await thread_session.commit()

                                    desc_content = page_obj.get_description_content()
                                    if not desc_content:
                                        raise ValueError("No description content for page")

                                    desc_text = desc_content.get("text", "")
                                    if not desc_text and desc_content.get("text_content"):
                                        text_content = desc_content.get("text_content", [])
                                        desc_text = "\n".join(text_content) if isinstance(text_content, list) else str(text_content)

                                    page_additional_ref_images = []
                                    has_material_images = False
                                    if desc_text:
                                        image_urls = ai_service.extract_image_urls_from_markdown(desc_text)
                                        if image_urls:
                                            page_additional_ref_images = image_urls
                                            has_material_images = True

                                    page_ref_image_path = file_service.get_template_path(project_id) if use_template else None
                                    prompt = ai_service.generate_image_prompt(
                                        outline,
                                        page_data,
                                        desc_text,
                                        page_index,
                                        has_material_images=has_material_images,
                                        extra_requirements=extra_requirements,
                                        language=language,
                                        has_template=use_template,
                                    )
                                    async with image_request_gate.acquire():
                                        image = await ai_service.call_async(
                                            "generate_image",
                                            prompt,
                                            page_ref_image_path,
                                            aspect_ratio,
                                            resolution,
                                            additional_ref_images=page_additional_ref_images if page_additional_ref_images else None,
                                        )
                                    if not image:
                                        raise ValueError("Failed to generate image")

                                    image_path, _ = await save_image_with_version(
                                        thread_session,
                                        image,
                                        project_id,
                                        page_id,
                                        file_service,
                                        page_obj=page_obj,
                                    )

                                    async with progress_lock:
                                        completed += 1
                                        completed_page_ids.add(page_id)
                                        failed_page_ids.discard(page_id)

                                        parent_task = await thread_session.get(Task, task_id)
                                        if parent_task:
                                            await _publish_image_task_progress(
                                                thread_session,
                                                parent_task,
                                                total=total_pages,
                                                completed=completed,
                                                failed=failed,
                                                completed_page_ids=completed_page_ids,
                                                failed_page_ids=failed_page_ids,
                                                current_page_id=page_id,
                                                current_page_status="COMPLETED",
                                            )
                                        
                                    return (page_id, image_path, None)
                                except Exception as exc:
                                    import traceback
                                    logger.error("Failed to generate image for page %s: %s", page_id, traceback.format_exc())
                                    
                                    page_obj = await thread_session.get(Page, page_id)
                                    if page_obj:
                                        page_obj.status = "FAILED"
                                        await thread_session.commit()

                                    async with progress_lock:
                                        failed += 1
                                        failed_page_ids.add(page_id)
                                        completed_page_ids.discard(page_id)

                                        parent_task = await thread_session.get(Task, task_id)
                                        if parent_task:
                                            await _publish_image_task_progress(
                                                thread_session,
                                                parent_task,
                                                total=total_pages,
                                                completed=completed,
                                                failed=failed,
                                                completed_page_ids=completed_page_ids,
                                                failed_page_ids=failed_page_ids,
                                                current_page_id=page_id,
                                                current_page_status="FAILED",
                                            )
                                        
                                    return (page_id, None, str(exc))

                tasks = []
                for page in pages:
                    page_order = int(page.order_index or 0)
                    page_data = page_data_by_order.get(page_order)
                    if page_data is None:
                        raise ValueError(f"Missing outline data for page {page.id} (order_index={page_order})")
                    tasks.append(generate_single_image(page.id, page_data, page_order + 1))

                await asyncio.gather(*tasks)

                from models import Project
                task = await session.get(Task, task_id)
                task_succeeded = True
                if task:
                    task_succeeded = finalize_generation_task(
                        task,
                        completed=completed,
                        failed=failed,
                        finished_at=datetime.utcnow(),
                    )
                    progress = task.get_progress()
                    progress.update(
                        {
                            "completed_page_ids": sorted(completed_page_ids),
                            "failed_page_ids": sorted(failed_page_ids),
                        }
                    )
                    task.set_progress(progress)
                    await session.commit()
                    await task_manager.publish_task_update(task.id, task.to_dict())

                project = await session.get(Project, project_id)
                if project:
                    project.status = "COMPLETED" if task_succeeded else "FAILED"
                    await session.commit()

            except Exception as exc:
                task = await session.get(Task, task_id)
                if task:
                    task.status = "FAILED"
                    task.error_message = str(exc)
                    task.completed_at = datetime.utcnow()
                    progress = task.get_progress()
                    progress["current_page_status"] = "FAILED"
                    task.set_progress(progress)

                from models import Project
                project = await session.get(Project, project_id)
                if project:
                    project.status = "FAILED"

                await session.commit()
                if task:
                    await task_manager.publish_task_update(task.id, task.to_dict())


async def generate_single_page_image_task(
    task_id: str,
    project_id: str,
    page_id: str,
    ai_service,
    file_service,
    outline: List[dict],
    use_template: bool = True,
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    runtime_config: dict | None = None,
    extra_requirements: str = None,
    language: str = None,
):
    """Generate a single page image in the background."""
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

                page.status = "GENERATING"
                await session.commit()

                ai_service = await get_ai_service_async()
                image_request_gate = get_shared_image_request_gate(
                    image_model=resolved_runtime_config.get("IMAGE_MODEL"),
                    runtime_config=resolved_runtime_config,
                )

                desc_content = page.get_description_content()
                if not desc_content:
                    raise ValueError("No description content for page")

                desc_text = desc_content.get("text", "")
                if not desc_text and desc_content.get("text_content"):
                    text_content = desc_content.get("text_content", [])
                    desc_text = "\n".join(text_content) if isinstance(text_content, list) else str(text_content)

                additional_ref_images = []
                has_material_images = False
                if desc_text:
                    image_urls = ai_service.extract_image_urls_from_markdown(desc_text)
                    if image_urls:
                        additional_ref_images = image_urls
                        has_material_images = True

                ref_image_path = file_service.get_template_path(project_id) if use_template else None
                page_data = page.get_outline_content() or {}
                if page.part:
                    page_data["part"] = page.part

                prompt = ai_service.generate_image_prompt(
                    outline,
                    page_data,
                    desc_text,
                    int(page.order_index) + 1,
                    has_material_images=has_material_images,
                    extra_requirements=extra_requirements,
                    language=language,
                    has_template=use_template,
                )
                async with image_request_gate.acquire():
                    image = await ai_service.call_async(
                        "generate_image",
                        prompt,
                        ref_image_path,
                        aspect_ratio,
                        resolution,
                        additional_ref_images=additional_ref_images if additional_ref_images else None,
                    )
                if not image:
                    raise ValueError("Failed to generate image")

                await save_image_with_version(session, image, project_id, page_id, file_service, page_obj=page)
                
                task = await session.get(Task, task_id)
                if task:
                    task.status = "COMPLETED"
                    task.completed_at = datetime.utcnow()
                    task.set_progress(
                        {
                            "total": 1,
                            "completed": 1,
                            "failed": 0,
                            "completed_page_ids": [page_id],
                            "failed_page_ids": [],
                            "current_page_id": page_id,
                            "current_page_status": "COMPLETED",
                        }
                    )
                    await session.commit()
                    await task_manager.publish_task_update(task.id, task.to_dict())
            except Exception as exc:
                import traceback
                logger.error("Task %s FAILED: %s", task_id, traceback.format_exc())
                task = await session.get(Task, task_id)
                if task:
                    task.status = "FAILED"
                    task.error_message = str(exc)
                    task.completed_at = datetime.now()
                    task.set_progress(
                        {
                            "total": 1,
                            "completed": 0,
                            "failed": 1,
                            "completed_page_ids": [],
                            "failed_page_ids": [page_id],
                            "current_page_id": page_id,
                            "current_page_status": "FAILED",
                        }
                    )

                page = await session.get(Page, page_id)
                if page:
                    page.status = "FAILED"
                await session.commit()
                if task:
                    await task_manager.publish_task_update(task.id, task.to_dict())


async def generate_material_image_task(
    task_id: str,
    project_id: str,
    prompt: str,
    ai_service,
    file_service,
    ref_image_path: str = None,
    additional_ref_images: List[str] = None,
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    temp_dir: str = None,
    runtime_config: dict | None = None,
    user_id: str = None,
):
    """Generate a standalone material image."""
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

                ai_service = await get_ai_service_async()
                image_request_gate = get_shared_image_request_gate(
                    image_model=resolved_runtime_config.get("IMAGE_MODEL"),
                    runtime_config=resolved_runtime_config,
                )
                async with image_request_gate.acquire():
                    image = await ai_service.call_async(
                        "generate_image",
                        prompt=prompt,
                        ref_image_path=ref_image_path,
                        aspect_ratio=aspect_ratio,
                        resolution=resolution,
                        additional_ref_images=additional_ref_images or None,
                    )
                if not image:
                    raise ValueError("Failed to generate image")

                actual_project_id = None if project_id in ("global", None) else project_id
                relative_path = file_service.save_material_image(image, actual_project_id)
                filename = Path(relative_path).name
                image_url = file_service.get_file_url(actual_project_id, "materials", filename)

                material = Material(
                    project_id=actual_project_id,
                    user_id=user_id or "1",
                    filename=filename,
                    relative_path=relative_path,
                    url=image_url,
                )
                session.add(material)
                await session.flush()

                task.status = "COMPLETED"
                task.completed_at = datetime.now()
                task.set_progress(
                    {
                        "total": 1,
                        "completed": 1,
                        "failed": 0,
                        "material_id": material.id,
                        "image_url": image_url,
                    }
                )
                await session.commit()
                await task_manager.publish_task_update(task.id, task.to_dict())
            except Exception as exc:
                import traceback
                logger.error("Task %s FAILED: %s", task_id, traceback.format_exc())
                task = await session.get(Task, task_id)
                if task:
                    task.status = "FAILED"
                    task.error_message = str(exc)
                    task.completed_at = datetime.now()
                    await session.commit()
                    await task_manager.publish_task_update(task.id, task.to_dict())
            finally:
                if temp_dir:
                    import shutil
                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir, ignore_errors=True)


__all__ = [
    "generate_images_task",
    "generate_material_image_task",
    "generate_single_page_image_task",
]
