"""
Task status and progress routes.

Extracted from project_controller.py get_task_status() (lines 926-945) and
extended with WebSocket progress streaming for the FastAPI runtime.
"""
import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deps import async_session_factory, get_db
from models.task import Task
from schemas.common import SuccessResponse
from services.tasks import _get_stale_timeout_seconds, task_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["tasks"])


async def _load_task(
    db: AsyncSession,
    project_id: str,
    task_id: str,
) -> Task | None:
    if project_id in ("none", "global", "_none"):
        query = select(Task).where(Task.id == task_id, Task.project_id.is_(None))
    else:
        query = select(Task).where(Task.id == task_id, Task.project_id == project_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _auto_fail_stale_task_async(db: AsyncSession, task: Task | None) -> bool:
    """FastAPI-native stale-task handling without relying on Flask's sync session."""
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
            logger.warning("Invalid created_at for task %s: %s", task.id, raw)
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
            "Marked as FAILED to stop infinite polling."
        )

    progress = task.get_progress()
    if isinstance(progress, dict):
        total = int(progress.get("total", 0) or 0)
        completed = int(progress.get("completed", 0) or 0)
        failed = int(progress.get("failed", 0) or 0)
        remaining = max(0, total - completed)
        progress["failed"] = max(failed, remaining or 1)
        task.set_progress(progress)

    await db.flush()
    return True


@router.get("/{project_id}/tasks/{task_id}", response_model=SuccessResponse)
async def get_task_status(
    project_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """GET /api/projects/{project_id}/tasks/{task_id} - Get task status."""
    task = await _load_task(db, project_id, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    await _auto_fail_stale_task_async(db, task)
    return SuccessResponse(data=task.to_dict())


@router.websocket("/{project_id}/tasks/{task_id}/ws")
async def stream_task_status(
    websocket: WebSocket,
    project_id: str,
    task_id: str,
):
    """Push task progress updates without client polling."""
    await websocket.accept()

    try:
        while True:
            async with async_session_factory() as db:
                task = await _load_task(db, project_id, task_id)
                if not task:
                    await websocket.send_json(
                        {"task_id": task_id, "status": "FAILED", "error_message": "Task not found"}
                    )
                    return

                if await _auto_fail_stale_task_async(db, task):
                    await db.commit()
                    await db.refresh(task)

                await websocket.send_json(task.to_dict())
                if task.status in ("COMPLETED", "FAILED"):
                    return

            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        logger.debug("Task WebSocket disconnected: %s", task_id)
