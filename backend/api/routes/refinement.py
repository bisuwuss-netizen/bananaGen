"""AI refinement routes. Migrated from project_controller.py refinement endpoints."""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from deps import get_db
from models.project import Project
from models.page import Page
from schemas.common import SuccessResponse
from schemas.generation import RefineOutlineRequest, RefineDescriptionsRequest
from config_fastapi import settings as app_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["refinement"])


async def _get_project_with_pages(db: AsyncSession, project_id: str) -> Project:
    result = await db.execute(
        select(Project).options(selectinload(Project.pages)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


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


def _sorted_pages(project: Project) -> list[Page]:
    return sorted(project.pages, key=lambda p: int(p.order_index) if p.order_index is not None else 999)


def _page_title(page: Page, index: int) -> str:
    outline = page.get_outline_content() or {}
    return outline.get("title") or f"第 {index + 1} 页"


def _build_description_refinement_inputs(pages: list[Page]) -> list[dict]:
    current_descriptions = []
    for index, page in enumerate(pages):
        current_descriptions.append({
            "index": index,
            "title": _page_title(page, index),
            "description_content": page.get_description_content() or {},
        })
    return current_descriptions


def _build_html_model_refinement_inputs(pages: list[Page]) -> list[dict]:
    current_models = []
    for index, page in enumerate(pages):
        current_models.append({
            "index": index,
            "title": _page_title(page, index),
            "layout_id": page.layout_id or "title_content",
            "html_model": page.get_html_model() or {},
        })
    return current_models


def _ensure_refined_list(refined_items, *, expected_count: int, label: str) -> list:
    if not isinstance(refined_items, list):
        raise HTTPException(502, f"AI returned invalid {label} payload type")
    if len(refined_items) != expected_count:
        raise HTTPException(
            502,
            f"AI returned {len(refined_items)} {label}, expected {expected_count}",
        )
    return refined_items


def _merge_refined_description(existing_content, refined_text: str, generated_at: str) -> dict:
    payload = existing_content.copy() if isinstance(existing_content, dict) else {}
    payload["text"] = refined_text
    payload["generated_at"] = generated_at
    return payload


@router.post("/{project_id}/refine/outline", response_model=SuccessResponse)
async def refine_outline(
    project_id: str,
    req: RefineOutlineRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id)

    from services.ai_service_manager import get_ai_service_async
    from services.ai.base import ProjectContext

    ai_service = await get_ai_service_async()
    ref_content = await _get_reference_files_content(db, project_id)

    ctx = ProjectContext(project, ref_content)
    current_outline = _reconstruct_outline(_sorted_pages(project))
    language = req.language or app_settings.output_language
    render_mode = project.render_mode or "image"

    refined = await ai_service.call_async(
        "refine_outline",
        current_outline,
        req.user_requirement,
        project_context=ctx,
        previous_requirements=req.previous_requirements or None,
        language=language,
        render_mode=render_mode,
    )

    if render_mode == "html":
        pages_data = refined.get("pages", []) if isinstance(refined, dict) else refined
    else:
        pages_data = ai_service.flatten_outline(refined) if isinstance(refined, dict) else refined

    # Delete old pages
    for p in list(project.pages):
        await db.delete(p)
    await db.flush()

    # Create new pages
    created = []
    for idx, pd in enumerate(pages_data):
        page = Page(
            project_id=project_id,
            order_index=idx,
            part=pd.get("part"),
            status="OUTLINE_GENERATED",
        )
        if render_mode == "html":
            page.layout_id = pd.get("layout_id", "title_content")
        page.set_outline_content(pd)
        db.add(page)
        created.append(page)

    project.status = "OUTLINE_GENERATED"
    project.updated_at = datetime.now()
    await db.flush()

    return SuccessResponse(data={
        "outline": refined,
        "pages": [p.to_dict() for p in created],
    })


@router.post("/{project_id}/refine/descriptions", response_model=SuccessResponse)
async def refine_descriptions(
    project_id: str,
    req: RefineDescriptionsRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id)

    if not project.pages:
        raise HTTPException(400, "No pages found.")

    from services.ai_service_manager import get_ai_service_async
    from services.ai.base import ProjectContext

    ai_service = await get_ai_service_async()
    ref_content = await _get_reference_files_content(db, project_id)
    ctx = ProjectContext(project, ref_content)
    language = req.language or app_settings.output_language
    render_mode = project.render_mode or "image"
    sorted_pages = _sorted_pages(project)
    outline = _reconstruct_outline(sorted_pages)
    previous_requirements = req.previous_requirements or None

    if render_mode == "html":
        current_models = _build_html_model_refinement_inputs(sorted_pages)

        refined_models = _ensure_refined_list(
            await ai_service.call_async(
            "refine_html_models",
            current_models,
            req.user_requirement,
            project_context=ctx,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language,
            ),
            expected_count=len(sorted_pages),
            label="refined html models",
        )

        now = datetime.now()
        for page, refined_model in zip(sorted_pages, refined_models):
            if not isinstance(refined_model, dict):
                raise HTTPException(502, "AI returned non-object html model")
            page.set_html_model(refined_model)
            page.status = "HTML_MODEL_GENERATED"
            page.updated_at = now
    else:
        current_descs = _build_description_refinement_inputs(sorted_pages)

        refined_descs = _ensure_refined_list(
            await ai_service.call_async(
            "refine_descriptions",
            current_descs,
            req.user_requirement,
            project_context=ctx,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language,
            ),
            expected_count=len(sorted_pages),
            label="refined descriptions",
        )

        now = datetime.now()
        timestamp = now.isoformat()
        for page, refined_text in zip(sorted_pages, refined_descs):
            if not isinstance(refined_text, str):
                raise HTTPException(502, "AI returned non-string page description")
            page.set_description_content(
                _merge_refined_description(
                    page.get_description_content(),
                    refined_text,
                    timestamp,
                )
            )
            page.status = "DESCRIPTION_GENERATED"
            page.updated_at = now

    project.updated_at = datetime.now()
    await db.flush()

    return SuccessResponse(data={
        "pages": [p.to_dict() for p in _sorted_pages(project)],
    })
