"""Read-only API route for the standalone home characters feature."""

from fastapi import APIRouter

from schemas.common import SuccessResponse

from .service import get_home_characters_config

router = APIRouter(prefix="/api/home-characters", tags=["home-characters"])


@router.get("/config", response_model=SuccessResponse)
async def read_home_characters_config():
    """Expose lightweight homepage character config to the frontend feature."""

    return SuccessResponse(data={"config": get_home_characters_config().model_dump()})
