"""Page CRUD routes. Migrated from page_controller.py."""
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from deps import CurrentUser, get_db, get_project_for_user, require_current_user
from models.project import Project
from models.page import Page
from models.page_image_version import PageImageVersion
from models.task import Task
from schemas.common import SuccessResponse
from schemas.page import (
    CreatePageRequest, UpdatePageRequest,
    UpdateOutlineRequest, UpdateDescriptionRequest, PageResponse,
)
from config_fastapi import settings as app_settings
from services.runtime_state import load_runtime_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["pages"])


@router.post("/{project_id}/pages", response_model=SuccessResponse, status_code=201)
async def create_page(
    project_id: str,
    req: CreatePageRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)

    page = Page(
        project_id=project_id,
        order_index=req.order_index,
        part=req.part,
        status="DRAFT",
    )
    if req.outline_content:
        page.set_outline_content(req.outline_content)

    db.add(page)
    await db.flush()

    # Shift existing pages
    result = await db.execute(
        select(Page).where(
            Page.project_id == project_id,
            Page.order_index >= req.order_index,
            Page.id != page.id,
        )
    )
    for p in result.scalars().all():
        p.order_index += 1

    project.updated_at = datetime.now()
    await db.flush()
    return SuccessResponse(data=page.to_dict())


@router.put("/{project_id}/pages/{page_id}", response_model=SuccessResponse)
async def update_page(
    project_id: str,
    page_id: str,
    req: UpdatePageRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_for_user(db, project_id, current_user)
    page = await db.get(Page, page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, "Page not found")

    if req.html_model is not None:
        page.set_html_model(req.html_model)
    if req.layout_id is not None:
        page.layout_id = req.layout_id
    if req.status is not None:
        page.status = req.status

    page.updated_at = datetime.now()
    project = await db.get(Project, project_id)
    if project:
        project.updated_at = datetime.now()

    await db.flush()
    return SuccessResponse(data=page.to_dict())


@router.delete("/{project_id}/pages/{page_id}", response_model=SuccessResponse)
async def delete_page(
    project_id: str,
    page_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_for_user(db, project_id, current_user)
    page = await db.get(Page, page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, "Page not found")

    await db.delete(page)

    project = await db.get(Project, project_id)
    if project:
        project.updated_at = datetime.now()

    await db.flush()
    return SuccessResponse(message="Page deleted")


@router.put("/{project_id}/pages/{page_id}/outline", response_model=SuccessResponse)
async def update_page_outline(
    project_id: str,
    page_id: str,
    req: UpdateOutlineRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)
    page = await db.get(Page, page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, "Page not found")

    page.set_outline_content(req.outline_content)
    page.updated_at = datetime.now()

    if project and (project.render_mode or "image") == "html":
        page.set_html_model(None)
        page.status = "DRAFT"
    else:
        page.set_description_content(None)
        page.generated_image_path = None
        page.status = "DRAFT"

    if project:
        project.updated_at = datetime.now()

    await db.flush()
    return SuccessResponse(data=page.to_dict())


@router.put("/{project_id}/pages/{page_id}/description", response_model=SuccessResponse)
async def update_page_description(
    project_id: str,
    page_id: str,
    req: UpdateDescriptionRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)
    page = await db.get(Page, page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, "Page not found")

    page.set_description_content(req.description_content)
    page.updated_at = datetime.now()

    if project:
        project.updated_at = datetime.now()

    await db.flush()
    return SuccessResponse(data=page.to_dict())


@router.get("/{project_id}/pages/{page_id}/image-versions", response_model=SuccessResponse)
async def get_page_image_versions(
    project_id: str,
    page_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_for_user(db, project_id, current_user)
    page = await db.get(Page, page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, "Page not found")

    result = await db.execute(
        select(PageImageVersion)
        .where(PageImageVersion.page_id == page_id)
        .order_by(PageImageVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return SuccessResponse(data={"versions": [v.to_dict() for v in versions]})


@router.post(
    "/{project_id}/pages/{page_id}/image-versions/{version_id}/set-current",
    response_model=SuccessResponse,
)
async def set_current_image_version(
    project_id: str,
    page_id: str,
    version_id: str,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_for_user(db, project_id, current_user)
    page = await db.get(Page, page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, "Page not found")

    version = await db.get(PageImageVersion, version_id)
    if not version or version.page_id != page_id:
        raise HTTPException(404, "Image version not found")

    await db.execute(
        update(PageImageVersion)
        .where(PageImageVersion.page_id == page_id)
        .values(is_current=False)
    )
    version.is_current = True
    page.generated_image_path = version.image_path
    page.updated_at = datetime.now()
    await db.flush()

    return SuccessResponse(data=page.to_dict())


# --- Page-level generation endpoints ---


class GeneratePageDescriptionRequest(BaseModel):
    force_regenerate: bool = False
    language: str | None = None


class GeneratePageImageRequest(BaseModel):
    use_template: bool = True
    force_regenerate: bool = False
    language: str | None = None


@router.post("/{project_id}/pages/{page_id}/generate/description", response_model=SuccessResponse)
async def generate_page_description(
    project_id: str,
    page_id: str,
    req: GeneratePageDescriptionRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)
    page = await db.get(Page, page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, "Page not found")

    language = req.language or app_settings.output_language
    render_mode = project.render_mode or "image"

    if render_mode == "html":
        has_content = bool(page.get_html_model())
    else:
        has_content = page.get_description_content() is not None

    if has_content and not req.force_regenerate:
        raise HTTPException(400, "Content already exists. Set force_regenerate=true to regenerate")

    outline_content = page.get_outline_content()
    if not outline_content:
        raise HTTPException(400, "Page must have outline content first")

    result = await db.execute(
        select(Page).where(Page.project_id == project_id)
    )
    all_pages = sorted(result.scalars().all(), key=lambda p: int(p.order_index or 0))

    outline = []
    for p in all_pages:
        oc = p.get_outline_content()
        if oc:
            item = oc.copy()
            if p.part:
                item["part"] = p.part
            if p.layout_id:
                item["layout_id"] = p.layout_id
            outline.append(item)

    from services.ai_service_manager import get_ai_service_async
    from services.ai.base import ProjectContext

    ai_service = await get_ai_service_async()

    from models.reference_file import ReferenceFile
    ref_result = await db.execute(
        select(ReferenceFile).where(
            ReferenceFile.project_id == project_id,
            ReferenceFile.parse_status == "completed",
        )
    )
    ref_files = ref_result.scalars().all()
    ref_content = [
        {"filename": f.filename, "content": f.markdown_content or ""}
        for f in ref_files if f.markdown_content
    ]
    project_context = ProjectContext(project, ref_content)

    page_data = outline_content.copy()
    if page.part:
        page_data["part"] = page.part

    if render_mode == "html":
        from services.presentation.narrative_continuity import (
            NarrativeRuntimeTracker,
            enrich_outline_with_narrative_contract,
        )
        from services.presentation.layout_planner import assign_layout_variants
        from services.prompts.layouts import LAYOUT_ID_ALIASES

        layout_id = page.layout_id or page_data.get("layout_id", "title_content")

        current_index = 0
        ordered_outline_pages = []
        for i, p in enumerate(all_pages, 1):
            if p.id == page.id:
                current_index = i
            oc = p.get_outline_content() or {}
            existing_model = p.get_html_model()
            if not isinstance(existing_model, dict):
                existing_model = {}
            ordered_outline_pages.append({
                "page_id": f"p{i:02d}",
                "title": oc.get("title", ""),
                "layout_id": p.layout_id or oc.get("layout_id", "title_content"),
                "has_image": bool(oc.get("has_image", False)),
                "keywords": oc.get("keywords", oc.get("points", [])[:3]),
                "points": oc.get("points", []),
                "depends_on": oc.get("depends_on", []),
                "must_cover": oc.get("must_cover", []),
                "promises_open": oc.get("promises_open", []),
                "promises_close": oc.get("promises_close", []),
                "required_close_promise_ids": oc.get("required_close_promise_ids", oc.get("promises_close", [])),
                "layout_variant": oc.get("layout_variant")
                or existing_model.get("layout_variant")
                or existing_model.get("variant"),
            })

        try:
            ordered_outline_pages = assign_layout_variants(
                outline=ordered_outline_pages,
                scheme_id=project.scheme_id or "edu_dark",
                layout_aliases=LAYOUT_ID_ALIASES,
                seed=project.idea_prompt or project.id or project_id,
            )
        except Exception as planner_err:
            logger.warning("Single-page regeneration variant planning skipped: %s", planner_err)

        for i, p in enumerate(all_pages, 1):
            planned_outline = ordered_outline_pages[i - 1] if i - 1 < len(ordered_outline_pages) else None
            if not isinstance(planned_outline, dict):
                continue
            persisted_outline = p.get_outline_content() or {}
            if not isinstance(persisted_outline, dict):
                persisted_outline = {}
            persisted_outline["logical_page_id"] = planned_outline.get("page_id", f"p{i:02d}")
            persisted_outline["layout_variant"] = str(planned_outline.get("layout_variant") or "a").strip().lower() or "a"
            if planned_outline.get("layout_archetype"):
                persisted_outline["layout_archetype"] = planned_outline.get("layout_archetype")
            p.set_outline_content(persisted_outline)

        full_outline_context = enrich_outline_with_narrative_contract({
            "title": project_context.idea_prompt or project.idea_prompt or "",
            "pages": ordered_outline_pages,
        })

        logical_page_id = f"p{current_index:02d}" if current_index > 0 else f"p{int(page.order_index) + 1:02d}"
        page_outline_context = next(
            (item for item in full_outline_context.get("pages", []) if item.get("page_id") == logical_page_id),
            {},
        )
        layout_variant = str(page_outline_context.get("layout_variant") or "a").strip().lower() or "a"
        layout_archetype = str(page_outline_context.get("layout_archetype") or "").strip()
        layout_id = page_outline_context.get("layout_id", layout_id)

        structured_page_outline = {
            "page_id": logical_page_id,
            "title": page_data.get("title", page_outline_context.get("title", "")),
            "layout_id": layout_id,
            "layout_variant": layout_variant,
            "has_image": bool(page_outline_context.get("has_image", False)),
            "keywords": page_outline_context.get("keywords", page_data.get("points", [])[:3]),
            "depends_on": page_outline_context.get("depends_on", []),
            "must_cover": page_outline_context.get("must_cover", []),
            "promises_open": page_outline_context.get("promises_open", []),
            "promises_close": page_outline_context.get("promises_close", []),
            "required_close_promise_ids": page_outline_context.get("required_close_promise_ids", page_outline_context.get("promises_close", [])),
        }
        if layout_archetype:
            structured_page_outline["layout_archetype"] = layout_archetype
        if "section_number" in page_data:
            structured_page_outline["section_number"] = page_data["section_number"]
        if "subtitle" in page_data:
            structured_page_outline["subtitle"] = page_data["subtitle"]

        tracker = NarrativeRuntimeTracker(full_outline_context)
        for i, p in enumerate(all_pages, 1):
            if i >= current_index:
                break
            existing_model = p.get_html_model()
            if not existing_model:
                continue
            prev_outline = ordered_outline_pages[i - 1] if i - 1 < len(ordered_outline_pages) else {}
            tracker.apply_generated_page(
                page_id=f"p{i:02d}",
                layout_id=p.layout_id or prev_outline.get("layout_id", "title_content"),
                title=prev_outline.get("title", ""),
                model=existing_model,
            )

        continuity_context = tracker.build_context_for_page(logical_page_id)

        model = await ai_service.call_async(
            "generate_structured_page_content",
            page_outline=structured_page_outline,
            full_outline=full_outline_context,
            language=language,
            scheme_id=project.scheme_id or "edu_dark",
            continuity_context=continuity_context,
        )

        if isinstance(model, dict):
            model["variant"] = layout_variant
            model["layout_variant"] = layout_variant
            if layout_archetype:
                model["layout_archetype"] = layout_archetype
        page.set_html_model(model)
        if layout_id:
            page.layout_id = layout_id
        page.status = "HTML_MODEL_GENERATED"
    else:
        desc_text = await ai_service.call_async(
            "generate_page_description",
            project_context,
            outline,
            page_data,
            int(page.order_index) + 1,
            language=language,
        )
        desc_content = {"text": desc_text, "generated_at": datetime.now().isoformat()}
        page.set_description_content(desc_content)
        page.status = "DESCRIPTION_GENERATED"

    page.updated_at = datetime.now()
    await db.flush()
    return SuccessResponse(data=page.to_dict())


@router.post("/{project_id}/pages/{page_id}/generate/image", response_model=SuccessResponse, status_code=202)
async def generate_page_image(
    project_id: str,
    page_id: str,
    req: GeneratePageImageRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(db, project_id, current_user)
    page = await db.get(Page, page_id)
    if not page or page.project_id != project_id:
        raise HTTPException(404, "Page not found")

    if page.generated_image_path and not req.force_regenerate:
        raise HTTPException(400, "Image already exists. Set force_regenerate=true to regenerate")

    if not page.get_description_content():
        raise HTTPException(400, "Page must have description content first")

    language = req.language or app_settings.output_language

    task = Task(
        project_id=project_id,
        task_type="GENERATE_PAGE_IMAGE",
        status="PENDING",
    )
    task.set_progress({"total": 1, "completed": 0, "failed": 0})
    db.add(task)
    await db.commit()

    from services.ai_service_manager import get_ai_service
    from services.tasks import generate_single_page_image_task, task_manager
    from services.file_service import FileService

    ai_service = get_ai_service()
    file_service = FileService(app_settings.upload_folder)

    result = await db.execute(
        select(Page).where(Page.project_id == project_id)
    )
    all_pages = sorted(result.scalars().all(), key=lambda p: int(p.order_index or 0))
    outline = _reconstruct_outline_with_parts(all_pages)

    combined_requirements = project.extra_requirements or ""
    if project.template_style:
        combined_requirements += f"\n\nppt页面风格描述：\n\n{project.template_style}"

    task_manager.submit_task(
        task.id,
        generate_single_page_image_task,
        project_id=project_id,
        page_id=page_id,
        ai_service=ai_service,
        file_service=file_service,
        outline=outline,
        use_template=req.use_template,
        aspect_ratio=app_settings.default_aspect_ratio,
        resolution=app_settings.default_resolution,
        runtime_config=load_runtime_config(),
        extra_requirements=combined_requirements.strip() or None,
        language=language,
    )

    return SuccessResponse(data={"task_id": task.id, "page_id": page_id, "status": "PENDING"})


def _reconstruct_outline_with_parts(pages: list[Page]) -> list[dict]:
    outline = []
    current_part = None
    current_part_pages = []

    for p in pages:
        oc = p.get_outline_content()
        if not oc:
            continue
        page_data = oc.copy()
        if p.layout_id:
            page_data["layout_id"] = p.layout_id

        if p.part:
            if current_part and current_part != p.part:
                outline.append({"part": current_part, "pages": current_part_pages})
                current_part_pages = []
            current_part = p.part
            page_data.pop("part", None)
            current_part_pages.append(page_data)
        else:
            if current_part:
                outline.append({"part": current_part, "pages": current_part_pages})
                current_part = None
                current_part_pages = []
            outline.append(page_data)

    if current_part:
        outline.append({"part": current_part, "pages": current_part_pages})

    return outline
