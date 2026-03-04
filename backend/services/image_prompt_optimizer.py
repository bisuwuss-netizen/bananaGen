"""
HTML image prompt optimizer.

Hybrid strategy:
1) deterministic rule prompt (stable/controllable)
2) optional small-model rewrite (semantic lift/diversity)
3) quality gate fallback to rule prompt
"""

from __future__ import annotations

import json
import logging
import re
from hashlib import md5
from typing import Any, Dict, Iterable, List

from flask import current_app

from services.ai_providers import get_text_provider
from services.ai_service_manager import get_ai_service

logger = logging.getLogger(__name__)


SCHEME_STYLE_MAP: Dict[str, str] = {
    "tech_blue": "科技教学插画，冷蓝与青灰配色，专业克制，细节清晰。",
    "academic": "学术讲解风，冷灰与深蓝配色，理性严谨，构图干净。",
    "interactive": "课堂互动插画，明亮但低饱和，亲和活泼，元素清楚。",
    "visual": "叙事感插画，灰度基调+单一强调色，层次分明。",
    "practical": "实操训练插画，工业橙与深灰，强调工具与步骤。",
    "modern": "现代商务视觉，干净留白，几何结构与柔和层次。",
}

LAYOUT_INTENT_MAP: Dict[str, str] = {
    "process_steps": "流程解释图，必须体现先后顺序与动作结果，含1个主体和3-4个流程节点。",
    "title_bullets": "要点解释图，必须对应页面关键要点，至少体现3个元素之间关系。",
    "two_column_left": "左栏语义图，对应左侧观点/方案，与右栏形成明确对比。",
    "two_column_right": "右栏语义图，对应右侧观点/方案，与左栏形成明确对比。",
    "two_column": "对比信息图，突出两个方案差异与边界条件。",
    "image_full": "整页核心场景图，突出主题对象与关键情境。",
    "title_content": "概念解释图，将抽象概念转为可视化场景。",
    "cover": "封面辅助图，强化主题识别但不过度抢标题。",
    "default": "概念解释图，用于辅助理解，不是背景纹理图。",
}

LAYOUT_COMPOSITION_MAP: Dict[str, str] = {
    "process_steps": "构图建议：主对象居中，流程节点沿阅读方向分布，留出讲解空间。",
    "title_bullets": "构图建议：主体+辅助元素成组分布，信息关系清楚，避免散乱。",
    "two_column": "构图建议：两侧视觉权重平衡，中间留出对比分界。",
    "image_full": "构图建议：单一核心主体，前中后景分层，避免信息拥挤。",
    "title_content": "构图建议：主体位于右侧或下侧，预留文字阅读区。",
    "cover": "构图建议：主体靠边，中心和上方留白给标题区域。",
    "default": "构图建议：主体明确，2-4个强相关元素，避免大面积空白。",
}

INDUSTRY_HINTS: Dict[str, Dict[str, Any]] = {
    "education": {
        "keywords": ["教学", "课堂", "课程", "学生", "培训", "学习", "讲解", "教育"],
        "hint": "行业语境：教育培训，强调“概念-案例-应用”链路。",
    },
    "finance": {
        "keywords": ["金融", "银行", "投资", "风控", "资产", "收益", "证券", "基金"],
        "hint": "行业语境：金融，强调风险/收益权衡与数据可信度。",
    },
    "medical": {
        "keywords": ["医疗", "医院", "临床", "药物", "患者", "诊断", "护理", "健康"],
        "hint": "行业语境：医疗，强调专业严谨、流程规范和安全感。",
    },
    "tech": {
        "keywords": ["技术", "软件", "系统", "模型", "算法", "代码", "工程", "架构"],
        "hint": "行业语境：技术，强调机制结构、因果关系和模块协同。",
    },
}

AUDIENCE_HINTS: Dict[str, Dict[str, Any]] = {
    "executive": {
        "keywords": ["老板", "高管", "管理层", "董事会", "决策", "汇报", "战略"],
        "hint": "受众：管理层，信息表达要简洁、结论先行、价值导向。",
    },
    "student": {
        "keywords": ["学生", "初学者", "新手", "入门", "课堂", "学习者"],
        "hint": "受众：学生/初学者，表达应直观、可解释、降低理解门槛。",
    },
    "expert": {
        "keywords": ["专家", "研究员", "工程师", "专业人士", "评审"],
        "hint": "受众：专业人群，可接受更高信息密度与技术细节。",
    },
}

DIVERSITY_VARIANTS: List[str] = [
    "变化策略：三分构图，主体偏左，次要元素在右后方。",
    "变化策略：正视图，主体居中，前景加入轻量引导元素。",
    "变化策略：轻俯视视角，突出流程路径与空间层次。",
    "变化策略：近景主体+远景环境，形成清晰景深层次。",
    "变化策略：主元素靠右，左侧留白用于承接文字内容。",
    "变化策略：环形或放射结构，强调核心与外延关系。",
]

