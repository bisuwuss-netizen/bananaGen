"""Knowledge-base outline generation background task."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any

from sqlalchemy import select

from deps import async_session_factory
from models.reference_file import ReferenceFile
from models.task import Task
from services.runtime_state import get_config_value, load_runtime_config, runtime_context
from .manager import task_manager

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """你是一个专业的PPT大纲提炼专家。用户会提供一份或多份文档的内容，你需要从中提炼出适合做PPT演示的结构化大纲。

要求：
- 大纲格式：使用 Markdown 多级标题（# 一级 ## 二级 ### 三级）
- 还原度约90%，允许创意加工，使大纲更适合演示
- 每个标题下可以有1-3行简短的描述要点
- 总页数建议 8-15 页
- 如有多份文档，综合提炼，去除重复内容"""


def _append_message(messages: list[str], message: str) -> list[str]:
    text = str(message or "").strip()
    if not text:
        return messages
    updated = [*messages, text]
    return updated[-8:]


async def _set_task_progress(
    session,
    task: Task,
    *,
    total: int,
    completed: int,
    percent: int,
    current_step: str,
    messages: list[str],
    reference_file_ids: list[str],
    reference_file_names: list[str],
    extra_requirements: str | None,
    outline_text: str,
) -> None:
    task.set_progress(
        {
            "total": total,
            "completed": completed,
            "failed": 0,
            "percent": percent,
            "current_step": current_step,
            "messages": messages,
            "reference_file_ids": reference_file_ids,
            "reference_file_names": reference_file_names,
            "extra_requirements": extra_requirements,
            "outline_text": outline_text,
        }
    )
    await session.commit()
    await task_manager.publish_task_update(task.id, task.to_dict())


async def _fail_task(
    session,
    task: Task,
    *,
    total: int,
    messages: list[str],
    reference_file_ids: list[str],
    reference_file_names: list[str],
    extra_requirements: str | None,
    outline_text: str,
    error_message: str,
) -> None:
    task.status = "FAILED"
    task.error_message = error_message[:500]
    task.completed_at = datetime.utcnow()
    task.set_progress(
        {
            "total": total,
            "completed": 0,
            "failed": max(1, total),
            "percent": 100,
            "current_step": "生成失败",
            "messages": _append_message(messages, error_message),
            "reference_file_ids": reference_file_ids,
            "reference_file_names": reference_file_names,
            "extra_requirements": extra_requirements,
            "outline_text": outline_text,
        }
    )
    await session.commit()
    await task_manager.publish_task_update(task.id, task.to_dict())


async def generate_knowledge_base_outline_task(
    task_id: str,
    *,
    reference_file_ids: list[str],
    user_id: str,
    extra_requirements: str | None = None,
    runtime_config: dict[str, Any] | None = None,
) -> None:
    resolved_runtime_config = runtime_config or load_runtime_config()

    with runtime_context(resolved_runtime_config):
        from services.ai_providers import get_text_provider

        async with async_session_factory() as session:
            task = await session.get(Task, task_id)
            if not task:
                logger.error("Knowledge-base task %s not found", task_id)
                return

            result = await session.execute(
                select(ReferenceFile).where(
                    ReferenceFile.id.in_(reference_file_ids),
                    ReferenceFile.user_id == user_id,
                    ReferenceFile.parse_status == "completed",
                )
            )
            files = result.scalars().all()
            total = len(reference_file_ids) or len(files) or 1
            reference_file_names = [item.filename for item in files]
            messages = ["任务开始执行。"]
            outline_text = ""

            if not files:
                await _fail_task(
                    session,
                    task,
                    total=total,
                    messages=messages,
                    reference_file_ids=reference_file_ids,
                    reference_file_names=reference_file_names,
                    extra_requirements=extra_requirements,
                    outline_text=outline_text,
                    error_message="未找到可用的已解析文档或文档内容为空",
                )
                return

            doc_parts = [
                f"## 文档：{item.filename}\n\n{item.markdown_content}"
                for item in files
                if item.markdown_content
            ]
            if not doc_parts:
                await _fail_task(
                    session,
                    task,
                    total=total,
                    messages=messages,
                    reference_file_ids=reference_file_ids,
                    reference_file_names=reference_file_names,
                    extra_requirements=extra_requirements,
                    outline_text=outline_text,
                    error_message="文档解析内容为空，无法生成大纲",
                )
                return

            task.status = "PROCESSING"
            await _set_task_progress(
                session,
                task,
                total=total,
                completed=0,
                percent=5,
                current_step="正在分析文档结构...",
                messages=_append_message(messages, "正在分析文档结构..."),
                reference_file_ids=reference_file_ids,
                reference_file_names=reference_file_names,
                extra_requirements=extra_requirements,
                outline_text=outline_text,
            )

            user_content = "\n\n---\n\n".join(doc_parts)
            if extra_requirements:
                user_content += f"\n\n---\n\n额外要求：{extra_requirements}"

            messages = _append_message(["任务开始执行。", "正在分析文档结构..."], "正在提炼核心要点...")
            await _set_task_progress(
                session,
                task,
                total=total,
                completed=0,
                percent=15,
                current_step="正在提炼核心要点...",
                messages=messages,
                reference_file_ids=reference_file_ids,
                reference_file_names=reference_file_names,
                extra_requirements=extra_requirements,
                outline_text=outline_text,
            )

            try:
                text_model = (
                    resolved_runtime_config.get("TEXT_MODEL")
                    or get_config_value("TEXT_MODEL")
                    or os.getenv("TEXT_MODEL", "gpt-4.1-mini")
                )
                provider = get_text_provider(model=text_model)
                response = await provider.async_client.chat.completions.create(
                    model=provider.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    stream=True,
                )

                chunk_count = 0
                async for chunk in response:
                    delta = chunk.choices[0].delta.content if chunk.choices else None
                    if not delta:
                        continue
                    outline_text += delta
                    chunk_count += 1
                    if chunk_count % 10 != 0:
                        continue

                    percent = min(90, 20 + chunk_count)
                    if chunk_count < 30:
                        step_msg = "正在生成大纲框架..."
                    elif chunk_count < 70:
                        step_msg = "正在丰富大纲内容..."
                    else:
                        step_msg = "正在优化大纲结构..."
                    await _set_task_progress(
                        session,
                        task,
                        total=total,
                        completed=0,
                        percent=percent,
                        current_step=step_msg,
                        messages=_append_message(messages, step_msg),
                        reference_file_ids=reference_file_ids,
                        reference_file_names=reference_file_names,
                        extra_requirements=extra_requirements,
                        outline_text=outline_text,
                    )

                messages = _append_message(messages, "正在优化大纲结构...")
                await _set_task_progress(
                    session,
                    task,
                    total=total,
                    completed=0,
                    percent=95,
                    current_step="正在优化大纲结构...",
                    messages=messages,
                    reference_file_ids=reference_file_ids,
                    reference_file_names=reference_file_names,
                    extra_requirements=extra_requirements,
                    outline_text=outline_text,
                )

                task.status = "COMPLETED"
                task.completed_at = datetime.utcnow()
                await _set_task_progress(
                    session,
                    task,
                    total=total,
                    completed=total,
                    percent=100,
                    current_step="完成",
                    messages=_append_message(messages, "文档大纲已生成完成。"),
                    reference_file_ids=reference_file_ids,
                    reference_file_names=reference_file_names,
                    extra_requirements=extra_requirements,
                    outline_text=outline_text,
                )
            except Exception as e:
                logger.exception("Knowledge-base task %s AI call failed", task_id)
                await _fail_task(
                    session,
                    task,
                    total=total,
                    messages=messages,
                    reference_file_ids=reference_file_ids,
                    reference_file_names=reference_file_names,
                    extra_requirements=extra_requirements,
                    outline_text=outline_text,
                    error_message=str(e),
                )
                return
