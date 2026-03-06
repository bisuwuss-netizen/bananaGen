"""Task package compatibility tests for the FastAPI refactor."""

from services.tasks import (
    TaskManager,
    generate_descriptions_task,
    generate_images_task,
    task_manager,
)
from services.tasks.utils import _chunked


def test_tasks_package_exports_legacy_api():
    assert TaskManager is not None
    assert task_manager is not None
    assert callable(generate_descriptions_task)
    assert callable(generate_images_task)


def test_tasks_package_exports_utils():
    assert _chunked([1, 2, 3], 2) == [[1, 2], [3]]
