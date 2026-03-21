"""Task package facade for the FastAPI refactor."""

from .description_task import generate_descriptions_task
from .export_task import export_editable_pptx_with_recursive_analysis_task
from .image_task import (
    generate_images_task,
    generate_material_image_task,
    generate_single_page_image_task,
)
from .knowledge_base_task import generate_knowledge_base_outline_task
from .outline_task import generate_outline_task
from .manager import (
    DEFAULT_TASK_STALE_TIMEOUT_SECONDS,
    TASK_STALE_TIMEOUT_SECONDS,
    TaskManager,
    _env_positive_int,
    _get_stale_timeout_seconds,
    _safe_positive_int,
    task_manager,
)
from .utils import _chunked, save_image_with_version

__all__ = [
    "DEFAULT_TASK_STALE_TIMEOUT_SECONDS",
    "TASK_STALE_TIMEOUT_SECONDS",
    "TaskManager",
    "_chunked",
    "_env_positive_int",
    "_get_stale_timeout_seconds",
    "_safe_positive_int",
    "export_editable_pptx_with_recursive_analysis_task",
    "generate_descriptions_task",
    "generate_images_task",
    "generate_knowledge_base_outline_task",
    "generate_material_image_task",
    "generate_outline_task",
    "generate_single_page_image_task",
    "save_image_with_version",
    "task_manager",
]
