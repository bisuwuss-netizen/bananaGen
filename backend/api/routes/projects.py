"""
Project CRUD routes.

Handles: list, create, get, update, delete projects.
Extracted from the original project_controller.py (lines 162-426).
"""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Cookie, HTTPException
from sqlalchemy import select, desc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from deps import get_db
from models.project import Project
from models.page import Page
from schemas.project import (
    CreateProjectRequest, UpdateProjectRequest,
    ProjectResponse, ProjectListResponse,
)
from schemas.common import SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects"])


def _resolve_user_id(
    user_id: str | None = Query(None),
    user_id_cookie: str | None = Cookie(None, alias="user_id"),
) -> str | None:
    """Resolve user_id from query param/cookie. Empty value means no user filter."""
    return user_id or user_id_cookie or None


@router.get("", response_model=SuccessResponse)
async def list_projects(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str | None = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/projects - List all projects with pagination.
    
    Original: project_controller.py list_projects() (lines 162-212)
    """
    query = select(Project)
    count_query = select(func.count(Project.id))

    if user_id:
        # Backward compatibility: include legacy rows that were created before user_id isolation.
        user_filter = or_(Project.user_id == user_id, Project.user_id.is_(None))
        query = query.where(user_filter)
        count_query = count_query.where(user_filter)

    query = (
        query
        .options(selectinload(Project.pages), selectinload(Project.tasks))
        .order_by(desc(Project.updated_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    projects = result.scalars().all()

    total = (await db.execute(count_query)).scalar() or 0

    return SuccessResponse(data={
        "projects": [
            _project_to_dict(
                p,
                include_pages=True,
                page_summary=True,
                include_latest_generation_task=True,
            )
            for p in projects
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@router.post("", response_model=SuccessResponse, status_code=201)
async def create_project(
    req: CreateProjectRequest,
    user_id: str | None = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    POST /api/projects - Create a new project.
    
    Original: project_controller.py create_project() (lines 215-295)
    Pydantic validates creation_type, render_mode etc. automatically.
    """
    project = Project(
        idea_prompt=req.idea_prompt,
        outline_text=req.outline_text,
        description_text=req.description_text,
        creation_type=req.creation_type,
        template_style=req.template_style,
        render_mode=req.render_mode,
        scheme_id=req.scheme_id,
        user_id=user_id or "1",
        status="DRAFT",
    )
    db.add(project)
    await db.flush()

    logger.info(f"Created project {project.id} (type={req.creation_type}, mode={req.render_mode})")
    return SuccessResponse(data={"project_id": project.id, "status": project.status})


@router.get("/{project_id}", response_model=SuccessResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    GET /api/projects/{project_id} - Get project details with pages.
    
    Original: project_controller.py get_project() (lines 298-317)
    """
    query = (
        select(Project)
        .options(selectinload(Project.pages), selectinload(Project.tasks))
        .where(Project.id == project_id)
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    return SuccessResponse(
        data=_project_to_dict(
            project,
            include_pages=True,
            include_latest_generation_task=True,
        )
    )


@router.put("/{project_id}", response_model=SuccessResponse)
async def update_project(
    project_id: str,
    req: UpdateProjectRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    PUT /api/projects/{project_id} - Update project fields.
    
    Original: project_controller.py update_project() (lines 320-398)
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # Update only provided fields
    update_data = req.model_dump(exclude_unset=True)

    # Handle pages_order separately
    pages_order = update_data.pop("pages_order", None)

    for field, value in update_data.items():
        setattr(project, field, value)

    # Reorder pages if provided
    if pages_order:
        for idx, page_id in enumerate(pages_order):
            query = select(Page).where(Page.id == page_id, Page.project_id == project_id)
            result = await db.execute(query)
            page = result.scalar_one_or_none()
            if page:
                page.order_index = idx

    project.updated_at = datetime.now()
    await db.flush()

    return SuccessResponse(data=_project_to_dict(project))


@router.delete("/{project_id}", response_model=SuccessResponse)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    DELETE /api/projects/{project_id} - Delete project and all related data.
    
    Original: project_controller.py delete_project() (lines 401-426)
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    await db.delete(project)
    await db.flush()

    logger.info(f"Deleted project {project_id}")
    return SuccessResponse(message=f"Project {project_id} deleted")


# ── Helpers ──────────────────────────────────────────────────────

def _project_to_dict(
    project: Project,
    include_pages: bool = False,
    page_summary: bool = False,
    include_latest_generation_task: bool = False,
) -> dict:
    """
    Convert Project ORM object to response dict.
    
    Temporary bridge during migration - will eventually be replaced
    by Pydantic model_validate(project) once models use from_attributes.
    """
    return project.to_dict(
        include_pages=include_pages,
        page_summary=page_summary,
        include_latest_generation_task=include_latest_generation_task,
    )
