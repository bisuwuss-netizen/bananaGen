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
    GenerateLayoutPlanRequest,
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


@router.post("/{project_id}/generate/outline", response_model=SuccessResponse, status_code=202)
async def generate_outline(
    project_id: str,
    req: GenerateOutlineRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id)
    task = Task(
        project_id=project_id,
        task_type="GENERATE_OUTLINE",
        status="PENDING",
    )
    task.set_progress(
        {
            "total": 5,
            "completed": 0,
            "failed": 0,
            "percent": 0,
            "current_step": "等待开始",
            "messages": ["已创建大纲生成任务。"],
            "render_mode": project.render_mode or "image",
            "scheme_id": project.scheme_id or "edu_dark",
        }
    )
    db.add(task)
    await db.commit()

    from services.tasks import generate_outline_task, task_manager

    try:
        task_manager.submit_task(
            task.id,
            generate_outline_task,
            project_id=project_id,
            language=req.language or app_settings.output_language,
            runtime_config=load_runtime_config(),
        )
    except Exception as exc:
        logger.error("Failed to submit outline task %s: %s", task.id, exc, exc_info=True)
        task = await db.get(Task, task.id)
        if task:
            task.status = "FAILED"
            task.error_message = f"Submit failed: {exc}"
            task.completed_at = datetime.now()
            await db.commit()
        return SuccessResponse(data={"task_id": task.id, "status": "FAILED", "error": str(exc)})

    return SuccessResponse(data={"task_id": task.id, "status": "PENDING"})


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
    await db.commit()

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


@router.post("/{project_id}/generate/layout-plan", response_model=SuccessResponse)
async def generate_layout_plan(
    project_id: str,
    req: GenerateLayoutPlanRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id)
    if (project.render_mode or "image") != "html":
        raise HTTPException(400, "Layout plan is only available in HTML render mode")

    pages = sorted(project.pages, key=lambda p: int(p.order_index) if p.order_index is not None else 999)
    if not pages:
        raise HTTPException(400, "No pages found. Generate outline first.")

    from services.presentation.layout_planner import assign_layout_variants, validate_capacity
    from services.prompts.layouts import LAYOUT_ID_ALIASES

    outline_pages: list[dict] = []
    for idx, page in enumerate(pages, 1):
        outline_content = page.get_outline_content() or {}
        if not isinstance(outline_content, dict):
            outline_content = {}
        model = page.get_html_model()
        if not isinstance(model, dict):
            model = {}
        layout_id = page.layout_id or outline_content.get("layout_id", "title_content")
        outline_pages.append(
            {
                "page_id": page.id,
                "order_index": idx - 1,
                "layout_id": layout_id,
                "title": outline_content.get("title", ""),
                "points": outline_content.get("points", []),
                "has_image": bool(outline_content.get("has_image", False)),
                "keywords": outline_content.get("keywords", []),
                "layout_variant": outline_content.get("layout_variant")
                or model.get("layout_variant")
                or model.get("variant"),
                "html_model": model,
            }
        )

    seed = (req.seed or project.idea_prompt or project.id or "").strip()
    planned_outline = assign_layout_variants(
        outline=outline_pages,
        scheme_id=project.scheme_id or "edu_dark",
        layout_aliases=LAYOUT_ID_ALIASES,
        seed=seed,
    )

    planned_by_id = {
        str(item.get("page_id")): item
        for item in planned_outline
        if isinstance(item, dict) and item.get("page_id")
    }

    layout_plan: list[dict[str, str]] = []
    for page in pages:
        plan_item = planned_by_id.get(page.id)
        if not plan_item:
            continue

        layout_id = str(plan_item.get("layout_id") or page.layout_id or "title_content").strip() or "title_content"
        variant = str(plan_item.get("layout_variant") or "a").strip().lower() or "a"
        variant = validate_capacity(layout_id, variant, plan_item)
        archetype = str(plan_item.get("layout_archetype") or "").strip()

        outline_content = page.get_outline_content() or {}
        if not isinstance(outline_content, dict):
            outline_content = {}
        outline_content["layout_id"] = layout_id
        outline_content["layout_variant"] = variant
        if archetype:
            outline_content["layout_archetype"] = archetype
        page.set_outline_content(outline_content)

        html_model = page.get_html_model()
        if isinstance(html_model, dict):
            html_model = dict(html_model)
            html_model["variant"] = variant
            html_model["layout_variant"] = variant
            if archetype:
                html_model["layout_archetype"] = archetype
            page.set_html_model(html_model)

        page.layout_id = layout_id
        layout_plan.append(
            {
                "page_id": page.id,
                "layout_id": layout_id,
                "variant": variant,
            }
        )

    project.updated_at = datetime.now()
    await db.flush()
    return SuccessResponse(data={"layout_plan": layout_plan})


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
    await db.commit()

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
