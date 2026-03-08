"""Material routes. Migrated from material_controller.py."""
import shutil
import tempfile
import time
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Cookie
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from werkzeug.utils import secure_filename

from deps import get_db
from models.project import Project
from models.material import Material
from models.task import Task
from schemas.common import SuccessResponse
from config_fastapi import settings as app_settings
from services.runtime_state import load_runtime_config

logger = logging.getLogger(__name__)
router = APIRouter(tags=["materials"])

ALLOWED_MATERIAL_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}


def _resolve_user_id(
    user_id: str | None = Query(None),
    user_id_cookie: str | None = Cookie(None, alias="user_id"),
) -> str | None:
    for v in (user_id, user_id_cookie):
        if v and str(v).strip():
            return str(v).strip()
    return None


async def _get_materials_list(
    db: AsyncSession,
    filter_project_id: str,
    user_id: str | None = None,
) -> list[dict]:
    query = select(Material)

    if filter_project_id == "none":
        query = query.where(Material.project_id.is_(None))
    elif filter_project_id != "all":
        query = query.where(Material.project_id == filter_project_id)

    if user_id:
        query = query.where(or_(Material.user_id == user_id, Material.user_id.is_(None)))

    query = query.order_by(Material.created_at.desc())
    result = await db.execute(query)
    materials = result.scalars().all()

    # Fallback if user_id filter returns empty
    if user_id and not materials:
        fallback = select(Material).order_by(Material.created_at.desc())
        if filter_project_id == "none":
            fallback = fallback.where(Material.project_id.is_(None))
        elif filter_project_id != "all":
            fallback = fallback.where(Material.project_id == filter_project_id)
        result = await db.execute(fallback)
        materials = result.scalars().all()

    from services.file_service import FileService

    file_service = FileService(app_settings.upload_folder)
    valid = []
    orphan_ids = []
    for m in materials:
        abs_path = Path(file_service.get_absolute_path(m.relative_path))
        if abs_path.exists():
            valid.append(m)
        else:
            orphan_ids.append(m.id)

    if orphan_ids:
        for oid in orphan_ids:
            obj = await db.get(Material, oid)
            if obj:
                await db.delete(obj)
        await db.flush()

    return [m.to_dict() for m in valid]


# ── Project-scoped endpoints ─────────────────────────────────

@router.get("/api/projects/{project_id}/materials", response_model=SuccessResponse)
async def list_materials(
    project_id: str,
    user_id: str | None = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
):
    materials = await _get_materials_list(db, project_id, user_id)
    return SuccessResponse(data={"materials": materials, "count": len(materials)})


@router.post("/api/projects/{project_id}/materials/upload", response_model=SuccessResponse, status_code=201)
async def upload_material(
    project_id: str,
    request: Request,
    user_id: str | None = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
):
    form = await request.form()
    file = form.get("file")
    if not file or not file.filename:
        raise HTTPException(400, "file is required")

    filename = secure_filename(file.filename)
    file_ext = Path(filename).suffix.lower()
    if file_ext not in ALLOWED_MATERIAL_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_MATERIAL_EXTENSIONS))}")

    from services.file_service import FileService

    file_service = FileService(app_settings.upload_folder)
    target_project_id = None if project_id == "none" else project_id

    if target_project_id:
        materials_dir = file_service._get_materials_dir(target_project_id)
    else:
        materials_dir = file_service.upload_folder / "materials"
        materials_dir.mkdir(exist_ok=True, parents=True)

    timestamp = int(time.time() * 1000)
    base_name = Path(filename).stem
    unique_filename = f"{base_name}_{timestamp}{file_ext}"
    filepath = materials_dir / unique_filename

    content = await file.read()
    with open(str(filepath), "wb") as f:
        f.write(content)

    relative_path = filepath.relative_to(file_service.upload_folder).as_posix()
    if target_project_id:
        image_url = file_service.get_file_url(target_project_id, "materials", unique_filename)
    else:
        image_url = f"/files/materials/{unique_filename}"

    material = Material(
        project_id=target_project_id,
        user_id=user_id or "1",
        filename=unique_filename,
        relative_path=relative_path,
        url=image_url,
    )
    db.add(material)
    await db.flush()

    return SuccessResponse(data=material.to_dict())


