"""Preset style routes. Migrated from preset_style_controller.py."""
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deps import get_db
from models.preset_style import PresetStyle
from schemas.common import SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/preset-styles", tags=["preset-styles"])


@router.get("/", response_model=SuccessResponse)
async def list_preset_styles(
    status: int = Query(1),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PresetStyle)
    if status is not None:
        stmt = stmt.where(PresetStyle.status == status)

    result = await db.execute(stmt)
    styles = result.scalars().all()
    return SuccessResponse(data={"styles": [s.to_dict() for s in styles]})
