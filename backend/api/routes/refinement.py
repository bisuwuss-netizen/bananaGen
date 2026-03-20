"""AI refinement routes. Migrated from project_controller.py refinement endpoints."""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from deps import CurrentUser, get_db, get_project_for_user, require_current_user
from models.project import Project
from models.page import Page
from schemas.common import SuccessResponse
from schemas.generation import RefineOutlineRequest, RefineDescriptionsRequest
from config_fastapi import settings as app_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["refinement"])


async def _get_project_with_pages(
    db: AsyncSession,
    project_id: str,
    current_user: CurrentUser,
) -> Project:
    return await get_project_for_user(
        db,
        project_id,
        current_user,
        selectinload(Project.pages),
    )


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
    # Flatten in case any outline_content was stored in nested {part, pages} format
    return _flatten_nested_outline(outline)


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


def _flatten_nested_outline(outline) -> list[dict]:
    """Flatten nested {part, pages} structure WITHOUT modifying content.

    Unlike ai_service.flatten_outline, this does NOT re-populate TOC points
    or re-order pages — those have already been applied by the quality guard.
    """
    if not isinstance(outline, list):
        outline = [outline] if isinstance(outline, dict) else []

    pages: list[dict] = []
    for item in outline:
        if not isinstance(item, dict):
            continue
        if "part" in item and isinstance(item.get("pages"), list):
            for page in item["pages"]:
                if isinstance(page, dict):
                    flat = page.copy()
                    flat["part"] = item.get("part")
                    pages.append(flat)
        else:
            pages.append(item.copy())
    return pages


def _prepare_refined_outline_pages(refined, *, render_mode: str, ai_service) -> list[dict]:
    if isinstance(refined, dict):
        if "pages" in refined:
            refined = refined["pages"]
        elif "outline" in refined:
            refined = refined["outline"]

    # Pure flatten only: quality guard already processed TOC + ordering
    pages_data = _flatten_nested_outline(refined)

    if not isinstance(pages_data, list):
        raise HTTPException(502, "AI returned invalid outline payload type")
    if not pages_data:
        raise HTTPException(502, "AI returned empty outline result")
    if not all(isinstance(page, dict) for page in pages_data):
        raise HTTPException(502, "AI returned invalid outline page item")

    return pages_data


def _extract_refine_payload(result, *, default_summary: str, payload_keys: tuple[str, ...] = ()) -> tuple[str, object]:
    """Accept both RefineResult objects and legacy raw dict/list payloads."""
    summary = getattr(result, "summary", default_summary) or default_summary
    data = getattr(result, "data", result)

    if isinstance(data, dict):
        summary = data.get("summary", summary)
        for key in payload_keys:
            if key in data:
                return summary, data[key]

    return summary, data


@router.post("/{project_id}/refine/outline", response_model=SuccessResponse)
async def refine_outline(
    project_id: str,
    req: RefineOutlineRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id, current_user)

    from services.ai_service_manager import get_ai_service_async
    from services.ai.base import ProjectContext

    ai_service = await get_ai_service_async()
    ref_content = await _get_reference_files_content(db, project_id)

    ctx = ProjectContext(project, ref_content)
    current_outline = _reconstruct_outline(_sorted_pages(project))
    language = req.language or app_settings.output_language
    render_mode = project.render_mode or "image"

    result = await ai_service.call_async(
        "refine_outline",
        current_outline,
        req.user_requirement,
        project_context=ctx,
        previous_requirements=req.previous_requirements or None,
        language=language,
        render_mode=render_mode,
    )

    summary, refined_outline = _extract_refine_payload(
        result,
        default_summary="大纲已更新",
        payload_keys=("pages", "outline"),
    )

    pages_data = _prepare_refined_outline_pages(
        refined_outline,
        render_mode=render_mode,
        ai_service=ai_service,
    )

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
        "outline": refined_outline,
        "pages": [p.to_dict() for p in created],
        "summary": summary,
    })


@router.post("/{project_id}/refine/descriptions", response_model=SuccessResponse)
async def refine_descriptions(
    project_id: str,
    req: RefineDescriptionsRequest,
    current_user: CurrentUser = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id, current_user)

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

    summary = "描述已更新"

    if render_mode == "html":
        current_models = _build_html_model_refinement_inputs(sorted_pages)

        result = await ai_service.call_async(
            "refine_html_models",
            current_models,
            req.user_requirement,
            project_context=ctx,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language,
        )

        summary, refined_model_payload = _extract_refine_payload(
            result,
            default_summary="描述已更新",
            payload_keys=("html_models",),
        )

        refined_models = _ensure_refined_list(
            refined_model_payload,
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

        result = await ai_service.call_async(
            "refine_descriptions",
            current_descs,
            req.user_requirement,
            project_context=ctx,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language,
        )

        summary, refined_description_payload = _extract_refine_payload(
            result,
            default_summary="描述已更新",
            payload_keys=("descriptions",),
        )

        refined_descs = _ensure_refined_list(
            refined_description_payload,
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
        "summary": summary,
    })