NEGATIVE_CONSTRAINT = (
    "禁止：文字、数字、Logo、水印、纯抽象渐变、纯装饰边框、无意义背景纹理。"
)

TOKEN_SPLIT_RE = re.compile(r"[，。；、,.!?:：/\\\s\-\(\)\[\]{}]+")
GENERIC_STOPWORDS = {
    "以及",
    "进行",
    "通过",
    "相关",
    "这个",
    "那个",
    "我们",
    "你们",
    "他们",
    "页面",
    "主题",
    "内容",
    "需要",
    "用于",
    "可以",
    "请",
    "和",
    "与",
}


def optimize_html_image_slots(slots: List[Dict[str, Any]], project: Any) -> List[Dict[str, Any]]:
    """
    Optimize HTML image generation slots in three stages:
    rule prompt -> optional small-model rewrite -> quality gate.
    """
    if not slots:
        return slots

    prepared: List[Dict[str, Any]] = []
    for index, slot in enumerate(slots):
        context = _normalize_slot_context(slot, project)
        slot_key = f"{slot.get('page_id', 'p')}-{slot.get('slot_path', 's')}-{index}"
        rule_prompt = _build_rule_prompt(slot.get("prompt", ""), context, slot_key)
        prepared.append(
            {
                "id": f"slot_{index}",
                "slot": slot,
                "context": context,
                "rule_prompt": rule_prompt,
                "final_prompt": rule_prompt,
            }
        )

    _rewrite_with_small_model_if_enabled(prepared)

    optimized_slots: List[Dict[str, Any]] = []
    for item in prepared:
        final_prompt = _quality_gate_prompt(
            prompt=item["final_prompt"],
            fallback=item["rule_prompt"],
            context=item["context"],
        )
        merged = dict(item["slot"])
        merged["prompt"] = final_prompt
        optimized_slots.append(merged)

    logger.info("HTML image prompt optimizer: %s slots prepared", len(optimized_slots))
    return optimized_slots


def _normalize_slot_context(slot: Dict[str, Any], project: Any) -> Dict[str, Any]:
    raw_context = slot.get("context") if isinstance(slot.get("context"), dict) else {}
    slot_path = _clean_text(slot.get("slot_path", ""))
    slot_role = _clean_text(raw_context.get("slot_role")) or _infer_slot_role(slot_path)

    page_facts = raw_context.get("page_facts")
    facts: List[str] = []
    if isinstance(page_facts, list):
        facts = [_clean_text(x) for x in page_facts if _clean_text(x)]
    facts = _uniq_keep_order(facts)[:8]

    page_title = _clean_text(raw_context.get("page_title", ""))
    project_topic = _clean_text(
        raw_context.get("project_topic")
        or getattr(project, "idea_prompt", "")
        or ""
    )
    extra_requirements = _clean_text(
        raw_context.get("extra_requirements")
        or getattr(project, "extra_requirements", "")
        or ""
    )
    template_style = _clean_text(
        raw_context.get("template_style")
        or getattr(project, "template_style", "")
        or ""
    )
    layout_id = _normalize_layout_id(_clean_text(raw_context.get("layout_id", "")))
    scheme_id = _clean_text(
        raw_context.get("scheme_id")
        or getattr(project, "scheme_id", "")
        or "tech_blue"
    )
    visual_goal = _clean_text(raw_context.get("visual_goal", ""))

    full_text = " ".join([project_topic, page_title, " ".join(facts), extra_requirements, template_style])
    industry = _clean_text(raw_context.get("industry")) or _detect_tag(full_text, INDUSTRY_HINTS)
    audience = _clean_text(raw_context.get("audience")) or _detect_tag(full_text, AUDIENCE_HINTS)

    if not facts and page_title:
        facts = [page_title]

    return {
        "layout_id": layout_id,
        "slot_role": slot_role,
        "scheme_id": scheme_id or "tech_blue",
        "page_title": page_title,
        "facts": facts,
        "project_topic": project_topic,
        "extra_requirements": extra_requirements,
        "template_style": template_style,
        "visual_goal": visual_goal,
        "industry": industry,
        "audience": audience,
        "slot_path": slot_path,
    }


