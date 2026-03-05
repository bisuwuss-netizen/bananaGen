"""Unit tests for narrative continuity helpers."""

from services.narrative_continuity import (
    NarrativeRuntimeTracker,
    apply_template_capacity,
    enrich_outline_with_narrative_contract,
    evaluate_generation_quality,
    inject_unresolved_promise_closure_blocks,
)


def _build_outline():
    return {
        "title": "AI 产品方案",
        "pages": [
            {"page_id": "p01", "title": "封面", "layout_id": "cover", "keywords": []},
            {
                "page_id": "p02",
                "title": "方案总览",
                "layout_id": "title_bullets",
                "points": ["用户增长策略", "成本优化方法", "风险控制机制"],
                "keywords": ["增长", "成本", "风险"],
            },
            {"page_id": "p03", "title": "增长策略展开", "layout_id": "title_content", "points": []},
            {"page_id": "p04", "title": "成本与风险展开", "layout_id": "title_content", "points": []},
            {"page_id": "p05", "title": "总结与答疑", "layout_id": "ending", "keywords": []},
        ],
    }


def test_enrich_outline_injects_hard_closure_fields():
    outline = enrich_outline_with_narrative_contract(_build_outline())
    pages = outline["pages"]

    assert "depends_on" in pages[2]
    assert "must_cover" in pages[2]
    assert "promises_open" in pages[1]

    first_promise = pages[1]["promises_open"][0]
    assert first_promise.get("promise_id")
    assert first_promise.get("target_page_ids")

    close_slots = [p.get("required_close_promise_ids", []) for p in pages]
    assert any(first_promise["promise_id"] in closings for closings in close_slots)


def test_semantic_target_matching_falls_back_to_summary_page():
    outline = {
        "title": "技术选型",
        "pages": [
            {"page_id": "p01", "title": "封面", "layout_id": "cover"},
            {
                "page_id": "p02",
                "title": "技术路线总览",
                "layout_id": "title_bullets",
                "promises_open": [
                    {"promise_id": "pr_demo", "text": "开源框架落地建议", "must_cover": ["开源框架", "落地建议"]}
                ],
            },
            {"page_id": "p03", "title": "企业平台治理", "layout_id": "title_content"},
            {"page_id": "p04", "title": "总结", "layout_id": "title_content"},
        ],
    }
    enriched = enrich_outline_with_narrative_contract(outline)
    promise = enriched["pages"][1]["promises_open"][0]
    assert promise["target_page_ids"] == ["p04"]
    assert "pr_demo" in enriched["pages"][3]["required_close_promise_ids"]


def test_case_chain_rule_adds_followup_promise_when_missing():
    outline = {
        "title": "案例教学",
        "pages": [
            {"page_id": "p01", "title": "封面", "layout_id": "cover"},
            {"page_id": "p02", "title": "增长案例", "layout_id": "title_content", "points": ["案例背景", "方法"]},
            {"page_id": "p03", "title": "总结", "layout_id": "title_content"},
        ],
    }
    enriched = enrich_outline_with_narrative_contract(outline)
    promises = enriched["pages"][1]["promises_open"]
    assert any("复盘" in p.get("text", "") or "启示" in p.get("text", "") for p in promises)
    summary_required = enriched["pages"][2].get("required_close_promise_ids", [])
    assert summary_required


def test_auto_promises_not_over_generated_for_non_overview_pages():
    outline = {
        "title": "架构方案",
        "pages": [
            {"page_id": "p01", "title": "封面", "layout_id": "cover"},
            {
                "page_id": "p02",
                "title": "核心技术组件",
                "layout_id": "title_bullets",
                "points": ["高性能向量数据库", "多模态数据处理管道", "大模型网关服务", "权限与监控中心"],
            },
            {"page_id": "p03", "title": "总结", "layout_id": "title_content"},
        ],
    }
    enriched = enrich_outline_with_narrative_contract(outline)
    assert enriched["pages"][1].get("promises_open", []) == []


def test_context_keeps_all_required_close_ids_for_hard_constraints():
    promises = [
        {"promise_id": f"pr_{i}", "text": f"主题{i}", "target_page_ids": ["p03"], "is_hard": True}
        for i in range(1, 7)
    ]
    outline = {
        "title": "硬承诺测试",
        "pages": [
            {"page_id": "p01", "title": "封面", "layout_id": "cover"},
            {"page_id": "p02", "title": "方案总览", "layout_id": "title_bullets", "promises_open": promises},
            {"page_id": "p03", "title": "总结", "layout_id": "title_content"},
        ],
    }
    tracker = NarrativeRuntimeTracker(enrich_outline_with_narrative_contract(outline))
    ctx = tracker.build_context_for_page("p03")
    required_ids = ctx.get("required_close_promise_ids", [])
    assert len(required_ids) >= 6
    assert all(f"pr_{i}" in required_ids for i in range(1, 7))


