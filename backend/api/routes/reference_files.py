"""Reference file routes. Migrated from reference_file_controller.py."""
import asyncio
import os
import re
import time
import uuid
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from werkzeug.utils import secure_filename

from deps import CurrentUser, get_db, get_project_for_user, require_current_user, async_session_factory
from models.project import Project
from models.reference_file import ReferenceFile
from schemas.common import SuccessResponse
from config_fastapi import settings as app_settings
from config import Config
from services.runtime_state import load_runtime_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reference-files", tags=["reference-files"])

MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB


def _allowed_file(filename: str, allowed: set) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed


def _get_file_type(filename: str) -> str:
    if "." in filename:
        return filename.rsplit(".", 1)[1].lower()
    return "unknown"


async def _parse_file_async(file_id: str, file_path: str, filename: str):
    """Parse file in background using async ORM and thread-pooled file parsing."""
    from services.file_parser_service import FileParserService

    # Load runtime config (may query DB synchronously for settings overrides)
    config = await asyncio.to_thread(load_runtime_config)

    try:
        async with async_session_factory() as session:
            ref = await session.get(ReferenceFile, file_id)
            if not ref:
                return
            ref.parse_status = "parsing"
            await session.commit()

        parser_svc = FileParserService(
            openai_api_key=config.get("OPENAI_API_KEY", ""),
            openai_api_base=config.get("OPENAI_API_BASE", ""),
            image_caption_model=config["IMAGE_CAPTION_MODEL"],
            provider_format="openai",
        )

        batch_id = markdown_content = extract_id = error_message = None
        failed_count = 0
        for attempt in range(3):
            batch_id, markdown_content, extract_id, error_message, failed_count = (
                await asyncio.to_thread(parser_svc.parse_file, file_path, filename)
            )
            if not error_message:
                break
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)

        async with async_session_factory() as session:
            ref = await session.get(ReferenceFile, file_id)
            if not ref:
                return
            ref.mineru_batch_id = batch_id
            if error_message:
                ref.parse_status = "failed"
                ref.error_message = error_message
            else:
                ref.parse_status = "completed"
                ref.markdown_content = markdown_content

            ref.updated_at = datetime.utcnow()
            await session.commit()
    except Exception as e:
        logger.error(f"Async file parsing error: {e}", exc_info=True)
        try:
            async with async_session_factory() as session:
                ref = await session.get(ReferenceFile, file_id)
                if ref:
                    ref.parse_status = "failed"
                    ref.error_message = str(e)
                    await session.commit()
        except Exception:
            pass


@router.post("/upload", response_model=SuccessResponse)
async def upload_reference_file(
    request: Request,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(400, "No file provided")

    original_filename = file.filename
    if not original_filename:
        raise HTTPException(400, "No filename")

    allowed = Config.ALLOWED_REFERENCE_FILE_EXTENSIONS
    if not _allowed_file(original_filename, allowed):
        raise HTTPException(400, f"File type not allowed. Allowed: {', '.join(allowed)}")

    project_id_raw = form.get("project_id")
    project_id = None if not project_id_raw or project_id_raw == "none" else project_id_raw

    if project_id:
        await get_project_for_user(db, project_id, current_user)

    filename = secure_filename(original_filename)
    if not filename:
        ext = _get_file_type(original_filename)
        filename = f"file_{uuid.uuid4().hex[:8]}.{ext}"

    upload_folder = app_settings.upload_folder
    ref_dir = Path(upload_folder) / "reference_files"
    ref_dir.mkdir(parents=True, exist_ok=True)

    unique_id = str(uuid.uuid4())[:8]
    file_type = _get_file_type(original_filename)
    unique_filename = f"{unique_id}_{filename}"
    file_path = ref_dir / unique_filename

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="文件过大，最大支持 200MB")
    with open(str(file_path), "wb") as f:
        f.write(content)
    file_size = os.path.getsize(file_path)

    ref = ReferenceFile(
        project_id=project_id,
        user_id=current_user.user_id,
        filename=original_filename,
        file_path=str(file_path.relative_to(upload_folder)),
        file_size=file_size,
        file_type=file_type,
        parse_status="pending",
    )
    db.add(ref)
    await db.flush()
    await db.commit()

    return SuccessResponse(data={"file": ref.to_dict()})


