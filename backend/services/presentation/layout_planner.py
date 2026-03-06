"""
Layout planner for HTML rendering mode.

Assigns layout_archetype + layout_variant to each page.
Includes capacity profiling and fallback logic.
"""

from __future__ import annotations

import hashlib
import math
from typing import Dict, Iterable, List, Optional, Any

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
    "edu_cover": "cover",
    "edu_toc": "toc",
    "edu_tri_compare": "feature_compare",
    "edu_core_hub": "core_model",
    "edu_timeline_steps": "timeline",
    "edu_logic_flow": "process_flow",
    "edu_data_board": "data_dashboard",
    "edu_summary": "summary_reflection",
    "edu_qa_case": "qa_session",
}

VARIANT_POOLS_BY_BASE_LAYOUT: Dict[str, List[str]] = {
    "title_bullets": ["a", "b"],
    "process_steps": ["a", "b"],
    "ending": ["a", "b"],
    "edu_cover": ["a", "b"],
    "edu_toc": ["a", "b"],
    "edu_tri_compare": ["a", "b"],
    "edu_core_hub": ["a", "b"],
    "edu_timeline_steps": ["a", "b"],
    "edu_logic_flow": ["a", "b"],
    "edu_data_board": ["a", "b"],
    "edu_summary": ["a", "b"],
    "edu_qa_case": ["a", "b", "c", "d"],
}

# capacity_profile: max content each variant can hold.
# fallback_order: when content overflows, try these variants in order.
CAPACITY_PROFILES: Dict[str, Dict[str, Dict[str, Any]]] = {
    "edu_tri_compare": {
        "a": {"max_items": 3, "max_chars_per_item": 120, "max_total_chars": 500},
        "b": {"max_items": 3, "max_chars_per_item": 150, "max_total_chars": 600},
    },
    "edu_core_hub": {
        "a": {"max_items": 4, "max_chars_per_item": 40, "max_total_chars": 300},
        "b": {"max_items": 3, "max_chars_per_item": 60, "max_total_chars": 400},
    },
    "edu_timeline_steps": {
        "a": {"max_items": 4, "max_chars_per_item": 100, "max_total_chars": 500},
        "b": {"max_items": 4, "max_chars_per_item": 120, "max_total_chars": 600},
    },
    "edu_logic_flow": {
        "a": {"max_items": 3, "max_chars_per_item": 140, "max_total_chars": 500},
        "b": {"max_items": 4, "max_chars_per_item": 160, "max_total_chars": 700},
    },
    "edu_data_board": {
        "a": {"max_items": 3, "max_chars_per_item": 60, "max_total_chars": 400},
        "b": {"max_items": 3, "max_chars_per_item": 60, "max_total_chars": 400},
    },
    "edu_toc": {
        "a": {"max_items": 8, "max_chars_per_item": 40, "max_total_chars": 400},
        "b": {"max_items": 6, "max_chars_per_item": 50, "max_total_chars": 400},
    },
    "edu_summary": {
        "a": {"max_items": 3, "max_chars_per_item": 200, "max_total_chars": 800},
        "b": {"max_items": 3, "max_chars_per_item": 200, "max_total_chars": 800},
    },
    "edu_qa_case": {
        "a": {"max_items": 4, "max_chars_per_item": 150, "max_total_chars": 600},
        "b": {"max_items": 5, "max_chars_per_item": 150, "max_total_chars": 800},
        "c": {"max_items": 4, "max_chars_per_item": 200, "max_total_chars": 800},
        "d": {"max_items": 3, "max_chars_per_item": 200, "max_total_chars": 800},
    },
    "title_bullets": {
        "a": {"max_items": 6, "max_chars_per_item": 80, "max_total_chars": 600},
        "b": {"max_items": 5, "max_chars_per_item": 100, "max_total_chars": 600},
    },
}

# For each layout, preferred fallback order when capacity overflows.
# First entry with sufficient capacity wins.
FALLBACK_ORDER: Dict[str, List[str]] = {
    "edu_tri_compare": ["b", "a"],
    "edu_core_hub": ["b", "a"],
    "edu_timeline_steps": ["b", "a"],
    "edu_logic_flow": ["b", "a"],
    "edu_data_board": ["a", "b"],
    "edu_toc": ["a", "b"],
    "edu_summary": ["a", "b"],
    "edu_qa_case": ["b", "c", "a", "d"],
    "title_bullets": ["a", "b"],
}


