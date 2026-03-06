"""User template routes. Migrated from template_controller.py."""
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Cookie
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from deps import get_db
from models.user_template import UserTemplate
from schemas.common import SuccessResponse
from config_fastapi import settings as app_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user-templates", tags=["user-templates"])


def _resolve_user_id(
    user_id: str | None = Query(None),
    user_id_cookie: str | None = Cookie(None, alias="user_id"),
) -> str | None:
    for v in (user_id, user_id_cookie):
        if v and str(v).strip():
            return str(v).strip()
    return None


@router.post("", response_model=SuccessResponse, status_code=201)
async def upload_user_template(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(_resolve_user_id),
):
    form = await request.form()
    file = form.get("template_image")
    if not file:
        raise HTTPException(400, "No file uploaded")

    name = form.get("name")
    content = await file.read()
    file_size = len(content)
    await file.seek(0)

    template_id = str(uuid.uuid4())

    from services.file_service import FileService

    file_service = FileService(app_settings.upload_folder)
    file_path = file_service.save_user_template(file, template_id)

    now = datetime.now()
    template = UserTemplate(
        id=template_id,
        user_id=int(user_id) if user_id else 1,
        name=name,
        file_path=file_path,
        file_size=file_size,
        created_at=now,
        updated_at=now,
    )
    db.add(template)
    await db.flush()

    return SuccessResponse(data=template.to_dict())


@router.get("", response_model=SuccessResponse)
async def list_user_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=100),
    user_id: str | None = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
):
    base = select(UserTemplate).order_by(UserTemplate.created_at.desc())
    count_base = select(func.count(UserTemplate.id))

    if user_id:
        query = base.where(UserTemplate.user_id == int(user_id))
        count_q = count_base.where(UserTemplate.user_id == int(user_id))
    else:
        query = base
        count_q = count_base

    total = (await db.execute(count_q)).scalar() or 0

    # Fallback: if user_id filter returns 0, try unfiltered
    if user_id and total == 0:
        query = base
        count_q = count_base
        total = (await db.execute(count_q)).scalar() or 0

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


@router.delete("/{template_id}", response_model=SuccessResponse)
async def delete_user_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
):
    template = await db.get(UserTemplate, template_id)
    if not template:
        raise HTTPException(404, "Template not found")

    from services.file_service import FileService

    file_service = FileService(app_settings.upload_folder)
    file_service.delete_user_template(template_id)

    await db.delete(template)
    await db.flush()

    return SuccessResponse(message="Template deleted")
