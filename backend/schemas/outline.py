"""Outline-related Pydantic schemas - replaces Dict[str, Any] for outline data"""
from enum import Enum
from typing import Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class LayoutType(str, Enum):
    """All supported layout types for HTML rendering mode"""
    # Core layouts
    COVER = "cover"
    TOC = "toc"
    TITLE_CONTENT = "title_content"
    TITLE_BULLETS = "title_bullets"
    TWO_COLUMN = "two_column"
    PROCESS_STEPS = "process_steps"
    ENDING = "ending"
    SECTION_TITLE = "section_title"
    IMAGE_FULL = "image_full"
    QUOTE = "quote"
    TIMELINE = "timeline"
    TRI_COLUMN = "tri_column"

    # Edu scheme layouts
    EDU_COVER = "edu_cover"
    EDU_TOC = "edu_toc"
    EDU_CORE_HUB = "edu_core_hub"
    EDU_TRI_COMPARE = "edu_tri_compare"
    EDU_TIMELINE_STEPS = "edu_timeline_steps"
    EDU_DATA_BOARD = "edu_data_board"
    EDU_LOGIC_FLOW = "edu_logic_flow"
    EDU_SUMMARY = "edu_summary"

    # Additional layouts
    DARK_MATH = "dark_math"
    LEARNING_OBJECTIVES = "learning_objectives"
    THEORY_EXPLANATION = "theory_explanation"
    WARMUP_QUESTION = "warmup_question"
    SIDEBAR_CARD = "sidebar_card"
    SAFETY_NOTICE = "safety_notice"
    POLL_INTERACTIVE = "poll_interactive"
    DETAIL_ZOOM = "detail_zoom"
    PORTFOLIO = "portfolio"
    CINEMATIC_OVERLAY = "cinematic_overlay"
    CONCENTRIC_FOCUS = "concentric_focus"
    DIAGONAL_SPLIT = "diagonal_split"
    GRID_MATRIX = "grid_matrix"
    OVERLAP = "overlap"
    VERTICAL_TIMELINE = "vertical_timeline"
    FLOW_PROCESS = "flow_process"


class PageOutline(BaseModel):
    """
    Single page outline structure.
    
    Replaces the ubiquitous Dict[str, Any] pattern used throughout:
    - ai_service.py: generate_outline(), flatten_outline()
    - task_manager.py: generate_descriptions_task()
    - project_controller.py: generate_outline(), refine_outline()
    """
    page_id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    points: list[str] = Field(default_factory=list)
    layout_id: Optional[str] = None
    has_image: bool = False
    keywords: list[str] = Field(default_factory=list)
    part: Optional[str] = None
    # Narrative continuity fields
    depends_on: Optional[str] = None
    must_cover: list[str] = Field(default_factory=list)
    promises_open: list[dict] = Field(default_factory=list)
    promises_close: list[str] = Field(default_factory=list)


class OutlineResponse(BaseModel):
    """Structured outline response from AI generation"""
    title: str
    pages: list[PageOutline]
