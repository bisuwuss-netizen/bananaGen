"""Project-related Pydantic schemas"""
import json
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, model_validator

from .page import PageResponse


class CreateProjectRequest(BaseModel):
    """
    Create project request body.
    
    Replaces manual request.json parsing in project_controller.py create_project().
    FastAPI auto-validates all fields and returns 422 on invalid input.
    """
    creation_type: Literal["idea", "outline", "description"] = "idea"
    idea_prompt: Optional[str] = None
    outline_text: Optional[str] = None
    outline: Optional[list[dict]] = None
    description_text: Optional[str] = None
    template_style: Optional[str] = None
    render_mode: Literal["image", "html"] = "image"
    scheme_id: str = "edu_dark"

    @model_validator(mode="after")
    def normalize_outline(self):
        if self.outline_text is None and self.outline is not None:
            self.outline_text = json.dumps(self.outline, ensure_ascii=False)
        return self


class UpdateProjectRequest(BaseModel):
    """Update project request body"""
    idea_prompt: Optional[str] = None
    extra_requirements: Optional[str] = None
    template_style: Optional[str] = None
    scheme_id: Optional[str] = None
    export_extractor_method: Optional[str] = None
    export_inpaint_method: Optional[str] = None
    pages_order: Optional[list[str]] = None


class ProjectResponse(BaseModel):
    """
    Project API response.
    
    Replaces Project.to_dict() method - Pydantic handles serialization automatically.
    """
    project_id: str
    idea_prompt: Optional[str] = None
    outline_text: Optional[str] = None
    description_text: Optional[str] = None
    extra_requirements: Optional[str] = None
    creation_type: str = "idea"
    template_image_url: Optional[str] = None
    template_style: Optional[str] = None
    scheme_id: str = "edu_dark"
    export_extractor_method: str = "hybrid"
    export_inpaint_method: str = "hybrid"
    render_mode: str = "image"
    status: str = "DRAFT"
    user_id: Optional[str] = None
    pages: list[PageResponse] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    """Project list response with pagination"""
    projects: list[ProjectResponse]
    total: int
    limit: int
    offset: int
