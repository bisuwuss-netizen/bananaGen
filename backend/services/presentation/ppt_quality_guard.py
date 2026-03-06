"""
Cross-project quality guards for outline and structured page content.

These guards are deterministic and provider-agnostic. They patch common
quality issues before data is persisted:
- broken narrative continuity in outlines
- missing expansion pages for overview promises
- missing case follow-up pages
- missing summary/Q&A before ending
- sparse or incomplete structured page models
"""

from __future__ import annotations

import copy
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from services.prompts import LAYOUT_ID_ALIASES, LAYOUT_SCHEMES, SCHEME_ROLE_LAYOUTS

logger = logging.getLogger(__name__)

_OVERVIEW_KEYWORDS = {
    "概述", "总览", "框架", "大纲", "导览", "地图", "overview", "agenda", "roadmap"
}

_CASE_KEYWORDS = {
    "案例", "示例", "实战", "实践", "场景", "case", "use case", "demo"
}

_CASE_FOLLOWUP_KEYWORDS = {
    "复盘", "启示", "拆解", "结果", "反思", "lesson", "takeaway", "结论"
}

_SUMMARY_KEYWORDS = {
    "总结", "小结", "回顾", "结语", "收束", "答疑", "q&a", "qa", "下一步", "行动建议"
}

_SECTION_KEYWORDS = {
    "章节", "第", "part", "模块"
}

_ENDING_KEYWORDS = {
    "感谢", "谢谢", "结束", "结语", "thank", "the end"
}

_GENERIC_PROMISE_SKIP = {
    "定义", "背景", "意义", "总结", "概述", "引言", "结束", "结论"
}

_SENTENCE_ENDINGS = ("。", "！", "？", ".", "!", "?", ";", "；")

_PLACEHOLDER_TOKENS = {
    "", "...", "……", "待补充", "tbd", "todo", "n/a", "null", "none"
}


def apply_outline_quality_guard(
    outline: List[Dict[str, Any]],
    render_mode: str = "image",
    scheme_id: str = "tech_blue",
) -> List[Dict[str, Any]]:
    """
    Apply deterministic cross-project quality rules to outline data.

    Args:
        outline: The original outline list (flat or part-based).
        render_mode: image|html.
        scheme_id: selected template scheme.

    Returns:
        Outline in the same shape (flat or part-based) with quality patches.
    """
    if not isinstance(outline, list) or not outline:
        return outline

    has_parts, pages = _flatten_outline(outline)
    if not pages:
        return outline

    pages = [_sanitize_outline_page(p) for p in pages if isinstance(p, dict)]
    if not pages:
        return outline

    insertion_budget = 6
    inserted = 0

    inserted += _insert_section_buffer_pages(
        pages=pages,
        render_mode=render_mode,
        scheme_id=scheme_id,
        max_insertions=max(0, insertion_budget - inserted),
    )

    inserted += _insert_missing_topic_expansions(
        pages=pages,
        render_mode=render_mode,
        scheme_id=scheme_id,
        max_insertions=max(0, insertion_budget - inserted),
    )

    inserted += _insert_case_followups(
        pages=pages,
        render_mode=render_mode,
        scheme_id=scheme_id,
        max_insertions=max(0, insertion_budget - inserted),
    )

    _ensure_summary_or_qa_page(
        pages=pages,
        render_mode=render_mode,
        scheme_id=scheme_id,
    )

    _ensure_minimum_points(pages)

    if inserted > 0:
        logger.info("[quality_guard] inserted %s outline patch pages", inserted)

    return _rebuild_outline(pages, has_parts)