def _build_rule_prompt(raw_prompt: str, context: Dict[str, Any], slot_key: str) -> str:
    facts = context.get("facts", [])
    topic = context.get("page_title") or context.get("project_topic") or "专业知识讲解场景"
    focus = "；".join(facts[:6]) if facts else topic
    layout_id = context.get("layout_id", "title_content")
    slot_role = context.get("slot_role", "main")
    scheme_id = context.get("scheme_id", "tech_blue")
    industry = context.get("industry", "")
    audience = context.get("audience", "")
    visual_goal = context.get("visual_goal", "")

    if layout_id == "two_column":
        if slot_role == "left":
            layout_intent = LAYOUT_INTENT_MAP["two_column_left"]
        elif slot_role == "right":
            layout_intent = LAYOUT_INTENT_MAP["two_column_right"]
        else:
            layout_intent = LAYOUT_INTENT_MAP["two_column"]
    else:
        layout_intent = LAYOUT_INTENT_MAP.get(layout_id, LAYOUT_INTENT_MAP["default"])

    composition = LAYOUT_COMPOSITION_MAP.get(layout_id, LAYOUT_COMPOSITION_MAP["default"])
    scheme_style = SCHEME_STYLE_MAP.get(scheme_id, SCHEME_STYLE_MAP["tech_blue"])
    diversity = _pick_variant(slot_key)

    lines: List[str] = [
        "任务：为PPT生成内容解释型配图，目标是辅助理解当前页面，不是装饰背景。",
        f"主题：{topic}。",
        f"讲解重点：{focus}。",
    ]

    if visual_goal:
        lines.append(f"页面意图：{visual_goal}")
    lines.extend(
        [
            f"布局意图：{layout_intent}",
            f"视觉风格：{scheme_style}",
            composition,
            diversity,
            "质量要求：主体明确、关系清楚、2-4个强相关元素、可读性优先。",
        ]
    )

    if industry and industry in INDUSTRY_HINTS:
        lines.append(INDUSTRY_HINTS[industry]["hint"])
    if audience and audience in AUDIENCE_HINTS:
        lines.append(AUDIENCE_HINTS[audience]["hint"])
    if context.get("template_style"):
        lines.append(f"风格补充：{context['template_style']}")
    if context.get("extra_requirements"):
        lines.append(f"额外约束：{context['extra_requirements']}")

    # Preserve previous baseline prompt as soft hint (shortened), improving compatibility.
    baseline = _clean_text(raw_prompt)
    if baseline:
        lines.append(f"参考草稿（可重写优化）：{baseline[:240]}")

    lines.append(NEGATIVE_CONSTRAINT)
    return _clean_text(" ".join(lines))


def _rewrite_with_small_model_if_enabled(prepared: List[Dict[str, Any]]) -> None:
    if not prepared:
        return
    if not _as_bool(_get_cfg("IMAGE_PROMPT_REWRITE_ENABLED", True), True):
        return

    max_slots = int(_get_cfg("IMAGE_PROMPT_REWRITE_MAX_SLOTS", 24))
    batch_size = int(_get_cfg("IMAGE_PROMPT_REWRITE_BATCH_SIZE", 8))
    thinking_budget = int(_get_cfg("IMAGE_PROMPT_REWRITE_THINKING_BUDGET", 400))
    targets = prepared[:max(0, max_slots)]
    if not targets:
        return

    provider = None
    model_name = _clean_text(_get_cfg("IMAGE_PROMPT_REWRITE_MODEL", ""))
    try:
        app_text_model = _clean_text(_get_cfg("TEXT_MODEL", ""))
        if model_name and model_name != app_text_model:
            provider = get_text_provider(model=model_name)
        else:
            ai_service = get_ai_service()
            provider = ai_service.text_provider
            model_name = app_text_model
    except Exception as exc:
        logger.warning("Prompt rewrite provider init failed, fallback to rule prompt: %s", exc)
        return

    logger.info(
        "HTML image prompt optimizer: rewrite enabled, model=%s, slots=%s",
        model_name or "default-text-model",
        len(targets),
    )

    for batch in _chunk(targets, max(1, batch_size)):
        payload = [_to_rewriter_payload(item) for item in batch]
        rewrite_prompt = _build_rewriter_instruction(payload)
        try:
            response = provider.generate_text(rewrite_prompt, thinking_budget=thinking_budget)
            rewritten = _parse_rewriter_response(response)
            rewritten_map = {str(item.get("id")): _clean_text(item.get("prompt", "")) for item in rewritten if isinstance(item, dict)}
            for item in batch:
                candidate = rewritten_map.get(item["id"])
                if candidate:
                    item["final_prompt"] = candidate
        except Exception as exc:
            logger.warning("Prompt rewrite batch failed, fallback to rule prompts: %s", exc)


def _to_rewriter_payload(item: Dict[str, Any]) -> Dict[str, Any]:
    context = item["context"]
    return {
        "id": item["id"],
        "rule_prompt": item["rule_prompt"],
        "layout_id": context.get("layout_id"),
        "slot_role": context.get("slot_role"),
        "page_title": context.get("page_title"),
        "facts": context.get("facts", []),
        "scheme_id": context.get("scheme_id"),
        "industry": context.get("industry"),
        "audience": context.get("audience"),
    }


