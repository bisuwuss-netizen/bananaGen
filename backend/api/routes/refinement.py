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


@router.post("/{project_id}/refine/outline", response_model=SuccessResponse)
async def refine_outline(
    project_id: str,
    req: RefineOutlineRequest,
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_pages(db, project_id)

    if not project.pages:
        raise HTTPException(400, "No pages. Generate outline first.")

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

    ctx = ProjectContext(project, ref_content)
    current_outline = _reconstruct_outline(project.pages)
    language = req.language or app_settings.output_language

    refined = await ai_service.call_async(
        "refine_outline",
        current_outline,
        req.user_requirement,
        project_context=ctx,
        language=language,
    )

    render_mode = project.render_mode or "image"
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

    ai_service = await get_ai_service_async()
    language = req.language or app_settings.output_language
    render_mode = project.render_mode or "image"

    if render_mode == "html":
        current_models = []
        for p in sorted(project.pages, key=lambda x: int(x.order_index or 0)):
            hm = p.get_html_model()
            if hm:
                current_models.append({
                    "page_id": p.id,
                    "layout_id": p.layout_id,
                    "model": hm,
                })

        refined_models = await ai_service.call_async(
            "refine_html_models",
            current_models,
            req.user_requirement,
            language=language,
        )

        for rm in refined_models:
            page_id = rm.get("page_id")
            for p in project.pages:
                if p.id == page_id:
                    p.set_html_model(rm.get("model"))
                    p.updated_at = datetime.now()
                    break
    else:
        current_descs = []
        for p in sorted(project.pages, key=lambda x: int(x.order_index or 0)):
            dc = p.get_description_content()
            if dc:
                current_descs.append({
                    "page_id": p.id,
                    "description": dc,
                })

        refined_descs = await ai_service.call_async(
            "refine_descriptions",
            current_descs,
            req.user_requirement,
            language=language,
        )

        for rd in refined_descs:
            page_id = rd.get("page_id")
            for p in project.pages:
                if p.id == page_id:
                    p.set_description_content(rd.get("description"))
                    p.updated_at = datetime.now()
                    break

    project.updated_at = datetime.now()
    await db.flush()

    return SuccessResponse(data={
        "pages": [p.to_dict() for p in sorted(project.pages, key=lambda x: int(x.order_index or 0))],
    })
