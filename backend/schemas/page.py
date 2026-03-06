"""Page-related Pydantic schemas"""
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class CreatePageRequest(BaseModel):
    """Create page request body"""
    order_index: int
    part: Optional[str] = None
    outline_content: Optional[dict[str, Any]] = None


class UpdatePageRequest(BaseModel):
    """Update page request body (general fields)"""
    layout_id: Optional[str] = None
    html_model: Optional[dict[str, Any]] = None
    status: Optional[str] = None


class UpdateOutlineRequest(BaseModel):
    """Update page outline content"""
    outline_content: dict[str, Any]


class UpdateDescriptionRequest(BaseModel):
    """Update page description content"""
    description_content: dict[str, Any]


class PageResponse(BaseModel):
    """
    Page API response.
    
    Replaces Page.to_dict() - all JSON fields auto-parsed by Pydantic.
    """
    page_id: str
    order_index: int = 0
    part: Optional[str] = None
    outline_content: Optional[dict[str, Any]] = None
    description_content: Optional[dict[str, Any]] = None
    layout_id: Optional[str] = None
    html_model: Optional[dict[str, Any]] = None
    closed_promise_ids: list[str] = Field(default_factory=list)
    missing_required_close_promise_ids: list[str] = Field(default_factory=list)
    generated_image_url: Optional[str] = None
    status: str = "DRAFT"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