def _build_rewriter_instruction(payload: List[Dict[str, Any]]) -> str:
    payload_json = json.dumps(payload, ensure_ascii=False)
    return (
        "你是资深中文文生图提示词工程师。请将输入的 rule_prompt 重写为更准确、可控、"
        "且适合 PPT 讲解辅助图的 prompt。\n"
        "目标：\n"
        "1) 保留页面事实，不编造数据；\n"
        "2) 强化主题与因果/层次关系；\n"
        "3) 避免同质化，保持每个槽位视觉差异；\n"
        "4) 保留“禁止文字/数字/Logo/水印”等约束；\n"
        "5) 输出简洁、可执行、中文为主。\n\n"
        f"输入 JSON：{payload_json}\n\n"
        "输出要求：\n"
        "- 仅输出 JSON 数组；\n"
        '- 数组元素格式：{"id":"slot_x","prompt":"..."}；\n'
        "- 必须覆盖每个输入 id；\n"
        "- prompt 长度建议 80-320 字。"
    )


def _parse_rewriter_response(text: str) -> List[Dict[str, Any]]:
    cleaned = _clean_json_block(text)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # fallback: try to extract outermost array
        match = re.search(r"\[[\s\S]*\]", cleaned)
        if not match:
            raise
        data = json.loads(match.group(0))

    if not isinstance(data, list):
        raise ValueError("rewriter response is not a list")
    return data


def _quality_gate_prompt(prompt: str, fallback: str, context: Dict[str, Any]) -> str:
    candidate = _clean_text(prompt)
    if not candidate:
        return fallback

    # Basic length guard.
    if len(candidate) < 40:
        return fallback
    if len(candidate) > 900:
        candidate = candidate[:900]

    # Fact coverage guard.
    keywords = _extract_keywords(context.get("facts", []) or [context.get("page_title", ""), context.get("project_topic", "")])
    if keywords:
        coverage = sum(1 for kw in keywords[:4] if kw and kw in candidate)
        if coverage == 0:
            return fallback

    # Safety/quality constraints should always exist.
    if "禁止" not in candidate and "避免" not in candidate:
        candidate = f"{candidate} {NEGATIVE_CONSTRAINT}"
    return candidate


def _extract_keywords(texts: Iterable[str]) -> List[str]:
    tokens: List[str] = []
    for text in texts:
        for token in TOKEN_SPLIT_RE.split(_clean_text(text)):
            if len(token) < 2:
                continue
            if token.lower() in GENERIC_STOPWORDS:
                continue
            tokens.append(token[:20])
    return _uniq_keep_order(tokens)[:8]


def _detect_tag(text: str, tag_map: Dict[str, Dict[str, Any]]) -> str:
    low = _clean_text(text).lower()
    if not low:
        return ""
    for tag, config in tag_map.items():
        for keyword in config.get("keywords", []):
            if keyword.lower() in low:
                return tag
    return ""


def _normalize_layout_id(layout_id: str) -> str:
    if not layout_id:
        return "title_content"
    lid = layout_id.strip().lower()
    if lid in {"title_content", "title_bullets", "two_column", "process_steps", "image_full", "cover"}:
        return lid
    if lid.startswith("cover_"):
        return "cover"
    if lid.startswith("toc"):
        return "title_bullets"
    if "step" in lid or "process" in lid:
        return "process_steps"
    if "column" in lid or "split" in lid or "before_after" in lid:
        return "two_column"
    if "image" in lid or "gallery" in lid or "hero" in lid or "portfolio" in lid:
        return "image_full"
    if "bullet" in lid or "concept" in lid or "check" in lid or "quiz" in lid:
        return "title_bullets"
    return "title_content"


def _infer_slot_role(slot_path: str) -> str:
    low = slot_path.lower()
    if low.startswith("left"):
        return "left"
    if low.startswith("right"):
        return "right"
    if "background" in low:
        return "background"
    return "main"


def _pick_variant(slot_key: str) -> str:
    digest = md5(slot_key.encode("utf-8")).hexdigest()
    index = int(digest[:6], 16) % len(DIVERSITY_VARIANTS)
    return DIVERSITY_VARIANTS[index]


def _clean_json_block(text: str) -> str:
    content = text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    return content.strip()


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[<>`]", "", text)
    return text.strip()


def _uniq_keep_order(items: Iterable[str]) -> List[str]:
    seen = set()
    result = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def _chunk(items: List[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    for i in range(0, len(items), size):
        yield items[i:i + size]


def _get_cfg(key: str, default: Any) -> Any:
    try:
        if key in current_app.config:
            return current_app.config.get(key, default)
    except RuntimeError:
        pass
    return default


def _as_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}
