"""Prompt package compatibility tests for the FastAPI refactor."""

from services.prompts import (
    LAYOUT_SCHEMAS,
    get_layout_scheme,
    get_outline_generation_prompt,
    get_structured_page_content_prompt,
    get_text_attribute_extraction_prompt,
)
from services.prompts.base import get_language_instruction


def test_prompts_package_exports_legacy_api():
    assert callable(get_outline_generation_prompt)
    assert callable(get_structured_page_content_prompt)
    assert callable(get_text_attribute_extraction_prompt)
    assert callable(get_language_instruction)


def test_prompts_package_exports_layout_metadata():
    scheme = get_layout_scheme()

    assert isinstance(scheme, dict)
    assert "layouts" in scheme
    assert "cover" in LAYOUT_SCHEMAS