def test_runtime_tracker_closes_promises_with_closed_ids():
    outline = enrich_outline_with_narrative_contract(_build_outline())
    tracker = NarrativeRuntimeTracker(outline)

    tracker.apply_generated_page("p01", "cover", "封面", {"title": "AI 产品方案"}, [])
    tracker.apply_generated_page(
        "p02",
        "title_bullets",
        "方案总览",
        {
            "title": "方案总览",
            "bullets": [
                {"text": "用户增长策略", "description": "后续会详细展开"},
                {"text": "成本优化方法", "description": "后续会详细展开"},
            ],
        },
        [],
    )

    p03_required = tracker.build_context_for_page("p03").get("required_close_promise_ids", [])
    tracker.apply_generated_page(
        "p03",
        "title_content",
        "增长策略展开",
        {"title": "增长策略展开", "content": ["用户增长策略通过渠道分层提高转化。"]},
        p03_required,
    )
    tracker.apply_generated_page(
        "p04",
        "title_content",
        "成本与风险展开",
        {"title": "成本与风险展开", "content": ["成本优化方法与风险控制机制的关键动作。"]},
        tracker.build_context_for_page("p04").get("required_close_promise_ids", []),
    )

    assert tracker.unresolved_promises() == []


def test_quality_evaluation_flags_hard_promise_unclosed():
    outline = enrich_outline_with_narrative_contract(_build_outline())
    generated_pages = [
        {"page_id": "p01", "layout_id": "cover", "title": "封面", "model": {"title": "AI 产品方案"}, "closed_promise_ids": []},
        {"page_id": "p02", "layout_id": "title_bullets", "title": "方案总览", "model": {"title": "方案总览", "bullets": ["用户增长策略", "成本优化方法"]}, "closed_promise_ids": []},
        {"page_id": "p03", "layout_id": "title_content", "title": "增长策略展开", "model": {"title": "增长策略展开", "content": ["泛化描述，未完成承诺。"]}, "closed_promise_ids": []},
        {"page_id": "p04", "layout_id": "title_content", "title": "成本与风险展开", "model": {"title": "成本与风险展开", "content": ["仍未完成承诺。"]}, "closed_promise_ids": []},
    ]
    report = evaluate_generation_quality(outline, generated_pages)
    issue_types = [issue.get("type") for issue in report.get("issues", [])]
    assert "hard_promise_unclosed" in issue_types


def test_fallback_injection_reduces_unresolved_promises():
    outline = enrich_outline_with_narrative_contract(_build_outline())
    generated_pages = [
        {"page_id": "p01", "layout_id": "cover", "title": "封面", "model": {"title": "AI 产品方案"}, "closed_promise_ids": []},
        {"page_id": "p02", "layout_id": "title_bullets", "title": "方案总览", "model": {"title": "方案总览", "bullets": ["用户增长策略"]}, "closed_promise_ids": []},
        {"page_id": "p03", "layout_id": "title_content", "title": "增长策略展开", "model": {"title": "增长策略展开", "content": ["内容不足"]}, "closed_promise_ids": []},
        {"page_id": "p04", "layout_id": "title_content", "title": "成本与风险展开", "model": {"title": "成本与风险展开", "content": ["内容不足"]}, "closed_promise_ids": []},
    ]
    before = evaluate_generation_quality(outline, generated_pages)
    after = inject_unresolved_promise_closure_blocks(outline, generated_pages)
    after_report = evaluate_generation_quality(after.get("outline", outline), after.get("generated_pages", generated_pages))

    assert len(before.get("unresolved_promises", [])) >= len(after_report.get("unresolved_promises", []))


def test_fallback_injection_can_close_many_promises_on_one_target_page():
    promises = [
        {"promise_id": f"pr_many_{i}", "text": f"需收束主题{i}", "target_page_ids": ["p04"], "is_hard": True}
        for i in range(1, 10)
    ]
    outline = enrich_outline_with_narrative_contract(
        {
            "title": "多承诺兜底",
            "pages": [
                {"page_id": "p01", "title": "封面", "layout_id": "cover"},
                {"page_id": "p02", "title": "方案总览", "layout_id": "title_bullets", "promises_open": promises},
                {"page_id": "p03", "title": "中间页", "layout_id": "title_content"},
                {"page_id": "p04", "title": "总结", "layout_id": "title_content"},
            ],
        }
    )

    generated_pages = [
        {"page_id": "p01", "layout_id": "cover", "title": "封面", "model": {"title": "封面"}, "closed_promise_ids": []},
        {"page_id": "p02", "layout_id": "title_bullets", "title": "方案总览", "model": {"title": "方案总览", "bullets": ["概览"]}, "closed_promise_ids": []},
        {"page_id": "p03", "layout_id": "title_content", "title": "中间页", "model": {"title": "中间页", "content": ["过渡"]}, "closed_promise_ids": []},
        {"page_id": "p04", "layout_id": "title_content", "title": "总结", "model": {"title": "总结", "content": ["结论"]}, "closed_promise_ids": []},
    ]

    after = inject_unresolved_promise_closure_blocks(outline, generated_pages, max_lines_per_page=2)
    after_report = evaluate_generation_quality(after.get("outline", outline), after.get("generated_pages", generated_pages))
    assert after_report.get("unresolved_promises", []) == []


def test_template_capacity_trims_overflow_content():
    model = {
        "title": "超长要点页",
        "bullets": [
            {"text": f"要点{i}", "description": "x" * 200}
            for i in range(1, 9)
        ],
    }
    trimmed = apply_template_capacity("title_bullets", model)
    assert len(trimmed.get("bullets", [])) <= 5
    assert all(len((item.get("description") or "")) <= 220 for item in trimmed.get("bullets", []))
