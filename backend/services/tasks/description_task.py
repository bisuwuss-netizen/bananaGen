"""Description generation background task."""

from __future__ import annotations

import copy
import logging
import asyncio
from sqlalchemy import select
from deps import async_session_factory
from concurrent.futures import (
    ThreadPoolExecutor,
    TimeoutError as FutureTimeoutError,
    as_completed,
)
from datetime import datetime
from typing import Any, Dict, List, Optional

from models import Page, Task, db
from services.presentation.narrative_continuity import (
    NarrativeRuntimeTracker,
    enrich_outline_with_narrative_contract,
    inject_unresolved_promise_closure_blocks,
    split_outline_into_chapters,
)
from services.runtime_state import load_runtime_config, runtime_context

from .manager import _safe_positive_int
from .utils import _chunked, finalize_generation_task

logger = logging.getLogger(__name__)


async def generate_descriptions_task(
    task_id: str,
    project_id: str,
    ai_service,
    project_context,
    outline: List[Dict],
    max_workers: int = 5,
    runtime_config: dict[str, Any] | None = None,
    language: str = None,
    render_mode: str = "image",
    generation_mode: str = "fast",
):
    """Background task for generating page descriptions."""
    from services.ai.base import ProjectContext as _PC
    if isinstance(project_context, dict):
        project_context = _PC(project_context)

    resolved_runtime_config = runtime_config or load_runtime_config()
    from services.ai_service_manager import get_ai_service_async

    with runtime_context(resolved_runtime_config):
        async with async_session_factory() as session:
            try:
                task = await session.get(Task, task_id)
                if not task:
                    logger.error("Task %s not found", task_id)
                    return

                task.status = "PROCESSING"
                await session.commit()

                result = await session.execute(select(Page).where(Page.project_id == project_id).order_by(Page.numeric_order()))
                pages = result.scalars().all()
                pages_data = []
                for p in pages:
                    oc = p.get_outline_content() or {}
                    pd = oc.copy()
                    if p.layout_id:
                        pd["layout_id"] = p.layout_id
                    if p.part:
                        pd["part"] = p.part
                    pages_data.append(pd)

                if not pages_data:
                    raise ValueError("No pages found for project")

                task.set_progress({"total": len(pages), "completed": 0, "failed": 0})
                await session.commit()

                completed = 0
                failed = 0
                description_batch_size = _safe_positive_int(
                    resolved_runtime_config.get("DESCRIPTION_BATCH_SIZE", 1),
                    1,
                )

                html_outline_context: Dict[str, Any] = {}
                narrative_tracker: Optional[NarrativeRuntimeTracker] = None
                html_jobs: List[Dict[str, Any]] = []

                if render_mode == "html":
                    raw_outline_context = {"title": project_context.idea_prompt or "", "pages": []}
                    for i, (page_obj, page_data) in enumerate(zip(pages, pages_data), 1):
                        layout_id = page_obj.layout_id or page_data.get("layout_id", "title_content")
                        raw_outline_context["pages"].append(
                            {
                                "page_id": f"p{i:02d}",
                                "title": page_data.get("title", ""),
                                "layout_id": layout_id,
                                "has_image": bool(page_data.get("has_image", False)),
                                "keywords": page_data.get("keywords", page_data.get("points", [])[:3]),
                                "points": page_data.get("points", []),
                                "depends_on": page_data.get("depends_on", []),
                                "must_cover": page_data.get("must_cover", []),
                                "promises_open": page_data.get("promises_open", []),
                                "promises_close": page_data.get("promises_close", []),
                                "required_close_promise_ids": page_data.get(
                                    "required_close_promise_ids",
                                    page_data.get("promises_close", []),
                                ),
                            }
                        )

                    try:
                        from services.presentation.layout_planner import assign_layout_variants
                        from services.prompts.layouts import LAYOUT_ID_ALIASES

                        raw_outline_context["pages"] = assign_layout_variants(
                            outline=raw_outline_context["pages"],
                            scheme_id=project_context.scheme_id or "edu_dark",
                            layout_aliases=LAYOUT_ID_ALIASES,
                            seed=project_context.idea_prompt or str(project_id),
                        )
                    except Exception as planner_err:
                        logger.warning("HTML description task: layout variant planning skipped: %s", planner_err)

                    html_outline_context = enrich_outline_with_narrative_contract(raw_outline_context)
                    normalized_pages = html_outline_context.get("pages") if isinstance(html_outline_context.get("pages"), list) else []
                    narrative_tracker = NarrativeRuntimeTracker(html_outline_context)

                    for i, (page_obj, page_data) in enumerate(zip(pages, pages_data), 1):
                        normalized_outline = normalized_pages[i - 1] if i - 1 < len(normalized_pages) else {
                            "page_id": f"p{i:02d}",
                            "title": page_data.get("title", ""),
                            "layout_id": page_obj.layout_id or page_data.get("layout_id", "title_content"),
                            "has_image": bool(page_data.get("has_image", False)),
                            "keywords": page_data.get("keywords", page_data.get("points", [])[:3]),
                            "layout_variant": "a",
                        }
                        layout_variant = str(normalized_outline.get("layout_variant") or "a").strip().lower() or "a"
                        layout_archetype = str(normalized_outline.get("layout_archetype") or "").strip()
                        html_jobs.append(
                            {
                                "db_page_id": page_obj.id,
                                "logical_page_id": normalized_outline.get("page_id", f"p{i:02d}"),
                                "page_index": i,
                                "layout_id": page_obj.layout_id or normalized_outline.get("layout_id", "title_content"),
                                "layout_variant": layout_variant,
                                "layout_archetype": layout_archetype,
                                "page_outline": normalized_outline,
                            }
                        )

                        persisted_outline = page_obj.get_outline_content()
                        if not isinstance(persisted_outline, dict):
                            persisted_outline = {}
                        merged_outline = copy.deepcopy(persisted_outline)
                        merged_outline.update(
                            {
                                "logical_page_id": normalized_outline.get("page_id", f"p{i:02d}"),
                                "has_image": bool(normalized_outline.get("has_image", False)),
                                "keywords": normalized_outline.get("keywords", []),
                                "depends_on": normalized_outline.get("depends_on", []),
                                "must_cover": normalized_outline.get("must_cover", []),
                                "promises_open": normalized_outline.get("promises_open", []),
                                "promises_close": normalized_outline.get("promises_close", []),
                                "required_close_promise_ids": normalized_outline.get(
                                    "required_close_promise_ids",
                                    normalized_outline.get("promises_close", []),
                                ),
                                "layout_id": page_obj.layout_id or normalized_outline.get("layout_id", "title_content"),
                                "layout_variant": layout_variant,
                            }
                        )
                        if layout_archetype:
                            merged_outline["layout_archetype"] = layout_archetype
                        page_obj.set_outline_content(merged_outline)

                    await session.commit()

                async def generate_single_desc(
                    page_id,
                    page_outline,
                    page_index,
                    page_layout_id=None,
                    logical_page_id=None,
                    continuity_context=None,
                    rewrite_instruction: str = "",
                    thinking_budget: int = 320,
                ):
                    with runtime_context(resolved_runtime_config):
                        try:
                            scoped_ai_service = await get_ai_service_async()

                            if render_mode == "html":
                                layout_id = page_layout_id or page_outline.get("layout_id", "title_content")
                                layout_variant = str(page_outline.get("layout_variant") or "a").strip().lower() or "a"
                                layout_archetype = str(page_outline.get("layout_archetype") or "").strip()
                                structured_page_outline = {
                                    "page_id": logical_page_id or page_outline.get("page_id", f"p{page_index:02d}"),
                                    "title": page_outline.get("title", ""),
                                    "layout_id": layout_id,
                                    "layout_variant": layout_variant,
                                    "has_image": bool(page_outline.get("has_image", False)),
                                    "keywords": page_outline.get("keywords", page_outline.get("points", [])[:3]),
                                    "depends_on": page_outline.get("depends_on", []),
                                    "must_cover": page_outline.get("must_cover", []),
                                    "promises_open": page_outline.get("promises_open", []),
                                    "promises_close": page_outline.get("promises_close", []),
                                    "required_close_promise_ids": page_outline.get(
                                        "required_close_promise_ids",
                                        page_outline.get("promises_close", []),
                                    ),
                                }
                                if layout_archetype:
                                    structured_page_outline["layout_archetype"] = layout_archetype
                                if "section_number" in page_outline:
                                    structured_page_outline["section_number"] = page_outline.get("section_number")
                                if "subtitle" in page_outline:
                                    structured_page_outline["subtitle"] = page_outline.get("subtitle")

                                layout_is_toc = "toc" in str(layout_id).lower()
                                full_outline_for_prompt = html_outline_context if layout_is_toc else None
                                generation_result = await scoped_ai_service.call_async(
                                    "generate_structured_page_content",
                                    page_outline=structured_page_outline,
                                    full_outline=full_outline_for_prompt,
                                    language=language,
                                    scheme_id=project_context.scheme_id or "edu_dark",
                                    continuity_context=continuity_context,
                                    rewrite_instruction=rewrite_instruction,
                                    thinking_budget=thinking_budget,
                                    return_metadata=True,
                                )
                                model = generation_result.get("model") if isinstance(generation_result, dict) else {}
                                if isinstance(model, dict):
                                    model["variant"] = layout_variant
                                    model["layout_variant"] = layout_variant
                                    if layout_archetype:
                                        model["layout_archetype"] = layout_archetype
                                closed_promise_ids = generation_result.get("closed_promise_ids") if isinstance(generation_result, dict) else []
                                required_ids = []
                                if isinstance(continuity_context, dict):
                                    required_ids = continuity_context.get("required_close_promise_ids", []) or []
                                missing_required = [
                                    pid
                                    for pid in required_ids
                                    if pid not in (closed_promise_ids if isinstance(closed_promise_ids, list) else [])
                                ]

                                return (
                                    page_id,
                                    {
                                        "html_model": model,
                                        "closed_promise_ids": closed_promise_ids if isinstance(closed_promise_ids, list) else [],
                                        "missing_required_close_promise_ids": missing_required,
                                        "layout_id": layout_id,
                                        "logical_page_id": structured_page_outline.get("page_id"),
                                        "title": structured_page_outline.get("title", ""),
                                        "layout_variant": layout_variant,
                                        "layout_archetype": layout_archetype,
                                    },
                                    None,
                                )

                            desc_text = await scoped_ai_service.call_async(
                                "generate_page_description",
                                project_context,
                                outline,
                                page_outline,
                                page_index,
                                language=language,
                            )
                            desc_content = {"text": desc_text, "generated_at": datetime.utcnow().isoformat()}
                            return (page_id, {"description_content": desc_content}, None)
                        except Exception as exc:
                            import traceback

                            logger.error(
                                "Failed to generate description for page %s: %s",
                                page_id,
                                traceback.format_exc(),
                            )
                            return (page_id, None, str(exc))

                async def update_page_result(page_id, result_data, error, count_stats: bool = True):
                    nonlocal completed, failed
                    page = await session.get(Page, page_id)
                    if not page:
                        if count_stats:
                            failed += 1
                        return
                    if error:
                        page.status = "FAILED"
                        if count_stats:
                            failed += 1
                        return
                    if not isinstance(result_data, dict):
                        page.status = "FAILED"
                        if count_stats:
                            failed += 1
                        return

                    if render_mode == "html":
                        model = result_data.get("html_model") if isinstance(result_data.get("html_model"), dict) else {}
                        persisted_outline = page.get_outline_content()
                        if not isinstance(persisted_outline, dict):
                            persisted_outline = {}
                        layout_variant = str(
                            result_data.get("layout_variant")
                            or persisted_outline.get("layout_variant")
                            or model.get("layout_variant")
                            or model.get("variant")
                            or "a"
                        ).strip().lower() or "a"
                        layout_archetype = str(
                            result_data.get("layout_archetype")
                            or persisted_outline.get("layout_archetype")
                            or model.get("layout_archetype")
                            or ""
                        ).strip()
                        model["variant"] = layout_variant
                        model["layout_variant"] = layout_variant
                        if layout_archetype:
                            model["layout_archetype"] = layout_archetype
                        page.set_html_model(model)
                        continuity_meta = {
                            "closed_promise_ids": result_data.get("closed_promise_ids")
                            if isinstance(result_data.get("closed_promise_ids"), list)
                            else [],
                            "missing_required_close_promise_ids": result_data.get("missing_required_close_promise_ids")
                            if isinstance(result_data.get("missing_required_close_promise_ids"), list)
                            else [],
                        }
                        page.set_description_content({"continuity": continuity_meta, "generated_at": datetime.utcnow().isoformat()})
                        if result_data.get("layout_id"):
                            page.layout_id = result_data.get("layout_id")
                        persisted_outline["layout_id"] = page.layout_id or result_data.get("layout_id", persisted_outline.get("layout_id"))
                        persisted_outline["layout_variant"] = layout_variant
                        if layout_archetype:
                            persisted_outline["layout_archetype"] = layout_archetype
                        if result_data.get("logical_page_id"):
                            persisted_outline["logical_page_id"] = result_data.get("logical_page_id")
                        page.set_outline_content(persisted_outline)
                        page.status = "HTML_MODEL_GENERATED"
                    else:
                        page.set_description_content(result_data.get("description_content"))
                        page.status = "DESCRIPTION_GENERATED"

                    if count_stats:
                        completed += 1

                if render_mode == "html":
                    html_mode = str(
                        generation_mode or resolved_runtime_config.get("HTML_CONTINUITY_MODE", "fast")
                    ).strip().lower()
                    strict_mode = html_mode == "strict"
                    html_batch_size = max(
                        1,
                        min(
                            3,
                            _safe_positive_int(
                                resolved_runtime_config.get("HTML_DESCRIPTION_BATCH_SIZE", 3),
                                3,
                            ),
                        ),
                    )
                    chapter_parallelism = _safe_positive_int(
                        resolved_runtime_config.get("HTML_CHAPTER_PARALLELISM", 3),
                        3,
                    )
                    first_pass_budget = _safe_positive_int(
                        resolved_runtime_config.get("HTML_FIRST_PASS_THINKING_BUDGET", 280),
                        280,
                    )
                    rewrite_budget = _safe_positive_int(
                        resolved_runtime_config.get("HTML_REWRITE_THINKING_BUDGET", 850),
                        850,
                    )
                    rewrite_timeout_seconds = _safe_positive_int(
                        resolved_runtime_config.get("HTML_REWRITE_TIMEOUT_SECONDS", 210),
                        210,
                    )

                    html_job_by_logical_id = {job["logical_page_id"]: job for job in html_jobs}
                    chapters = split_outline_into_chapters(html_outline_context)
                    chapter_jobs: List[List[Dict[str, Any]]] = []
                    for chapter in chapters:
                        jobs = [html_job_by_logical_id[pid] for pid in chapter if pid in html_job_by_logical_id]
                        if jobs:
                            chapter_jobs.append(jobs)
                    if not chapter_jobs:
                        chapter_jobs = [html_jobs]

                    async def generate_chapter(chapter_job_items: List[Dict[str, Any]]):
                        with runtime_context(resolved_runtime_config):
                            chapter_ai_service = await get_ai_service_async()

                        local_results: List[Any] = []
                        local_tracker = NarrativeRuntimeTracker(html_outline_context)

                        for batch_items in _chunked(chapter_job_items, html_batch_size):
                            batch_requests = []
                            required_by_page: Dict[str, List[str]] = {}
                            for job in batch_items:
                                continuity_context = local_tracker.build_context_for_page(job["logical_page_id"])
                                required_by_page[job["logical_page_id"]] = (
                                    continuity_context.get("required_close_promise_ids", [])
                                    if isinstance(continuity_context, dict)
                                    else []
                                )
                                batch_requests.append(
                                    {
                                        "page_outline": job["page_outline"],
                                        "continuity_context": continuity_context,
                                        "rewrite_instruction": "",
                                    }
                                )

                            batch_output: Dict[str, Dict[str, Any]] = {}
                            try:
                                batch_output = await chapter_ai_service.call_async(
                                    "generate_structured_page_content_batch",
                                    batch_requests=batch_requests,
                                    language=language,
                                    scheme_id=project_context.scheme_id or "edu_dark",
                                    thinking_budget=first_pass_budget,
                                )
                            except Exception as batch_err:
                                logger.warning(
                                    "HTML chapter batch generation failed (size=%s), fallback single-page: %s",
                                    len(batch_items),
                                    batch_err,
                                )

                            for job in batch_items:
                                logical_page_id = job["logical_page_id"]
                                batch_row = batch_output.get(logical_page_id) if isinstance(batch_output, dict) else None
                                if isinstance(batch_row, dict) and isinstance(batch_row.get("model"), dict):
                                    closed_ids = batch_row.get("closed_promise_ids") if isinstance(batch_row.get("closed_promise_ids"), list) else []
                                    row_model = batch_row.get("model") or {}
                                    row_variant = str(
                                        job.get("layout_variant")
                                        or job.get("page_outline", {}).get("layout_variant")
                                        or "a"
                                    ).strip().lower() or "a"
                                    row_archetype = str(
                                        job.get("layout_archetype")
                                        or job.get("page_outline", {}).get("layout_archetype")
                                        or ""
                                    ).strip()
                                    row_model["variant"] = row_variant
                                    row_model["layout_variant"] = row_variant
                                    if row_archetype:
                                        row_model["layout_archetype"] = row_archetype
                                    row_result = {
                                        "html_model": row_model,
                                        "closed_promise_ids": closed_ids,
                                        "missing_required_close_promise_ids": [
                                            pid for pid in required_by_page.get(logical_page_id, []) if pid not in closed_ids
                                        ],
                                        "layout_id": job.get("layout_id"),
                                        "logical_page_id": logical_page_id,
                                        "title": job.get("page_outline", {}).get("title", ""),
                                        "layout_variant": row_variant,
                                        "layout_archetype": row_archetype,
                                    }
                                    local_results.append((job["db_page_id"], row_result, None))
                                    try:
                                        local_tracker.apply_generated_page(
                                            page_id=logical_page_id,
                                            layout_id=row_result.get("layout_id", job.get("layout_id")),
                                            title=row_result.get("title", ""),
                                            model=row_result.get("html_model") or {},
                                            closed_promise_ids=row_result.get("closed_promise_ids")
                                            if isinstance(row_result.get("closed_promise_ids"), list)
                                            else [],
                                        )
                                    except Exception as tracker_err:
                                        logger.warning("章节局部追踪失败（页 %s）: %s", logical_page_id, tracker_err)
                                    continue

                                continuity_context = local_tracker.build_context_for_page(logical_page_id)
                                page_id, result_data, error = await generate_single_desc(
                                    page_id=job["db_page_id"],
                                    page_outline=job["page_outline"],
                                    page_index=job["page_index"],
                                    page_layout_id=job["layout_id"],
                                    logical_page_id=logical_page_id,
                                    continuity_context=continuity_context,
                                    thinking_budget=first_pass_budget,
                                )
                                local_results.append((page_id, result_data, error))
                                if not error and result_data:
                                    try:
                                        local_tracker.apply_generated_page(
                                            page_id=result_data.get("logical_page_id", logical_page_id),
                                            layout_id=result_data.get("layout_id", job["layout_id"]),
                                            title=result_data.get("title", job["page_outline"].get("title", "")),
                                            model=result_data.get("html_model") or {},
                                            closed_promise_ids=result_data.get("closed_promise_ids")
                                            if isinstance(result_data.get("closed_promise_ids"), list)
                                            else [],
                                        )
                                    except Exception as tracker_err:
                                        logger.warning("章节单页追踪失败（页 %s）: %s", logical_page_id, tracker_err)
                        return local_results

                    worker_count = max(1, min(max_workers, chapter_parallelism, len(chapter_jobs)))
                    first_pass_map: Dict[str, Any] = {}
                    sem = asyncio.Semaphore(worker_count)
                    
                    async def sem_run(items):
                        async with sem:
                            return await generate_chapter(items)
                    
                    tasks = [sem_run(items) for items in chapter_jobs]
                    results = await asyncio.gather(*tasks)
                    
                    for chapter_results in results:
                        for page_id, result_data, error in chapter_results:
                            first_pass_map[str(page_id)] = (result_data, error)

                    for job in html_jobs:
                        page_id = str(job["db_page_id"])
                        result_data, error = first_pass_map.get(page_id, (None, "页面生成结果缺失"))

                        try:
                            await update_page_result(page_id, result_data, error)
                            await session.commit()
                        except Exception as commit_exc:
                            logger.warning("Failed to commit page %s update, rolling back: %s", page_id, commit_exc)
                            try:
                                await session.rollback()
                            except Exception:
                                pass
                            completed = max(0, completed - 1)
                            failed += 1
                            continue

                        if not error and result_data and narrative_tracker:
                            try:
                                narrative_tracker.apply_generated_page(
                                    page_id=result_data.get("logical_page_id", job["logical_page_id"]),
                                    layout_id=result_data.get("layout_id", job["layout_id"]),
                                    title=result_data.get("title", job["page_outline"].get("title", "")),
                                    model=result_data.get("html_model") or {},
                                    closed_promise_ids=result_data.get("closed_promise_ids")
                                    if isinstance(result_data.get("closed_promise_ids"), list)
                                    else [],
                                )
                            except Exception as tracker_err:
                                logger.warning("更新叙事追踪器失败（页 %s）: %s", job["logical_page_id"], tracker_err)

                        try:
                            task = await session.get(Task, task_id)
                            if task:
                                task.update_progress(completed=completed, failed=failed)
                                await session.commit()
                        except Exception:
                            try:
                                await session.rollback()
                            except Exception:
                                pass

                    if narrative_tracker and completed > 0:
                        deterministic_report = narrative_tracker.quality_report()
                        deterministic_issues = deterministic_report.get("issues", []) if isinstance(deterministic_report, dict) else []
                        pre_unresolved = deterministic_report.get("unresolved_promises", []) if isinstance(deterministic_report, dict) else []
                        pre_unresolved_ids = [
                            str(item.get("promise_id"))
                            for item in pre_unresolved
                            if isinstance(item, dict) and item.get("promise_id")
                        ]

                        rewrite_tasks: List[Dict[str, Any]] = []
                        if strict_mode:
                            ai_service = await get_ai_service_async()
                            semantic_review = await ai_service.call_async(
                                "review_structured_document_continuity",
                                outline_doc=html_outline_context,
                                generated_pages=narrative_tracker.generated_pages_in_order(),
                                deterministic_issues=deterministic_issues,
                                language=language or resolved_runtime_config.get("OUTPUT_LANGUAGE", "zh"),
                            )
                            rewrite_tasks = await ai_service.call_async(
                                "_plan_rewrites_from_reports",
                                deterministic_issues=deterministic_issues,
                                semantic_review=semantic_review,
                                max_pages=4,
                            )

                        if rewrite_tasks:
                            for rewrite_task in rewrite_tasks:
                                logical_page_id = rewrite_task.get("page_id")
                                job = html_job_by_logical_id.get(logical_page_id)
                                if not job:
                                    continue

                                continuity_context = narrative_tracker.build_context_for_page(logical_page_id)
                                rewrite_instruction = (
                                    f"{str(rewrite_task.get('reason') or '').strip()}。"
                                    f"{str(rewrite_task.get('instruction') or '').strip()}"
                                ).strip("。")
                                if rewrite_instruction:
                                    rewrite_instruction += "。"

                                try:
                                    page_id, rewrite_data, rewrite_error = await asyncio.wait_for(
                                        generate_single_desc(
                                            page_id=job["db_page_id"],
                                            page_outline=job["page_outline"],
                                            page_index=job["page_index"],
                                            page_layout_id=job["layout_id"],
                                            logical_page_id=job["logical_page_id"],
                                            continuity_context=continuity_context,
                                            rewrite_instruction=rewrite_instruction,
                                            thinking_budget=rewrite_budget,
                                        ),
                                        timeout=rewrite_timeout_seconds
                                    )
                                except asyncio.TimeoutError:
                                    page_id = job["db_page_id"]
                                    rewrite_data = None
                                    rewrite_error = f"页面重写超时({rewrite_timeout_seconds}s)"

                                if rewrite_error or not rewrite_data:
                                    continue

                                try:
                                    await update_page_result(page_id, rewrite_data, None, count_stats=False)
                                    await session.commit()
                                except Exception as rw_exc:
                                    logger.warning("Rewrite commit failed for page %s: %s", page_id, rw_exc)
                                    try:
                                        await session.rollback()
                                    except Exception:
                                        pass

                                try:
                                    narrative_tracker.apply_generated_page(
                                        page_id=rewrite_data.get("logical_page_id", logical_page_id),
                                        layout_id=rewrite_data.get("layout_id", job["layout_id"]),
                                        title=rewrite_data.get("title", job["page_outline"].get("title", "")),
                                        model=rewrite_data.get("html_model") or {},
                                        closed_promise_ids=rewrite_data.get("closed_promise_ids")
                                        if isinstance(rewrite_data.get("closed_promise_ids"), list)
                                        else [],
                                    )
                                except Exception as tracker_err:
                                    logger.warning("重写后更新追踪器失败（页 %s）: %s", logical_page_id, tracker_err)

                        fallback_result = inject_unresolved_promise_closure_blocks(
                            outline_doc=html_outline_context,
                            generated_pages=narrative_tracker.generated_pages_in_order(),
                            max_lines_per_page=2,
                        )
                        patched_pages = fallback_result.get("generated_pages", []) if isinstance(fallback_result, dict) else []
                        patched_outline = fallback_result.get("outline") if isinstance(fallback_result, dict) else None

                        if isinstance(patched_outline, dict):
                            html_outline_context = patched_outline
                        if patched_pages:
                            for entry in patched_pages:
                                if not isinstance(entry, dict):
                                    continue
                                logical_page_id = str(entry.get("page_id") or "")
                                job = html_job_by_logical_id.get(logical_page_id)
                                if not job:
                                    continue
                                await update_page_result(
                                    job["db_page_id"],
                                    {
                                        "html_model": entry.get("model") if isinstance(entry.get("model"), dict) else {},
                                        "layout_id": entry.get("layout_id", job.get("layout_id")),
                                        "logical_page_id": logical_page_id,
                                        "title": entry.get("title", job.get("page_outline", {}).get("title", "")),
                                        "closed_promise_ids": entry.get("closed_promise_ids")
                                        if isinstance(entry.get("closed_promise_ids"), list)
                                        else [],
                                    },
                                    None,
                                    count_stats=False,
                                )
                            try:
                                await session.commit()
                            except Exception as patch_exc:
                                logger.warning("Patched pages commit failed: %s", patch_exc)
                                try:
                                    await session.rollback()
                                except Exception:
                                    pass

                elif description_batch_size > 1:
                    page_jobs = [(page.id, page_data, i, page.layout_id) for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)]
                    batches = _chunked(page_jobs, description_batch_size)
                    worker_count = max(1, min(max_workers, len(batches)))

                    async def generate_desc_batch(batch_items):
                        with runtime_context(resolved_runtime_config):
                            scoped_ai_service = await get_ai_service_async()
                            batch_payload = [{"page_index": idx, "page_outline": page_outline} for _, page_outline, idx, _ in batch_items]
                            batch_desc_map = {}
                            try:
                                batch_desc_map = await scoped_ai_service.call_async(
                                    "generate_page_descriptions_batch",
                                    project_context=project_context,
                                    outline=outline,
                                    batch_pages=batch_payload,
                                    language=language,
                                )
                            except Exception as batch_err:
                                logger.warning(
                                    "Batch description generation failed for %s pages, fallback to single-page mode. Error: %s",
                                    len(batch_items),
                                    batch_err,
                                )

                            results = []
                            for page_id, page_outline, idx, page_layout_id in batch_items:
                                desc_text = batch_desc_map.get(idx)
                                if isinstance(desc_text, str) and desc_text.strip():
                                    desc_content = {"text": desc_text, "generated_at": datetime.utcnow().isoformat()}
                                    results.append((page_id, {"description_content": desc_content}, None))
                                    continue
                                results.append(await generate_single_desc(page_id, page_outline, idx, page_layout_id))
                            return results

                    sem = asyncio.Semaphore(worker_count)
                    async def sem_batch(batch_items):
                        async with sem:
                            return await generate_desc_batch(batch_items)
                            
                    tasks = [sem_batch(batch_items) for batch_items in batches]
                    results = await asyncio.gather(*tasks)
                    
                    for batch_results in results:
                        for page_id, result_data, error in batch_results:
                            try:
                                await update_page_result(page_id, result_data, error)
                                await session.commit()
                            except Exception as commit_exc:
                                logger.warning("Failed to commit page %s update: %s", page_id, commit_exc)
                                try:
                                    await session.rollback()
                                except Exception:
                                    pass
                                completed = max(0, completed - 1)
                                failed += 1
                        try:
                            task = await session.get(Task, task_id)
                            if task:
                                task.update_progress(completed=completed, failed=failed)
                                await session.commit()
                        except Exception:
                            try:
                                await session.rollback()
                            except Exception:
                                pass
                else:
                    sem_single = asyncio.Semaphore(max_workers)
                    
                    async def sem_single_run(page_obj, page_data_obj, idx):
                        async with sem_single:
                            return await generate_single_desc(page_obj.id, page_data_obj, idx, page_obj.layout_id)
                            
                    tasks = [
                        sem_single_run(page, page_data, i)
                        for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)
                    ]
                    results = await asyncio.gather(*tasks)
                    
                    for page_id, result_data, error in results:
                        try:
                            await update_page_result(page_id, result_data, error)
                            await session.commit()
                        except Exception as commit_exc:
                            logger.warning("Failed to commit page %s update: %s", page_id, commit_exc)
                            try:
                                await session.rollback()
                            except Exception:
                                pass
                            completed = max(0, completed - 1)
                            failed += 1
                        try:
                            task = await session.get(Task, task_id)
                            if task:
                                task.update_progress(completed=completed, failed=failed)
                                await session.commit()
                        except Exception:
                            try:
                                await session.rollback()
                            except Exception:
                                pass

                from models import Project
                task = await session.get(Task, task_id)
                task_succeeded = True
                if task:
                    task_succeeded = finalize_generation_task(
                        task,
                        completed=completed,
                        failed=failed,
                        finished_at=datetime.utcnow(),
                    )
                    await session.commit()

                project = await session.get(Project, project_id)
                if project:
                    project.status = "DESCRIPTIONS_GENERATED" if task_succeeded else "FAILED"
                    await session.commit()
            except Exception as exc:
                import traceback

                logger.error("Task %s FAILED with exception: %s", task_id, traceback.format_exc())
                try:
                    await session.rollback()
                except Exception:
                    pass
                try:
                    task = await session.get(Task, task_id)
                    if task:
                        task.status = "FAILED"
                        task.error_message = str(exc)
                        task.completed_at = datetime.utcnow()

                    from models import Project
                    project = await session.get(Project, project_id)
                    if project:
                        project.status = "FAILED"

                    await session.commit()
                except Exception as cleanup_exc:
                    logger.warning("Failed to mark task %s as FAILED: %s", task_id, cleanup_exc)
                    try:
                        await session.rollback()
                    except Exception:
                        pass


__all__ = ["generate_descriptions_task"]
