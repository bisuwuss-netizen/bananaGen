"""Task-related Pydantic schemas"""
from datetime import datetime
from typing import Any, Optional, Literal
from pydantic import BaseModel


class TaskProgress(BaseModel):
    """
    Task progress structure.
    
    Replaces manual JSON string parsing of Task.progress field.
    """
    total: int = 0
    completed: int = 0
    failed: int = 0
    current_page: Optional[str] = None
    stage: Optional[str] = None
    # Allow extra fields for task-specific progress data (e.g. download_url)
    model_config = {"extra": "allow"}


class TaskResponse(BaseModel):
    """Task status API response"""
    task_id: str
    task_type: str
    status: Literal["PENDING", "PROCESSING", "COMPLETED", "FAILED"]
    progress: TaskProgress = TaskProgress()
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
