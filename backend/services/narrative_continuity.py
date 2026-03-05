"""
Narrative continuity helpers for structured HTML slide generation.

This module provides deterministic utilities to:
- normalize a structured outline into a narrative contract
- track open/closed promises across generated pages
- build per-page continuity context for prompting
- enforce template capacity limits
- run rule-based post-generation quality checks
"""

from __future__ import annotations

import copy
import hashlib
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from .prompts import LAYOUT_ID_ALIASES


_OVERVIEW_HINTS = {
    "概述", "总览", "框架", "路线图", "导览", "地图", "overview", "agenda", "roadmap"
}

_GENERIC_TOPICS = {
    "定义", "背景", "意义", "概述", "总览", "引言", "总结", "结论", "结束", "说明"
}

_NON_CONTENT_LAYOUTS = {"cover", "toc", "section_title", "ending", "quote"}

_CASE_HINTS = {"案例", "示例", "case", "example", "实战", "实例"}
_CASE_REVIEW_HINTS = {"复盘", "结果", "启示", "outcome", "insight", "takeaway"}
_SUMMARY_HINTS = {"总结", "回顾", "结论", "答疑", "ending", "summary", "wrap", "takeaway"}
_PROMISE_EXPAND_HINTS = {
    "案例", "示例", "实战", "对比", "路径", "策略", "方案", "步骤", "阶段",
    "方法", "框架", "落地", "治理", "复盘", "启示", "风险", "收益", "roi",
    "展开", "详解", "详述", "分析", "建议", "计划", "行动"
}

_MAX_PRIOR_SUMMARY = 3
_MAX_OPEN_PROMISES = 3
_MAX_REQUIRED_CLOSE_IDS = 12
_MAX_REQUIRED_PROMISE_DETAILS = 6
_SEMANTIC_MATCH_THRESHOLD = 0.16

_DEFAULT_TEMPLATE_CONSTRAINTS: Dict[str, Dict[str, Any]] = {
    "title_content": {"max_items": 4, "max_text_chars": 220, "max_item_chars": 120},
    "title_bullets": {"max_items": 5, "max_text_chars": 220, "max_item_chars": 90},
    "two_column": {"max_items_per_column": 4, "max_text_chars": 240, "max_item_chars": 80},
    "process_steps": {"max_items": 6, "max_text_chars": 240, "max_item_chars": 80},
    "toc": {"max_items": 12},
    "section_title": {"max_text_chars": 60},
    "quote": {"max_text_chars": 120},
}


def _clean_text(value: Any) -> str:
    text = str(value or "")
    return re.sub(r"\s+", " ", text).strip()


def _normalize_for_match(value: Any) -> str:
    text = _clean_text(value).lower()
    return re.sub(r"[^\w\u4e00-\u9fa5]+", "", text)


def _resolve_layout_id(layout_id: Optional[str]) -> str:
    value = (layout_id or "").strip()
    return LAYOUT_ID_ALIASES.get(value, value)


def _is_content_layout(layout_id: Optional[str]) -> bool:
    return _resolve_layout_id(layout_id) not in _NON_CONTENT_LAYOUTS


def _as_str_list(value: Any, max_items: int = 10) -> List[str]:
    if isinstance(value, list):
        items = value
    elif value is None:
        items = []
    else:
        items = [value]

    result: List[str] = []
    seen: Set[str] = set()
    for item in items:
        text = _clean_text(item)
        if not text:
            continue
        key = _normalize_for_match(text)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(text)
        if len(result) >= max_items:
            break
    return result


def _extract_outline_points(page: Dict[str, Any]) -> List[str]:
    points = _as_str_list(page.get("points"), max_items=8)
    keywords = _as_str_list(page.get("keywords"), max_items=6)
    return points + [kw for kw in keywords if _normalize_for_match(kw) not in {_normalize_for_match(p) for p in points}]


def _contains_any_hint(text: str, hints: Set[str]) -> bool:
    lowered = _clean_text(text).lower()
    return any(hint in lowered for hint in hints)


def _page_semantic_text(page: Dict[str, Any]) -> str:
    chunks = [
        _clean_text(page.get("title")),
        " ".join(_as_str_list(page.get("keywords"), max_items=6)),
        " ".join(_as_str_list(page.get("points"), max_items=8)),
        " ".join(_as_str_list(page.get("must_cover"), max_items=6)),
    ]
    return " ".join(chunk for chunk in chunks if chunk)


def _build_promise_id(page_id: str, index: int, text: str) -> str:
    digest = hashlib.md5(f"{page_id}|{index}|{text}".encode("utf-8")).hexdigest()[:8]
    return f"pr_{page_id}_{index}_{digest}"


def _normalize_promise_item(
    promise: Any,
    page_id: str,
    index: int,
) -> Optional[Dict[str, Any]]:
    if isinstance(promise, dict):
        text = _clean_text(promise.get("text") or promise.get("topic"))
        promise_id = _clean_text(promise.get("promise_id"))
        must_cover = _as_str_list(promise.get("must_cover"), max_items=4)
        targets = _as_str_list(promise.get("target_page_ids"), max_items=4)
        is_hard = bool(promise.get("is_hard", True))
    else:
        text = _clean_text(promise)
        promise_id = ""
        must_cover = []
        targets = []
        is_hard = True

    if not text:
        return None
    if _normalize_for_match(text) in {_normalize_for_match(x) for x in _GENERIC_TOPICS}:
        return None

    if not promise_id:
        promise_id = _build_promise_id(page_id, index, text)

    return {
        "promise_id": promise_id,
        "text": text,
        "must_cover": must_cover,
        "target_page_ids": targets,
        "is_hard": is_hard,
    }


def _derive_promises_from_page(page: Dict[str, Any], page_index: int) -> List[Dict[str, Any]]:
    layout_id = _resolve_layout_id(page.get("layout_id"))
    if layout_id in {"cover", "toc", "ending"}:
        return []

    title = _clean_text(page.get("title"))
    keyword_text = " ".join(_as_str_list(page.get("keywords"), max_items=6))
    candidates = _extract_outline_points(page)
    overview_like = _contains_any_hint(title, _OVERVIEW_HINTS) or _contains_any_hint(keyword_text, _OVERVIEW_HINTS)
    if not overview_like:
        return []

    expandable_topics = [
        topic
        for topic in candidates
        if _contains_any_hint(topic, _PROMISE_EXPAND_HINTS)
    ]
    selected_topics = expandable_topics[:4] if expandable_topics else candidates[:3]

    promises: List[Dict[str, Any]] = []
    seen: Set[str] = set()
    for idx, topic in enumerate(selected_topics, 1):
        normalized = _normalize_for_match(topic)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        item = _normalize_promise_item(topic, str(page.get("page_id") or f"p{page_index:02d}"), idx)
        if item:
            promises.append(item)
    return promises


