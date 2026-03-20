"""Export routes. Migrated from export_controller.py."""
import os
import logging
from typing import Optional
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deps import CurrentUser, get_db, get_project_for_user, require_current_user
from models.project import Project
from models.page import Page
from models.task import Task
from schemas.common import SuccessResponse
from schemas.generation import ExportEditablePptxRequest
from config_fastapi import settings
from services.runtime_state import load_runtime_config
from services.file_service import FileService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["export"])


def _get_filtered_pages_sync(pages: list[Page], page_ids: list[str] | None) -> list[Page]:
    if not page_ids:
        return pages
    id_set = set(page_ids)
    return [p for p in pages if p.id in id_set]


def _extract_image_paths_from_pages(
    pages: list[Page],
    project: Project,
    file_service: FileService,
) -> list[str]:
    """从页面中提取图片路径，支持HTML模式和图片模式"""
    image_paths = []
    render_mode = project.render_mode or "image"
    
    if render_mode == "html":
        # HTML模式：从html_model中提取图片路径
        for page in pages:
            html_model = page.get_html_model() if hasattr(page, 'get_html_model') else None
            if not html_model or not isinstance(html_model, dict):
                continue
            
            # 递归查找所有图片路径
            def find_image_paths(obj: any, paths: list = None) -> list:
                if paths is None:
                    paths = []
                if isinstance(obj, str):
                    # 检查是否是图片URL路径（以/files/开头）
                    if obj.startswith('/files/'):
                        # 转换为文件系统路径
                        # /files/{project_id}/pages/{filename} -> {project_id}/pages/{filename}
                        relative_path = obj.replace('/files/', '').lstrip('/')
                        abs_path = file_service.get_absolute_path(relative_path)
                        if os.path.exists(abs_path):
                            paths.append(abs_path)
                elif isinstance(obj, dict):
                    for value in obj.values():
                        find_image_paths(value, paths)
                elif isinstance(obj, list):
                    for item in obj:
                        find_image_paths(item, paths)
                return paths
            
            page_image_paths = find_image_paths(html_model)
            if page_image_paths:
                # 如果找到多个图片，使用第一个（通常是主图）
                image_paths.append(page_image_paths[0])
            elif page.generated_image_path:
                # 回退到generated_image_path
                image_paths.append(file_service.get_absolute_path(page.generated_image_path))
    else:
        # 图片模式：使用generated_image_path
        for page in pages:
            if page.generated_image_path:
                image_paths.append(file_service.get_absolute_path(page.generated_image_path))
    
    return image_paths


@router.get("/{project_id}/export/pptx", response_model=SuccessResponse)
async def export_pptx(
    project_id: str,
    request: Request,
    filename: Optional[str] = Query(None),
    page_ids: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)

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

    from services.presentation.export_service import ExportService

    file_service = FileService(settings.upload_folder)
    image_paths = _extract_image_paths_from_pages(pages, project, file_service)

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
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)

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

    from services.presentation.export_service import ExportService

    file_service = FileService(settings.upload_folder)
    image_paths = _extract_image_paths_from_pages(pages, project, file_service)

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
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)

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
