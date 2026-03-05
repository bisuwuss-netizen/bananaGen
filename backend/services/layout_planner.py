"""
Layout planner for HTML rendering mode.

This planner assigns:
- layout_archetype: semantic page archetype
- layout_variant: visual variant key (a/b/c...)

The assignment is deterministic and applies lightweight diversity constraints.
"""

from __future__ import annotations

import hashlib
import math
from typing import Dict, Iterable, List, Optional

# Archetype mapping is based on resolved/base layout id.
ARCHETYPE_BY_BASE_LAYOUT: Dict[str, str] = {
    "cover": "cover",
    "toc": "toc",
    "section_title": "section_divider",
    "title_content": "concept_explain",
    "title_bullets": "feature_list",
    "two_column": "data_metrics",
    "process_steps": "process_steps",
    "image_full": "case_visual",
    "quote": "quote",
    "ending": "summary_reflection",
}

# Variant pools per base layout.
# "a" is existing default layout, "b" is the newly added variant.
VARIANT_POOLS_BY_BASE_LAYOUT: Dict[str, List[str]] = {
    "title_bullets": ["a", "b"],
    "process_steps": ["a", "b"],
    "ending": ["a", "b"],
}


def _stable_rank(value: str) -> int:
    digest = hashlib.md5(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _iter_page_refs(outline: List[Dict]) -> Iterable[Dict]:
    for item in outline or []:
        if isinstance(item, dict) and isinstance(item.get("pages"), list):
            for page in item.get("pages", []):
                if isinstance(page, dict):
                    yield page
        elif isinstance(item, dict):
            yield item


def _resolve_base_layout(layout_id: str, aliases: Optional[Dict[str, str]]) -> str:
    value = (layout_id or "").strip()
    if not value:
        return ""
    if not aliases:
        return value
    return aliases.get(value, value)


def assign_layout_variants(
    outline: List[Dict],
    scheme_id: str = "tech_blue",
    layout_aliases: Optional[Dict[str, str]] = None,
    max_variant_usage: int = 2,
    max_run_length: int = 1,
) -> List[Dict]:
    """
    Assign archetype + variant to outline pages in-place, then return the same outline.

    Constraints:
    - Prefer not repeating the same variant in adjacent pages (within same base layout family)
    - Prefer capping the same variant usage to max_variant_usage
    - Automatically relax cap when the deck is too long for a strict cap
    """
    del scheme_id  # Reserved for future scheme-specific pools.

    pages = list(_iter_page_refs(outline))
    if not pages:
        return outline

    # Pre-count pages per variant-enabled base layout to compute feasible caps.
    counts_per_base: Dict[str, int] = {}
    for page in pages:
        base_layout = _resolve_base_layout(str(page.get("layout_id", "")), layout_aliases)
        if base_layout in VARIANT_POOLS_BY_BASE_LAYOUT:
            counts_per_base[base_layout] = counts_per_base.get(base_layout, 0) + 1

    usage: Dict[str, Dict[str, int]] = {}
    run_state: Dict[str, Dict[str, int]] = {}

    for page_index, page in enumerate(pages):
        base_layout = _resolve_base_layout(str(page.get("layout_id", "")), layout_aliases)
        archetype = ARCHETYPE_BY_BASE_LAYOUT.get(base_layout, "generic_content")
        page["layout_archetype"] = archetype

        pool = VARIANT_POOLS_BY_BASE_LAYOUT.get(base_layout)
        if not pool:
            page["layout_variant"] = "a"
            continue

        base_usage = usage.setdefault(base_layout, {variant: 0 for variant in pool})
        base_state = run_state.setdefault(base_layout, {"variant": "", "run": 0, "last_index": -2})
        total_for_base = max(1, counts_per_base.get(base_layout, 1))
        pool_size = max(1, len(pool))

        # Relax cap when strict limit is mathematically impossible.
        dynamic_cap = max(max_variant_usage, math.ceil(total_for_base / pool_size))

        preferred: List[str] = []
        relaxed_cap: List[str] = []
        relaxed_run: List[str] = []

        for variant in pool:
            current_usage = base_usage.get(variant, 0)
            exceeds_cap = current_usage >= dynamic_cap
            last_index = int(base_state.get("last_index", -2))
            is_adjacent = (page_index - last_index) == 1
            exceeds_run = (
                is_adjacent
                and base_state.get("variant") == variant
                and int(base_state.get("run", 0)) >= max_run_length
            )
            if not exceeds_cap and not exceeds_run:
                preferred.append(variant)
            if not exceeds_run:
                relaxed_cap.append(variant)
            relaxed_run.append(variant)

        candidates = preferred or relaxed_cap or relaxed_run
        candidates.sort(key=lambda variant: (base_usage.get(variant, 0), _stable_rank(f"{page_index}:{variant}:{page.get('title', '')}")))
        chosen = candidates[0] if candidates else pool[0]

        page["layout_variant"] = chosen
        base_usage[chosen] = base_usage.get(chosen, 0) + 1

        last_index = int(base_state.get("last_index", -2))
        is_adjacent = (page_index - last_index) == 1
        if is_adjacent and base_state.get("variant") == chosen:
            base_state["run"] = int(base_state.get("run", 0)) + 1
        else:
            base_state["variant"] = chosen
            base_state["run"] = 1
        base_state["last_index"] = page_index

    return outline


def assign_layout_variants_to_structured_outline(
    outline: Dict,
    scheme_id: str = "tech_blue",
    layout_aliases: Optional[Dict[str, str]] = None,
    max_variant_usage: int = 2,
    max_run_length: int = 1,
) -> Dict:
    if not isinstance(outline, dict) or not isinstance(outline.get("pages"), list):
        return outline
    outline["pages"] = assign_layout_variants(
        outline=outline["pages"],
        scheme_id=scheme_id,
        layout_aliases=layout_aliases,
        max_variant_usage=max_variant_usage,
        max_run_length=max_run_length,
    )
    return outline
