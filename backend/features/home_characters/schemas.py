"""Schemas for the standalone home characters feature."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HomeCharacterConfig(BaseModel):
    """Visual and motion configuration for a single character."""

    id: str
    shape: Literal["block", "rounded_block", "arch"]
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    left: int = 0
    bottom: int = Field(default=0, ge=0)
    layer: int = Field(default=1, ge=0)
    background: str
    border_radius: str
    eye_style: Literal["eyeball", "pupil"]
    eye_top: int = Field(ge=0)
    eye_left: int = Field(ge=0)
    eye_gap: int = Field(ge=0)
    eye_size: int = Field(ge=1)
    pupil_size: int = Field(ge=1)
    eye_color: str = "white"
    pupil_color: str = "#2D2D2D"
    mouth_top: int | None = None
    mouth_left: int | None = None
    mouth_width: int | None = None
    mouth_height: int = Field(default=4, ge=1)
    max_face_x: int = Field(default=14, ge=0)
    max_face_y: int = Field(default=10, ge=0)
    max_skew: float = Field(default=6.0, ge=0)
    face_x_factor: float = Field(default=1.0, ge=0)
    face_y_factor: float = Field(default=1.0, ge=0)
    skew_factor: float = Field(default=1.0, ge=0)
    focus_shift_x: int = 0
    focus_shift_y: int = 0
    focus_skew: float = 0.0
    focus_height_delta: int = 0
    ready_shift_y: int = 0
    blink_enabled: bool = False


class HomeCharactersConfig(BaseModel):
    """Standalone homepage feature payload."""

    eyebrow: str
    title: str
    description: str
    footnote: str
    scene_width: int = Field(ge=1)
    scene_height: int = Field(ge=1)
    floor_height: int = Field(ge=1)
    chips: list[str] = Field(default_factory=list)
    characters: list[HomeCharacterConfig] = Field(default_factory=list)
