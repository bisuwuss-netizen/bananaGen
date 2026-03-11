"""Outline generation background task with staged progress updates."""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from deps import async_session_factory
from models import Page, Project, Task
from services.runtime_state import load_runtime_config, runtime_context
from .manager import task_manager

logger = logging.getLogger(__name__)

# HTML 大纲写入非常快，给前端留出一个可感知的逐卡片刷新窗口。
_HTML_OUTLINE_STREAM_DELAY_SECONDS = 0.2

_DEFAULT_PREVIEW_TITLES = [
    "封面",
    "目录",
    "问题背景",
    "核心分析",
    "行动建议",
    "总结",
]


async def _get_reference_files_content(session, project_id: str) -> list[dict[str, str]]:
    from models.reference_file import ReferenceFile

    result = await session.execute(
        select(ReferenceFile).where(
            ReferenceFile.project_id == project_id,
            ReferenceFile.parse_status == "completed",
        )
    )
    files = result.scalars().all()
    return [
        {"filename": item.filename, "content": item.markdown_content or ""}
        for item in files
        if item.markdown_content
    ]


def _append_message(messages: list[str], message: str, max_messages: int = 8) -> list[str]:
    text = str(message or "").strip()
    if not text:
        return messages
    updated = [*messages, text]
    return updated[-max_messages:]