def _normalize_page_contract(
    page: Dict[str, Any],
    previous_page_id: Optional[str],
    page_index: int,
) -> Dict[str, Any]:
    normalized = copy.deepcopy(page)
    page_id = _clean_text(normalized.get("page_id")) or f"p{page_index:02d}"
    normalized["page_id"] = page_id

    depends_on = _as_str_list(normalized.get("depends_on"), max_items=4)
    if not depends_on and previous_page_id and _resolve_layout_id(normalized.get("layout_id")) != "cover":
        depends_on = [previous_page_id]
    normalized["depends_on"] = depends_on

    must_cover = _as_str_list(normalized.get("must_cover"), max_items=6)
    if _is_content_layout(normalized.get("layout_id")):
        for item in _extract_outline_points(normalized):
            if len(must_cover) >= 5:
                break
            norm_item = _normalize_for_match(item)
            if not norm_item:
                continue
            if norm_item in {_normalize_for_match(x) for x in must_cover}:
                continue
            must_cover.append(item)
    else:
        must_cover = []
    normalized["must_cover"] = must_cover[:5]

    raw_promises = normalized.get("promises_open")
    normalized_promises: List[Dict[str, Any]] = []
    if isinstance(raw_promises, list):
        for idx, promise in enumerate(raw_promises, 1):
            item = _normalize_promise_item(promise, page_id, idx)
            if item:
                normalized_promises.append(item)
    if not normalized_promises:
        normalized_promises = _derive_promises_from_page(normalized, page_index)
    normalized["promises_open"] = normalized_promises

    required_close = _as_str_list(
        normalized.get("required_close_promise_ids") or normalized.get("promises_close"),
        max_items=_MAX_REQUIRED_CLOSE_IDS
    )
    normalized["required_close_promise_ids"] = required_close
    # Keep backward-compatible alias for existing call sites.
    normalized["promises_close"] = required_close
    return normalized


def _next_boundary_index(pages: List[Dict[str, Any]], start_index: int) -> int:
    idx = start_index + 1
    while idx < len(pages):
        layout_id = _resolve_layout_id(pages[idx].get("layout_id"))
        if layout_id in {"section_title", "ending"}:
            break
        idx += 1
    return idx


def _append_required_close(page: Dict[str, Any], promise_id: str) -> None:
    if not page or not promise_id:
        return
    closings = _as_str_list(page.get("required_close_promise_ids"), max_items=12)
    if promise_id not in closings:
        closings.append(promise_id)
    page["required_close_promise_ids"] = closings
    page["promises_close"] = list(closings)


def _find_summary_page_id(pages: List[Dict[str, Any]]) -> str:
    if not pages:
        return ""

    for page in reversed(pages):
        page_id = _clean_text(page.get("page_id"))
        if not page_id or not _is_content_layout(page.get("layout_id")):
            continue
        text = f"{_clean_text(page.get('title'))} {_page_semantic_text(page)}"
        if _contains_any_hint(text, _SUMMARY_HINTS):
            return page_id

    for page in reversed(pages):
        page_id = _clean_text(page.get("page_id"))
        if not page_id:
            continue
        text = f"{_clean_text(page.get('title'))} {_page_semantic_text(page)}"
        if _contains_any_hint(text, _SUMMARY_HINTS):
            return page_id

    for page in reversed(pages):
        page_id = _clean_text(page.get("page_id"))
        if page_id and _is_content_layout(page.get("layout_id")):
            return page_id

    return _clean_text(pages[-1].get("page_id"))


def _build_promise_query_text(promise: Dict[str, Any]) -> str:
    return " ".join(
        [
            _clean_text(promise.get("text")),
            " ".join(_as_str_list(promise.get("must_cover"), max_items=4)),
        ]
    ).strip()


def _semantic_match_promise_target(
    promise: Dict[str, Any],
    source_idx: int,
    pages: List[Dict[str, Any]],
    page_lookup: Dict[str, Dict[str, Any]],
    summary_page_id: str,
) -> List[str]:
    manual_targets = set(
        target
        for target in _as_str_list(promise.get("target_page_ids"), max_items=4)
        if target in page_lookup
    )
    boundary = _next_boundary_index(pages, source_idx)

    local_candidates: List[Tuple[int, Dict[str, Any]]] = [
        (idx, pages[idx])
        for idx in range(source_idx + 1, boundary)
        if pages[idx].get("page_id") and _is_content_layout(pages[idx].get("layout_id"))
    ]
    if not local_candidates:
        local_candidates = [
            (idx, pages[idx])
            for idx in range(source_idx + 1, len(pages))
            if pages[idx].get("page_id") and _is_content_layout(pages[idx].get("layout_id"))
        ]

    if not local_candidates:
        return [summary_page_id] if summary_page_id else []

    query_text = _build_promise_query_text(promise)
    normalized_query = _normalize_for_match(query_text)

    best_score = -1.0
    best_page_id = ""
    for candidate_idx, candidate in local_candidates:
        candidate_id = _clean_text(candidate.get("page_id"))
        if not candidate_id:
            continue

        candidate_text = _page_semantic_text(candidate)
        candidate_title = _clean_text(candidate.get("title"))
        normalized_candidate = _normalize_for_match(candidate_text)
        normalized_title = _normalize_for_match(candidate_title)

        score = _jaccard_similarity(query_text, candidate_text)
        if normalized_query and normalized_query in normalized_title:
            score += 0.35
        elif normalized_query and normalized_query in normalized_candidate:
            score += 0.18

        for phrase in _as_str_list(promise.get("must_cover"), max_items=4):
            normalized_phrase = _normalize_for_match(phrase)
            if not normalized_phrase:
                continue
            if normalized_phrase in normalized_title:
                score += 0.20
            elif normalized_phrase in normalized_candidate:
                score += 0.10

        if candidate_id in manual_targets:
            score += 0.05

        distance = max(0, candidate_idx - source_idx - 1)
        score -= min(0.08, distance * 0.01)

        if score > best_score:
            best_score = score
            best_page_id = candidate_id

    if best_page_id and best_score >= _SEMANTIC_MATCH_THRESHOLD:
        return [best_page_id]

    return [summary_page_id] if summary_page_id else ([best_page_id] if best_page_id else [])