def _stable_rank(value: str, seed: str = "") -> int:
    digest = hashlib.md5(f"{seed}{value}".encode("utf-8")).hexdigest()
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
    seed: str = "",
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

    def _variant_key(page: Dict, aliases: Optional[Dict[str, str]]) -> str:
        """Return the effective key for variant pool lookup.
        Check original layout_id first (e.g. edu_tri_compare),
        then fall back to the aliased layout_id (e.g. two_column)."""
        original = (str(page.get("layout_id", "")) or "").strip()
        if original in VARIANT_POOLS_BY_BASE_LAYOUT:
            return original
        return _resolve_base_layout(original, aliases)

    # Pre-count pages per variant-enabled base layout to compute feasible caps.
    counts_per_base: Dict[str, int] = {}
    for page in pages:
        vk = _variant_key(page, layout_aliases)
        if vk in VARIANT_POOLS_BY_BASE_LAYOUT:
            counts_per_base[vk] = counts_per_base.get(vk, 0) + 1

    usage: Dict[str, Dict[str, int]] = {}
    run_state: Dict[str, Dict[str, int]] = {}

    for page_index, page in enumerate(pages):
        base_layout = _resolve_base_layout(str(page.get("layout_id", "")), layout_aliases)
        archetype = ARCHETYPE_BY_BASE_LAYOUT.get(base_layout, "generic_content")
        page["layout_archetype"] = archetype

        # Use variant key (original layout_id if it has its own pool, otherwise aliased)
        vk = _variant_key(page, layout_aliases)
        pool = VARIANT_POOLS_BY_BASE_LAYOUT.get(vk)
        if not pool:
            page["layout_variant"] = "a"
            continue

        base_usage = usage.setdefault(vk, {variant: 0 for variant in pool})
        base_state = run_state.setdefault(vk, {"variant": "", "run": 0, "last_index": -2})
        total_for_base = max(1, counts_per_base.get(vk, 1))
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
        candidates.sort(key=lambda variant: (base_usage.get(variant, 0), _stable_rank(f"{page_index}:{variant}:{page.get('title', '')}", seed)))
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


def _estimate_content_size(page: Dict) -> Dict[str, int]:
    """Estimate item count and total char length from page content."""
    model = page.get("html_model") or page.get("model") or {}
    if isinstance(model, str):
        import json as _json
        try:
            model = _json.loads(model)
        except Exception:
            model = {}

    items = (
        model.get("bullets")
        or model.get("stages")
        or model.get("nodes")
        or model.get("columns")
        or model.get("items")
        or model.get("metrics")
        or model.get("steps")
        or model.get("analysis")
        or []
    )
    item_count = len(items) if isinstance(items, list) else 0

    total_chars = 0
    max_item_chars = 0
    for item in (items if isinstance(items, list) else []):
        if isinstance(item, str):
            length = len(item)
        elif isinstance(item, dict):
            length = sum(len(str(v)) for v in item.values() if isinstance(v, (str, int, float)))
        else:
            length = 0
        total_chars += length
        max_item_chars = max(max_item_chars, length)

    return {"item_count": item_count, "total_chars": total_chars, "max_item_chars": max_item_chars}


def validate_capacity(
    layout_id: str,
    variant: str,
    page: Dict,
) -> str:
    """Check if page content fits in the chosen variant.
    Returns the variant to use (may fallback to a different one)."""
    profiles = CAPACITY_PROFILES.get(layout_id)
    if not profiles:
        return variant

    size = _estimate_content_size(page)
    if not size["item_count"] and not size["total_chars"]:
        return variant

    profile = profiles.get(variant)
    if profile and _fits(size, profile):
        return variant

    # Try fallback order
    for fb_variant in FALLBACK_ORDER.get(layout_id, []):
        fb_profile = profiles.get(fb_variant)
        if fb_profile and _fits(size, fb_profile):
            return fb_variant

    return variant


def _fits(size: Dict[str, int], profile: Dict[str, Any]) -> bool:
    max_items = profile.get("max_items", 999)
    max_chars = profile.get("max_total_chars", 99999)
    max_per = profile.get("max_chars_per_item", 99999)
    return (
        size["item_count"] <= max_items
        and size["total_chars"] <= max_chars
        and size["max_item_chars"] <= max_per
    )


def generate_layout_plan(
    pages: List[Dict],
    scheme_id: str = "edu_dark",
    layout_aliases: Optional[Dict[str, str]] = None,
    seed: str = "",
) -> List[Dict[str, str]]:
    """High-level entry: assign variants then validate capacity.
    Returns list of {page_id, layout_id, variant} dicts."""
    outline_copy = [dict(p) for p in pages]
    assign_layout_variants(outline_copy, scheme_id=scheme_id, layout_aliases=layout_aliases, seed=seed)

    plan = []
    for page in outline_copy:
        layout_id = str(page.get("layout_id", "")).strip()
        variant = str(page.get("layout_variant", "a"))
        variant = validate_capacity(layout_id, variant, page)
        plan.append({
            "page_id": str(page.get("page_id", page.get("id", ""))),
            "layout_id": layout_id,
            "variant": variant,
        })
    return plan


def assign_layout_variants_to_structured_outline(
    outline: Dict,
    scheme_id: str = "tech_blue",
    layout_aliases: Optional[Dict[str, str]] = None,
    max_variant_usage: int = 2,
    max_run_length: int = 1,
    seed: str = "",
) -> Dict:
    if not isinstance(outline, dict) or not isinstance(outline.get("pages"), list):
        return outline
    outline["pages"] = assign_layout_variants(
        outline=outline["pages"],
        scheme_id=scheme_id,
        layout_aliases=layout_aliases,
        max_variant_usage=max_variant_usage,
        max_run_length=max_run_length,
        seed=seed,
    )
    return outline