def _sanitize_preview_title(raw: str) -> str:
    text = re.sub(r"^[\s>*-]+", "", raw or "")
    text = re.sub(r"^\d+[\.\)、:\s-]+", "", text)
    text = re.sub(r"^[一二三四五六七八九十]+[\.\)、:\s-]+", "", text)
    text = re.sub(r"^第[一二三四五六七八九十0-9]+[章节部分篇]\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip(" -:：、。；;|")
    if len(text) > 28:
        text = text[:28].rstrip()
    return text


def _extract_preview_titles(project: Project, max_titles: int = 6) -> list[str]:
    candidates: list[str] = []
    source_buckets = [
        [project.outline_text] if project.outline_text else [],
        [
            item
            for item in (
                project.idea_prompt,
                project.description_text,
                project.extra_requirements,
            )
            if item
        ],
    ]

    for bucket in source_buckets:
        if not bucket:
            continue

        source_text = "\n".join(bucket)

        for line in re.split(r"[\n\r]+", source_text):
            text = _sanitize_preview_title(line)
            if len(text) < 3:
                continue
            if text in candidates:
                continue
            if any(token in text for token in ("http://", "https://", "```")):
                continue
            candidates.append(text)
            if len(candidates) >= max_titles:
                return candidates

        if candidates:
            return candidates

        for part in re.split(r"[。！？!?；;]", source_text):
            text = _sanitize_preview_title(part)
            if len(text) < 4 or text in candidates:
                continue
            candidates.append(text)
            if len(candidates) >= max_titles:
                return candidates

        if candidates:
            return candidates

    return candidates


def _build_preview_cards_from_titles(titles: list[str]) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for idx, title in enumerate(titles, 1):
        if not title:
            continue
        cards.append(
            {
                "id": f"preview-{idx}",
                "title": title,
                "points": [],
                "status": "planning",
            }
        )
    return cards


def _build_preview_cards_from_pages(
    pages: list[dict[str, Any]],
    limit: int | None = 6,
    status: str = "ready",
) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    selected_pages = pages[:limit] if isinstance(limit, int) and limit > 0 else pages
    for idx, page in enumerate(selected_pages, 1):
        if not isinstance(page, dict):
            continue
        title = str(page.get("title") or f"第 {idx} 页").strip()
        points_raw = page.get("points") or []
        points = [str(point).strip() for point in points_raw if str(point).strip()][:2]
        cards.append(
            {
                "id": str(page.get("page_id") or f"generated-{idx}"),
                "title": title,
                "points": points,
                "status": status,
                "layout_id": page.get("layout_id"),
            }
        )
    return cards


def _estimate_total_pages(preview_titles: list[str]) -> int:
    if preview_titles:
        return max(5, min(12, len(preview_titles) + 2))
    return 6


_AI_CALL_PROGRESS_STEPS = [
    (40, "AI 正在理解主题与要求…"),
    (44, "正在构思整体叙事框架…"),
    (48, "正在规划章节与要点…"),
    (52, "正在设计每页大纲内容…"),
    (56, "正在优化结构与逻辑…"),
    (60, "AI 仍在思考，即将完成…"),
    (63, "正在审查内容质量…"),
    (66, "最后润色中…"),
]


async def _run_progress_ticker(
    task_id: str,
    *,
    cancel_event: asyncio.Event,
    messages: list[str],
    preview_cards: list[dict[str, Any]],
    extra: dict[str, Any],
) -> None:
    """Smoothly advance progress from 38% → 68% during a long AI call."""
    for target_pct, step_text in _AI_CALL_PROGRESS_STEPS:
        await asyncio.sleep(3.0)
        if cancel_event.is_set():
            return
        try:
            async with async_session_factory() as ticker_session:
                task = await ticker_session.get(Task, task_id)
                if not task or task.status not in ("PROCESSING",):
                    return
                updated_messages = _append_message(list(messages), step_text)
                payload: dict[str, Any] = {
                    "total": extra.get("estimated_total_pages", 5),
                    "completed": 0,
                    "failed": 0,
                    "percent": target_pct,
                    "current_step": step_text,
                    "messages": updated_messages,
                }
                if preview_cards is not None:
                    payload["preview_cards"] = preview_cards
                    payload["generated_cards"] = []
                    payload["queued_cards"] = preview_cards
                if extra:
                    payload.update(extra)
                payload["percent"] = target_pct
                task.set_progress(payload)
                await ticker_session.commit()
                # Keep messages in sync for caller
                messages.clear()
                messages.extend(updated_messages)
        except Exception:
            pass  # best-effort; don't break the main task


async def _set_task_progress(
    session,
    task: Task,
    *,
    total: int,
    completed: int,
    percent: int,
    current_step: str,
    messages: list[str],
    preview_cards: list[dict[str, Any]] | None = None,
    generated_cards: list[dict[str, Any]] | None = None,
    queued_cards: list[dict[str, Any]] | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "total": total,
        "completed": completed,
        "failed": 0,
        "percent": percent,
        "current_step": current_step,
        "messages": messages,
    }
    if preview_cards is not None:
        payload["preview_cards"] = preview_cards
    if generated_cards is not None:
        payload["generated_cards"] = generated_cards
    if queued_cards is not None:
        payload["queued_cards"] = queued_cards
    if extra:
        payload.update(extra)
    task.set_progress(payload)
    await session.commit()
    await task_manager.publish_task_update(task.id, task.to_dict())


async def generate_outline_task(
    task_id: str,
    project_id: str,
    *,
    language: str = "zh",
    runtime_config: dict[str, Any] | None = None,
):
    """Generate project outline in the background and stream staged progress."""
    resolved_runtime_config = runtime_config or load_runtime_config()

    with runtime_context(resolved_runtime_config):
        from services.ai.base import ProjectContext
        from services.ai_service_manager import get_ai_service_async

        async with async_session_factory() as session:
            try:
                task = await session.get(Task, task_id)
                if not task:
                    logger.error("Task %s not found", task_id)
                    return

                project_result = await session.execute(
                    select(Project)
                    .options(selectinload(Project.pages))
                    .where(Project.id == project_id)
                )
                project = project_result.scalar_one_or_none()
                if not project:
                    raise ValueError(f"Project {project_id} not found")

                reference_files = await _get_reference_files_content(session, project_id)
                render_mode = project.render_mode or "image"
                scheme_id = project.scheme_id or "edu_dark"
                reference_count = len(reference_files)
                preview_titles = _extract_preview_titles(project) or _DEFAULT_PREVIEW_TITLES
                preview_cards = _build_preview_cards_from_titles(preview_titles)
                messages: list[str] = []

                task.status = "PROCESSING"
                messages = _append_message(messages, "已接收大纲生成请求，正在分析输入内容。")
                await _set_task_progress(
                    session,
                    task,
                    total=5,
                    completed=0,
                    percent=6,
                    current_step="分析主题与约束",
                    messages=messages,
                    preview_cards=preview_cards,
                    generated_cards=[],
                    queued_cards=preview_cards,
                    extra={
                        "render_mode": render_mode,
                        "scheme_id": scheme_id,
                        "reference_count": reference_count,
                        "page_count_confirmed": False,
                    },
                )

                if reference_count > 0:
                    reference_message = f"已读取 {reference_count} 份已上传资料，正在组织章节结构。"
                    reference_step = "整理资料与章节线索"
                else:
                    reference_message = "未检测到已上传资料，正在基于主题组织章节结构。"
                    reference_step = "整理章节线索"

                messages = _append_message(
                    messages,
                    reference_message,
                )
                await _set_task_progress(
                    session,
                    task,
                    total=5,
                    completed=1,
                    percent=18,
                    current_step=reference_step,
                    messages=messages,
                    preview_cards=preview_cards,
                    generated_cards=[],
                    queued_cards=preview_cards,
                    extra={
                        "render_mode": render_mode,
                        "scheme_id": scheme_id,
                        "reference_count": reference_count,
                        "page_count_confirmed": False,
                    },
                )

                ai_service = await get_ai_service_async()
                project_context = ProjectContext(project, reference_files)

                messages = _append_message(messages, "正在调用 AI 规划页面结构与叙事顺序。")
                estimated_total = _estimate_total_pages(preview_titles)
                ticker_extra = {
                    "render_mode": render_mode,
                    "scheme_id": scheme_id,
                    "reference_count": reference_count,
                    "estimated_total_pages": estimated_total,
                }
                await _set_task_progress(
                    session,
                    task,
                    total=5,
                    completed=2,
                    percent=38,
                    current_step="生成页面结构",
                    messages=messages,
                    preview_cards=preview_cards,
                    generated_cards=[],
                    queued_cards=preview_cards,
                    extra=ticker_extra,
                )

                # 启动平滑进度推进器 ── 在 AI 调用期间逐步推进进度条
                ticker_cancel = asyncio.Event()
                ticker_task = asyncio.create_task(
                    _run_progress_ticker(
                        task_id,
                        cancel_event=ticker_cancel,
                        messages=messages,  # 共享消息列表，让步骤日志累积
                        preview_cards=preview_cards,
                        extra=ticker_extra,
                    )
                )

                try:
                    if render_mode == "html":
                        # 如果是从大纲生成，先解析用户输入的大纲文本
                        if project.creation_type == "outline" and project.outline_text:
                            # 第一步：解析用户提供的大纲文本
                            parsed_outline = await ai_service.call_async(
                                "parse_outline_text_async",
                                project_context,
                                language=language,
                                render_mode=render_mode,
                            )
                            
                            # 验证解析结果
                            if not parsed_outline:
                                raise ValueError("解析大纲文本失败：未生成任何大纲页面")
                            if not isinstance(parsed_outline, list):
                                raise ValueError(f"解析结果格式错误：期望列表，得到 {type(parsed_outline).__name__}")
                            
                            # 第二步：使用大模型对解析结果进行丰富和优化
                            enhanced_outline = await ai_service.call_async(
                                "enhance_outline_async",
                                parsed_outline,
                                project_context,
                                language=language,
                                render_mode=render_mode,
                            )
                            
                            # 验证优化结果
                            if not enhanced_outline:
                                logger.warning("大纲优化失败，使用原始解析结果")
                                enhanced_outline = parsed_outline
                            if not isinstance(enhanced_outline, list):
                                logger.warning(f"优化结果格式错误：期望列表，得到 {type(enhanced_outline).__name__}，使用原始解析结果")
                                enhanced_outline = parsed_outline
                            
                            # 第三步：将丰富后的结果转换为结构化格式（添加 narrative_version、depends_on、must_cover 等字段）
                            from services.presentation.narrative_continuity import enrich_outline_with_narrative_contract
                            from services.presentation.ppt_quality_guard import apply_structured_outline_quality_guard
                            
                            # 从大纲文本中提取标题（取第一行或前50个字符）
                            outline_title = project.idea_prompt or ""
                            if not outline_title and project.outline_text:
                                first_line = project.outline_text.split('\n')[0].strip()
                                outline_title = first_line[:50] if first_line else "PPT 大纲"
                            if not outline_title:
                                outline_title = "PPT 大纲"
                            
                            # 构建结构化大纲格式
                            structured_outline = {
                                "title": outline_title,
                                "narrative_version": 1,
                                "pages": []
                            }
                            
                            # 将丰富后的页面转换为结构化格式
                            # 需要先展平章节结构
                            from api.routes.refinement import _flatten_nested_outline
                            flattened_pages = _flatten_nested_outline(
                                enhanced_outline if isinstance(enhanced_outline, list) else [enhanced_outline]
                            )
                            
                            for idx, page in enumerate(flattened_pages):
                                page_id = f"p{idx + 1:02d}"
                                structured_page = {
                                    "page_id": page_id,
                                    "title": page.get("title", f"第 {idx + 1} 页"),
                                    "layout_id": page.get("layout_id", "title_content"),
                                    "has_image": page.get("has_image", False),
                                    "keywords": page.get("keywords", []),
                                    "depends_on": [],
                                    "must_cover": page.get("points", [])[:3] if page.get("points") else [],
                                    "promises_open": [],
                                    "promises_close": [],
                                }
                                if page.get("part"):
                                    structured_page["part"] = page["part"]
                                structured_outline["pages"].append(structured_page)
                            
                            # 应用质量检查和叙事连续性增强
                            guarded = apply_structured_outline_quality_guard(structured_outline, scheme_id=scheme_id)
                            outline_result = enrich_outline_with_narrative_contract(guarded)
                            
                            # 应用布局变体规划
                            if isinstance(outline_result, dict):
                                try:
                                    from services.presentation.layout_planner import (
                                        assign_layout_variants_to_structured_outline,
                                    )
                                    from services.prompts.layouts import LAYOUT_ID_ALIASES

                                    outline_result = assign_layout_variants_to_structured_outline(
                                        outline=outline_result,
                                        scheme_id=scheme_id,
                                        layout_aliases=LAYOUT_ID_ALIASES,
                                        seed=project.outline_text or project_id,
                                    )
                                except Exception as planner_err:
                                    logger.warning("Outline variant planning skipped: %s", planner_err)
                        elif project.creation_type == "descriptions" and project.description_text:
                            # 第一步：解析描述文本到大纲
                            parsed_outline = await ai_service.call_async(
                                "parse_description_to_outline_async",
                                project_context,
                                language=language,
                                render_mode=render_mode,
                            )
                            
                            # 验证解析结果
                            if not parsed_outline:
                                raise ValueError("解析描述文本失败：未生成任何大纲页面")
                            if not isinstance(parsed_outline, list):
                                raise ValueError(f"解析结果格式错误：期望列表，得到 {type(parsed_outline).__name__}")
                            
                            # 第二步：使用大模型对解析结果进行丰富和优化
                            enhanced_outline = await ai_service.call_async(
                                "enhance_outline_async",
                                parsed_outline,
                                project_context,
                                language=language,
                                render_mode=render_mode,
                            )
                            
                            # 验证优化结果
                            if not enhanced_outline:
                                logger.warning("大纲优化失败，使用原始解析结果")
                                enhanced_outline = parsed_outline
                            if not isinstance(enhanced_outline, list):
                                logger.warning(f"优化结果格式错误：期望列表，得到 {type(enhanced_outline).__name__}，使用原始解析结果")
                                enhanced_outline = parsed_outline
                            
                            # 第三步：将丰富后的结果转换为结构化格式
                            from services.presentation.narrative_continuity import enrich_outline_with_narrative_contract
                            from services.presentation.ppt_quality_guard import apply_structured_outline_quality_guard
                            
                            # 从描述文本中提取标题
                            description_title = project.idea_prompt or ""
                            if not description_title and project.description_text:
                                first_line = project.description_text.split('\n')[0].strip()
                                description_title = first_line[:50] if first_line else "PPT 大纲"
                            if not description_title:
                                description_title = "PPT 大纲"
                            
                            # 构建结构化大纲格式
                            structured_outline = {
                                "title": description_title,
                                "narrative_version": 1,
                                "pages": []
                            }
                            
                            # 将丰富后的页面转换为结构化格式
                            # 需要先展平章节结构
                            from api.routes.refinement import _flatten_nested_outline
                            flattened_pages = _flatten_nested_outline(
                                enhanced_outline if isinstance(enhanced_outline, list) else [enhanced_outline]
                            )
                            
                            for idx, page in enumerate(flattened_pages):
                                page_id = f"p{idx + 1:02d}"
                                structured_page = {
                                    "page_id": page_id,
                                    "title": page.get("title", f"第 {idx + 1} 页"),
                                    "layout_id": page.get("layout_id", "title_content"),
                                    "has_image": page.get("has_image", False),
                                    "keywords": page.get("keywords", []),
                                    "depends_on": [],
                                    "must_cover": page.get("points", [])[:3] if page.get("points") else [],
                                    "promises_open": [],
                                    "promises_close": [],
                                }
                                if page.get("part"):
                                    structured_page["part"] = page["part"]
                                structured_outline["pages"].append(structured_page)
                            
                            # 应用质量检查和叙事连续性增强
                            guarded = apply_structured_outline_quality_guard(structured_outline, scheme_id=scheme_id)
                            outline_result = enrich_outline_with_narrative_contract(guarded)
                            
                            # 应用布局变体规划
                            if isinstance(outline_result, dict):
                                try:
                                    from services.presentation.layout_planner import (
                                        assign_layout_variants_to_structured_outline,
                                    )
                                    from services.prompts.layouts import LAYOUT_ID_ALIASES

                                    outline_result = assign_layout_variants_to_structured_outline(
                                        outline=outline_result,
                                        scheme_id=scheme_id,
                                        layout_aliases=LAYOUT_ID_ALIASES,
                                        seed=project.description_text or project_id,
                                    )
                                except Exception as planner_err:
                                    logger.warning("Outline variant planning skipped: %s", planner_err)
                        else:
                            # 从主题生成（原有逻辑）
                            outline_result = await ai_service.call_async(
                                "generate_structured_outline",
                                topic=project.idea_prompt or "",
                                requirements=project.extra_requirements or "",
                                language=language,
                                scheme_id=scheme_id,
                            )
                            if isinstance(outline_result, dict):
                                try:
                                    from services.presentation.layout_planner import (
                                        assign_layout_variants_to_structured_outline,
                                    )
                                    from services.prompts.layouts import LAYOUT_ID_ALIASES

                                    outline_result = assign_layout_variants_to_structured_outline(
                                        outline=outline_result,
                                        scheme_id=scheme_id,
                                        layout_aliases=LAYOUT_ID_ALIASES,
                                        seed=project.idea_prompt or project_id,
                                    )
                                except Exception as planner_err:
                                    logger.warning("Outline variant planning skipped: %s", planner_err)
                        pages_data = outline_result.get("pages", []) if isinstance(outline_result, dict) else []
                    else:
                        blueprint_result = await ai_service.call_async(
                            "generate_outline_blueprint",
                            project_context,
                            language=language,
                            render_mode=render_mode,
                        )
                        # Pure flatten only: quality guard already processed TOC + ordering
                        from api.routes.refinement import _flatten_nested_outline
                        if isinstance(blueprint_result, (dict, list)):
                            pages_data = _flatten_nested_outline(
                                blueprint_result if isinstance(blueprint_result, list)
                                else [blueprint_result]
                            )
                        else:
                            pages_data = blueprint_result
                finally:
                    # 停止进度推进器
                    ticker_cancel.set()
                    ticker_task.cancel()
                    try:
                        await ticker_task
                    except asyncio.CancelledError:
                        pass

                if not isinstance(pages_data, list) or not pages_data:
                    raise ValueError("Outline generation returned no pages")

                messages = _append_message(
                    messages,
                    f"AI 规划完毕，共 {len(pages_data)} 页，开始逐页生成大纲卡片。",
                )

                initial_queue_cards = _build_preview_cards_from_pages(
                    pages_data,
                    limit=None,
                    status="planning",
                )
                total_pages = len(pages_data)
                await _set_task_progress(
                    session,
                    task,
                    total=total_pages,
                    completed=0,
                    percent=70,
                    current_step="准备逐页写入",
                    messages=messages,
                    preview_cards=initial_queue_cards or preview_cards,
                    generated_cards=[],
                    queued_cards=initial_queue_cards,
                    extra={
                        "render_mode": render_mode,
                        "scheme_id": scheme_id,
                        "reference_count": reference_count,
                        "actual_total_pages": total_pages,
                        "page_count_confirmed": True,
                    },
                )

                for page in list(project.pages):
                    await session.delete(page)
                await session.flush()

                created_pages: list[Page] = []

                generated_pages: list[dict[str, Any]] = []

                for idx, page_stub in enumerate(pages_data):
                    if render_mode == "html":
                        page_data = dict(page_stub) if isinstance(page_stub, dict) else {}
                    elif project.creation_type == "outline" and project.outline_text:
                        page_data = dict(page_stub)
                    else:
                        page_data = await ai_service.call_async(
                            "expand_outline_page",
                            project_context,
                            page_stub,
                            pages_data,
                            idx,
                            language=language,
                            render_mode=render_mode,
                        )

                    page = Page(
                        project_id=project_id,
                        order_index=idx,
                        part=page_data.get("part") if isinstance(page_data, dict) else None,
                        status="OUTLINE_GENERATED",
                    )
                    if isinstance(page_data, dict):
                        if render_mode == "html":
                            page.layout_id = page_data.get("layout_id", "title_content")
                        page.set_outline_content(page_data)
                    session.add(page)
                    created_pages.append(page)
                    generated_pages.append(page_data)

                    project.updated_at = datetime.utcnow()
                    await session.commit()

                    generated_cards = _build_preview_cards_from_pages(
                        generated_pages,
                        limit=None,
                        status="ready",
                    )
                    queued_cards = _build_preview_cards_from_pages(
                        pages_data[idx + 1:],
                        limit=None,
                        status="planning",
                    )

                    messages = _append_message(
                        messages,
                        f"第 {idx + 1}/{total_pages} 页已完成：{page_data.get('title', f'第 {idx + 1} 页')}",
                    )
                    next_step = (
                        f"正在生成第 {idx + 2} 页"
                        if idx + 1 < total_pages
                        else "正在完成收尾"
                    )
                    # 72% → 99%: 逐页推进进度
                    percent = min(99, 72 + round(((idx + 1) / total_pages) * 27))
                    await _set_task_progress(
                        session,
                        task,
                        total=total_pages,
                        completed=idx + 1,
                        percent=percent,
                        current_step=next_step,
                        messages=messages,
                        preview_cards=generated_cards + queued_cards,
                        generated_cards=generated_cards,
                        queued_cards=queued_cards,
                        extra={
                            "render_mode": render_mode,
                            "scheme_id": scheme_id,
                            "reference_count": reference_count,
                            "actual_total_pages": total_pages,
                            "page_count_confirmed": True,
                        },
                    )

                    if render_mode == "html" and idx + 1 < total_pages:
                        await asyncio.sleep(_HTML_OUTLINE_STREAM_DELAY_SECONDS)

                project.status = "OUTLINE_GENERATED"
                project.updated_at = datetime.utcnow()
                await session.flush()

                task.status = "COMPLETED"
                task.completed_at = datetime.utcnow()
                generated_cards = _build_preview_cards_from_pages(
                    generated_pages,
                    limit=None,
                    status="ready",
                )
                messages = _append_message(messages, f"大纲生成完成，已创建 {len(created_pages)} 页。")
                task.set_progress(
                    {
                        "total": total_pages,
                        "completed": total_pages,
                        "failed": 0,
                        "percent": 100,
                        "current_step": "大纲已生成",
                        "messages": messages,
                        "preview_cards": generated_cards,
                        "generated_cards": generated_cards,
                        "queued_cards": [],
                        "render_mode": render_mode,
                        "scheme_id": scheme_id,
                        "reference_count": reference_count,
                        "actual_total_pages": total_pages,
                        "page_count_confirmed": True,
                    }
                )
                await session.commit()
                await task_manager.publish_task_update(task.id, task.to_dict())
            except Exception as exc:
                logger.exception("Outline generation task %s failed", task_id)
                task = await session.get(Task, task_id)
                if task:
                    task.status = "FAILED"
                    task.error_message = str(exc)
                    task.completed_at = datetime.utcnow()
                    await session.commit()
                    await task_manager.publish_task_update(task.id, task.to_dict())


__all__ = ["generate_outline_task"]