@router.get("/project/{project_id}", response_model=SuccessResponse)
async def list_project_reference_files(
    project_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    if project_id == "all":
        result = await db.execute(select(ReferenceFile).where(ReferenceFile.user_id == current_user.user_id))
    elif project_id in ("global", "none"):
        result = await db.execute(
            select(ReferenceFile).where(
                ReferenceFile.project_id.is_(None),
                ReferenceFile.user_id == current_user.user_id,
            )
        )
    else:
        await get_project_for_user(db, project_id, current_user)
        result = await db.execute(
            select(ReferenceFile).where(
                ReferenceFile.project_id == project_id,
                ReferenceFile.user_id == current_user.user_id,
            )
        )

    files = result.scalars().all()
    return SuccessResponse(data={"files": [f.to_dict(include_content=False) for f in files]})


@router.get("/{file_id}", response_model=SuccessResponse)
async def get_reference_file(
    file_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    ref = await db.get(ReferenceFile, file_id)
    if not ref or ref.user_id != current_user.user_id:
        raise HTTPException(404, "Reference file not found")
    return SuccessResponse(data={"file": ref.to_dict(include_content=True, include_failed_count=True)})


@router.delete("/{file_id}", response_model=SuccessResponse)
async def delete_reference_file(
    file_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    ref = await db.get(ReferenceFile, file_id)
    if not ref or ref.user_id != current_user.user_id:
        raise HTTPException(404, "Reference file not found")

    try:
        fp = Path(app_settings.upload_folder) / ref.file_path
        if fp.exists():
            fp.unlink()
    except Exception as e:
        logger.warning(f"Failed to delete file: {e}")

    await db.delete(ref)
    await db.commit()
    return SuccessResponse(data={"message": "File deleted"})


@router.post("/{file_id}/parse", response_model=SuccessResponse)
async def trigger_file_parse(
    file_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    ref = await db.get(ReferenceFile, file_id)
    if not ref or ref.user_id != current_user.user_id:
        raise HTTPException(404, "Reference file not found")

    if ref.parse_status == "parsing":
        return SuccessResponse(data={"file": ref.to_dict(), "message": "Already parsing"})

    if ref.parse_status in ("completed", "failed"):
        ref.parse_status = "pending"
        ref.error_message = None
        ref.markdown_content = None
        ref.mineru_batch_id = None
        await db.commit()

    file_path = Path(app_settings.upload_folder) / ref.file_path
    if not file_path.exists():
        raise HTTPException(404, f"File not found on disk")

    asyncio.create_task(_parse_file_async(ref.id, str(file_path), ref.filename))

    return SuccessResponse(data={"file": ref.to_dict(), "message": "Parsing started"})


@router.post("/{file_id}/associate", response_model=SuccessResponse)
async def associate_file_to_project(
    file_id: str,
    request: Request,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    ref = await db.get(ReferenceFile, file_id)
    if not ref or ref.user_id != current_user.user_id:
        raise HTTPException(404, "Reference file not found")

    data = await request.json()
    project_id = data.get("project_id")
    if not project_id:
        raise HTTPException(400, "project_id is required")

    await get_project_for_user(db, project_id, current_user)

    ref.project_id = project_id
    ref.updated_at = datetime.utcnow()
    await db.commit()

    return SuccessResponse(data={"file": ref.to_dict()})


@router.post("/{file_id}/dissociate", response_model=SuccessResponse)
async def dissociate_file_from_project(
    file_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    ref = await db.get(ReferenceFile, file_id)
    if not ref or ref.user_id != current_user.user_id:
        raise HTTPException(404, "Reference file not found")

    ref.project_id = None
    ref.updated_at = datetime.utcnow()
    await db.commit()

    return SuccessResponse(data={"file": ref.to_dict(), "message": "Dissociated"})
