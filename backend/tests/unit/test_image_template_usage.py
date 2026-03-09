from pathlib import Path

from services.prompts.image import get_image_generation_prompt
from services.tasks.image_task import _resolve_template_usage


class DummyFileService:
    def __init__(self, template_path: str | None):
        self.template_path = template_path

    def get_template_path(self, project_id: str) -> str | None:
        del project_id
        return self.template_path


def test_resolve_template_usage_returns_false_when_template_not_requested(tmp_path):
    template_file = tmp_path / "template.png"
    template_file.write_bytes(b"fake")

    ref_path, has_template = _resolve_template_usage(
        DummyFileService(str(template_file)),
        "project-1",
        use_template=False,
    )

    assert ref_path is None
    assert has_template is False


def test_resolve_template_usage_returns_false_when_no_template_file():
    ref_path, has_template = _resolve_template_usage(
        DummyFileService(None),
        "project-1",
        use_template=True,
    )

    assert ref_path is None
    assert has_template is False


def test_resolve_template_usage_returns_true_when_template_file_exists(tmp_path):
    template_file = tmp_path / "template.png"
    template_file.write_bytes(b"fake")

    ref_path, has_template = _resolve_template_usage(
        DummyFileService(str(template_file)),
        "project-1",
        use_template=True,
    )

    assert ref_path == str(template_file)
    assert has_template is True


def test_image_prompt_without_template_uses_generic_style_guideline():
    prompt = get_image_generation_prompt(
        page_desc="封面标题：香蕉项目复盘",
        outline_text="1. 封面",
        current_section="封面",
        has_template=False,
        page_index=1,
    )

    assert "模板图片严格相似" not in prompt
    assert "禁止出现模板中的文字" not in prompt
    assert "若提供了风格描述" in prompt