def _ensure_case_chain_promises(pages: List[Dict[str, Any]]) -> None:
    summary_page_id = _find_summary_page_id(pages)
    page_lookup = {
        _clean_text(page.get("page_id")): page
        for page in pages
        if _clean_text(page.get("page_id"))
    }

    for idx, page in enumerate(pages):
        page_id = _clean_text(page.get("page_id"))
        if not page_id or not _is_content_layout(page.get("layout_id")):
            continue
        if idx >= len(pages) - 1:
            continue

        semantic_text = _page_semantic_text(page)
        if not _contains_any_hint(semantic_text, _CASE_HINTS):
            continue

        has_followup = False
        for future in pages[idx + 1:]:
            if not _is_content_layout(future.get("layout_id")):
                continue
            if _contains_any_hint(_page_semantic_text(future), _CASE_REVIEW_HINTS):
                has_followup = True
                break

        if has_followup:
            continue

        promises = page.get("promises_open")
        if not isinstance(promises, list):
            promises = []

        existing_case_promise = next(
            (
                item
                for item in promises
                if isinstance(item, dict) and _contains_any_hint(_clean_text(item.get("text")), _CASE_REVIEW_HINTS)
            ),
            None
        )
        if existing_case_promise:
            continue

        promise_text = f"{_clean_text(page.get('title')) or '案例'}的复盘与结果启示"
        case_promise = _normalize_promise_item(
            {
                "text": promise_text,
                "must_cover": ["案例复盘", "结果启示"],
                "target_page_ids": [summary_page_id] if summary_page_id else [],
                "is_hard": True,
            },
            page_id=page_id,
            index=len(promises) + 1,
        )
        if not case_promise:
            continue
        promises.append(case_promise)
        page["promises_open"] = promises

        target_page = page_lookup.get(summary_page_id)
        if target_page and case_promise.get("promise_id"):
            _append_required_close(target_page, case_promise.get("promise_id"))


def _assign_promise_targets(pages: List[Dict[str, Any]]) -> None:
    page_lookup: Dict[str, Dict[str, Any]] = {
        _clean_text(p.get("page_id")): p
        for p in pages
        if _clean_text(p.get("page_id"))
    }
    summary_page_id = _find_summary_page_id(pages)

    for idx, page in enumerate(pages):
        promises = page.get("promises_open") if isinstance(page.get("promises_open"), list) else []
        if not promises:
            continue

        for promise in promises:
            promise_id = _clean_text(promise.get("promise_id"))
            if not promise_id:
                continue

            targets = _semantic_match_promise_target(
                promise=promise,
                source_idx=idx,
                pages=pages,
                page_lookup=page_lookup,
                summary_page_id=summary_page_id,
            )
            promise["target_page_ids"] = targets

            if targets:
                target_page = page_lookup.get(targets[0])
                if target_page is not None:
                    _append_required_close(target_page, promise_id)


