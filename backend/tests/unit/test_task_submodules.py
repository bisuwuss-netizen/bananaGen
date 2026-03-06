import inspect

from services.tasks import description_task, edit_task, export_task, image_task, manager, utils


def test_task_manager_helpers_cover_timeout_parsing():
    assert manager._safe_positive_int("8", 4) == 8
    assert manager._safe_positive_int("0", 4) == 4
    assert manager._get_stale_timeout_seconds("GENERATE_IMAGES") == manager.TASK_STALE_TIMEOUT_SECONDS["GENERATE_IMAGES"]
    assert manager._get_stale_timeout_seconds("UNKNOWN_TASK") == manager.DEFAULT_TASK_STALE_TIMEOUT_SECONDS


def test_task_utils_chunked_handles_small_and_invalid_sizes():
    assert utils._chunked([1, 2, 3, 4], 2) == [[1, 2], [3, 4]]
    assert utils._chunked([1, 2, 3], 0) == [[1], [2], [3]]


def test_task_submodules_expose_expected_entrypoints():
    assert callable(description_task.generate_descriptions_task)
    assert callable(image_task.generate_images_task)
    assert callable(image_task.generate_single_page_image_task)
    assert callable(image_task.generate_material_image_task)
    assert callable(edit_task.edit_page_image_task)
    assert callable(export_task.export_editable_pptx_with_recursive_analysis_task)

    assert "task_id" in inspect.signature(description_task.generate_descriptions_task).parameters
    assert "project_id" in inspect.signature(image_task.generate_images_task).parameters
    assert "page_id" in inspect.signature(edit_task.edit_page_image_task).parameters
