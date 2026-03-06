"""
Layout planner unit tests.
"""

import copy
from collections import Counter

from services.presentation.layout_planner import assign_layout_variants


def _make_outline(layout_ids):
    return [
        {
            "title": f"Page {idx + 1}",
            "points": ["p1", "p2"],
            "layout_id": layout_id,
        }
        for idx, layout_id in enumerate(layout_ids)
    ]


def test_assigns_archetype_and_default_variant_for_non_variant_layouts():
    outline = _make_outline(["cover", "toc", "quote"])

    result = assign_layout_variants(copy.deepcopy(outline))

    assert result[0]["layout_archetype"] == "cover"
    assert result[1]["layout_archetype"] == "toc"
    assert result[2]["layout_archetype"] == "quote"
    assert all(page["layout_variant"] == "a" for page in result)


def test_adjacent_pages_with_same_base_layout_do_not_repeat_variant():
    outline = _make_outline(["title_bullets", "title_bullets", "title_bullets", "title_bullets"])

    result = assign_layout_variants(copy.deepcopy(outline), max_variant_usage=10, max_run_length=1)
    variants = [page["layout_variant"] for page in result]

    for idx in range(1, len(variants)):
        assert variants[idx] != variants[idx - 1]


def test_non_adjacent_pages_are_not_treated_as_run_length(monkeypatch):
    outline = _make_outline(["title_bullets", "two_column", "title_bullets", "quote", "title_bullets"])

    def fake_rank(value: str) -> int:
        # page 0 prefers variant "a"; later ties prefer variant "b"
        if value.startswith("0:"):
            return 0 if ":a:" in value else 1
        return 0 if ":b:" in value else 1

    monkeypatch.setattr("services.presentation.layout_planner._stable_rank", fake_rank)

    result = assign_layout_variants(copy.deepcopy(outline), max_variant_usage=10, max_run_length=1)
    variants = [result[idx]["layout_variant"] for idx in [0, 2, 4]]

    # If non-adjacent pages were still considered a run, page 5 would be forced to "a".
    # Correct behavior allows page 5 to be "b" based on ranking tie-break.
    assert variants == ["a", "b", "b"]


def test_dynamic_cap_relaxation_keeps_distribution_feasible():
    outline = _make_outline(["title_bullets"] * 5)

    result = assign_layout_variants(copy.deepcopy(outline), max_variant_usage=1, max_run_length=1)
    variants = [page["layout_variant"] for page in result]
    counts = Counter(variants)

    assert len(variants) == 5
    assert max(counts.values()) <= 3
    for idx in range(1, len(variants)):
        assert variants[idx] != variants[idx - 1]
