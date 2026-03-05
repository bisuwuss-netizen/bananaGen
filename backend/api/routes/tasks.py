"""
Task status route.

Extracted from project_controller.py get_task_status() (lines 926-945).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deps import get_db
from models.task import Task
from schemas.common import SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["tasks"])


@router.get("/{project_id}/tasks/{task_id}", response_model=SuccessResponse)
async def get_task_status(
    project_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/projects/{project_id}/tasks/{task_id} - Get task status.
    
    Original: project_controller.py get_task_status() (lines 926-945)
    """
    query = select(Task).where(Task.id == task_id, Task.project_id == project_id)
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    # Auto-fail stale tasks
    from services.task_manager import auto_fail_stale_task
    if auto_fail_stale_task(task):
        await db.flush()

    return SuccessResponse(data=task.to_dict())
