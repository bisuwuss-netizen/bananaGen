"""Settings routes. Migrated from settings_controller.py."""
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from deps import get_db
from models.settings import Settings
from schemas.common import SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["settings"])


class UpdateSettingsRequest(BaseModel):
    api_base_url: Optional[str] = None
    api_key: Optional[str] = None
    image_resolution: Optional[str] = None
    image_aspect_ratio: Optional[str] = None
    max_description_workers: Optional[int] = None
    max_image_workers: Optional[int] = None
    text_model: Optional[str] = None
    image_model: Optional[str] = None
    image_caption_model: Optional[str] = None
    output_language: Optional[str] = None


def _get_settings_sync(db_session) -> Settings:
    """Get or create settings - must run within sync context for legacy model compatibility."""
    # For async context, we query directly
    from sqlalchemy import select
    return None  # Placeholder, actual impl below


@router.get("", response_model=SuccessResponse)
@router.get("/", response_model=SuccessResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(Settings).where(Settings.id == 1))
    s = result.scalar_one_or_none()
    if not s:
        from config import Config
        s = Settings(
            id=1,
            image_resolution=Config.DEFAULT_RESOLUTION,
            image_aspect_ratio=Config.DEFAULT_ASPECT_RATIO,
            max_description_workers=Config.MAX_DESCRIPTION_WORKERS,
            max_image_workers=Config.MAX_IMAGE_WORKERS,
            text_model=Config.TEXT_MODEL,
            image_model=Config.IMAGE_MODEL,
            output_language="zh",
        )
        db.add(s)
        await db.flush()
    return SuccessResponse(data=s.to_dict())


@router.put("", response_model=SuccessResponse)
@router.put("/", response_model=SuccessResponse)
async def update_settings(
    req: UpdateSettingsRequest,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    result = await db.execute(select(Settings).where(Settings.id == 1))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Settings not found")

    if req.api_base_url is not None:
        v = req.api_base_url.strip()
        s.api_base_url = v if v else None

    if req.api_key is not None:
        s.api_key = req.api_key

    if req.image_resolution is not None:
        if req.image_resolution not in ("1K", "2K", "4K"):
            raise HTTPException(400, "Resolution must be 1K, 2K, or 4K")
        s.image_resolution = req.image_resolution

    if req.image_aspect_ratio is not None:
        s.image_aspect_ratio = req.image_aspect_ratio

    if req.max_description_workers is not None:
        if not 1 <= req.max_description_workers <= 20:
            raise HTTPException(400, "max_description_workers must be 1-20")
        s.max_description_workers = req.max_description_workers

    if req.max_image_workers is not None:
        if not 1 <= req.max_image_workers <= 20:
            raise HTTPException(400, "max_image_workers must be 1-20")
        s.max_image_workers = req.max_image_workers

    if req.text_model is not None:
        s.text_model = req.text_model.strip() or None
    if req.image_model is not None:
        s.image_model = req.image_model.strip() or None
    if req.image_caption_model is not None:
        s.image_caption_model = req.image_caption_model.strip() or None

    if req.output_language is not None:
        if req.output_language not in ("zh", "en", "ja", "auto"):
            raise HTTPException(400, "output_language must be zh/en/ja/auto")
        s.output_language = req.output_language

    s.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return SuccessResponse(data=s.to_dict(), message="Settings updated")


@router.post("/reset", response_model=SuccessResponse)
async def reset_settings(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from config import Config

    result = await db.execute(select(Settings).where(Settings.id == 1))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Settings not found")

    s.ai_provider_format = "openai"
    s.api_base_url = Config.OPENAI_API_BASE or None
    s.api_key = Config.OPENAI_API_KEY or None

    s.text_model = Config.TEXT_MODEL
    s.image_model = Config.IMAGE_MODEL
    s.image_caption_model = Config.IMAGE_CAPTION_MODEL
    s.output_language = "zh"
    s.image_resolution = Config.DEFAULT_RESOLUTION
    s.image_aspect_ratio = Config.DEFAULT_ASPECT_RATIO
    s.max_description_workers = Config.MAX_DESCRIPTION_WORKERS
    s.max_image_workers = Config.MAX_IMAGE_WORKERS
    s.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return SuccessResponse(data=s.to_dict(), message="Settings reset to defaults")