def apply_structured_outline_quality_guard(
    outline_doc: Dict[str, Any],
    scheme_id: str = "tech_blue",
) -> Dict[str, Any]:
    """
    Apply quality guard to structured outline format:
    {
      "title": "...",
      "pages": [...]
    }
    """
    if not isinstance(outline_doc, dict):
        return outline_doc

    pages = outline_doc.get("pages")
    if not isinstance(pages, list) or not pages:
        return outline_doc

    guarded_pages = apply_outline_quality_guard(
        outline=pages,
        render_mode="html",
        scheme_id=scheme_id,
    )

    # Re-sequence page_id and enforce reserved positions for HTML mode.
    roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or "tech_blue", SCHEME_ROLE_LAYOUTS["tech_blue"])
    cover_id = roles.get("cover", "cover")
    toc_id = roles.get("toc", "toc")
    ending_id = roles.get("ending", "ending")

    for idx, page in enumerate(guarded_pages, 1):
        page["page_id"] = f"p{idx:02d}"

    if guarded_pages:
        guarded_pages[0]["layout_id"] = cover_id
        guarded_pages[0]["has_image"] = bool(guarded_pages[0].get("has_image", False))
        guarded_pages[0]["keywords"] = _safe_keywords(guarded_pages[0].get("keywords", []))

    if len(guarded_pages) >= 2:
        guarded_pages[1]["layout_id"] = toc_id
        guarded_pages[1]["has_image"] = False
        guarded_pages[1]["keywords"] = []

    if len(guarded_pages) >= 2:
        guarded_pages[-1]["layout_id"] = ending_id
        guarded_pages[-1]["has_image"] = False
        guarded_pages[-1]["keywords"] = []

    patched = copy.deepcopy(outline_doc)
    patched["pages"] = guarded_pages
    return patched


