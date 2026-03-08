"""Outline generation background task with staged progress updates."""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from deps import async_session_factory
from models import Page, Project, Task
from services.runtime_state import load_runtime_config, runtime_context

logger = logging.getLogger(__name__)

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
                        "reference_count": len(reference_files),
                        "estimated_total_pages": _estimate_total_pages(preview_titles),
                    },
                )

                messages = _append_message(
                    messages,
                    f"已读取 {len(reference_files)} 份参考资料，正在组织章节结构。",
                )
                await _set_task_progress(
                    session,
                    task,
                    total=5,
                    completed=1,
                    percent=18,
                    current_step="整理参考资料与章节线索",
                    messages=messages,
                    preview_cards=preview_cards,
                    generated_cards=[],
                    queued_cards=preview_cards,
                    extra={
                        "render_mode": render_mode,
                        "scheme_id": scheme_id,
                        "reference_count": len(reference_files),
                        "estimated_total_pages": _estimate_total_pages(preview_titles),
                    },
                )

                ai_service = await get_ai_service_async()
                project_context = ProjectContext(project, reference_files)

                messages = _append_message(messages, "正在调用 AI 规划页面结构与叙事顺序。")
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
                    extra={
                        "render_mode": render_mode,
                        "scheme_id": scheme_id,
                        "reference_count": len(reference_files),
                        "estimated_total_pages": _estimate_total_pages(preview_titles),
                    },
                )

                if render_mode == "html":
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
                    pages_data = (
                        ai_service.flatten_outline(blueprint_result)
                        if isinstance(blueprint_result, dict)
                        else blueprint_result
                    )

                if not isinstance(pages_data, list) or not pages_data:
                    raise ValueError("Outline generation returned no pages")

                messages = _append_message(
                    messages,
                    f"已规划 {len(pages_data)} 页，开始逐页生成大纲卡片。",
                )

                initial_queue_cards = _build_preview_cards_from_pages(
                    pages_data,
                    limit=None,
                    status="planning",
                )
                await _set_task_progress(
                    session,
                    task,
                    total=len(pages_data) if render_mode != "html" else 5,
                    completed=0 if render_mode != "html" else 3,
                    percent=42 if render_mode != "html" else 78,
                    current_step="准备逐页写入",
                    messages=messages,
                    preview_cards=initial_queue_cards or preview_cards,
                    generated_cards=[],
                    queued_cards=initial_queue_cards,
                    extra={
                        "render_mode": render_mode,
                        "scheme_id": scheme_id,
                        "reference_count": len(reference_files),
                        "estimated_total_pages": len(pages_data),
                    },
                )

                for page in list(project.pages):
                    await session.delete(page)
                await session.flush()

                created_pages: list[Page] = []

                if render_mode == "html":
                    for idx, page_data in enumerate(pages_data):
                        page = Page(
                            project_id=project_id,
                            order_index=idx,
                            part=page_data.get("part") if isinstance(page_data, dict) else None,
                            status="OUTLINE_GENERATED",
                        )
                        if isinstance(page_data, dict):
                            page.layout_id = page_data.get("layout_id", "title_content")
                            page.set_outline_content(page_data)
                        session.add(page)
                        created_pages.append(page)

                    project.status = "OUTLINE_GENERATED"
                    project.updated_at = datetime.utcnow()
                    await session.flush()

                    generated_preview_cards = _build_preview_cards_from_pages(pages_data)
                    task.status = "COMPLETED"
                    task.completed_at = datetime.utcnow()
                    messages = _append_message(messages, f"大纲生成完成，已创建 {len(created_pages)} 页。")
                    task.set_progress(
                        {
                            "total": 5,
                            "completed": 5,
                            "failed": 0,
                            "percent": 100,
                            "current_step": "大纲已生成",
                            "messages": messages,
                            "preview_cards": generated_preview_cards or preview_cards,
                            "generated_cards": generated_preview_cards,
                            "queued_cards": [],
                            "render_mode": render_mode,
                            "scheme_id": scheme_id,
                            "reference_count": len(reference_files),
                            "estimated_total_pages": len(pages_data),
                        }
                    )
                    await session.commit()
                    return

                generated_pages: list[dict[str, Any]] = []
                total_pages = len(pages_data)

                for idx, page_stub in enumerate(pages_data):
                    if project.creation_type == "outline" and project.outline_text:
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
                    percent = min(99, max(45, round(((idx + 1) / total_pages) * 100)))
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
                            "reference_count": len(reference_files),
                            "estimated_total_pages": total_pages,
                        },
                    )

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
                        "reference_count": len(reference_files),
                        "estimated_total_pages": total_pages,
                    }
                )
                await session.commit()
            except Exception as exc:
                logger.exception("Outline generation task %s failed", task_id)
                task = await session.get(Task, task_id)
                if task:
                    task.status = "FAILED"
                    task.error_message = str(exc)
                    task.completed_at = datetime.utcnow()
                    await session.commit()


__all__ = ["generate_outline_task"]
