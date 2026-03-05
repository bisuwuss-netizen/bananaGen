"""Common schemas used across the application"""
from typing import Any, Optional
from pydantic import BaseModel, Field


class SuccessResponse(BaseModel):
    """Standardized success response wrapper"""
    status: str = "success"
    data: Any = None
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standardized error response wrapper"""
    status: str = "error"
    error: dict = Field(default_factory=lambda: {"message": "Unknown error", "code": 500})


class PaginationParams(BaseModel):
    """Pagination query parameters"""
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