def enrich_outline_with_narrative_contract(outline_doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enrich structured outline with narrative contract fields:
    - depends_on
    - must_cover
    - promises_open
    - promises_close
    """
    if not isinstance(outline_doc, dict):
        return outline_doc

    pages_raw = outline_doc.get("pages")
    if not isinstance(pages_raw, list):
        return outline_doc

    patched = copy.deepcopy(outline_doc)
    normalized_pages: List[Dict[str, Any]] = []
    previous_page_id: Optional[str] = None

    for idx, page in enumerate(pages_raw, 1):
        if not isinstance(page, dict):
            continue
        normalized = _normalize_page_contract(page, previous_page_id, idx)
        previous_page_id = normalized.get("page_id")
        normalized_pages.append(normalized)

    # Keep only valid backward dependencies.
    seen_page_ids: Set[str] = set()
    for idx, page in enumerate(normalized_pages):
        valid_depends = [dep for dep in _as_str_list(page.get("depends_on"), max_items=4) if dep in seen_page_ids]
        if not valid_depends and idx > 0 and _resolve_layout_id(page.get("layout_id")) != "cover":
            prev_id = normalized_pages[idx - 1].get("page_id")
            if prev_id:
                valid_depends = [prev_id]
        page["depends_on"] = valid_depends
        page_id = page.get("page_id")
        if page_id:
            seen_page_ids.add(page_id)

    _ensure_case_chain_promises(normalized_pages)
    _assign_promise_targets(normalized_pages)
    patched["pages"] = normalized_pages
    patched["narrative_version"] = 2
    return patched


def template_constraints_for_layout(layout_id: Optional[str]) -> Dict[str, Any]:
    layout = _resolve_layout_id(layout_id)
    constraints = _DEFAULT_TEMPLATE_CONSTRAINTS.get(layout, {})
    result = copy.deepcopy(constraints)
    if "max_text_chars" not in result:
        result["max_text_chars"] = 220
    return result


def _trim_text(value: Any, max_chars: int) -> str:
    text = _clean_text(value)
    if max_chars <= 0:
        return text
    return text if len(text) <= max_chars else text[:max_chars]


def apply_template_capacity(
    layout_id: Optional[str],
    model: Dict[str, Any],
    constraints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    if not isinstance(model, dict):
        return {}

    layout = _resolve_layout_id(layout_id)
    merged_constraints = template_constraints_for_layout(layout)
    if isinstance(constraints, dict):
        merged_constraints.update(constraints)

    result = copy.deepcopy(model)
    max_text_chars = int(merged_constraints.get("max_text_chars", 220))
    max_item_chars = int(merged_constraints.get("max_item_chars", 90))

    if "title" in result:
        result["title"] = _trim_text(result.get("title"), 60)

    if layout == "title_content":
        max_items = int(merged_constraints.get("max_items", 4))
        content = result.get("content")
        content_list = content if isinstance(content, list) else ([content] if content else [])
        content_list = [_trim_text(item, max_item_chars) for item in content_list if _clean_text(item)]
        result["content"] = content_list[:max_items]
        if "highlight" in result:
            result["highlight"] = _trim_text(result.get("highlight"), max_item_chars)

    elif layout == "title_bullets":
        max_items = int(merged_constraints.get("max_items", 5))
        bullets = result.get("bullets") if isinstance(result.get("bullets"), list) else []
        trimmed_bullets: List[Any] = []
        for bullet in bullets[:max_items]:
            if isinstance(bullet, dict):
                item = copy.deepcopy(bullet)
                if "text" in item:
                    item["text"] = _trim_text(item.get("text"), 48)
                if "description" in item:
                    item["description"] = _trim_text(item.get("description"), max_item_chars)
                trimmed_bullets.append(item)
            else:
                trimmed_bullets.append(_trim_text(bullet, max_item_chars))
        result["bullets"] = trimmed_bullets

    elif layout == "two_column":
        max_per_col = int(merged_constraints.get("max_items_per_column", 4))
        for side in ("left", "right"):
            column = result.get(side)
            if not isinstance(column, dict):
                continue
            col_copy = copy.deepcopy(column)
            if "header" in col_copy:
                col_copy["header"] = _trim_text(col_copy.get("header"), 40)

            content = col_copy.get("content")
            content_list = content if isinstance(content, list) else ([content] if content else [])
            content_list = [_trim_text(item, max_item_chars) for item in content_list if _clean_text(item)]
            col_copy["content"] = content_list[:max_per_col]

            bullets = col_copy.get("bullets") if isinstance(col_copy.get("bullets"), list) else []
            trimmed_bullets: List[Any] = []
            for bullet in bullets[:max_per_col]:
                if isinstance(bullet, dict):
                    bullet_item = copy.deepcopy(bullet)
                    if "text" in bullet_item:
                        bullet_item["text"] = _trim_text(bullet_item.get("text"), 40)
                    if "description" in bullet_item:
                        bullet_item["description"] = _trim_text(bullet_item.get("description"), max_item_chars)
                    trimmed_bullets.append(bullet_item)
                else:
                    trimmed_bullets.append(_trim_text(bullet, max_item_chars))
            col_copy["bullets"] = trimmed_bullets
            result[side] = col_copy

    elif layout == "process_steps":
        max_items = int(merged_constraints.get("max_items", 6))
        steps = result.get("steps") if isinstance(result.get("steps"), list) else []
        trimmed_steps: List[Dict[str, Any]] = []
        for step in steps[:max_items]:
            if not isinstance(step, dict):
                continue
            item = copy.deepcopy(step)
            if "label" in item:
                item["label"] = _trim_text(item.get("label"), 40)
            if "description" in item:
                item["description"] = _trim_text(item.get("description"), max_item_chars)
            trimmed_steps.append(item)
        result["steps"] = trimmed_steps

    elif layout == "toc":
        max_items = int(merged_constraints.get("max_items", 12))
        items = result.get("items") if isinstance(result.get("items"), list) else []
        result["items"] = items[:max_items]

    elif layout == "quote":
        if "quote" in result:
            result["quote"] = _trim_text(result.get("quote"), max_text_chars)

    # Final soft trim of long strings.
    def _trim_recursive(value: Any) -> Any:
        if isinstance(value, dict):
            return {k: _trim_recursive(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_trim_recursive(v) for v in value]
        if isinstance(value, str):
            return _trim_text(value, max_text_chars)
        return value

    return _trim_recursive(result)


def extract_model_text(layout_id: Optional[str], model: Dict[str, Any]) -> str:
    if not isinstance(model, dict):
        return ""

    layout = _resolve_layout_id(layout_id)
    parts: List[str] = []

    def _add(value: Any) -> None:
        text = _clean_text(value)
        if text:
            parts.append(text)

    if layout == "title_content":
        _add(model.get("title"))
        content = model.get("content")
        if isinstance(content, list):
            for item in content:
                _add(item)
        else:
            _add(content)
        _add(model.get("highlight"))
    elif layout == "title_bullets":
        _add(model.get("title"))
        bullets = model.get("bullets") if isinstance(model.get("bullets"), list) else []
        for bullet in bullets:
            if isinstance(bullet, dict):
                _add(bullet.get("text"))
                _add(bullet.get("description"))
            else:
                _add(bullet)
    elif layout == "two_column":
        _add(model.get("title"))
        for side in ("left", "right"):
            column = model.get(side) if isinstance(model.get(side), dict) else {}
            _add(column.get("header"))
            content = column.get("content")
            if isinstance(content, list):
                for item in content:
                    _add(item)
            else:
                _add(content)
            bullets = column.get("bullets") if isinstance(column.get("bullets"), list) else []
            for bullet in bullets:
                if isinstance(bullet, dict):
                    _add(bullet.get("text"))
                    _add(bullet.get("description"))
                else:
                    _add(bullet)
    elif layout == "process_steps":
        _add(model.get("title"))
        steps = model.get("steps") if isinstance(model.get("steps"), list) else []
        for step in steps:
            if isinstance(step, dict):
                _add(step.get("label"))
                _add(step.get("description"))
    elif layout == "toc":
        _add(model.get("title"))
        items = model.get("items") if isinstance(model.get("items"), list) else []
        for item in items:
            if isinstance(item, dict):
                _add(item.get("text"))
            else:
                _add(item)
    elif layout == "quote":
        _add(model.get("title"))
        _add(model.get("quote"))
        _add(model.get("author"))
    else:
        _add(model.get("title"))
        for value in model.values():
            if isinstance(value, str):
                _add(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, str):
                        _add(item)

    return " ".join(parts)


def build_page_summary(page_outline: Dict[str, Any], model: Dict[str, Any]) -> str:
    layout_id = page_outline.get("layout_id")
    title = _clean_text(page_outline.get("title")) or _clean_text(model.get("title")) or "本页"
    text = extract_model_text(layout_id, model)
    if not text:
        return f"{title}：本页聚焦核心观点与落地建议。"

    candidates = [
        _clean_text(chunk)
        for chunk in re.split(r"[。！？!?；;\n]+", text)
        if _clean_text(chunk)
    ]
    picked = candidates[:3]
    if not picked:
        return f"{title}：本页聚焦核心观点与落地建议。"

    summary = "；".join(picked)
    if not summary.endswith(("。", ".", "！", "!", "？", "?")):
        summary += "。"
    return summary


def promise_covered_by_text(promise: Dict[str, Any], page_text: str) -> bool:
    normalized_page = _normalize_for_match(page_text)
    if not normalized_page:
        return False

    terms = [_clean_text(promise.get("text"))] + _as_str_list(promise.get("must_cover"), max_items=4)
    for term in terms:
        normalized_term = _normalize_for_match(term)
        if not normalized_term:
            continue
        if normalized_term in normalized_page:
            return True

        tokens = [tok for tok in re.split(r"[、,，/\\\-\s]+", term) if _clean_text(tok)]
        for token in tokens:
            norm_token = _normalize_for_match(token)
            if len(norm_token) >= 2 and norm_token in normalized_page:
                return True
    return False


def build_continuity_context_for_page(
    outline_doc: Dict[str, Any],
    page_id: str,
    prior_summaries: List[Dict[str, Any]],
    active_promises: List[Dict[str, Any]],
) -> Dict[str, Any]:
    pages = outline_doc.get("pages") if isinstance(outline_doc, dict) else None
    if not isinstance(pages, list):
        return {}

    page_lookup: Dict[str, Dict[str, Any]] = {
        p.get("page_id"): p for p in pages if isinstance(p, dict) and p.get("page_id")
    }
    page = page_lookup.get(page_id)
    if not page:
        return {}

    cleaned_promises: List[Dict[str, Any]] = []
    for promise in active_promises:
        if not isinstance(promise, dict):
            continue
        pid = _clean_text(promise.get("promise_id"))
        text = _clean_text(promise.get("text"))
        if not pid or not text:
            continue
        cleaned_promises.append(
            {
                "promise_id": pid,
                "text": text,
                "must_cover": _as_str_list(promise.get("must_cover"), max_items=4),
                "target_page_ids": _as_str_list(promise.get("target_page_ids"), max_items=4),
                "from_page_id": _clean_text(promise.get("from_page_id")),
                "is_hard": bool(promise.get("is_hard", True)),
            }
        )

    priority = [
        promise for promise in cleaned_promises
        if page_id in promise.get("target_page_ids", [])
    ]
    remaining = [
        promise for promise in cleaned_promises
        if page_id not in promise.get("target_page_ids", [])
    ]
    open_promises = (priority + remaining)[:_MAX_OPEN_PROMISES]

    summaries = prior_summaries[-_MAX_PRIOR_SUMMARY:] if isinstance(prior_summaries, list) else []
    clean_summaries: List[Dict[str, str]] = []
    for summary in summaries:
        if not isinstance(summary, dict):
            continue
        text = _clean_text(summary.get("summary"))
        if not text:
            continue
        clean_summaries.append(
            {
                "page_id": _clean_text(summary.get("page_id")),
                "title": _clean_text(summary.get("title")),
                "summary": text,
            }
        )

    required_close_ids = _as_str_list(page.get("required_close_promise_ids"), max_items=_MAX_REQUIRED_CLOSE_IDS)
    promise_lookup: Dict[str, Dict[str, Any]] = {
        item.get("promise_id"): item
        for item in open_promises
        if isinstance(item, dict) and item.get("promise_id")
    }
    for candidate_page in pages:
        if not isinstance(candidate_page, dict):
            continue
        for promise in candidate_page.get("promises_open") if isinstance(candidate_page.get("promises_open"), list) else []:
            if not isinstance(promise, dict):
                continue
            pid = _clean_text(promise.get("promise_id"))
            if not pid or pid in promise_lookup:
                continue
            promise_lookup[pid] = {
                "promise_id": pid,
                "text": _clean_text(promise.get("text")),
                "must_cover": _as_str_list(promise.get("must_cover"), max_items=4),
                "target_page_ids": _as_str_list(promise.get("target_page_ids"), max_items=4),
                "from_page_id": _clean_text(candidate_page.get("page_id")),
                "is_hard": bool(promise.get("is_hard", True)),
            }

    required_close_promises: List[Dict[str, Any]] = []
    for promise_id in required_close_ids:
        if promise_id in promise_lookup:
            required_close_promises.append(promise_lookup[promise_id])
        else:
            required_close_promises.append(
                {
                    "promise_id": promise_id,
                    "text": "",
                    "must_cover": [],
                    "target_page_ids": [page_id],
                    "from_page_id": "",
                    "is_hard": True,
                }
            )

    return {
        "page_id": page_id,
        "page_contract": {
            "depends_on": _as_str_list(page.get("depends_on"), max_items=4),
            "must_cover": _as_str_list(page.get("must_cover"), max_items=6),
            "required_close_promise_ids": required_close_ids,
        },
        "depends_on": _as_str_list(page.get("depends_on"), max_items=4),
        "must_cover": _as_str_list(page.get("must_cover"), max_items=6),
        "required_close_promise_ids": required_close_ids,
        "required_close_promises": required_close_promises[:_MAX_REQUIRED_PROMISE_DETAILS],
        "priority_promises": priority[:_MAX_OPEN_PROMISES],
        "open_promises": open_promises,
        "prior_page_summaries": clean_summaries[-_MAX_PRIOR_SUMMARY:],
        "template_constraints": template_constraints_for_layout(page.get("layout_id")),
    }


def _tokenize_for_similarity(text: str) -> Set[str]:
    normalized = _normalize_for_match(text)
    if not normalized:
        return set()

    tokens = set(re.findall(r"[a-z0-9_]{3,}", normalized))
    chinese_chunks = re.findall(r"[\u4e00-\u9fa5]{2,}", normalized)
    for chunk in chinese_chunks:
        if len(chunk) <= 2:
            tokens.add(chunk)
            continue
        for idx in range(0, len(chunk) - 1):
            tokens.add(chunk[idx:idx + 2])
    return tokens


def _jaccard_similarity(text_a: str, text_b: str) -> float:
    tokens_a = _tokenize_for_similarity(text_a)
    tokens_b = _tokenize_for_similarity(text_b)
    if not tokens_a or not tokens_b:
        return 0.0
    inter = len(tokens_a & tokens_b)
    union = len(tokens_a | tokens_b)
    if union == 0:
        return 0.0
    return inter / union


def evaluate_generation_quality(
    outline_doc: Dict[str, Any],
    generated_pages: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Rule-based quality evaluation for generated structured pages.
    """
    outline = enrich_outline_with_narrative_contract(outline_doc)
    pages = outline.get("pages") if isinstance(outline, dict) else None
    if not isinstance(pages, list):
        return {"issues": [], "unresolved_promises": []}

    generated_by_id: Dict[str, Dict[str, Any]] = {}
    for item in generated_pages:
        if not isinstance(item, dict):
            continue
        page_id = _clean_text(item.get("page_id"))
        if not page_id:
            continue
        generated_by_id[page_id] = item

    issues: List[Dict[str, Any]] = []
    seen_pages: Set[str] = set()
    active_promises: Dict[str, Dict[str, Any]] = {}
    closed_promises: Set[str] = set()
    previous_content: Optional[Dict[str, Any]] = None

    for page in pages:
        page_id = _clean_text(page.get("page_id"))
        layout_id = _resolve_layout_id(page.get("layout_id"))

        depends_on = _as_str_list(page.get("depends_on"), max_items=4)
        missing_dependencies = [dep for dep in depends_on if dep not in seen_pages]
        if missing_dependencies:
            issues.append(
                {
                    "type": "dependency_gap",
                    "severity": "medium",
                    "page_id": page_id,
                    "reason": f"依赖页缺失或顺序异常: {', '.join(missing_dependencies)}",
                    "instruction": "补充与前序页面的承接句，明确当前页与依赖页的关系。",
                }
            )

        generated = generated_by_id.get(page_id)
        page_text = ""
        generated_closed_ids: Set[str] = set()
        if isinstance(generated, dict):
            page_text = extract_model_text(
                generated.get("layout_id") or page.get("layout_id"),
                generated.get("model") if isinstance(generated.get("model"), dict) else {},
            )
            generated_closed_ids = set(_as_str_list(generated.get("closed_promise_ids"), max_items=12))

        required_close_ids = _as_str_list(
            page.get("required_close_promise_ids") or page.get("promises_close"),
            max_items=_MAX_REQUIRED_CLOSE_IDS
        )
        explicit_closings = set(generated_closed_ids)
        closed_this_page: Set[str] = set()
        for promise_id in list(active_promises.keys()):
            if promise_id in explicit_closings:
                active_promises.pop(promise_id, None)
                closed_promises.add(promise_id)
                closed_this_page.add(promise_id)
                continue
            if promise_covered_by_text(active_promises[promise_id], page_text):
                active_promises.pop(promise_id, None)
                closed_promises.add(promise_id)
                closed_this_page.add(promise_id)

        missing_required = [pid for pid in required_close_ids if pid not in closed_promises]
        if missing_required and _is_content_layout(layout_id):
            issues.append(
                {
                    "type": "hard_promise_unclosed",
                    "severity": "high",
                    "page_id": page_id,
                    "promise_id": ",".join(missing_required),
                    "reason": f"本页硬承诺未闭环: {', '.join(missing_required)}",
                    "instruction": (
                        "必须补全 required_close_promise_ids 对应内容，"
                        "并在 closed_promise_ids 返回这些 promise_id。"
                    ),
                    "missing_required_close_promise_ids": missing_required,
                    "closed_promise_ids": sorted(closed_this_page),
                }
            )

        for promise in page.get("promises_open") if isinstance(page.get("promises_open"), list) else []:
            if not isinstance(promise, dict):
                continue
            promise_id = _clean_text(promise.get("promise_id"))
            if not promise_id or promise_id in closed_promises:
                continue
            active_promises[promise_id] = {
                "promise_id": promise_id,
                "text": _clean_text(promise.get("text")),
                "must_cover": _as_str_list(promise.get("must_cover"), max_items=4),
                "target_page_ids": _as_str_list(promise.get("target_page_ids"), max_items=4),
                "from_page_id": page_id,
                "is_hard": bool(promise.get("is_hard", True)),
            }

        if _is_content_layout(layout_id):
            must_cover = _as_str_list(page.get("must_cover"), max_items=4)
            if must_cover and page_text:
                missing_topics = [
                    topic for topic in must_cover
                    if not promise_covered_by_text({"text": topic, "must_cover": []}, page_text)
                ]
                if len(missing_topics) >= 2:
                    issues.append(
                        {
                            "type": "must_cover_missing",
                            "severity": "medium",
                            "page_id": page_id,
                            "reason": f"本页未覆盖关键要点: {', '.join(missing_topics[:3])}",
                            "instruction": "重写该页，补全缺失要点并保证句子完整闭环。",
                        }
                    )

            if previous_content and page_text:
                similarity = _jaccard_similarity(previous_content.get("text", ""), page_text)
                if similarity >= 0.86 and len(page_text) >= 80:
                    issues.append(
                        {
                            "type": "duplicate_content",
                            "severity": "medium",
                            "page_id": page_id,
                            "reason": f"与前一内容页语义重复度过高（{similarity:.2f}）。",
                            "instruction": "调整本页视角，补充新的信息增量，避免与前页重复。",
                        }
                    )
            previous_content = {"page_id": page_id, "text": page_text}

        seen_pages.add(page_id)

    unresolved_promises = list(active_promises.values())
    summary_page_id = _find_summary_page_id(pages)
    for promise in unresolved_promises:
        targets = promise.get("target_page_ids") or []
        target_page_id = ""
        for candidate in targets:
            if candidate in generated_by_id:
                target_page_id = candidate
                break
        if not target_page_id:
            target_page_id = summary_page_id or promise.get("from_page_id") or ""

        issues.append(
            {
                "type": "unclosed_promise",
                "severity": "high",
                "page_id": target_page_id,
                "promise_id": promise.get("promise_id"),
                "reason": f"存在未兑现承诺：{promise.get('text')}",
                "instruction": f"补充并明确展开“{promise.get('text')}”，形成完整收束。",
            }
        )

    # De-duplicate issues by (type, page_id, promise_id)
    deduped: List[Dict[str, Any]] = []
    seen_keys: Set[str] = set()
    for issue in issues:
        key = "|".join(
            [
                _clean_text(issue.get("type")),
                _clean_text(issue.get("page_id")),
                _clean_text(issue.get("promise_id")),
            ]
        )
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped.append(issue)

    return {
        "issues": deduped,
        "unresolved_promises": unresolved_promises,
    }


def split_outline_into_chapters(outline_doc: Dict[str, Any]) -> List[List[str]]:
    """
    Split outline page ids into chapters:
    - sequential inside each chapter
    - chapter boundary on section_title (except the first bucket)
    """
    pages = outline_doc.get("pages") if isinstance(outline_doc, dict) else None
    if not isinstance(pages, list):
        return []

    chapters: List[List[str]] = []
    current: List[str] = []
    seen_first_content = False

    for page in pages:
        if not isinstance(page, dict):
            continue
        page_id = _clean_text(page.get("page_id"))
        if not page_id:
            continue
        layout_id = _resolve_layout_id(page.get("layout_id"))

        # Start a new chapter when a new section title appears after content started.
        if layout_id == "section_title" and current and seen_first_content:
            chapters.append(current)
            current = []
        current.append(page_id)
        if _is_content_layout(layout_id):
            seen_first_content = True

    if current:
        chapters.append(current)
    return chapters


def _inject_closure_line(layout_id: str, model: Dict[str, Any], line: str) -> Dict[str, Any]:
    layout = _resolve_layout_id(layout_id)
    patched = copy.deepcopy(model) if isinstance(model, dict) else {}
    if "title" not in patched:
        patched["title"] = "承诺收束"

    if layout == "title_bullets":
        bullets = patched.get("bullets") if isinstance(patched.get("bullets"), list) else []
        bullets.insert(0, {
            "icon": "fa-link",
            "text": "承诺收束",
            "description": line,
        })
        patched["bullets"] = bullets
        return patched

    if layout == "title_content":
        content = patched.get("content")
        content_items = content if isinstance(content, list) else ([content] if content else [])
        content_items.insert(0, line)
        patched["content"] = content_items
        return patched

    if layout == "two_column":
        right = patched.get("right") if isinstance(patched.get("right"), dict) else {}
        right_content = right.get("content")
        right_items = right_content if isinstance(right_content, list) else ([right_content] if right_content else [])
        right_items.insert(0, line)
        right["content"] = right_items
        if "header" not in right:
            right["header"] = "收束说明"
        patched["right"] = right
        return patched

    if layout == "process_steps":
        steps = patched.get("steps") if isinstance(patched.get("steps"), list) else []
        steps.insert(0, {
            "number": 1,
            "label": "承诺收束",
            "description": line,
            "icon": "fa-check",
        })
        for idx, step in enumerate(steps, 1):
            if isinstance(step, dict):
                step["number"] = idx
        patched["steps"] = steps
        return patched

    # Non-content layout fallback: create a compact title_content model.
    return {
        "title": patched.get("title") or "承诺收束",
        "content": [line],
    }


def inject_unresolved_promise_closure_blocks(
    outline_doc: Dict[str, Any],
    generated_pages: List[Dict[str, Any]],
    max_lines_per_page: int = 2,
) -> Dict[str, Any]:
    """
    Deterministic fallback to guarantee promise closure.
    For unresolved promises, inject grouped closure blocks into target/summary pages.
    """
    if not isinstance(generated_pages, list):
        return {
            "generated_pages": [],
            "applied": [],
            "remaining_unresolved": [],
        }

    outline = enrich_outline_with_narrative_contract(outline_doc)
    report = evaluate_generation_quality(outline, generated_pages)
    unresolved = report.get("unresolved_promises", []) if isinstance(report, dict) else []
    if not unresolved:
        return {
            "generated_pages": copy.deepcopy(generated_pages),
            "applied": [],
            "remaining_unresolved": [],
        }

    pages = outline.get("pages") if isinstance(outline.get("pages"), list) else []
    summary_page_id = _find_summary_page_id(pages)

    generated_by_id: Dict[str, Dict[str, Any]] = {
        _clean_text(item.get("page_id")): copy.deepcopy(item)
        for item in generated_pages
        if isinstance(item, dict) and _clean_text(item.get("page_id"))
    }
    outline_by_id: Dict[str, Dict[str, Any]] = {
        _clean_text(page.get("page_id")): page
        for page in pages
        if isinstance(page, dict) and _clean_text(page.get("page_id"))
    }

    applied: List[Dict[str, Any]] = []
    line_count_by_page: Dict[str, int] = {}
    promises_by_target: Dict[str, List[Dict[str, Any]]] = {}

    for promise in unresolved:
        if not isinstance(promise, dict):
            continue
        promise_id = _clean_text(promise.get("promise_id"))
        if not promise_id:
            continue
        candidate_targets = [
            target
            for target in _as_str_list(promise.get("target_page_ids"), max_items=4)
            if target in generated_by_id
        ]
        target_page_id = candidate_targets[0] if candidate_targets else summary_page_id
        if not target_page_id or target_page_id not in generated_by_id:
            continue
        promises_by_target.setdefault(target_page_id, []).append(promise)

    def _build_group_closure_line(batch: List[Dict[str, Any]]) -> str:
        topics = [
            _clean_text(item.get("text"))
            for item in batch
            if isinstance(item, dict) and _clean_text(item.get("text"))
        ]
        if not topics:
            return "承诺收束：补全前序承诺的结论、结果与可执行建议。"
        quoted = [f"“{topic}”" for topic in topics[:3]]
        if len(topics) > 3:
            quoted.append(f"等{len(topics)}项")
        return f"承诺收束：补全{'；'.join(quoted)}的结论、结果与可执行建议。"

    def _apply_group_to_page(
        target_page_id: str,
        batch: List[Dict[str, Any]],
        respect_limit: bool,
    ) -> bool:
        page_id = _clean_text(target_page_id)
        if not page_id or page_id not in generated_by_id:
            return False
        if respect_limit and line_count_by_page.get(page_id, 0) >= max_lines_per_page:
            return False

        target_entry = generated_by_id[page_id]
        target_layout = _resolve_layout_id(target_entry.get("layout_id"))
        if not _is_content_layout(target_layout) and summary_page_id and summary_page_id in generated_by_id:
            page_id = summary_page_id
            target_entry = generated_by_id[page_id]
            target_layout = _resolve_layout_id(target_entry.get("layout_id"))

        closure_line = _build_group_closure_line(batch)
        patched_model = _inject_closure_line(
            layout_id=target_layout,
            model=target_entry.get("model") if isinstance(target_entry.get("model"), dict) else {},
            line=closure_line,
        )
        patched_model = apply_template_capacity(
            layout_id=target_layout,
            model=patched_model,
            constraints=template_constraints_for_layout(target_layout),
        )
        target_entry["model"] = patched_model

        closed_ids = set(_as_str_list(target_entry.get("closed_promise_ids"), max_items=12))
        promise_ids: List[str] = []
        for promise in batch:
            if not isinstance(promise, dict):
                continue
            pid = _clean_text(promise.get("promise_id"))
            if not pid:
                continue
            promise_ids.append(pid)
            closed_ids.add(pid)
            outline_target = outline_by_id.get(page_id)
            if outline_target:
                _append_required_close(outline_target, pid)
        target_entry["closed_promise_ids"] = sorted(closed_ids)

        line_count_by_page[page_id] = line_count_by_page.get(page_id, 0) + 1
        applied.append(
            {
                "promise_ids": promise_ids,
                "target_page_id": page_id,
                "line": closure_line,
            }
        )
        return True

    line_budget = max(1, int(max_lines_per_page or 2))
    for target_page_id, grouped_promises in promises_by_target.items():
        if not grouped_promises:
            continue

        chunk_size = max(1, (len(grouped_promises) + line_budget - 1) // line_budget)
        cursor = 0
        for _ in range(line_budget):
            if cursor >= len(grouped_promises):
                break
            chunk = grouped_promises[cursor:cursor + chunk_size]
            cursor += len(chunk)
            applied_ok = _apply_group_to_page(
                target_page_id=target_page_id,
                batch=chunk,
                respect_limit=True,
            )
            if not applied_ok:
                cursor -= len(chunk)
                break

        overflow_target = summary_page_id if summary_page_id in generated_by_id else target_page_id
        while cursor < len(grouped_promises):
            chunk = grouped_promises[cursor:cursor + chunk_size]
            cursor += len(chunk)
            applied_ok = _apply_group_to_page(
                target_page_id=overflow_target,
                batch=chunk,
                respect_limit=False,
            )
            if not applied_ok:
                break

    ordered_pages: List[Dict[str, Any]] = []
    for item in generated_pages:
        if not isinstance(item, dict):
            continue
        page_id = _clean_text(item.get("page_id"))
        if page_id in generated_by_id:
            ordered_pages.append(generated_by_id[page_id])

    post_report = evaluate_generation_quality(outline, ordered_pages)
    remaining = post_report.get("unresolved_promises", []) if isinstance(post_report, dict) else []
    return {
        "generated_pages": ordered_pages,
        "applied": applied,
        "remaining_unresolved": remaining,
        "outline": outline,
    }


class NarrativeRuntimeTracker:
    """
    Runtime tracker for promise lifecycle and summary chain.
    """

    def __init__(self, outline_doc: Dict[str, Any]):
        self.outline = enrich_outline_with_narrative_contract(outline_doc)
        pages = self.outline.get("pages") if isinstance(self.outline, dict) else []
        self.page_order = [
            page.get("page_id")
            for page in pages
            if isinstance(page, dict) and page.get("page_id")
        ]
        self.page_lookup: Dict[str, Dict[str, Any]] = {
            page.get("page_id"): page
            for page in pages
            if isinstance(page, dict) and page.get("page_id")
        }
        self.generated_pages: Dict[str, Dict[str, Any]] = {}
        self.active_promises: Dict[str, Dict[str, Any]] = {}
        self.closed_promises: Set[str] = set()
        self.summaries: List[Dict[str, str]] = []
        self.page_hard_closure_status: Dict[str, Dict[str, Any]] = {}

    def build_context_for_page(self, page_id: str) -> Dict[str, Any]:
        return build_continuity_context_for_page(
            outline_doc=self.outline,
            page_id=page_id,
            prior_summaries=self.summaries,
            active_promises=list(self.active_promises.values()),
        )

    def apply_generated_page(
        self,
        page_id: str,
        layout_id: str,
        title: str,
        model: Dict[str, Any],
        closed_promise_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if not page_id:
            return {"summary": "", "active_promises": [], "missing_required_close_promise_ids": []}

        self.generated_pages[page_id] = {
            "page_id": page_id,
            "layout_id": layout_id,
            "title": title,
            "model": copy.deepcopy(model) if isinstance(model, dict) else {},
            "closed_promise_ids": _as_str_list(closed_promise_ids, max_items=12),
        }
        self._rebuild_state()

        summary = next(
            (item.get("summary", "") for item in self.summaries if item.get("page_id") == page_id),
            "",
        )
        return {
            "summary": summary,
            "active_promises": list(self.active_promises.keys()),
            "missing_required_close_promise_ids": (
                self.page_hard_closure_status.get(page_id, {}).get("missing_required_close_promise_ids", [])
            ),
        }

    def _rebuild_state(self) -> None:
        self.active_promises = {}
        self.closed_promises = set()
        self.summaries = []
        self.page_hard_closure_status = {}

        for page_id in self.page_order:
            generated = self.generated_pages.get(page_id)
            if not generated:
                continue

            page_outline = self.page_lookup.get(page_id, {})
            page_text = extract_model_text(
                generated.get("layout_id") or page_outline.get("layout_id"),
                generated.get("model") if isinstance(generated.get("model"), dict) else {},
            )

            required_close = _as_str_list(
                page_outline.get("required_close_promise_ids") or page_outline.get("promises_close"),
                max_items=_MAX_REQUIRED_CLOSE_IDS
            )
            generated_closed_ids = set(_as_str_list(generated.get("closed_promise_ids"), max_items=12))
            explicit_closings = set(generated_closed_ids)
            closed_this_page: Set[str] = set()
            for promise_id in list(self.active_promises.keys()):
                if promise_id in explicit_closings or promise_covered_by_text(self.active_promises[promise_id], page_text):
                    self.active_promises.pop(promise_id, None)
                    self.closed_promises.add(promise_id)
                    closed_this_page.add(promise_id)

            missing_required = [pid for pid in required_close if pid not in self.closed_promises]
            self.page_hard_closure_status[page_id] = {
                "required_close_promise_ids": required_close,
                "closed_promise_ids": sorted(closed_this_page),
                "missing_required_close_promise_ids": missing_required,
            }

            for promise in page_outline.get("promises_open") if isinstance(page_outline.get("promises_open"), list) else []:
                if not isinstance(promise, dict):
                    continue
                promise_id = _clean_text(promise.get("promise_id"))
                if not promise_id or promise_id in self.closed_promises:
                    continue
                item = {
                    "promise_id": promise_id,
                    "text": _clean_text(promise.get("text")),
                    "must_cover": _as_str_list(promise.get("must_cover"), max_items=4),
                    "target_page_ids": _as_str_list(promise.get("target_page_ids"), max_items=4),
                    "from_page_id": page_id,
                    "is_hard": bool(promise.get("is_hard", True)),
                }
                self.active_promises[promise_id] = item

            summary = build_page_summary(page_outline, generated.get("model") or {})
            self.summaries.append(
                {
                    "page_id": page_id,
                    "title": _clean_text(generated.get("title")) or _clean_text(page_outline.get("title")),
                    "summary": summary,
                }
            )

    def unresolved_promises(self) -> List[Dict[str, Any]]:
        return list(self.active_promises.values())

    def hard_closure_failures(self) -> Dict[str, List[str]]:
        failures: Dict[str, List[str]] = {}
        for page_id, status in self.page_hard_closure_status.items():
            missing = status.get("missing_required_close_promise_ids", []) if isinstance(status, dict) else []
            if missing:
                failures[page_id] = list(missing)
        return failures

    def generated_pages_in_order(self) -> List[Dict[str, Any]]:
        result: List[Dict[str, Any]] = []
        for page_id in self.page_order:
            item = self.generated_pages.get(page_id)
            if item:
                result.append(copy.deepcopy(item))
        return result

    def quality_report(self) -> Dict[str, Any]:
        return evaluate_generation_quality(self.outline, self.generated_pages_in_order())
