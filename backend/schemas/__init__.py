"""Pydantic schemas for request/response validation"""
from .common import SuccessResponse, ErrorResponse, PaginationParams
from .project import (
    CreateProjectRequest, UpdateProjectRequest, ProjectResponse, ProjectListResponse
)
from .page import (
    CreatePageRequest, UpdatePageRequest, UpdateOutlineRequest,
    UpdateDescriptionRequest, PageResponse
)
from .outline import PageOutline, OutlineResponse, LayoutType
from .task import TaskProgress, TaskResponse
from .generation import (
    GenerateOutlineRequest, GenerateDescriptionsRequest,
    GenerateImagesRequest, RefineOutlineRequest, RefineDescriptionsRequest,
    GenerateHtmlImagesRequest, HtmlImageSlot
)
