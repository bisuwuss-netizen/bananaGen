"""HTML renderer routes. Migrated from html_renderer_controller.py."""
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from schemas.common import SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/html-renderer", tags=["html-renderer"])


class OutlineRequest(BaseModel):
    topic: str
    requirements: str = ""
    language: str = "zh"
    scheme_id: str = "edu_dark"


class PageContentRequest(BaseModel):
    page_outline: dict[str, Any]
    full_outline: Optional[dict[str, Any]] = None
    language: str = "zh"
    scheme_id: str = "edu_dark"
    continuity_context: Optional[dict[str, Any]] = None
    rewrite_instruction: str = ""


class FullDocumentRequest(BaseModel):
    topic: str
    requirements: str = ""
    language: str = "zh"
    scheme_id: str = "edu_dark"
    content_depth: str = "balanced"
    generation_mode: str = "fast"


@router.post("/outline", response_model=SuccessResponse)
async def generate_outline(req: OutlineRequest):
    from services.ai_service_manager import get_ai_service_async

    ai_service = await get_ai_service_async()
    outline = await ai_service.call_async(
        "generate_structured_outline",
        topic=req.topic,
        requirements=req.requirements,
        language=req.language,
        scheme_id=req.scheme_id,
    )
    return SuccessResponse(data=outline)


@router.post("/page-content", response_model=SuccessResponse)
async def generate_page_content(req: PageContentRequest):
    from services.ai_service_manager import get_ai_service_async

    ai_service = await get_ai_service_async()
    model = await ai_service.call_async(
        "generate_structured_page_content",
        page_outline=req.page_outline,
        full_outline=req.full_outline,
        language=req.language,
        scheme_id=req.scheme_id,
        continuity_context=req.continuity_context if isinstance(req.continuity_context, dict) else None,
        rewrite_instruction=req.rewrite_instruction,
    )
    return SuccessResponse(data={
        "page_id": req.page_outline.get("page_id"),
        "layout_id": req.page_outline.get("layout_id"),
        "model": model,
    })


@router.post("/full-document", response_model=SuccessResponse)
async def generate_full_document(req: FullDocumentRequest):
    from services.ai_service_manager import get_ai_service_async

    gen_mode = req.generation_mode.strip().lower()
    if gen_mode not in ("fast", "strict"):
        gen_mode = "fast"

    ai_service = await get_ai_service_async()
    doc = await ai_service.call_async(
        "generate_full_ppt_document",
        topic=req.topic,
        requirements=req.requirements,
        language=req.language,
        scheme_id=req.scheme_id,
        content_depth=req.content_depth,
        generation_mode=gen_mode,
    )
    return SuccessResponse(data=doc)


@router.get("/health")
async def health_check():
    return SuccessResponse(data={"status": "ok", "service": "html-renderer"})
