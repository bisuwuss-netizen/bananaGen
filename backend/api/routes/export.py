"""Export routes. Migrated from export_controller.py."""
import os
import logging
from typing import Optional
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deps import get_db
from models.project import Project
from models.page import Page
from models.task import Task
from schemas.common import SuccessResponse
from schemas.generation import ExportEditablePptxRequest
from config_fastapi import settings
from services.runtime_state import load_runtime_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["export"])


def _get_filtered_pages_sync(pages: list[Page], page_ids: list[str] | None) -> list[Page]:
    if not page_ids:
        return pages
    id_set = set(page_ids)
    return [p for p in pages if p.id in id_set]


@router.get("/{project_id}/export/pptx", response_model=SuccessResponse)
async def export_pptx(
    project_id: str,
    request: Request,
    filename: Optional[str] = Query(None),
    page_ids: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    result = await db.execute(
        select(Page)
        .where(Page.project_id == project_id)
        .order_by(Page.order_index)
    )
    all_pages = result.scalars().all()

    selected_ids = page_ids.split(",") if page_ids else None
    pages = _get_filtered_pages_sync(all_pages, selected_ids)
    if not pages:
        raise HTTPException(400, "No pages found")

    from services.file_service import FileService
    from services.presentation.export_service import ExportService

    file_service = FileService(settings.upload_folder)
    image_paths = []
    for page in pages:
        if page.generated_image_path:
            image_paths.append(file_service.get_absolute_path(page.generated_image_path))

    if not image_paths:
        raise HTTPException(400, "No generated images found")

    exports_dir = file_service._get_exports_dir(project_id)
    fname = filename or f"presentation_{project_id}.pptx"
    if not fname.endswith(".pptx"):
        fname += ".pptx"
    output_path = os.path.join(exports_dir, fname)

    await asyncio.to_thread(ExportService.create_pptx_from_images, image_paths, output_file=output_path)

    download_path = f"/files/{project_id}/exports/{fname}"
    base_url = str(request.base_url).rstrip("/")
    return SuccessResponse(data={
        "download_url": download_path,
        "download_url_absolute": f"{base_url}{download_path}",
    })


@router.get("/{project_id}/export/pdf", response_model=SuccessResponse)
async def export_pdf(
    project_id: str,
    request: Request,
    filename: Optional[str] = Query(None),
    page_ids: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    result = await db.execute(
        select(Page)
        .where(Page.project_id == project_id)
        .order_by(Page.order_index)
    )
    all_pages = result.scalars().all()

    selected_ids = page_ids.split(",") if page_ids else None
    pages = _get_filtered_pages_sync(all_pages, selected_ids)
    if not pages:
        raise HTTPException(400, "No pages found")

    from services.file_service import FileService
    from services.presentation.export_service import ExportService

    file_service = FileService(settings.upload_folder)
    image_paths = []
    for page in pages:
        if page.generated_image_path:
            image_paths.append(file_service.get_absolute_path(page.generated_image_path))

    if not image_paths:
        raise HTTPException(400, "No generated images found")

    exports_dir = file_service._get_exports_dir(project_id)
    fname = filename or f"presentation_{project_id}.pdf"
    if not fname.endswith(".pdf"):
        fname += ".pdf"
    output_path = os.path.join(exports_dir, fname)

    await asyncio.to_thread(ExportService.create_pdf_from_images, image_paths, output_file=output_path)

    download_path = f"/files/{project_id}/exports/{fname}"
    base_url = str(request.base_url).rstrip("/")
    return SuccessResponse(data={
        "download_url": download_path,
        "download_url_absolute": f"{base_url}{download_path}",
    })


@router.post("/{project_id}/export/editable-pptx", response_model=SuccessResponse)
async def export_editable_pptx(
    project_id: str,
    req: ExportEditablePptxRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    result = await db.execute(
        select(Page)
        .where(Page.project_id == project_id)
        .order_by(Page.order_index)
    )
    all_pages = result.scalars().all()
    pages = _get_filtered_pages_sync(all_pages, req.page_ids)
    if not pages:
        raise HTTPException(400, "No pages found")

    if not any(p.generated_image_path for p in pages):
        raise HTTPException(400, "No generated images found")

    fname = req.filename or f"presentation_editable_{project_id}.pptx"
    if not fname.endswith(".pptx"):
        fname += ".pptx"

    task = Task(
        project_id=project_id,
        task_type="EXPORT_EDITABLE_PPTX",
        status="PENDING",
    )
    db.add(task)
    await db.commit()

    from services.file_service import FileService
    from services.tasks import (
        export_editable_pptx_with_recursive_analysis_task,
        task_manager,
    )

    file_service = FileService(settings.upload_folder)

    task_manager.submit_task(
        task.id,
        export_editable_pptx_with_recursive_analysis_task,
        project_id=project_id,
        filename=fname,
        file_service=file_service,
        page_ids=req.page_ids,
        max_depth=req.max_depth,
        max_workers=req.max_workers,
        export_extractor_method=req.extractor_method,
        export_inpaint_method=req.inpaint_method,
        runtime_config=load_runtime_config(),
    )

    return SuccessResponse(data={
        "task_id": task.id,
        "method": "recursive_analysis",
        "max_depth": req.max_depth,
        "max_workers": req.max_workers,
    })
