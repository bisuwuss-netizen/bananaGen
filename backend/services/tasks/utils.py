"""Task utilities shared across background task modules."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy import func, select, update

from models import PageImageVersion

logger = logging.getLogger(__name__)

_TASK_LABELS = {
    "GENERATE_DESCRIPTIONS": "内容生成",
    "GENERATE_IMAGES": "图片生成",
    "GENERATE_PAGE_IMAGE": "图片生成",
}


def _chunked(items: list[Any], chunk_size: int) -> list[list[Any]]:
    """Split list into chunks."""
    if chunk_size <= 0:
        chunk_size = 1
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


from sqlalchemy.ext.asyncio import AsyncSession


def build_generation_failure_message(
    task_type: str,
    total: int,
    completed: int,
    failed: int,
) -> str:
    """Build a concise task-level failure summary for history/status surfaces."""
    label = _TASK_LABELS.get(task_type or "", "生成任务")
    safe_total = max(total, completed + failed, failed, 1)
    if completed > 0:
        return f"{label}部分失败：{failed}/{safe_total} 页未成功完成"
    return f"{label}失败：{failed}/{safe_total} 页未成功完成"


def finalize_generation_task(
    task,
    *,
    completed: int,
    failed: int,
    finished_at: datetime | None = None,
) -> bool:
    """Mark a generation task as completed or failed based on page-level outcome."""
    progress = task.get_progress() if hasattr(task, "get_progress") else {}
    total = int((progress or {}).get("total", 0) or 0)
    task.update_progress(completed=completed, failed=failed)
    task.completed_at = finished_at or datetime.utcnow()

    if failed > 0:
        task.status = "FAILED"
        task.error_message = build_generation_failure_message(
            task_type=getattr(task, "task_type", ""),
            total=total,
            completed=completed,
            failed=failed,
        )
        return False

    task.status = "COMPLETED"
    task.error_message = None
    return True

async def save_image_with_version(
    session: AsyncSession,
    image,
    project_id: str,
    page_id: str,
    file_service,
    page_obj=None,
    image_format: str = "PNG",
) -> tuple[str, int]:
    """Save image and create a current version record."""
    result = await session.execute(
        select(func.max(PageImageVersion.version_number))
        .where(PageImageVersion.page_id == page_id)
    )
    max_version = result.scalar() or 0
    next_version = max_version + 1

    await session.execute(
        update(PageImageVersion)
        .where(PageImageVersion.page_id == page_id)
        .values(is_current=False)
    )

    image_path = file_service.save_generated_image(
        image,
        project_id,
        page_id,
        version_number=next_version,
        image_format=image_format,
    )

    new_version = PageImageVersion(
        page_id=page_id,
        image_path=image_path,
        version_number=next_version,
        is_current=True,
    )
    session.add(new_version)

    if page_obj:
        page_obj.generated_image_path = image_path
        page_obj.status = "COMPLETED"
        page_obj.updated_at = datetime.utcnow()

    await session.flush()
    logger.debug("Page %s image saved as version %s: %s", page_id, next_version, image_path)
    return image_path, next_version

__all__ = [
    "_chunked",
    "build_generation_failure_message",
    "finalize_generation_task",
    "save_image_with_version",
]
