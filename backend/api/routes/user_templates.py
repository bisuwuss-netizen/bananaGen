"""User template routes. Migrated from template_controller.py."""
import uuid
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Cookie
from sqlalchemy import select, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from deps import get_db
from models import format_datetime_to_iso
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


async def _user_templates_has_user_id(db: AsyncSession) -> bool:
    result = await db.execute(text("SHOW COLUMNS FROM user_templates LIKE 'user_id'"))
    return result.first() is not None


def _legacy_template_to_dict(row) -> dict:
    file_path = row["file_path"]
    filename = Path(file_path).name
    return {
        "template_id": row["id"],
        "name": row["name"],
        "template_image_url": f"/files/user-templates/{row['id']}/{filename}",
        "created_at": format_datetime_to_iso(row["created_at"]),
        "updated_at": format_datetime_to_iso(row["updated_at"]),
    }


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
    has_user_id_column = await _user_templates_has_user_id(db)

    if not has_user_id_column:
        await db.execute(
            text(
                """
                INSERT INTO user_templates (id, name, file_path, file_size, created_at, updated_at)
                VALUES (:id, :name, :file_path, :file_size, :created_at, :updated_at)
                """
            ),
            {
                "id": template_id,
                "name": name,
                "file_path": file_path,
                "file_size": file_size,
                "created_at": now,
                "updated_at": now,
            },
        )
        return SuccessResponse(
            data=_legacy_template_to_dict(
                {
                    "id": template_id,
                    "name": name,
                    "file_path": file_path,
                    "created_at": now,
                    "updated_at": now,
                }
            )
        )

    template = UserTemplate(
        id=template_id,
        user_id=user_id or "1",
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
    has_user_id_column = await _user_templates_has_user_id(db)

    if not has_user_id_column:
        total = (await db.execute(text("SELECT COUNT(*) FROM user_templates"))).scalar() or 0
        result = await db.execute(
            text(
                """
                SELECT id, name, file_path, created_at, updated_at
                FROM user_templates
                ORDER BY created_at DESC
                LIMIT :offset, :page_size
                """
            ),
            {
                "offset": (page - 1) * page_size,
                "page_size": page_size,
            },
        )
        rows = result.mappings().all()
        total_pages = ((total - 1) // page_size) + 1 if total > 0 else 0
        return SuccessResponse(data={
            "templates": [_legacy_template_to_dict(row) for row in rows],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
        })

    base = select(UserTemplate).order_by(UserTemplate.created_at.desc())
    count_base = select(func.count(UserTemplate.id))

    if user_id:
        user_filter = or_(UserTemplate.user_id == user_id, UserTemplate.user_id.is_(None))
        query = base.where(user_filter)
        count_q = count_base.where(user_filter)
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
    has_user_id_column = await _user_templates_has_user_id(db)

    if not has_user_id_column:
        template_row = (
            await db.execute(
                text("SELECT id FROM user_templates WHERE id = :template_id"),
                {"template_id": template_id},
            )
        ).first()
        if not template_row:
            raise HTTPException(404, "Template not found")

        from services.file_service import FileService

        file_service = FileService(app_settings.upload_folder)
        file_service.delete_user_template(template_id)

        await db.execute(
            text("DELETE FROM user_templates WHERE id = :template_id"),
            {"template_id": template_id},
        )
        return SuccessResponse(message="Template deleted")

    template = await db.get(UserTemplate, template_id)
    if not template:
        raise HTTPException(404, "Template not found")

    from services.file_service import FileService

    file_service = FileService(app_settings.upload_folder)
    file_service.delete_user_template(template_id)

    await db.delete(template)
    await db.flush()

    return SuccessResponse(message="Template deleted")
