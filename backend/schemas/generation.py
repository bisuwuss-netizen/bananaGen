"""Generation-related request/response schemas"""
from typing import Any, Optional, Literal
from pydantic import BaseModel, Field


class GenerateOutlineRequest(BaseModel):
    """Generate outline request body"""
    idea_prompt: Optional[str] = None
    language: str = "zh"


class GenerateDescriptionsRequest(BaseModel):
    """Generate descriptions request body"""
    max_workers: int = 5
    language: str = "zh"
    generation_mode: Literal["fast", "strict"] = "fast"


class GenerateImagesRequest(BaseModel):
    """Generate images request body"""
    max_workers: int = 8
    use_template: bool = True
    language: str = "zh"
    page_ids: Optional[list[str]] = None


class RefineOutlineRequest(BaseModel):
    """Refine outline request body"""
    user_requirement: str
    language: str = "zh"


class RefineDescriptionsRequest(BaseModel):
    """Refine descriptions request body"""
    user_requirement: str
    language: str = "zh"


class HtmlImageSlot(BaseModel):
    """Single slot for HTML image generation"""
    page_id: str
    slot_path: str
    prompt: str
    aspect_ratio: str = "16:9"


class GenerateHtmlImagesRequest(BaseModel):
    """Generate HTML images request body"""
    slots: list[HtmlImageSlot]
    language: str = "zh"


class ExportEditablePptxRequest(BaseModel):
    """Export editable PPTX request body"""
    filename: Optional[str] = None
    page_ids: Optional[list[str]] = None
    max_depth: int = 2
    max_workers: int = 4
    extractor_method: str = "hybrid"
    inpaint_method: str = "hybrid"
