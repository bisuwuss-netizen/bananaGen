"""Knowledge-base outline generation and project creation routes."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deps import CurrentUser, get_db, require_current_user
from models.project import Project
from models.reference_file import ReferenceFile
from models.task import Task
from schemas.common import SuccessResponse
from services.runtime_state import load_runtime_config
from services.tasks import generate_knowledge_base_outline_task, task_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/knowledge-base", tags=["knowledge-base"])


class GenerateOutlineRequest(BaseModel):
    reference_file_ids: list[str] = Field(default_factory=list)
    extra_requirements: str | None = None


class CreateKnowledgeBaseProjectRequest(BaseModel):
    outline_text: str
    reference_file_ids: list[str] = Field(default_factory=list)
    render_mode: Literal["image", "html"] = "html"
    scheme_id: str = "edu_dark"


async def _load_reference_files(
    db: AsyncSession,
    *,
    reference_file_ids: list[str],
    current_user: CurrentUser,
    require_completed: bool,
) -> list[ReferenceFile]:
    requested_ids = [file_id for file_id in reference_file_ids if str(file_id).strip()]
    if not requested_ids:
        raise HTTPException(status_code=400, detail="reference_file_ids is required")

    query = select(ReferenceFile).where(
        ReferenceFile.id.in_(requested_ids),
        ReferenceFile.user_id == current_user.user_id,
    )
    if require_completed:
        query = query.where(ReferenceFile.parse_status == "completed")

    result = await db.execute(query)
    files = result.scalars().all()
    if len(files) != len(set(requested_ids)):
        raise HTTPException(status_code=400, detail="Some reference files are missing or unavailable")
    return files


@router.post("/generate-outline", response_model=SuccessResponse, status_code=202)
async def generate_outline(
    body: GenerateOutlineRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    files = await _load_reference_files(
        db,
        reference_file_ids=body.reference_file_ids,
        current_user=current_user,
        require_completed=True,
    )

    task = Task(
        project_id=None,
        task_type="GENERATE_KNOWLEDGE_BASE_OUTLINE",
        status="PENDING",
    )
    task.set_progress(
        {
            "total": len(files),
            "completed": 0,
            "failed": 0,
            "percent": 0,
            "current_step": "等待开始",
            "messages": ["已创建文档大纲生成任务。"],
            "reference_file_ids": [item.id for item in files],
            "reference_file_names": [item.filename for item in files],
            "extra_requirements": body.extra_requirements,
            "outline_text": "",
        }
    )
    db.add(task)
    await db.commit()

    task_id = task.id
    try:
        task_manager.submit_task(
            task_id,
            generate_knowledge_base_outline_task,
            reference_file_ids=[item.id for item in files],
            user_id=current_user.user_id,
            extra_requirements=body.extra_requirements,
            runtime_config=load_runtime_config(),
        )
    except Exception as exc:
        logger.error("Failed to submit knowledge-base task %s: %s", task_id, exc, exc_info=True)
        task = await db.get(Task, task_id)
        if task:
            task.status = "FAILED"
            task.error_message = f"Submit failed: {exc}"
            task.completed_at = datetime.utcnow()
            await db.commit()
        return SuccessResponse(data={"task_id": task_id, "status": "FAILED", "error": str(exc)})

    return SuccessResponse(data={"task_id": task.id, "status": "PENDING"})


@router.post("/create-project", response_model=SuccessResponse, status_code=201)
async def create_project_from_knowledge_base(
    body: CreateKnowledgeBaseProjectRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    outline_text = str(body.outline_text or "").strip()
    if not outline_text:
        raise HTTPException(status_code=400, detail="outline_text is required")

    files = await _load_reference_files(
        db,
        reference_file_ids=body.reference_file_ids,
        current_user=current_user,
        require_completed=False,
    )

    project = Project(
        outline_text=outline_text,
        creation_type="outline",
        render_mode=body.render_mode,
        scheme_id=body.scheme_id,
        user_id=current_user.user_id,
        status="DRAFT",
    )
    db.add(project)
    await db.flush()

    now = datetime.utcnow()
    for item in files:
        item.project_id = project.id
        item.updated_at = now

    await db.commit()

    return SuccessResponse(data={"project_id": project.id, "status": project.status})
