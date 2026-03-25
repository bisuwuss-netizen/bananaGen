"""
Enhanced Image Task with Concurrency Protection

这是对 image_task.py 的增强示例，展示如何使用新的并发控制机制
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Set

from sqlalchemy import select

from deps import async_session_factory
from models import Page, Task
from services.concurrency_limits import (
    db_session_with_limit,
    SafeSemaphore,
    get_concurrency_manager,
)
from services.image_request_policy import (
    get_shared_image_request_gate,
    resolve_image_request_policy,
)
from services.runtime_state import load_runtime_config, runtime_context

logger = logging.getLogger(__name__)


# 增强的 generate_images_task 示例
async def generate_images_task_enhanced(
    task_id: str,
    project_id: str,
    ai_service,
    file_service,
    outline: list[dict],
    use_template: bool = True,
    max_workers: int = 4,
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    runtime_config: dict | None = None,
    extra_requirements: str = None,
    language: str = None,
    page_ids: list = None,
):
    """
    增强版的图片生成任务
    
    改进点:
    1. 使用 SafeSemaphore 替代 asyncio.Semaphore，异常安全
    2. 使用 db_session_with_limit 限制数据库连接数
    3. 添加任务级超时控制
    4. 更好的错误处理和恢复
    """
    resolved_runtime_config = runtime_config or load_runtime_config()
    from services.ai_service_manager import get_ai_service_async
    from services.tasks.manager import task_manager
    from services.tasks.utils import finalize_generation_task, save_image_with_version
    from models import Project

    # 任务级超时（90分钟）
    task_timeout = 90 * 60
    task_start_time = datetime.utcnow()

    async def check_task_timeout():
        """检查任务是否超时"""
        elapsed = (datetime.utcnow() - task_start_time).total_seconds()
        if elapsed > task_timeout:
            raise TimeoutError(f"Task exceeded maximum runtime of {task_timeout}s")

    with runtime_context(resolved_runtime_config):
        # 使用数据库连接限制
        async with db_session_with_limit(
            async_session_factory,
            limiter_name="image_generation",
            max_connections=5,  # 限制图片生成任务的数据库连接数
            timeout=30.0
        ) as session:
            try:
                task = await session.get(Task, task_id)
                if not task:
                    logger.error(f"Task {task_id} not found")
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
                
                # 初始化进度
                completed_page_ids: Set[str] = set()
                failed_page_ids: Set[str] = set()
                task.set_progress({
                    "total": total_pages,
                    "completed": 0,
                    "failed": 0,
                    "completed_page_ids": [],
                    "failed_page_ids": [],
                })
                await session.commit()
                await task_manager.publish_task_update(task.id, task.to_dict())

                completed = 0
                failed = 0
                
                # 使用 SafeSemaphore 替代 asyncio.Semaphore
                semaphore = SafeSemaphore(image_policy.max_workers, "image_generation")
                progress_lock = asyncio.Lock()

                async def generate_single_image(page_id, page_data, page_index):
                    """生成单张图片 - 使用异常安全的信号量"""
                    nonlocal completed, failed
                    
                    # 检查任务超时
                    await check_task_timeout()
                    
                    # 使用 SafeSemaphore.acquire() 上下文管理器，确保异常时正确释放
                    async with semaphore.acquire(timeout=60.0):
                        with runtime_context(resolved_runtime_config):
                            # 使用数据库连接限制
                            async with db_session_with_limit(
                                async_session_factory,
                                limiter_name="image_gen_worker",
                                max_connections=3,
                                timeout=20.0
                            ) as thread_session:
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
                                    
                                    # 使用 image_request_gate 限制图片请求速率
                                    async with image_request_gate.acquire():
                                        # 使用熔断器保护的调用
                                        from services.ai_base_enhanced import safe_generate_image
                                        image = await safe_generate_image(
                                            ai_service.image_provider,
                                            prompt,
                                            additional_ref_images=page_additional_ref_images if page_additional_ref_images else None,
                                            aspect_ratio=aspect_ratio,
                                            resolution=resolution,
                                        )
                                    
                                    if not image:
                                        raise ValueError("Failed to generate image")

                                    # 保存图片
                                    image_path, _ = await save_image_with_version(
                                        thread_session,
                                        image,
                                        project_id,
                                        page_id,
                                        file_service,
                                        page_obj=page_obj,
                                    )

                                    # 更新进度
                                    async with progress_lock:
                                        completed += 1
                                        completed_page_ids.add(page_id)
                                        failed_page_ids.discard(page_id)

                                        parent_task = await thread_session.get(Task, task_id)
                                        if parent_task:
                                            parent_task.set_progress({
                                                "total": total_pages,
                                                "completed": completed,
                                                "failed": failed,
                                                "completed_page_ids": sorted(completed_page_ids),
                                                "failed_page_ids": sorted(failed_page_ids),
                                                "current_page_id": page_id,
                                                "current_page_status": "COMPLETED",
                                            })
                                            await thread_session.commit()
                                            await task_manager.publish_task_update(
                                                parent_task.id, parent_task.to_dict()
                                            )
                                    
                                    return (page_id, image_path, None)
                                    
                                except Exception as exc:
                                    import traceback
                                    logger.error(
                                        "Failed to generate image for page %s: %s",
                                        page_id,
                                        traceback.format_exc()
                                    )
                                    
                                    # 更新页面状态为失败
                                    page_obj = await thread_session.get(Page, page_id)
                                    if page_obj:
                                        page_obj.status = "FAILED"
                                        await thread_session.commit()

                                    # 更新失败进度
                                    async with progress_lock:
                                        failed += 1
                                        failed_page_ids.add(page_id)
                                        completed_page_ids.discard(page_id)

                                        parent_task = await thread_session.get(Task, task_id)
                                        if parent_task:
                                            parent_task.set_progress({
                                                "total": total_pages,
                                                "completed": completed,
                                                "failed": failed,
                                                "completed_page_ids": sorted(completed_page_ids),
                                                "failed_page_ids": sorted(failed_page_ids),
                                                "current_page_id": page_id,
                                                "current_page_status": "FAILED",
                                            })
                                            await thread_session.commit()
                                            await task_manager.publish_task_update(
                                                parent_task.id, parent_task.to_dict()
                                            )
                                    
                                    return (page_id, None, str(exc))

                # 创建所有任务
                tasks = []
                for page in pages:
                    page_order = int(page.order_index or 0)
                    page_data = page_data_by_order.get(page_order)
                    if page_data is None:
                        logger.error(f"Missing outline data for page {page.id}")
                        continue
                    tasks.append(generate_single_image(page.id, page_data, page_order + 1))

                # 使用 asyncio.gather 等待所有任务完成
                # 添加整体超时保护
                try:
                    await asyncio.wait_for(
                        asyncio.gather(*tasks, return_exceptions=True),
                        timeout=task_timeout
                    )
                except asyncio.TimeoutError:
                    logger.error(f"Task {task_id} timed out after {task_timeout}s")
                    # 标记未完成的页面为失败
                    for page in pages:
                        if page.id not in completed_page_ids:
                            failed_page_ids.add(page.id)
                    failed = len(failed_page_ids)

                # 完成任务处理
                task = await session.get(Task, task_id)
                task_succeeded = True
                if task:
                    task_succeeded = finalize_generation_task(
                        task,
                        completed=completed,
                        failed=failed,
                        finished_at=datetime.utcnow(),
                    )
                    task.set_progress({
                        "total": total_pages,
                        "completed": completed,
                        "failed": failed,
                        "completed_page_ids": sorted(completed_page_ids),
                        "failed_page_ids": sorted(failed_page_ids),
                    })
                    await session.commit()
                    await task_manager.publish_task_update(task.id, task.to_dict())

                # 更新项目状态
                project = await session.get(Project, project_id)
                if project:
                    project.status = "COMPLETED" if task_succeeded else "FAILED"
                    await session.commit()

            except Exception as exc:
                import traceback
                logger.error(f"Task {task_id} FAILED: {traceback.format_exc()}")
                
                task = await session.get(Task, task_id)
                if task:
                    task.status = "FAILED"
                    task.error_message = str(exc)
                    task.completed_at = datetime.utcnow()
                    task.set_progress({
                        "current_page_status": "FAILED",
                        "error": str(exc),
                    })
                
                project = await session.get(Project, project_id)
                if project:
                    project.status = "FAILED"
                
                await session.commit()
                if task:
                    await task_manager.publish_task_update(task.id, task.to_dict())


__all__ = ["generate_images_task_enhanced"]
