"""AI generation routes. Migrated from project_controller.py generation endpoints."""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Cookie, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from deps import get_db
from models.project import Project
from models.page import Page
from models.task import Task
from schemas.common import SuccessResponse
from schemas.generation import (
    GenerateOutlineRequest,
    GenerateDescriptionsRequest,
    GenerateImagesRequest,
)
from config_fastapi import settings as app_settings
from services.runtime_state import load_runtime_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["generation"])


def _resolve_user_id(
    user_id: str | None = Query(None),
    user_id_cookie: str | None = Cookie(None, alias="user_id"),
) -> str:
    return user_id or user_id_cookie or "1"


async def _get_project_with_pages(db: AsyncSession, project_id: str) -> Project:
    result = await db.execute(
        select(Project).options(selectinload(Project.pages)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


async def _get_reference_files_content(db: AsyncSession, project_id: str) -> list[dict]:
    from models.reference_file import ReferenceFile
    result = await db.execute(
        select(ReferenceFile).where(
            ReferenceFile.project_id == project_id,
            ReferenceFile.parse_status == "completed",
        )
    )
    files = result.scalars().all()
    return [
        {"filename": f.filename, "content": f.markdown_content or ""}
        for f in files
        if f.markdown_content
    ]


def _reconstruct_outline(pages: list[Page]) -> list[dict]:
    sorted_pages = sorted(pages, key=lambda p: int(p.order_index) if p.order_index is not None else 999)
    outline = []
    for p in sorted_pages:
        oc = p.get_outline_content()
        if oc:
            item = oc.copy()
            if p.part:
                item["part"] = p.part
            if p.layout_id:
                item["layout_id"] = p.layout_id
            outline.append(item)
    return outline


@router.post("/{project_id}/generate/outline", response_model=SuccessResponse)
async def generate_outline(
    project_id: str,
    req: GenerateOutlineRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id)

    from services.ai_service_manager import get_ai_service_async
    from services.ai.base import ProjectContext

    ai_service = await get_ai_service_async()
    ref_content = await _get_reference_files_content(db, project_id)
    ctx = ProjectContext(project, ref_content)

    language = req.language or app_settings.output_language
    render_mode = project.render_mode or "image"

    if render_mode == "html":
        outline_result = await ai_service.call_async(
            "generate_structured_outline",
            topic=project.idea_prompt or "",
            requirements=project.extra_requirements or "",
            language=language,
            scheme_id=project.scheme_id or "edu_dark",
        )
    else:
        outline_result = await ai_service.call_async("generate_outline", ctx, language=language)

    # Save pages from outline
    if render_mode == "html":
        pages_data = outline_result.get("pages", [])
    else:
        pages_data = ai_service.flatten_outline(outline_result) if isinstance(outline_result, dict) else outline_result

    # Delete existing pages
    for p in list(project.pages):
        await db.delete(p)
    await db.flush()

    created_pages = []
    for idx, page_data in enumerate(pages_data):
        page = Page(
            project_id=project_id,
            order_index=idx,
            part=page_data.get("part"),
            status="OUTLINE_GENERATED",
        )
        if render_mode == "html":
            page.layout_id = page_data.get("layout_id", "title_content")
        page.set_outline_content(page_data)
        db.add(page)
        created_pages.append(page)

    project.status = "OUTLINE_GENERATED"
    project.updated_at = datetime.now()
    await db.flush()

    return SuccessResponse(data={
        "outline": outline_result,
        "pages": [p.to_dict() for p in created_pages],
    })


@router.post("/{project_id}/generate/descriptions", response_model=SuccessResponse, status_code=202)
async def generate_descriptions(
    project_id: str,
    req: GenerateDescriptionsRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id)
    if not project.pages:
        raise HTTPException(400, "No pages found. Generate outline first.")

    task = Task(
        project_id=project_id,
        task_type="GENERATE_DESCRIPTIONS",
        status="PENDING",
    )
    task.set_progress({"total": len(project.pages), "completed": 0, "failed": 0})
    db.add(task)
    await db.flush()

    from services.ai_service_manager import get_ai_service
    from services.tasks import generate_descriptions_task, task_manager
    from services.ai.base import ProjectContext

    ai_service = get_ai_service()
    ref_content = await _get_reference_files_content(db, project_id)
    project_context = ProjectContext(project, ref_content)
    outline = _reconstruct_outline(project.pages)

    try:
        task_manager.submit_task(
            task.id,
            generate_descriptions_task,
            project_id=project_id,
            ai_service=ai_service,
            project_context=project_context.to_dict(),
            outline=outline,
            max_workers=req.max_workers,
            runtime_config=load_runtime_config(),
            language=req.language or app_settings.output_language,
            render_mode=project.render_mode or "image",
            generation_mode=req.generation_mode,
        )
        logger.info("Task %s submitted successfully, active_tasks=%s", task.id, list(task_manager.active_tasks.keys()))
    except Exception as e:
        logger.error("Failed to submit task %s: %s", task.id, e, exc_info=True)
        task.status = "FAILED"
        task.error_message = f"Submit failed: {e}"
        return SuccessResponse(data={"task_id": task.id, "status": "FAILED", "error": str(e)})

    return SuccessResponse(data={"task_id": task.id, "status": "PENDING"})


@router.post("/{project_id}/generate/images", response_model=SuccessResponse, status_code=202)
async def generate_images(
    project_id: str,
    req: GenerateImagesRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id)

    task = Task(
        project_id=project_id,
        task_type="GENERATE_IMAGES",
        status="PENDING",
    )
    db.add(task)
    await db.flush()

    from services.ai_service_manager import get_ai_service
    from services.tasks import generate_images_task, task_manager
    from services.file_service import FileService

    ai_service = get_ai_service()
    file_service = FileService(app_settings.upload_folder)
    outline = _reconstruct_outline(project.pages)
    combined_requirements = project.extra_requirements or ""
    if project.template_style:
        combined_requirements += f"\n\nppt页面风格描述：\n\n{project.template_style}"

    task_manager.submit_task(
        task.id,
        generate_images_task,
        project_id=project_id,
        ai_service=ai_service,
        file_service=file_service,
        outline=outline,
        use_template=req.use_template,
        max_workers=req.max_workers,
        aspect_ratio=app_settings.default_aspect_ratio,
        resolution=app_settings.default_resolution,
        runtime_config=load_runtime_config(),
        extra_requirements=combined_requirements.strip() or None,
        language=req.language or app_settings.output_language,
        page_ids=req.page_ids,
    )

    return SuccessResponse(data={"task_id": task.id, "status": "PENDING"})


    # HTML image generation (SSE streaming) is handled by api/routes/html_images.py
    # at POST /{project_id}/html-images/generate