def apply_page_model_quality_guard(
    layout_id: str,
    model: Dict[str, Any],
    page_outline: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Patch common structured-page quality issues:
    - missing descriptions
    - incomplete sentences
    - sparse bullets/steps
    - empty two-column side
    """
    if not isinstance(model, dict):
        model = {}

    safe_model = copy.deepcopy(model)
    resolved_layout = _resolve_layout_id(layout_id)
    page_title = _clean_short((page_outline or {}).get("title")) or _clean_short(safe_model.get("title")) or "本页内容"

    if "title" in safe_model and isinstance(safe_model["title"], str):
        safe_model["title"] = _clean_short(safe_model["title"]) or page_title

    if resolved_layout == "title_content":
        safe_model = _guard_title_content_model(safe_model, page_title)
    elif resolved_layout == "title_bullets":
        safe_model = _guard_title_bullets_model(safe_model, page_title)
    elif resolved_layout == "two_column":
        safe_model = _guard_two_column_model(safe_model, page_title)
    elif resolved_layout == "process_steps":
        safe_model = _guard_process_steps_model(safe_model, page_title)
    elif resolved_layout == "quote":
        quote = _ensure_sentence(safe_model.get("quote"), f"{page_title}值得反复推敲与验证")
        safe_model["quote"] = quote
        safe_model["author"] = _clean_short(safe_model.get("author")) or "项目团队"
    elif resolved_layout == "ending":
        safe_model["title"] = _clean_short(safe_model.get("title")) or "感谢聆听"
        if "subtitle" in safe_model:
            safe_model["subtitle"] = _ensure_sentence(safe_model.get("subtitle"), "欢迎交流与提问")
    elif resolved_layout == "image_full":
        if "caption" in safe_model:
            safe_model["caption"] = _ensure_sentence(safe_model.get("caption"), f"{page_title}相关示意图")
        if "image_alt" in safe_model:
            safe_model["image_alt"] = _clean_short(safe_model.get("image_alt")) or page_title

    # Respect optional image switches from outline contract.
    # If has_image=false, remove optional image fields to avoid accidental left-text-right-image homogenization.
    wants_image = bool((page_outline or {}).get("has_image", False))
    if not wants_image:
        if resolved_layout in {"title_content", "title_bullets", "process_steps"}:
            safe_model.pop("image", None)
        if resolved_layout == "cover":
            safe_model.pop("background_image", None)
        if resolved_layout == "two_column":
            for side_key in ("left", "right"):
                column = safe_model.get(side_key)
                if not isinstance(column, dict):
                    continue
                column.pop("image_src", None)
                column.pop("image_alt", None)
                if column.get("type") == "image":
                    if isinstance(column.get("bullets"), list) and column.get("bullets"):
                        column["type"] = "bullets"
                    else:
                        column["type"] = "text"
                safe_model[side_key] = column

    # Final recursive pass for rich text fields.
    _sanitize_rich_text_fields(safe_model, page_title)
    return safe_model


def _flatten_outline(outline: List[Dict[str, Any]]) -> Tuple[bool, List[Dict[str, Any]]]:
    has_parts = False
    pages: List[Dict[str, Any]] = []

    for item in outline:
        if not isinstance(item, dict):
            continue
        if "part" in item and isinstance(item.get("pages"), list):
            has_parts = True
            part_name = item.get("part")
            for page in item.get("pages", []):
                if isinstance(page, dict):
                    entry = copy.deepcopy(page)
                    entry["_part"] = part_name
                    pages.append(entry)
            continue

        entry = copy.deepcopy(item)
        entry["_part"] = item.get("part")
        pages.append(entry)

    return has_parts, pages


def _rebuild_outline(pages: List[Dict[str, Any]], has_parts: bool) -> List[Dict[str, Any]]:
    cleaned_pages = []
    for page in pages:
        if not isinstance(page, dict):
            continue
        page_copy = copy.deepcopy(page)
        page_copy.pop("_part", None)
        cleaned_pages.append(page_copy)

    if not has_parts:
        return cleaned_pages

    # Preserve mixed order: standalone page blocks and part blocks.
    part_buckets: Dict[str, List[Dict[str, Any]]] = {}
    sequence: List[Tuple[str, Any]] = []
    seen_parts = set()

    for page in pages:
        if not isinstance(page, dict):
            continue
        page_copy = copy.deepcopy(page)
        part_name = page_copy.pop("_part", None)
        if part_name:
            if part_name not in part_buckets:
                part_buckets[part_name] = []
            part_buckets[part_name].append(page_copy)
            if part_name not in seen_parts:
                sequence.append(("part", part_name))
                seen_parts.add(part_name)
        else:
            sequence.append(("page", page_copy))

    rebuilt: List[Dict[str, Any]] = []
    for kind, payload in sequence:
        if kind == "page":
            rebuilt.append(payload)
            continue
        rebuilt.append({"part": payload, "pages": part_buckets.get(payload, [])})

    return rebuilt


def _sanitize_outline_page(page: Dict[str, Any]) -> Dict[str, Any]:
    item = copy.deepcopy(page)

    title = _clean_short(item.get("title"))
    item["title"] = title or "未命名页面"

    points = item.get("points")
    if not isinstance(points, list):
        points = [str(points)] if points else []

    cleaned_points: List[str] = []
    for point in points:
        text = _clean_short(point)
        if not text:
            continue
        if text not in cleaned_points:
            cleaned_points.append(text)

    item["points"] = cleaned_points

    if "has_image" in item:
        item["has_image"] = bool(item.get("has_image"))
    if "keywords" in item:
        item["keywords"] = _safe_keywords(item.get("keywords", []))

    return item


def _resolve_layout_id(layout_id: Optional[str]) -> str:
    value = (layout_id or "").strip()
    return LAYOUT_ID_ALIASES.get(value, value)


def _clean_short(value: Any) -> str:
    text = str(value or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _normalize_for_match(value: Any) -> str:
    text = _clean_short(value).lower()
    return re.sub(r"[^\w\u4e00-\u9fa5]+", "", text)


def _contains_any(text: str, keywords: set) -> bool:
    low = (text or "").lower()
    return any(k in low for k in keywords)


def _is_section_page(page: Dict[str, Any]) -> bool:
    layout = _resolve_layout_id(page.get("layout_id"))
    if layout == "section_title":
        return True

    title = (page.get("title") or "").lower()
    points = page.get("points") if isinstance(page.get("points"), list) else []

    chapter_pattern = r"^(第\s*[0-9一二三四五六七八九十]+\s*(章|部分)|part\s*\d+|模块\s*\d+)"
    if re.search(chapter_pattern, title):
        return True

    if len(points) <= 1 and _contains_any(title, _SECTION_KEYWORDS):
        return True

    return False


def _is_ending_page(page: Dict[str, Any]) -> bool:
    layout = _resolve_layout_id(page.get("layout_id"))
    title = (page.get("title") or "").lower()
    return layout == "ending" or _contains_any(title, _ENDING_KEYWORDS)


def _find_ending_index(pages: List[Dict[str, Any]]) -> Optional[int]:
    ending_indices = [idx for idx, page in enumerate(pages) if _is_ending_page(page)]
    if ending_indices:
        return ending_indices[-1]
    return None


def _is_overview_page(page: Dict[str, Any], index: int) -> bool:
    layout = _resolve_layout_id(page.get("layout_id"))
    if layout in {"cover", "toc", "ending", "section_title"}:
        return False

    title = (page.get("title") or "").lower()
    points = page.get("points") if isinstance(page.get("points"), list) else []

    if _contains_any(title, _OVERVIEW_KEYWORDS):
        return True

    # Early dense pages usually describe roadmap points.
    if index <= 4 and len(points) >= 4:
        return True

    return False


def _extract_promises(points: List[Any]) -> List[str]:
    promises: List[str] = []
    seen = set()

    for point in points:
        raw = _clean_short(point)
        if not raw:
            continue

        text = re.sub(r"^[-*•]\s*", "", raw)
        text = re.sub(r"^[0-9一二三四五六七八九十]+[\.、\)\s]*", "", text)
        text = text.strip("。；;，,：: ")
        if not text:
            continue

        # Prefer the topic head before separators.
        head = re.split(r"[：:|｜]", text, maxsplit=1)[0].strip()
        candidate = head if 2 <= len(head) <= 24 else text[:24]
        if not candidate:
            continue

        if candidate in _GENERIC_PROMISE_SKIP:
            continue

        key = _normalize_for_match(candidate)
        if not key or key in seen:
            continue

        seen.add(key)
        promises.append(candidate)

    return promises[:4]


def _collect_page_text(page: Dict[str, Any]) -> str:
    title = _clean_short(page.get("title"))
    points = page.get("points") if isinstance(page.get("points"), list) else []
    return f"{title} {' '.join(str(p) for p in points)}"


def _promise_covered(topic: str, pages: List[Dict[str, Any]]) -> bool:
    normalized_topic = _normalize_for_match(topic)
    if not normalized_topic:
        return True

    for page in pages:
        target = _normalize_for_match(_collect_page_text(page))
        if normalized_topic in target:
            return True

    # Fallback: check sub-terms split by punctuation.
    for token in re.split(r"[、,，/\\\-\s]+", topic):
        normalized_token = _normalize_for_match(token)
        if len(normalized_token) < 2:
            continue
        if any(normalized_token in _normalize_for_match(_collect_page_text(page)) for page in pages):
            return True

    return False


def _next_section_boundary(pages: List[Dict[str, Any]], start_index: int) -> int:
    idx = start_index + 1
    while idx < len(pages):
        page = pages[idx]
        if _is_section_page(page) or _is_ending_page(page):
            break
        idx += 1
    return idx


def _infer_base_layout_for_topic(topic: str) -> str:
    lowered = topic.lower()
    if _contains_any(lowered, {"流程", "步骤", "路径", "过程", "method", "process"}):
        return "process_steps"
    if _contains_any(lowered, {"对比", "差异", "优缺点", "comparison", "tradeoff"}):
        return "two_column"
    if _contains_any(lowered, _CASE_KEYWORDS):
        return "title_content"
    if _contains_any(lowered, {"要点", "清单", "原则", "维度", "特征", "类型", "分类"}):
        return "title_bullets"
    # 默认使用段落型内容，避免过多卡片化要点页导致版式同质化
    return "title_content"


def _pick_scheme_layout(base_layout: str, scheme_id: str) -> str:
    scheme = LAYOUT_SCHEMES.get(scheme_id or "tech_blue", LAYOUT_SCHEMES["tech_blue"])
    layouts = list((scheme.get("layouts") or {}).keys())
    if not layouts:
        return base_layout

    roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or "tech_blue", SCHEME_ROLE_LAYOUTS["tech_blue"])
    reserved = {roles.get("cover"), roles.get("toc"), roles.get("ending")}

    if base_layout in layouts and base_layout not in reserved:
        return base_layout

    alias_candidates = [
        lid for lid in layouts
        if lid not in reserved and _resolve_layout_id(lid) == base_layout
    ]
    if alias_candidates:
        return alias_candidates[0]

    fallback = [lid for lid in layouts if lid not in reserved]
    return fallback[0] if fallback else layouts[0]


def _safe_keywords(keywords: Any) -> List[str]:
    if not isinstance(keywords, list):
        return []
    result: List[str] = []
    for kw in keywords:
        text = _clean_short(kw)
        if not text:
            continue
        if text not in result:
            result.append(text)
    return result[:5]


def _build_outline_page(
    title: str,
    points: List[str],
    part: Optional[str],
    render_mode: str,
    scheme_id: str,
    base_layout: str,
    topic: str,
) -> Dict[str, Any]:
    page: Dict[str, Any] = {
        "title": title,
        "points": points,
        "_part": part,
    }

    if render_mode == "html":
        layout_id = _pick_scheme_layout(base_layout, scheme_id)
        # 质量守卫自动补页默认不强制配图，避免出现大量“左文右图”占位页
        has_image = base_layout == "image_full"
        page.update(
            {
                "layout_id": layout_id,
                "has_image": has_image,
                "keywords": [topic, "场景", "示意"] if has_image else [],
            }
        )

    return page


def _insert_section_buffer_pages(
    pages: List[Dict[str, Any]],
    render_mode: str,
    scheme_id: str,
    max_insertions: int,
) -> int:
    inserted = 0
    idx = 0

    while idx < len(pages) - 1 and inserted < max_insertions:
        current_page = pages[idx]
        next_page = pages[idx + 1]

        if not (_is_section_page(current_page) and _is_section_page(next_page)):
            idx += 1
            continue

        section_title = _clean_short(current_page.get("title")) or "本章节"
        new_page = _build_outline_page(
            title=f"{section_title}：内容引导",
            points=[
                f"{section_title}的核心问题与学习目标",
                f"{section_title}的关键逻辑与结构",
                f"{section_title}与后续内容的衔接关系",
            ],
            part=current_page.get("_part"),
            render_mode=render_mode,
            scheme_id=scheme_id,
            base_layout="title_content",
            topic=section_title,
        )
        pages.insert(idx + 1, new_page)
        inserted += 1
        idx += 2

    return inserted


def _insert_missing_topic_expansions(
    pages: List[Dict[str, Any]],
    render_mode: str,
    scheme_id: str,
    max_insertions: int,
) -> int:
    inserted = 0
    idx = 0

    while idx < len(pages) and inserted < max_insertions:
        page = pages[idx]

        if not _is_overview_page(page, idx):
            idx += 1
            continue

        promises = _extract_promises(page.get("points") if isinstance(page.get("points"), list) else [])
        if not promises:
            idx += 1
            continue

        boundary = _next_section_boundary(pages, idx)
        follow_pages = pages[idx + 1:boundary]

        missing_topics = [topic for topic in promises if not _promise_covered(topic, follow_pages)]
        if not missing_topics:
            idx += 1
            continue

        for topic in missing_topics[:2]:
            if inserted >= max_insertions:
                break

            base_layout = _infer_base_layout_for_topic(topic)
            new_page = _build_outline_page(
                title=f"{topic}：重点展开",
                points=[
                    f"{topic}的核心概念与边界",
                    f"{topic}的典型案例与结果",
                    f"{topic}在本主题中的落地建议",
                ],
                part=page.get("_part"),
                render_mode=render_mode,
                scheme_id=scheme_id,
                base_layout=base_layout,
                topic=topic,
            )
            pages.insert(boundary, new_page)
            boundary += 1
            inserted += 1

        idx += 1

    return inserted


def _is_case_page(page: Dict[str, Any]) -> bool:
    text = _collect_page_text(page).lower()
    if _contains_any(text, _CASE_FOLLOWUP_KEYWORDS):
        return False
    return _contains_any(text, _CASE_KEYWORDS)


def _is_case_followup_page(page: Dict[str, Any]) -> bool:
    text = _collect_page_text(page).lower()
    return _contains_any(text, _CASE_FOLLOWUP_KEYWORDS)


def _short_topic(title: str) -> str:
    text = _clean_short(title)
    if not text:
        return "案例"
    return text[:18]


def _insert_case_followups(
    pages: List[Dict[str, Any]],
    render_mode: str,
    scheme_id: str,
    max_insertions: int,
) -> int:
    inserted = 0
    idx = 0

    while idx < len(pages) - 1 and inserted < max_insertions:
        page = pages[idx]
        if not _is_case_page(page):
            idx += 1
            continue

        if _is_case_followup_page(page):
            idx += 1
            continue

        ending_idx = _find_ending_index(pages)
        if ending_idx is not None and idx >= ending_idx:
            break

        # Check next two meaningful pages for an existing follow-up.
        window: List[Dict[str, Any]] = []
        probe = idx + 1
        while probe < len(pages) and len(window) < 2:
            candidate = pages[probe]
            if _is_ending_page(candidate):
                break
            if _resolve_layout_id(candidate.get("layout_id")) not in {"cover", "toc", "section_title"}:
                window.append(candidate)
            probe += 1

        if any(_is_case_followup_page(candidate) for candidate in window):
            idx += 1
            continue

        topic = _short_topic(page.get("title"))
        new_page = _build_outline_page(
            title=f"{topic}：案例复盘",
            points=[
                "问题与场景：案例要解决的核心矛盾",
                "方案与执行：关键动作与决策依据",
                "结果与启示：可复用经验与风险提示",
            ],
            part=page.get("_part"),
            render_mode=render_mode,
            scheme_id=scheme_id,
            base_layout="two_column",
            topic=topic,
        )
        pages.insert(idx + 1, new_page)
        inserted += 1
        idx += 2

    return inserted


def _ensure_summary_or_qa_page(
    pages: List[Dict[str, Any]],
    render_mode: str,
    scheme_id: str,
) -> None:
    if not pages:
        return

    ending_idx = _find_ending_index(pages)
    content_end = ending_idx if ending_idx is not None else len(pages)
    if content_end <= 0:
        return

    recent_start = max(0, content_end - 4)
    recent_pages = pages[recent_start:content_end]
    if any(_contains_any(_collect_page_text(page).lower(), _SUMMARY_KEYWORDS) for page in recent_pages):
        return

    topic = "本次分享"
    for page in pages:
        layout = _resolve_layout_id(page.get("layout_id"))
        if layout in {"cover", "toc", "ending", "section_title"}:
            continue
        topic = _clean_short(page.get("title")) or topic
        break

    summary_page = _build_outline_page(
        title="总结与答疑",
        points=[
            f"核心结论：{topic}的关键认知与边界",
            "行动建议：下一步如何落地与评估效果",
            "开放答疑：常见问题与延伸讨论方向",
        ],
        part=pages[content_end - 1].get("_part") if content_end - 1 >= 0 else None,
        render_mode=render_mode,
        scheme_id=scheme_id,
        base_layout="title_bullets",
        topic="总结答疑",
    )

    insert_at = ending_idx if ending_idx is not None else len(pages)
    pages.insert(insert_at, summary_page)


def _ensure_minimum_points(pages: List[Dict[str, Any]]) -> None:
    for idx, page in enumerate(pages):
        layout = _resolve_layout_id(page.get("layout_id"))

        # Skip special pages.
        if idx == 0 or layout in {"cover", "toc", "ending", "section_title", "quote"}:
            continue

        points = page.get("points") if isinstance(page.get("points"), list) else []
        cleaned = [_clean_short(point) for point in points if _clean_short(point)]

        title = _clean_short(page.get("title")) or "本页主题"
        while len(cleaned) < 3:
            fallback = [
                f"{title}的核心概念与背景",
                f"{title}的关键方法与执行要点",
                f"{title}的应用场景与注意事项",
            ][len(cleaned)]
            cleaned.append(fallback)

        page["points"] = cleaned[:6]


# ----------------------
# Page model guard helpers
# ----------------------

def _contains_cjk(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def _looks_placeholder(value: Any) -> bool:
    text = _clean_short(value).lower()
    return text in _PLACEHOLDER_TOKENS


def _ensure_sentence(value: Any, fallback: str) -> str:
    text = _clean_short(value)
    if _looks_placeholder(text):
        text = fallback

    text = re.sub(r"\s+", " ", text).strip()
    text = text.rstrip("，,、:：;；")

    if not text:
        text = fallback

    if text and not text.endswith(_SENTENCE_ENDINGS):
        text += "。" if _contains_cjk(text) else "."

    return text


def _guard_title_content_model(model: Dict[str, Any], page_title: str) -> Dict[str, Any]:
    content = model.get("content")
    if not isinstance(content, list):
        content = [str(content)] if content else []

    normalized = [_ensure_sentence(item, f"{page_title}的关键机制与背景") for item in content if _clean_short(item)]
    while len(normalized) < 2:
        normalized.append(
            _ensure_sentence(
                "",
                f"{page_title}在真实场景中的应用价值与落地建议",
            )
        )

    model["content"] = normalized[:4]

    if "highlight" in model:
        model["highlight"] = _ensure_sentence(model.get("highlight"), f"重点：{page_title}需要结合场景判断")

    return model


def _guard_title_bullets_model(model: Dict[str, Any], page_title: str) -> Dict[str, Any]:
    bullets = model.get("bullets")
    if not isinstance(bullets, list):
        bullets = []

    normalized: List[Dict[str, Any]] = []
    for bullet in bullets:
        if isinstance(bullet, dict):
            text = _clean_short(bullet.get("text"))
            if not text:
                continue
            description = _ensure_sentence(
                bullet.get("description"),
                f"说明{text}的作用、适用场景与注意事项",
            )
            normalized.append(
                {
                    "icon": _clean_short(bullet.get("icon")) or "fa-lightbulb",
                    "text": text,
                    "description": description,
                }
            )
        else:
            text = _clean_short(bullet)
            if not text:
                continue
            normalized.append(
                {
                    "icon": "fa-lightbulb",
                    "text": text,
                    "description": _ensure_sentence("", f"说明{text}的作用、适用场景与注意事项"),
                }
            )

    defaults = [
        f"{page_title}的关键概念",
        f"{page_title}的实践方法",
        f"{page_title}的风险与边界",
    ]
    while len(normalized) < 3:
        seed = defaults[len(normalized)]
        normalized.append(
            {
                "icon": "fa-check",
                "text": seed,
                "description": _ensure_sentence("", f"说明{seed}在当前主题中的价值与应用方式"),
            }
        )

    model["bullets"] = normalized[:6]
    return model


def _normalize_column(column: Any, side_name: str, page_title: str) -> Dict[str, Any]:
    if not isinstance(column, dict):
        column = {}

    header = _clean_short(column.get("header")) or ("维度一" if side_name == "left" else "维度二")

    content = column.get("content")
    if not isinstance(content, list):
        content = [str(content)] if content else []

    normalized_content = [
        _ensure_sentence(item, f"{page_title}在{header}下的关键要点")
        for item in content
        if _clean_short(item)
    ]

    if not normalized_content:
        normalized_content = [
            _ensure_sentence("", f"{page_title}在{header}下的核心结论与适用条件")
        ]

    result = {
        "header": header,
        "content": normalized_content[:4],
    }

    # Preserve bullets when present.
    if isinstance(column.get("bullets"), list):
        bullets = []
        for bullet in column.get("bullets", []):
            if isinstance(bullet, dict):
                text = _clean_short(bullet.get("text"))
                if not text:
                    continue
                bullets.append(
                    {
                        "icon": _clean_short(bullet.get("icon")) or "fa-circle",
                        "text": text,
                        "description": _ensure_sentence(
                            bullet.get("description"),
                            f"解释{text}在{header}维度下的意义",
                        ),
                    }
                )
            else:
                text = _clean_short(bullet)
                if not text:
                    continue
                bullets.append(
                    {
                        "icon": "fa-circle",
                        "text": text,
                        "description": _ensure_sentence("", f"解释{text}在{header}维度下的意义"),
                    }
                )

        if bullets:
            result["bullets"] = bullets[:5]

    return result


def _guard_two_column_model(model: Dict[str, Any], page_title: str) -> Dict[str, Any]:
    left = _normalize_column(model.get("left"), "left", page_title)
    right = _normalize_column(model.get("right"), "right", page_title)

    right_content = right.get("content", [])
    if not any("结论" in item or "建议" in item for item in right_content):
        right_content.append(_ensure_sentence("", f"结论：{page_title}需要结合目标场景做取舍"))
        right["content"] = right_content[:4]

    model["left"] = left
    model["right"] = right
    return model


def _guard_process_steps_model(model: Dict[str, Any], page_title: str) -> Dict[str, Any]:
    steps = model.get("steps")
    if not isinstance(steps, list):
        steps = []

    normalized = []
    for index, step in enumerate(steps, start=1):
        if not isinstance(step, dict):
            step = {"label": str(step)}

        label = _clean_short(step.get("label")) or f"步骤{index}"
        description = _ensure_sentence(
            step.get("description"),
            f"说明{label}的动作目标、执行方式与完成标准",
        )

        normalized.append(
            {
                "number": int(step.get("number") or index),
                "label": label,
                "description": description,
                "icon": _clean_short(step.get("icon")) or "fa-check",
            }
        )

    while len(normalized) < 3:
        step_index = len(normalized) + 1
        label = f"步骤{step_index}"
        normalized.append(
            {
                "number": step_index,
                "label": label,
                "description": _ensure_sentence("", f"说明{page_title}中{label}的执行要点与预期结果"),
                "icon": "fa-check",
            }
        )

    model["steps"] = normalized[:6]
    return model


def _sanitize_rich_text_fields(data: Any, page_title: str) -> None:
    """Recursively sanitize common long-text fields in-place."""
    if isinstance(data, dict):
        for key, value in list(data.items()):
            if isinstance(value, str):
                key_lower = key.lower()
                if key_lower in {
                    "description",
                    "summary",
                    "text",
                    "note",
                    "caption",
                    "instruction",
                    "explanation",
                    "quote",
                    "key_point",
                    "subtitle",
                }:
                    data[key] = _ensure_sentence(value, f"补充说明：{page_title}的关键结论与应用建议")
                elif key_lower in {
                    "title",
                    "header",
                    "label",
                    "author",
                    "source",
                }:
                    data[key] = _clean_short(value) or page_title
            else:
                _sanitize_rich_text_fields(value, page_title)
        return

    if isinstance(data, list):
        for item in data:
            _sanitize_rich_text_fields(item, page_title)
