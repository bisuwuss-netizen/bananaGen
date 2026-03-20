"""System template routes. Migrated from template_controller.py."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from deps import CurrentUser, get_db, get_project_for_user, require_current_user
from models.project import Project
from models.template import Template
from schemas.common import SuccessResponse
from config_fastapi import settings as app_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["templates"])

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


@router.post("/{project_id}/template", response_model=SuccessResponse)
async def upload_template(
    project_id: str,
    request: Request,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)

    form = await request.form()
    file = form.get("template_image")
    if not file:
        raise HTTPException(400, "No file uploaded")

    from services.file_service import FileService
    from datetime import datetime

    file_service = FileService(app_settings.upload_folder)
    file_path = file_service.save_template_image(file, project_id)

    project.template_image_path = file_path
    project.updated_at = datetime.now()
    await db.flush()

    return SuccessResponse(data={
        "template_image_url": f"/files/{project_id}/template/{file_path.split('/')[-1]}"
    })


@router.delete("/{project_id}/template", response_model=SuccessResponse)
async def delete_template(
    project_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)
    if not project.template_image_path:
        raise HTTPException(400, "No template to delete")

    from services.file_service import FileService
    from datetime import datetime

    file_service = FileService(app_settings.upload_folder)
    file_service.delete_template(project_id)

    project.template_image_path = None
    project.updated_at = datetime.now()
    await db.flush()

    return SuccessResponse(message="Template deleted")


@router.get("/templates", response_model=SuccessResponse)
async def get_system_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Template)
        .where(or_(Template.status == 1, Template.status.is_(None)))
        .order_by(Template.id)
    )
    count_query = (
        select(func.count(Template.id))
        .where(or_(Template.status == 1, Template.status.is_(None)))
    )

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    templates = result.scalars().all()

    total_pages = ((total - 1) // page_size) + 1 if total > 0 else 0
    return SuccessResponse(data={
        "templates": [t.to_dict() for t in templates],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    })
