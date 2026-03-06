"""Task manager primitives for FastAPI background work."""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime
from typing import Any, Callable, Coroutine

from models import Task, db

logger = logging.getLogger(__name__)


def _env_positive_int(name: str, default: int) -> int:
    """Read positive int env value with safe fallback."""
    try:
        value = int(os.getenv(name, str(default)))
        return value if value > 0 else default
    except (TypeError, ValueError):
        return default


def _safe_positive_int(value: Any, default: int) -> int:
    """Parse positive int from config values with safe fallback."""
    try:
        parsed = int(str(value).strip())
        return parsed if parsed > 0 else default
    except (TypeError, ValueError, AttributeError):
        return default


TASK_STALE_TIMEOUT_SECONDS = {
    "GENERATE_MATERIAL": _env_positive_int("TASK_TIMEOUT_GENERATE_MATERIAL_SECONDS", 15 * 60),
    "GENERATE_PAGE_IMAGE": _env_positive_int("TASK_TIMEOUT_GENERATE_PAGE_IMAGE_SECONDS", 20 * 60),
    "GENERATE_DESCRIPTIONS": _env_positive_int("TASK_TIMEOUT_GENERATE_DESCRIPTIONS_SECONDS", 20 * 60),
    "GENERATE_IMAGES": _env_positive_int("TASK_TIMEOUT_GENERATE_IMAGES_SECONDS", 90 * 60),
    "EXPORT_EDITABLE_PPTX": _env_positive_int("TASK_TIMEOUT_EXPORT_EDITABLE_PPTX_SECONDS", 6 * 60 * 60),
}
DEFAULT_TASK_STALE_TIMEOUT_SECONDS = _env_positive_int("TASK_TIMEOUT_DEFAULT_SECONDS", 2 * 60 * 60)


class TaskManager:
    """Async task manager using native asyncio for FastAPI background work."""

    def __init__(self):
        self.active_tasks: dict[str, asyncio.Task] = {}

    def submit_task(self, task_id: str, coro_func: Callable[..., Coroutine[Any, Any, Any]], *args, **kwargs):
        """Submit an async task to run in the background."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.get_event_loop()
        logger.info("submit_task %s: loop=%s running=%s", task_id, type(loop).__name__, loop.is_running())

        coro = coro_func(task_id, *args, **kwargs)
        logger.info("submit_task %s: coroutine created = %s", task_id, coro)
        # Create a new standalone task on the event loop
        task = loop.create_task(coro)
        logger.info("submit_task %s: asyncio.Task created = %s", task_id, task)
        self.active_tasks[task_id] = task
        
        # Attach callback for cleanup and error handling
        task.add_done_callback(lambda t: self._task_done_callback(task_id, t))

    def _task_done_callback(self, task_id: str, task: asyncio.Task):
        exception = None
        try:
            exception = task.exception()
            if exception:
                logger.error("Task %s failed with exception: %s", task_id, exception, exc_info=exception)
        except asyncio.CancelledError:
            logger.warning("Task %s was cancelled", task_id)
        except Exception as exc:
            logger.error("Error in task callback for %s: %s", task_id, exc, exc_info=True)
            exception = exc
        finally:
            self._cleanup_task(task_id)
            if exception:
                asyncio.ensure_future(self._mark_task_failed(task_id, str(exception)))

    async def _mark_task_failed(self, task_id: str, error_message: str):
        """Update task status to FAILED in DB when background task crashes."""
        try:
            from deps import async_session_factory
            async with async_session_factory() as session:
                from models import Task as TaskModel
                task = await session.get(TaskModel, task_id)
                if task and task.status in ("PENDING", "PROCESSING"):
                    task.status = "FAILED"
                    task.error_message = error_message[:500]
                    task.completed_at = datetime.utcnow()
                    await session.commit()
                    logger.info("Marked crashed task %s as FAILED", task_id)
        except Exception as e:
            logger.error("Failed to mark task %s as FAILED: %s", task_id, e)

    def _cleanup_task(self, task_id: str):
        self.active_tasks.pop(task_id, None)

    def is_task_active(self, task_id: str) -> bool:
        return task_id in self.active_tasks

    async def shutdown(self):
        """Cancel all running tasks and wait for them to finish."""
        tasks = list(self.active_tasks.values())
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


task_manager = TaskManager()


def _get_stale_timeout_seconds(task_type: str) -> int:
    if not task_type:
        return DEFAULT_TASK_STALE_TIMEOUT_SECONDS
    return TASK_STALE_TIMEOUT_SECONDS.get(task_type, DEFAULT_TASK_STALE_TIMEOUT_SECONDS)


def auto_fail_stale_task(task: Task) -> bool:
    """Auto-fail stale task to prevent infinite polling."""
    if not task or task.status not in ("PENDING", "PROCESSING"):
        return False

    if task_manager.is_task_active(task.id):
        return False

    now = datetime.utcnow()
    created_at = task.created_at or now
    if isinstance(created_at, str):
        raw = created_at.strip()
        try:
            created_at = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if created_at.tzinfo is not None:
                created_at = created_at.astimezone().replace(tzinfo=None)
        except Exception:
            logger.warning("Invalid created_at for task %s: %s, fallback to now", task.id, raw)
            created_at = now

    age_seconds = max(0, int((now - created_at).total_seconds()))
    timeout_seconds = _get_stale_timeout_seconds(task.task_type)
    if age_seconds < timeout_seconds:
        return False

    task.status = "FAILED"
    task.completed_at = now
    if not task.error_message:
        task.error_message = (
            f"Task timed out after {age_seconds}s and no active worker was found. "
            f"Marked as FAILED to stop infinite polling."
        )

    try:
        progress = task.get_progress()
        if isinstance(progress, dict):
            total = int(progress.get("total", 0) or 0)
            completed = int(progress.get("completed", 0) or 0)
            failed = int(progress.get("failed", 0) or 0)
            remaining = max(0, total - completed)
            progress["failed"] = max(failed, remaining or 1)
            task.set_progress(progress)
    except Exception:
        logger.debug("Failed to normalize progress for stale task %s", task.id, exc_info=True)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.error("Failed to commit stale task status for %s", task.id, exc_info=True)
        return False

    logger.warning(
        "Auto-failed stale task %s: type=%s, age=%ss, timeout=%ss, project=%s",
        task.id,
        task.task_type,
        age_seconds,
        timeout_seconds,
        task.project_id,
    )
    return True


__all__ = [
    "DEFAULT_TASK_STALE_TIMEOUT_SECONDS",
    "TASK_STALE_TIMEOUT_SECONDS",
    "TaskManager",
    "_env_positive_int",
    "_get_stale_timeout_seconds",
    "_safe_positive_int",
    "auto_fail_stale_task",
    "task_manager",
]
