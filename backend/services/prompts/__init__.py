"""Prompt package facade for the FastAPI refactor.

The legacy prompt implementation still lives in ``backend/services/prompts.py``.
This package exposes the same public API through modular re-export files so the
codebase can migrate imports incrementally without breaking compatibility.
"""

from .description import (
    get_description_split_prompt,
    get_page_description_prompt,
    get_page_descriptions_batch_prompt,
)
from .extraction import (
    get_batch_text_attribute_extraction_prompt,
    get_text_attribute_extraction_prompt,
)
from .image import (
    get_clean_background_prompt,
    get_image_edit_prompt,
    get_image_generation_prompt,
    get_quality_enhancement_prompt,
)
from .language import (
    LANGUAGE_CONFIG,
    get_default_output_language,
    get_language_instruction,
    get_ppt_language_instruction,
)
from .layouts import (
    LAYOUT_DESCRIPTIONS,
    LAYOUT_ID_ALIASES,
    LAYOUT_SCHEMAS,
    LAYOUT_SCHEMES,
    SCHEME_ROLE_LAYOUTS,
    get_layout_constraints,
    get_layout_scheme,
    get_layout_types_description,
    get_scheme_style_prompt,
    resolve_layout_id,
)
from .outline import (
    get_description_to_outline_prompt,
    get_outline_generation_prompt,
    get_outline_parsing_prompt,
)
from .refine import (
    get_descriptions_refinement_prompt,
    get_html_model_refinement_prompt,
    get_outline_refinement_prompt,
)
from .structured_content import (
    get_structured_outline_prompt,
    get_structured_page_content_batch_prompt,
    get_structured_page_content_prompt,
)
from .utils import (
    HTML_LAYOUT_TYPES,
    _build_compact_outline_context,
    _flatten_outline_pages,
    _format_reference_files_xml,
    _truncate_prompt_text,
)

__all__ = [
    "HTML_LAYOUT_TYPES",
    "LANGUAGE_CONFIG",
    "LAYOUT_DESCRIPTIONS",
    "LAYOUT_ID_ALIASES",
    "LAYOUT_SCHEMAS",
    "LAYOUT_SCHEMES",
    "SCHEME_ROLE_LAYOUTS",
    "_build_compact_outline_context",
    "_flatten_outline_pages",
    "_format_reference_files_xml",
    "_truncate_prompt_text",
    "get_batch_text_attribute_extraction_prompt",
    "get_clean_background_prompt",
    "get_default_output_language",
    "get_description_split_prompt",
    "get_description_to_outline_prompt",
    "get_descriptions_refinement_prompt",
    "get_html_model_refinement_prompt",
    "get_image_edit_prompt",
    "get_image_generation_prompt",
    "get_language_instruction",
    "get_layout_constraints",
    "get_layout_scheme",
    "get_layout_types_description",
    "get_outline_generation_prompt",
    "get_outline_parsing_prompt",
    "get_outline_refinement_prompt",
    "get_page_description_prompt",
    "get_page_descriptions_batch_prompt",
    "get_ppt_language_instruction",
    "get_quality_enhancement_prompt",
    "get_scheme_style_prompt",
    "get_structured_outline_prompt",
    "get_structured_page_content_batch_prompt",
    "get_structured_page_content_prompt",
    "get_text_attribute_extraction_prompt",
    "resolve_layout_id",
]