@router.post("/api/projects/{project_id}/materials/generate", response_model=SuccessResponse, status_code=202)
async def generate_material_image(
    project_id: str,
    request: Request,
    user_id: str | None = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
):
    if project_id != "none":
        project = await db.get(Project, project_id)
        if not project:
            raise HTTPException(404, "Project not found")

    form = await request.form()
    data = dict(form)
    prompt = (data.get("prompt") or "").strip()
    if not prompt:
        raise HTTPException(400, "prompt is required")

    task_project_id = project_id if project_id != "none" else "global"

    task = Task(
        project_id=task_project_id,
        task_type="GENERATE_MATERIAL",
        status="PENDING",
    )
    task.set_progress({"total": 1, "completed": 0, "failed": 0})
    db.add(task)
    await db.commit()

    from services.ai_service_manager import get_ai_service
    from services.file_service import FileService
    from services.tasks import generate_material_image_task, task_manager

    ai_service = get_ai_service()
    file_service = FileService(app_settings.upload_folder)
    runtime_config = load_runtime_config()
    temp_dir = Path(tempfile.mkdtemp(dir=app_settings.upload_folder))
    ref_path_str: str | None = None
    additional_ref_images: list[str] = []

    try:
        ref_file = form.get("ref_image")
        if ref_file and getattr(ref_file, "filename", None):
            ref_filename = secure_filename(ref_file.filename or "ref.png")
            ref_path = temp_dir / ref_filename
            with open(ref_path, "wb") as f:
                f.write(await ref_file.read())
            ref_path_str = str(ref_path)

        extra_files = form.getlist("extra_images") if hasattr(form, "getlist") else []
        for extra in extra_files:
            if not extra or not getattr(extra, "filename", None):
                continue
            extra_filename = secure_filename(extra.filename)
            extra_path = temp_dir / extra_filename
            with open(extra_path, "wb") as f:
                f.write(await extra.read())
            additional_ref_images.append(str(extra_path))

        task_manager.submit_task(
            task.id,
            generate_material_image_task,
            task_project_id,
            prompt,
            ai_service,
            file_service,
            ref_path_str,
            additional_ref_images or None,
            app_settings.default_aspect_ratio,
            app_settings.default_resolution,
            str(temp_dir),
            runtime_config,
            user_id or "1",
        )
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise

    return SuccessResponse(data={"task_id": task.id, "status": "PENDING"})


# ── Global material endpoints ────────────────────────────────

@router.get("/api/materials", response_model=SuccessResponse)
async def list_all_materials(
    project_id: str = Query("all"),
    user_id: str | None = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
):
    materials = await _get_materials_list(db, project_id, user_id)
    return SuccessResponse(data={"materials": materials, "count": len(materials)})


@router.post("/api/materials/upload", response_model=SuccessResponse, status_code=201)
async def upload_material_global(
    request: Request,
    user_id: str | None = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Delegate to the project-scoped upload with project_id="none"
    return await upload_material("none", request, user_id, db)


@router.delete("/api/materials/{material_id}", response_model=SuccessResponse)
async def delete_material(
    material_id: str,
    db: AsyncSession = Depends(get_db),
):
    material = await db.get(Material, material_id)
    if not material:
        raise HTTPException(404, "Material not found")

    from services.file_service import FileService

    file_service = FileService(app_settings.upload_folder)
    material_path = Path(file_service.get_absolute_path(material.relative_path))

    await db.delete(material)
    await db.flush()

    if material_path.exists():
        try:
            material_path.unlink(missing_ok=True)
        except OSError as e:
            logger.warning(f"Failed to delete material file: {e}")

    return SuccessResponse(data={"id": material_id})


@router.post("/api/materials/associate", response_model=SuccessResponse)
async def associate_materials_to_project(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    data = await request.json()
    project_id = data.get("project_id")
    material_urls = data.get("material_urls", [])

    if not project_id:
        raise HTTPException(400, "project_id is required")
    if not material_urls or not isinstance(material_urls, list):
        raise HTTPException(400, "material_urls must be a non-empty array")

    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    result = await db.execute(
        select(Material).where(
            Material.url.in_(material_urls),
            Material.project_id.is_(None),
        )
    )
    updated_ids = []
    for m in result.scalars().all():
        m.project_id = project_id
        updated_ids.append(m.id)

    await db.flush()
    return SuccessResponse(data={"updated_ids": updated_ids, "count": len(updated_ids)})
