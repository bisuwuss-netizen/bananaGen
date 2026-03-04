"""Unit tests for cross-project quality guard logic."""

from services.ppt_quality_guard import (
    apply_outline_quality_guard,
    apply_page_model_quality_guard,
)


def _flatten_outline(outline):
    pages = []
    for item in outline:
        if isinstance(item, dict) and "part" in item and isinstance(item.get("pages"), list):
            pages.extend(item["pages"])
        else:
            pages.append(item)
    return pages


def test_outline_guard_adds_missing_expansion_page_for_overview_promises():
    outline = [
        {"title": "封面", "layout_id": "cover", "points": []},
        {
            "title": "课程概述",
            "layout_id": "title_bullets",
            "points": ["模型能力", "评测方法", "落地策略"],
        },
        {
            "title": "模型能力详解",
            "layout_id": "title_content",
            "points": ["介绍核心能力与边界"],
        },
        {"title": "感谢观看", "layout_id": "ending", "points": []},
    ]

    guarded = apply_outline_quality_guard(outline, render_mode="html", scheme_id="tech_blue")
    pages = _flatten_outline(guarded)

    titles = [page.get("title", "") for page in pages]
    assert any("评测方法" in title for title in titles)
    assert pages[-1]["layout_id"] == "ending"


def test_outline_guard_adds_summary_before_ending():
    outline = [
        {"title": "封面", "layout_id": "cover", "points": []},
        {"title": "目录", "layout_id": "toc", "points": ["第一章"]},
        {"title": "第一章", "layout_id": "section_title", "points": []},
        {"title": "核心内容", "layout_id": "title_content", "points": ["关键定义", "应用示例"]},
        {"title": "致谢", "layout_id": "ending", "points": []},
    ]

    guarded = apply_outline_quality_guard(outline, render_mode="html", scheme_id="tech_blue")
    pages = _flatten_outline(guarded)

    assert len(pages) >= 6
    assert pages[-1]["layout_id"] == "ending"
    assert "总结" in pages[-2].get("title", "") or "答疑" in pages[-2].get("title", "")


def test_outline_guard_adds_case_followup_page():
    outline = [
        {"title": "封面", "layout_id": "cover", "points": []},
        {"title": "目录", "layout_id": "toc", "points": []},
        {
            "title": "案例展示：高校课程改革",
            "layout_id": "title_content",
            "points": ["展示项目案例", "说明改造成果"],
        },
        {"title": "后续章节", "layout_id": "title_bullets", "points": ["要点A", "要点B"]},
        {"title": "结束", "layout_id": "ending", "points": []},
    ]

    guarded = apply_outline_quality_guard(outline, render_mode="html", scheme_id="tech_blue")
    pages = _flatten_outline(guarded)
    titles = [page.get("title", "") for page in pages]

    assert any("复盘" in title for title in titles)


def test_page_model_guard_completes_bullets_and_sentences():
    model = {
        "title": "核心机制",
        "bullets": [
            {"text": "概念A", "description": ""},
            {"text": "概念B", "description": "解释到一半"},
        ],
    }

    guarded = apply_page_model_quality_guard(
        layout_id="title_bullets",
        model=model,
        page_outline={"title": "核心机制"},
    )

    bullets = guarded.get("bullets", [])
    assert len(bullets) >= 3
    assert all(b.get("description") for b in bullets)
    assert all(b["description"].endswith(("。", ".", "！", "?", "？", "!")) for b in bullets)


def test_outline_guard_preserves_part_structure_when_input_uses_parts():
    outline = [
        {
            "part": "第一部分",
            "pages": [
                {"title": "封面", "layout_id": "cover", "points": []},
                {"title": "目录", "layout_id": "toc", "points": []},
                {"title": "概述", "layout_id": "title_bullets", "points": ["A能力", "B能力"]},
            ],
        },
        {
            "part": "第二部分",
            "pages": [
                {"title": "A能力详解", "layout_id": "title_content", "points": ["说明A"]},
                {"title": "结束", "layout_id": "ending", "points": []},
            ],
        },
    ]

    guarded = apply_outline_quality_guard(outline, render_mode="html", scheme_id="tech_blue")
    assert isinstance(guarded, list)
    assert any(isinstance(item, dict) and "part" in item for item in guarded)
