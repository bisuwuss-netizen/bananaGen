"""
Task Manager - handles background tasks using ThreadPoolExecutor
No need for Celery or Redis, uses in-memory task tracking
"""
import os
import copy
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FutureTimeoutError
from typing import Callable, List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import func
from models import db, Task, Page, Material, PageImageVersion
from utils import get_filtered_pages
from pathlib import Path
from services.narrative_continuity import (
    NarrativeRuntimeTracker,
    enrich_outline_with_narrative_contract,
    inject_unresolved_promise_closure_blocks,
    split_outline_into_chapters,
)

logger = logging.getLogger(__name__)


def _env_positive_int(name: str, default: int) -> int:
    """Read positive int env value with safe fallback."""
    try:
        value = int(os.getenv(name, str(default)))
        return value if value > 0 else default
    except (TypeError, ValueError):
        return default


def _safe_positive_int(value: Any, default: int) -> int:
    """Parse positive int from config values with safe fallback."""
    try:
        parsed = int(str(value).strip())
        return parsed if parsed > 0 else default
    except (TypeError, ValueError, AttributeError):
        return default


def _chunked(items: List[Any], chunk_size: int) -> List[List[Any]]:
    """Split list into chunks."""
    if chunk_size <= 0:
        chunk_size = 1
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


# Timeout guard for stuck tasks (seconds)
# These are only used when a task is still PENDING/PROCESSING but no worker is active.
TASK_STALE_TIMEOUT_SECONDS = {
    "GENERATE_MATERIAL": _env_positive_int("TASK_TIMEOUT_GENERATE_MATERIAL_SECONDS", 15 * 60),
    "GENERATE_PAGE_IMAGE": _env_positive_int("TASK_TIMEOUT_GENERATE_PAGE_IMAGE_SECONDS", 20 * 60),
    "EDIT_PAGE_IMAGE": _env_positive_int("TASK_TIMEOUT_EDIT_PAGE_IMAGE_SECONDS", 20 * 60),
    "GENERATE_DESCRIPTIONS": _env_positive_int("TASK_TIMEOUT_GENERATE_DESCRIPTIONS_SECONDS", 20 * 60),
    "GENERATE_IMAGES": _env_positive_int("TASK_TIMEOUT_GENERATE_IMAGES_SECONDS", 90 * 60),
    "EXPORT_EDITABLE_PPTX": _env_positive_int("TASK_TIMEOUT_EXPORT_EDITABLE_PPTX_SECONDS", 6 * 60 * 60),
}
DEFAULT_TASK_STALE_TIMEOUT_SECONDS = _env_positive_int("TASK_TIMEOUT_DEFAULT_SECONDS", 2 * 60 * 60)


class TaskManager:
    """Simple task manager using ThreadPoolExecutor"""
    
    def __init__(self, max_workers: int = 4):
        """Initialize task manager"""
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.active_tasks = {}  # task_id -> Future
        self.lock = threading.Lock()
    
    def submit_task(self, task_id: str, func: Callable, *args, **kwargs):
        """Submit a background task"""
        future = self.executor.submit(func, task_id, *args, **kwargs)
        
        with self.lock:
            self.active_tasks[task_id] = future
        
        # Add callback to clean up when done and log exceptions
        future.add_done_callback(lambda f: self._task_done_callback(task_id, f))
    
    def _task_done_callback(self, task_id: str, future):
        """Handle task completion and log any exceptions"""
        try:
            # Check if task raised an exception
            exception = future.exception()
            if exception:
                logger.error(f"Task {task_id} failed with exception: {exception}", exc_info=exception)
        except Exception as e:
            logger.error(f"Error in task callback for {task_id}: {e}", exc_info=True)
        finally:
            self._cleanup_task(task_id)
    
    def _cleanup_task(self, task_id: str):
        """Clean up completed task"""
        with self.lock:
            if task_id in self.active_tasks:
                del self.active_tasks[task_id]
    
    def is_task_active(self, task_id: str) -> bool:
        """Check if task is still running"""
        with self.lock:
            return task_id in self.active_tasks
    
    def shutdown(self):
        """Shutdown the executor"""
        self.executor.shutdown(wait=True)


# Global task manager instance
def _env_positive_int(name: str, default: int) -> int:
    import os
    try:
        v = int(os.getenv(name, str(default)))
        return v if v > 0 else default
    except (TypeError, ValueError):
        return default

task_manager = TaskManager(max_workers=_env_positive_int('MAX_GLOBAL_TASK_WORKERS', 12))


def _get_stale_timeout_seconds(task_type: str) -> int:
    """Get stale timeout by task type."""
    if not task_type:
        return DEFAULT_TASK_STALE_TIMEOUT_SECONDS
    return TASK_STALE_TIMEOUT_SECONDS.get(task_type, DEFAULT_TASK_STALE_TIMEOUT_SECONDS)


def auto_fail_stale_task(task: Task) -> bool:
    """
    Auto-fail stale task to prevent infinite polling.

    Conditions:
    1. Task status is PENDING/PROCESSING
    2. Task is NOT active in in-memory task manager (e.g. worker lost after restart/crash)
    3. Task age exceeds timeout threshold

    Returns:
        True if task status changed to FAILED, else False
    """
    if not task:
        return False

    if task.status not in ("PENDING", "PROCESSING"):
        return False

    # If worker is still alive for this task, do not force-fail here.
    if task_manager.is_task_active(task.id):
        return False

    now = datetime.utcnow()
    created_at = task.created_at or now
    if isinstance(created_at, str):
        raw = created_at.strip()
        try:
            # Handle common forms: "YYYY-MM-DD HH:MM:SS(.ffffff)" or ISO8601
            created_at = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            # Normalize aware dt to naive UTC for subtraction compatibility.
            if created_at.tzinfo is not None:
                created_at = created_at.astimezone().replace(tzinfo=None)
        except Exception:
            logger.warning(f"Invalid created_at for task {task.id}: {raw}, fallback to now")
            created_at = now
    age_seconds = max(0, int((now - created_at).total_seconds()))
    timeout_seconds = _get_stale_timeout_seconds(task.task_type)

    if age_seconds < timeout_seconds:
        return False

    # Mark stale task as failed.
    task.status = "FAILED"
    task.completed_at = now

    if not task.error_message:
        task.error_message = (
            f"Task timed out after {age_seconds}s and no active worker was found. "
            f"Marked as FAILED to stop infinite polling."
        )

    try:
        progress = task.get_progress()
        if isinstance(progress, dict):
            total = int(progress.get("total", 0) or 0)
            completed = int(progress.get("completed", 0) or 0)
            failed = int(progress.get("failed", 0) or 0)
            remaining = max(0, total - completed)
            progress["failed"] = max(failed, remaining or 1)
            task.set_progress(progress)
    except Exception:
        logger.debug(f"Failed to normalize progress for stale task {task.id}", exc_info=True)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.error(f"Failed to commit stale task status for {task.id}", exc_info=True)
        return False

    logger.warning(
        f"Auto-failed stale task {task.id}: type={task.task_type}, age={age_seconds}s, "
        f"timeout={timeout_seconds}s, project={task.project_id}"
    )
    return True


def save_image_with_version(image, project_id: str, page_id: str, file_service, 
                            page_obj=None, image_format: str = 'PNG') -> tuple[str, int]:
    """
    保存图片并创建历史版本记录的公共函数
    
    Args:
        image: PIL Image 对象
        project_id: 项目ID
        page_id: 页面ID
        file_service: FileService 实例
        page_obj: Page 对象（可选，如果提供则更新页面状态）
        image_format: 图片格式，默认 PNG
    
    Returns:
        tuple: (image_path, version_number) - 图片路径和版本号
    
    这个函数会：
    1. 计算下一个版本号（使用 MAX 查询确保安全）
    2. 标记所有旧版本为非当前版本
    3. 保存图片到最终位置
    4. 创建新版本记录
    5. 如果提供了 page_obj，更新页面状态和图片路径
    """
    # 使用 MAX 查询确保版本号安全（即使有版本被删除也不会重复）
    max_version = db.session.query(func.max(PageImageVersion.version_number)).filter_by(page_id=page_id).scalar() or 0
    next_version = max_version + 1
    
    # 批量更新：标记所有旧版本为非当前版本（使用单条 SQL 更高效）
    PageImageVersion.query.filter_by(page_id=page_id).update({'is_current': False})
    
    # 保存图片到最终位置（使用版本号）
    image_path = file_service.save_generated_image(
        image, project_id, page_id,
        version_number=next_version,
        image_format=image_format
    )
    
    # 创建新版本记录
    new_version = PageImageVersion(
        page_id=page_id,
        image_path=image_path,
        version_number=next_version,
        is_current=True
    )
    db.session.add(new_version)
    
    # 如果提供了 page_obj，更新页面状态和图片路径
    if page_obj:
        page_obj.generated_image_path = image_path
        page_obj.status = 'COMPLETED'
        page_obj.updated_at = datetime.utcnow()
    
    # 提交事务
    db.session.commit()
    
    logger.debug(f"Page {page_id} image saved as version {next_version}: {image_path}")
    
    return image_path, next_version


def generate_descriptions_task(task_id: str, project_id: str, ai_service,
                               project_context, outline: List[Dict],
                               max_workers: int = 5, app=None,
                               language: str = None,
                               render_mode: str = 'image',
                               generation_mode: str = 'fast'):
    """
    Background task for generating page descriptions
    Based on demo.py gen_desc() with parallel processing

    Note: app instance MUST be passed from the request context

    Args:
        task_id: Task ID
        project_id: Project ID
        ai_service: AI service instance
        project_context: ProjectContext object containing all project information
        outline: Complete outline structure
        max_workers: Maximum number of parallel workers
        app: Flask app instance
        language: Output language (zh, en, ja, auto)
        render_mode: Rendering mode ('image' | 'html'). In HTML mode, generates
                     structured JSON for html_model instead of free-text descriptions.
        generation_mode: HTML generation mode ('fast' | 'strict'). Ignored in image mode.
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    # 在整个任务中保持应用上下文
    with app.app_context():
        try:
            # 重要：在后台线程开始时就获取task和设置状态
            task = Task.query.get(task_id)
            if not task:
                logger.error(f"Task {task_id} not found")
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            logger.info(f"Task {task_id} status updated to PROCESSING")
            
            # Get all pages for this project (already in correct order from DB)
            pages = Page.query.filter_by(project_id=project_id).order_by(Page.numeric_order()).all()
            
            # Build pages_data directly from DB pages instead of re-flattening outline
            # Re-flattening can reorder pages via _ensure_page_ordering, causing mismatch
            pages_data = []
            for p in pages:
                oc = p.get_outline_content() or {}
                pd = oc.copy()
                if p.layout_id:
                    pd['layout_id'] = p.layout_id
                if p.part:
                    pd['part'] = p.part
                pages_data.append(pd)
            
            if not pages_data:
                raise ValueError("No pages found for project")
            
            # Initialize progress
            task.set_progress({
                "total": len(pages),
                "completed": 0,
                "failed": 0
            })
            db.session.commit()
            
            # Generate descriptions
            completed = 0
            failed = 0
            description_batch_size = _safe_positive_int(
                app.config.get('DESCRIPTION_BATCH_SIZE', 1),
                1
            )

            html_outline_context: Dict[str, Any] = {}
            narrative_tracker: Optional[NarrativeRuntimeTracker] = None
            html_jobs: List[Dict[str, Any]] = []

            if render_mode == 'html':
                raw_outline_context = {
                    'title': project_context.idea_prompt or '',
                    'pages': []
                }
                for i, (page_obj, page_data) in enumerate(zip(pages, pages_data), 1):
                    layout_id = page_obj.layout_id or page_data.get('layout_id', 'title_content')
                    raw_outline_context['pages'].append({
                        'page_id': f'p{i:02d}',
                        'title': page_data.get('title', ''),
                        'layout_id': layout_id,
                        'has_image': bool(page_data.get('has_image', False)),
                        'keywords': page_data.get('keywords', page_data.get('points', [])[:3]),
                        'points': page_data.get('points', []),
                        'depends_on': page_data.get('depends_on', []),
                        'must_cover': page_data.get('must_cover', []),
                        'promises_open': page_data.get('promises_open', []),
                        'promises_close': page_data.get('promises_close', []),
                        'required_close_promise_ids': page_data.get('required_close_promise_ids', page_data.get('promises_close', [])),
                    })

                html_outline_context = enrich_outline_with_narrative_contract(raw_outline_context)
                normalized_pages = html_outline_context.get('pages') if isinstance(html_outline_context.get('pages'), list) else []
                narrative_tracker = NarrativeRuntimeTracker(html_outline_context)

                for i, (page_obj, page_data) in enumerate(zip(pages, pages_data), 1):
                    normalized_outline = normalized_pages[i - 1] if i - 1 < len(normalized_pages) else {
                        'page_id': f'p{i:02d}',
                        'title': page_data.get('title', ''),
                        'layout_id': page_obj.layout_id or page_data.get('layout_id', 'title_content'),
                        'has_image': bool(page_data.get('has_image', False)),
                        'keywords': page_data.get('keywords', page_data.get('points', [])[:3]),
                    }
                    html_jobs.append({
                        'db_page_id': page_obj.id,
                        'logical_page_id': normalized_outline.get('page_id', f'p{i:02d}'),
                        'page_index': i,
                        'layout_id': page_obj.layout_id or normalized_outline.get('layout_id', 'title_content'),
                        'page_outline': normalized_outline
                    })

                    # Persist enriched outline contract for downstream audit/debug.
                    persisted_outline = page_obj.get_outline_content()
                    if not isinstance(persisted_outline, dict):
                        persisted_outline = {}
                    merged_outline = copy.deepcopy(persisted_outline)
                    merged_outline.update({
                        'logical_page_id': normalized_outline.get('page_id', f'p{i:02d}'),
                        'has_image': bool(normalized_outline.get('has_image', False)),
                        'keywords': normalized_outline.get('keywords', []),
                        'depends_on': normalized_outline.get('depends_on', []),
                        'must_cover': normalized_outline.get('must_cover', []),
                        'promises_open': normalized_outline.get('promises_open', []),
                        'promises_close': normalized_outline.get('promises_close', []),
                        'required_close_promise_ids': normalized_outline.get(
                            'required_close_promise_ids',
                            normalized_outline.get('promises_close', [])
                        ),
                    })
                    page_obj.set_outline_content(merged_outline)

                db.session.commit()

            def generate_single_desc(page_id,
                                     page_outline,
                                     page_index,
                                     page_layout_id=None,
                                     logical_page_id=None,
                                     continuity_context=None,
                                     rewrite_instruction: str = "",
                                     thinking_budget: int = 320):
                """
                Generate description for a single page.
                In HTML mode this returns structured html_model; in image mode free-text description.
                """
                with app.app_context():
                    try:
                        from services.ai_service_manager import get_ai_service
                        ai_service = get_ai_service()

                        if render_mode == 'html':
                            layout_id = page_layout_id or page_outline.get('layout_id', 'title_content')
                            structured_page_outline = {
                                'page_id': logical_page_id or page_outline.get('page_id', f'p{page_index:02d}'),
                                'title': page_outline.get('title', ''),
                                'layout_id': layout_id,
                                'has_image': bool(page_outline.get('has_image', False)),
                                'keywords': page_outline.get('keywords', page_outline.get('points', [])[:3]),
                                'depends_on': page_outline.get('depends_on', []),
                                'must_cover': page_outline.get('must_cover', []),
                                'promises_open': page_outline.get('promises_open', []),
                                'promises_close': page_outline.get('promises_close', []),
                                'required_close_promise_ids': page_outline.get('required_close_promise_ids', page_outline.get('promises_close', [])),
                            }
                            if 'section_number' in page_outline:
                                structured_page_outline['section_number'] = page_outline.get('section_number')
                            if 'subtitle' in page_outline:
                                structured_page_outline['subtitle'] = page_outline.get('subtitle')

                            layout_is_toc = 'toc' in str(layout_id).lower()
                            full_outline_for_prompt = html_outline_context if layout_is_toc else None
                            generation_result = ai_service.generate_structured_page_content(
                                page_outline=structured_page_outline,
                                full_outline=full_outline_for_prompt,
                                language=language,
                                scheme_id=project_context.scheme_id or 'edu_dark',
                                continuity_context=continuity_context,
                                rewrite_instruction=rewrite_instruction,
                                thinking_budget=thinking_budget,
                                return_metadata=True
                            )
                            model = generation_result.get('model') if isinstance(generation_result, dict) else {}
                            closed_promise_ids = generation_result.get('closed_promise_ids') if isinstance(generation_result, dict) else []
                            required_ids = []
                            if isinstance(continuity_context, dict):
                                required_ids = continuity_context.get('required_close_promise_ids', []) or []
                            missing_required = [
                                pid for pid in required_ids
                                if pid not in (closed_promise_ids if isinstance(closed_promise_ids, list) else [])
                            ]

                            return (
                                page_id,
                                {
                                    'html_model': model,
                                    'closed_promise_ids': closed_promise_ids if isinstance(closed_promise_ids, list) else [],
                                    'missing_required_close_promise_ids': missing_required,
                                    'layout_id': layout_id,
                                    'logical_page_id': structured_page_outline.get('page_id'),
                                    'title': structured_page_outline.get('title', '')
                                },
                                None
                            )

                        desc_text = ai_service.generate_page_description(
                            project_context, outline, page_outline, page_index,
                            language=language
                        )
                        desc_content = {
                            "text": desc_text,
                            "generated_at": datetime.utcnow().isoformat()
                        }
                        return (page_id, {'description_content': desc_content}, None)
                    except Exception as e:
                        import traceback
                        error_detail = traceback.format_exc()
                        logger.error(f"Failed to generate description for page {page_id}: {error_detail}")
                        return (page_id, None, str(e))

            def update_page_result(page_id, result_data, error, count_stats: bool = True):
                nonlocal completed, failed
                page = Page.query.get(page_id)
                if not page:
                    if count_stats:
                        failed += 1
                    return

                if error:
                    page.status = 'FAILED'
                    if count_stats:
                        failed += 1
                    return

                if render_mode == 'html':
                    page.set_html_model(result_data.get('html_model'))
                    continuity_meta = {
                        'closed_promise_ids': (
                            result_data.get('closed_promise_ids')
                            if isinstance(result_data.get('closed_promise_ids'), list)
                            else []
                        ),
                        'missing_required_close_promise_ids': (
                            result_data.get('missing_required_close_promise_ids')
                            if isinstance(result_data.get('missing_required_close_promise_ids'), list)
                            else []
                        ),
                    }
                    page.set_description_content({
                        'continuity': continuity_meta,
                        'generated_at': datetime.utcnow().isoformat(),
                    })
                    if result_data.get('layout_id'):
                        page.layout_id = result_data.get('layout_id')
                    page.status = 'HTML_MODEL_GENERATED'
                else:
                    page.set_description_content(result_data.get('description_content'))
                    page.status = 'DESCRIPTION_GENERATED'

                if count_stats:
                    completed += 1

            if render_mode == 'html':
                html_mode = str(generation_mode or app.config.get('HTML_CONTINUITY_MODE', 'fast')).strip().lower()
                strict_mode = html_mode == 'strict'
                html_batch_size = max(1, min(3, _safe_positive_int(app.config.get('HTML_DESCRIPTION_BATCH_SIZE', 3), 3)))
                chapter_parallelism = _safe_positive_int(app.config.get('HTML_CHAPTER_PARALLELISM', 3), 3)
                first_pass_budget = _safe_positive_int(app.config.get('HTML_FIRST_PASS_THINKING_BUDGET', 280), 280)
                rewrite_budget = _safe_positive_int(app.config.get('HTML_REWRITE_THINKING_BUDGET', 850), 850)
                rewrite_timeout_seconds = _safe_positive_int(
                    app.config.get('HTML_REWRITE_TIMEOUT_SECONDS', 210),
                    210
                )

                html_job_by_logical_id = {job['logical_page_id']: job for job in html_jobs}
                chapters = split_outline_into_chapters(html_outline_context)
                chapter_jobs: List[List[Dict[str, Any]]] = []
                for chapter in chapters:
                    jobs = [html_job_by_logical_id[pid] for pid in chapter if pid in html_job_by_logical_id]
                    if jobs:
                        chapter_jobs.append(jobs)
                if not chapter_jobs:
                    chapter_jobs = [html_jobs]

                logger.info(
                    "HTML mode pipeline: mode=%s pages=%s chapters=%s chapter_parallelism=%s batch_size=%s",
                    html_mode,
                    len(html_jobs),
                    len(chapter_jobs),
                    chapter_parallelism,
                    html_batch_size,
                )

                def generate_chapter(chapter_job_items: List[Dict[str, Any]]):
                    with app.app_context():
                        from services.ai_service_manager import get_ai_service
                        chapter_ai_service = get_ai_service()

                    local_results: List[Any] = []
                    local_tracker = NarrativeRuntimeTracker(html_outline_context)

                    for batch_items in _chunked(chapter_job_items, html_batch_size):
                        batch_requests = []
                        required_by_page: Dict[str, List[str]] = {}
                        for job in batch_items:
                            continuity_context = local_tracker.build_context_for_page(job['logical_page_id'])
                            required_by_page[job['logical_page_id']] = continuity_context.get('required_close_promise_ids', []) if isinstance(continuity_context, dict) else []
                            batch_requests.append({
                                'page_outline': job['page_outline'],
                                'continuity_context': continuity_context,
                                'rewrite_instruction': ''
                            })

                        batch_output: Dict[str, Dict[str, Any]] = {}
                        try:
                            batch_output = chapter_ai_service.generate_structured_page_content_batch(
                                batch_requests=batch_requests,
                                language=language,
                                scheme_id=project_context.scheme_id or 'edu_dark',
                                thinking_budget=first_pass_budget
                            )
                        except Exception as batch_err:
                            logger.warning(
                                "HTML chapter batch generation failed (size=%s), fallback single-page: %s",
                                len(batch_items),
                                batch_err
                            )

                        for job in batch_items:
                            logical_page_id = job['logical_page_id']
                            batch_row = batch_output.get(logical_page_id) if isinstance(batch_output, dict) else None
                            if isinstance(batch_row, dict) and isinstance(batch_row.get('model'), dict):
                                closed_ids = batch_row.get('closed_promise_ids') if isinstance(batch_row.get('closed_promise_ids'), list) else []
                                row_result = {
                                    'html_model': batch_row.get('model') or {},
                                    'closed_promise_ids': closed_ids,
                                    'missing_required_close_promise_ids': [
                                        pid for pid in required_by_page.get(logical_page_id, [])
                                        if pid not in closed_ids
                                    ],
                                    'layout_id': job.get('layout_id'),
                                    'logical_page_id': logical_page_id,
                                    'title': job.get('page_outline', {}).get('title', '')
                                }
                                local_results.append((job['db_page_id'], row_result, None))
                                try:
                                    local_tracker.apply_generated_page(
                                        page_id=logical_page_id,
                                        layout_id=row_result.get('layout_id', job.get('layout_id')),
                                        title=row_result.get('title', ''),
                                        model=row_result.get('html_model') or {},
                                        closed_promise_ids=row_result.get('closed_promise_ids') if isinstance(row_result.get('closed_promise_ids'), list) else []
                                    )
                                except Exception as tracker_err:
                                    logger.warning(f"章节局部追踪失败（页 {logical_page_id}）: {tracker_err}")
                                continue

                            continuity_context = local_tracker.build_context_for_page(logical_page_id)
                            page_id, result_data, error = generate_single_desc(
                                page_id=job['db_page_id'],
                                page_outline=job['page_outline'],
                                page_index=job['page_index'],
                                page_layout_id=job['layout_id'],
                                logical_page_id=logical_page_id,
                                continuity_context=continuity_context,
                                thinking_budget=first_pass_budget
                            )
                            local_results.append((page_id, result_data, error))
                            if not error and result_data:
                                try:
                                    local_tracker.apply_generated_page(
                                        page_id=result_data.get('logical_page_id', logical_page_id),
                                        layout_id=result_data.get('layout_id', job['layout_id']),
                                        title=result_data.get('title', job['page_outline'].get('title', '')),
                                        model=result_data.get('html_model') or {},
                                        closed_promise_ids=result_data.get('closed_promise_ids') if isinstance(result_data.get('closed_promise_ids'), list) else []
                                    )
                                except Exception as tracker_err:
                                    logger.warning(f"章节单页追踪失败（页 {logical_page_id}）: {tracker_err}")
                    return local_results

                worker_count = max(1, min(max_workers, chapter_parallelism, len(chapter_jobs)))
                first_pass_map: Dict[str, Any] = {}
                with ThreadPoolExecutor(max_workers=worker_count) as executor:
                    futures = [executor.submit(generate_chapter, items) for items in chapter_jobs]
                    for future in as_completed(futures):
                        chapter_results = future.result()
                        for page_id, result_data, error in chapter_results:
                            first_pass_map[str(page_id)] = (result_data, error)

                for job in html_jobs:
                    page_id = str(job['db_page_id'])
                    result_data, error = first_pass_map.get(page_id, (None, "页面生成结果缺失"))

                    db.session.expire_all()
                    update_page_result(page_id, result_data, error)
                    db.session.commit()

                    if not error and result_data and narrative_tracker:
                        missing_required = result_data.get('missing_required_close_promise_ids', [])
                        if missing_required:
                            logger.warning(
                                "页面 %s 首轮未关闭 required_close_promise_ids: %s",
                                job['logical_page_id'],
                                missing_required
                            )
                        try:
                            narrative_tracker.apply_generated_page(
                                page_id=result_data.get('logical_page_id', job['logical_page_id']),
                                layout_id=result_data.get('layout_id', job['layout_id']),
                                title=result_data.get('title', job['page_outline'].get('title', '')),
                                model=result_data.get('html_model') or {},
                                closed_promise_ids=result_data.get('closed_promise_ids') if isinstance(result_data.get('closed_promise_ids'), list) else []
                            )
                        except Exception as tracker_err:
                            logger.warning(f"更新叙事追踪器失败（页 {job['logical_page_id']}）: {tracker_err}")

                    task = Task.query.get(task_id)
                    if task:
                        page_title = str(job.get('page_outline', {}).get('title', ''))
                        prog = task.get_progress()
                        prog['completed'] = completed
                        prog['failed'] = failed
                        prog['current_page'] = page_title
                        prog['stage'] = 'generating'
                        task.set_progress(prog)
                        db.session.commit()
                        logger.info(
                            f"Description Progress: {completed}/{len(pages)} pages completed "
                            f"(failed={failed})"
                        )

                # First pass finished: deterministic review first.
                if narrative_tracker and completed > 0:
                    deterministic_report = narrative_tracker.quality_report()
                    deterministic_issues = deterministic_report.get('issues', []) if isinstance(deterministic_report, dict) else []
                    pre_unresolved = deterministic_report.get('unresolved_promises', []) if isinstance(deterministic_report, dict) else []
                    pre_unresolved_ids = [
                        str(item.get('promise_id'))
                        for item in pre_unresolved
                        if isinstance(item, dict) and item.get('promise_id')
                    ]
                    pre_unresolved_text = {
                        str(item.get('promise_id')): str(item.get('text', ''))
                        for item in pre_unresolved
                        if isinstance(item, dict) and item.get('promise_id')
                    }
                    logger.info(
                        "HTML continuity report before rewrite: unresolved=%s ids=%s",
                        len(pre_unresolved_ids),
                        pre_unresolved_ids
                    )
                    if pre_unresolved_ids:
                        logger.info(
                            "HTML unresolved promise topics before rewrite: %s",
                            [pre_unresolved_text.get(pid, '') for pid in pre_unresolved_ids]
                        )

                    rewrite_tasks: List[Dict[str, Any]] = []
                    if strict_mode:
                        semantic_review = ai_service.review_structured_document_continuity(
                            outline_doc=html_outline_context,
                            generated_pages=narrative_tracker.generated_pages_in_order(),
                            deterministic_issues=deterministic_issues,
                            language=language or app.config.get('OUTPUT_LANGUAGE', 'zh')
                        )
                        rewrite_tasks = ai_service._plan_rewrites_from_reports(
                            deterministic_issues=deterministic_issues,
                            semantic_review=semantic_review,
                            max_pages=4
                        )

                    if rewrite_tasks:
                        logger.info(f"HTML continuity review requested targeted rewrites: {len(rewrite_tasks)}")

                        rewrite_items = []
                        for rewrite_task in rewrite_tasks:
                            logical_page_id = rewrite_task.get('page_id')
                            job = html_job_by_logical_id.get(logical_page_id)
                            if not job:
                                continue
                            continuity_context = narrative_tracker.build_context_for_page(logical_page_id)
                            rewrite_instruction = (
                                f"{str(rewrite_task.get('reason') or '').strip()}。"
                                f"{str(rewrite_task.get('instruction') or '').strip()}"
                            ).strip('。')
                            if rewrite_instruction:
                                rewrite_instruction += "。"
                            rewrite_items.append((job, continuity_context, rewrite_instruction))

                        # Parallel rewrite (was sequential before)
                        rewrite_worker_count = max(1, min(len(rewrite_items), chapter_parallelism))
                        with ThreadPoolExecutor(max_workers=rewrite_worker_count) as rewrite_pool:
                            rewrite_futures = {}
                            for job, ctx, instr in rewrite_items:
                                fut = rewrite_pool.submit(
                                    generate_single_desc,
                                    page_id=job['db_page_id'],
                                    page_outline=job['page_outline'],
                                    page_index=job['page_index'],
                                    page_layout_id=job['layout_id'],
                                    logical_page_id=job['logical_page_id'],
                                    continuity_context=ctx,
                                    rewrite_instruction=instr,
                                    thinking_budget=rewrite_budget
                                )
                                rewrite_futures[fut] = job['logical_page_id']

                            for fut in as_completed(rewrite_futures, timeout=rewrite_timeout_seconds):
                                logical_pid = rewrite_futures[fut]
                                try:
                                    page_id, rewrite_data, rewrite_error = fut.result(timeout=10)
                                except (FutureTimeoutError, Exception) as e:
                                    logger.warning("页面 %s 重写失败: %s", logical_pid, e)
                                    continue
                                if rewrite_error or not rewrite_data:
                                    logger.warning(f"页面 {logical_pid} 重写失败，保留首轮结果: {rewrite_error}")
                                    continue
                                db.session.expire_all()
                                update_page_result(page_id, rewrite_data, None, count_stats=False)
                                db.session.commit()

                            try:
                                narrative_tracker.apply_generated_page(
                                    page_id=rewrite_data.get('logical_page_id', logical_page_id),
                                    layout_id=rewrite_data.get('layout_id', job['layout_id']),
                                    title=rewrite_data.get('title', job['page_outline'].get('title', '')),
                                    model=rewrite_data.get('html_model') or {},
                                    closed_promise_ids=rewrite_data.get('closed_promise_ids') if isinstance(rewrite_data.get('closed_promise_ids'), list) else []
                                )
                            except Exception as tracker_err:
                                logger.warning(f"重写后更新追踪器失败（页 {logical_page_id}）: {tracker_err}")

                    mid_report = narrative_tracker.quality_report()
                    mid_unresolved = mid_report.get('unresolved_promises', []) if isinstance(mid_report, dict) else []
                    mid_unresolved_ids = [
                        str(item.get('promise_id'))
                        for item in mid_unresolved
                        if isinstance(item, dict) and item.get('promise_id')
                    ]

                    # Final deterministic fallback: inject closure blocks to guarantee no promise leak.
                    fallback_result = inject_unresolved_promise_closure_blocks(
                        outline_doc=html_outline_context,
                        generated_pages=narrative_tracker.generated_pages_in_order(),
                        max_lines_per_page=2
                    )
                    patched_pages = fallback_result.get('generated_pages', []) if isinstance(fallback_result, dict) else []
                    patched_outline = fallback_result.get('outline') if isinstance(fallback_result, dict) else None
                    fallback_applied = fallback_result.get('applied', []) if isinstance(fallback_result, dict) else []

                    if isinstance(patched_outline, dict):
                        html_outline_context = patched_outline
                    if patched_pages:
                        for entry in patched_pages:
                            if not isinstance(entry, dict):
                                continue
                            logical_page_id = str(entry.get('page_id') or '')
                            job = html_job_by_logical_id.get(logical_page_id)
                            if not job:
                                continue
                            db.session.expire_all()
                            update_page_result(
                                job['db_page_id'],
                                {
                                    'html_model': entry.get('model') if isinstance(entry.get('model'), dict) else {},
                                    'layout_id': entry.get('layout_id', job.get('layout_id')),
                                    'logical_page_id': logical_page_id,
                                    'title': entry.get('title', job.get('page_outline', {}).get('title', '')),
                                    'closed_promise_ids': entry.get('closed_promise_ids') if isinstance(entry.get('closed_promise_ids'), list) else []
                                },
                                None,
                                count_stats=False
                            )
                        db.session.commit()

                        narrative_tracker = NarrativeRuntimeTracker(html_outline_context)
                        for entry in patched_pages:
                            if not isinstance(entry, dict):
                                continue
                            narrative_tracker.apply_generated_page(
                                page_id=entry.get('page_id'),
                                layout_id=entry.get('layout_id'),
                                title=entry.get('title', ''),
                                model=entry.get('model') if isinstance(entry.get('model'), dict) else {},
                                closed_promise_ids=entry.get('closed_promise_ids') if isinstance(entry.get('closed_promise_ids'), list) else []
                            )

                    post_report = narrative_tracker.quality_report()
                    post_unresolved = post_report.get('unresolved_promises', []) if isinstance(post_report, dict) else []
                    post_unresolved_ids = [
                        str(item.get('promise_id'))
                        for item in post_unresolved
                        if isinstance(item, dict) and item.get('promise_id')
                    ]
                    post_unresolved_text = {
                        str(item.get('promise_id')): str(item.get('text', ''))
                        for item in post_unresolved
                        if isinstance(item, dict) and item.get('promise_id')
                    }
                    resolved_ids = [pid for pid in pre_unresolved_ids if pid not in set(post_unresolved_ids)]
                    newly_unresolved = [pid for pid in post_unresolved_ids if pid not in set(pre_unresolved_ids)]

                    logger.info(
                        "HTML continuity diff after rewrite/fallback: before=%s mid=%s after=%s resolved=%s newly_unresolved=%s fallback_applied=%s",
                        len(pre_unresolved_ids),
                        len(mid_unresolved_ids),
                        len(post_unresolved_ids),
                        resolved_ids,
                        newly_unresolved,
                        len(fallback_applied)
                    )
                    if post_unresolved_ids:
                        logger.info(
                            "HTML unresolved promise topics after fallback: %s",
                            [post_unresolved_text.get(pid, '') for pid in post_unresolved_ids]
                        )
                    if post_unresolved_ids:
                        logger.warning(f"兜底后仍有 {len(post_unresolved_ids)} 个承诺未关闭")

            # Image mode optimization: batch multiple pages per model call to reduce API round trips.
            elif description_batch_size > 1:
                page_jobs = [
                    (page.id, page_data, i, page.layout_id)
                    for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)
                ]
                batches = _chunked(page_jobs, description_batch_size)
                worker_count = max(1, min(max_workers, len(batches)))
                logger.info(
                    f"Description batch mode enabled: pages={len(page_jobs)}, "
                    f"batch_size={description_batch_size}, workers={worker_count}, batches={len(batches)}"
                )

                def generate_desc_batch(batch_items):
                    with app.app_context():
                        from services.ai_service_manager import get_ai_service
                        ai_service = get_ai_service()

                        batch_payload = [
                            {'page_index': idx, 'page_outline': page_outline}
                            for _, page_outline, idx, _ in batch_items
                        ]
                        batch_desc_map = {}
                        try:
                            batch_desc_map = ai_service.generate_page_descriptions_batch(
                                project_context=project_context,
                                outline=outline,
                                batch_pages=batch_payload,
                                language=language
                            )
                        except Exception as batch_err:
                            logger.warning(
                                f"Batch description generation failed for {len(batch_items)} pages, "
                                f"fallback to single-page mode. Error: {batch_err}"
                            )

                        results = []
                        for page_id, page_outline, idx, page_layout_id in batch_items:
                            desc_text = batch_desc_map.get(idx)
                            if isinstance(desc_text, str) and desc_text.strip():
                                desc_content = {
                                    "text": desc_text,
                                    "generated_at": datetime.utcnow().isoformat()
                                }
                                results.append((page_id, {'description_content': desc_content}, None))
                                continue

                            results.append(generate_single_desc(page_id, page_outline, idx, page_layout_id))
                        return results

                with ThreadPoolExecutor(max_workers=worker_count) as executor:
                    futures = [executor.submit(generate_desc_batch, batch_items) for batch_items in batches]

                    for future in as_completed(futures):
                        batch_results = future.result()
                        db.session.expire_all()

                        for page_id, result_data, error in batch_results:
                            update_page_result(page_id, result_data, error)

                        db.session.commit()

                        task = Task.query.get(task_id)
                        if task:
                            task.update_progress(completed=completed, failed=failed)
                            db.session.commit()
                            logger.info(
                                f"Description Progress: {completed}/{len(pages)} pages completed "
                                f"(failed={failed})"
                            )
            else:
                # Image mode single-page parallel generation.
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    futures = [
                        executor.submit(generate_single_desc, page.id, page_data, i, page.layout_id)
                        for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)
                    ]

                    for future in as_completed(futures):
                        page_id, result_data, error = future.result()

                        db.session.expire_all()
                        update_page_result(page_id, result_data, error)
                        db.session.commit()

                        task = Task.query.get(task_id)
                        if task:
                            task.update_progress(completed=completed, failed=failed)
                            db.session.commit()
                            logger.info(
                                f"Description Progress: {completed}/{len(pages)} pages completed "
                                f"(failed={failed})"
                            )
            
            # Mark task as completed
            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED'
                task.completed_at = datetime.now()
                db.session.commit()
                logger.info(f"Task {task_id} COMPLETED - {completed} pages generated, {failed} failed")
            
            # Update project status
            from models import Project
            project = Project.query.get(project_id)
            if project and failed == 0:
                project.status = 'DESCRIPTIONS_GENERATED'
                db.session.commit()
                logger.info(f"Project {project_id} status updated to DESCRIPTIONS_GENERATED")
        
        except Exception as e:
            # Mark task as failed
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Task {task_id} FAILED with exception: {error_detail}")
            
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.now()
                db.session.commit()


def generate_images_task(task_id: str, project_id: str, ai_service, file_service,
                        outline: List[Dict], use_template: bool = True, 
                        max_workers: int = 8, aspect_ratio: str = "16:9",
                        resolution: str = "2K", app=None,
                        extra_requirements: str = None,
                        language: str = None,
                        page_ids: list = None):
    """
    Background task for generating page images
    Based on demo.py gen_images_parallel()
    
    Note: app instance MUST be passed from the request context
    
    Args:
        language: Output language (zh, en, ja, auto)
        page_ids: Optional list of page IDs to generate (if not provided, generates all pages)
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        try:
            # Update task status to PROCESSING
            task = Task.query.get(task_id)
            if not task:
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            
            # Get pages for this project (filtered by page_ids if provided)
            pages = get_filtered_pages(project_id, page_ids)
            pages_data = ai_service.flatten_outline(outline)
            
            # 注意：不在任务开始时获取模板路径，而是在每个子线程中动态获取
            # 这样可以确保即使用户在上传新模板后立即生成，也能使用最新模板
            
            # Initialize progress
            task.set_progress({
                "total": len(pages),
                "completed": 0,
                "failed": 0
            })
            db.session.commit()
            
            # Generate images in parallel
            completed = 0
            failed = 0
            
            def generate_single_image(page_id, page_data, page_index):
                """
                Generate image for a single page
                注意：只传递 page_id（字符串），不传递 ORM 对象，避免跨线程会话问题
                """
                # 关键修复：在子线程中也需要应用上下文
                with app.app_context():
                    try:
                        logger.debug(f"Starting image generation for page {page_id}, index {page_index}")
                        # Get page from database in this thread
                        page_obj = Page.query.get(page_id)
                        if not page_obj:
                            raise ValueError(f"Page {page_id} not found")
                        
                        # Update page status
                        page_obj.status = 'GENERATING'
                        db.session.commit()
                        logger.debug(f"Page {page_id} status updated to GENERATING")
                        
                        # Get description content
                        desc_content = page_obj.get_description_content()
                        if not desc_content:
                            raise ValueError("No description content for page")
                        
                        # 获取描述文本（可能是 text 字段或 text_content 数组）
                        desc_text = desc_content.get('text', '')
                        if not desc_text and desc_content.get('text_content'):
                            # 如果 text 字段不存在，尝试从 text_content 数组获取
                            text_content = desc_content.get('text_content', [])
                            if isinstance(text_content, list):
                                desc_text = '\n'.join(text_content)
                            else:
                                desc_text = str(text_content)
                        
                        logger.debug(f"Got description text for page {page_id}: {desc_text[:100]}...")
                        
                        # 从当前页面的描述内容中提取图片 URL
                        page_additional_ref_images = []
                        has_material_images = False
                        
                        # 从描述文本中提取图片
                        if desc_text:
                            image_urls = ai_service.extract_image_urls_from_markdown(desc_text)
                            if image_urls:
                                logger.info(f"Found {len(image_urls)} image(s) in page {page_id} description")
                                page_additional_ref_images = image_urls
                                has_material_images = True
                        
                        # 在子线程中动态获取模板路径，确保使用最新模板
                        page_ref_image_path = None
                        if use_template:
                            page_ref_image_path = file_service.get_template_path(project_id)
                            # 注意：如果有风格描述，即使没有模板图片也允许生成
                            # 这个检查已经在 controller 层完成，这里不再检查
                        
                        # Generate image prompt
                        prompt = ai_service.generate_image_prompt(
                            outline, page_data, desc_text, page_index,
                            has_material_images=has_material_images,
                            extra_requirements=extra_requirements,
                            language=language,
                            has_template=use_template
                        )
                        logger.debug(f"Generated image prompt for page {page_id}")
                        
                        # Generate image
                        logger.info(f"🎨 Calling AI service to generate image for page {page_index}/{len(pages)}...")
                        image = ai_service.generate_image(
                            prompt, page_ref_image_path, aspect_ratio, resolution,
                            additional_ref_images=page_additional_ref_images if page_additional_ref_images else None
                        )
                        logger.info(f"✅ Image generated successfully for page {page_index}")
                        
                        if not image:
                            raise ValueError("Failed to generate image")
                        
                        # 优化：直接在子线程中计算版本号并保存到最终位置
                        # 每个页面独立，使用数据库事务保证版本号原子性，避免临时文件
                        image_path, next_version = save_image_with_version(
                            image, project_id, page_id, file_service, page_obj=page_obj
                        )
                        
                        return (page_id, image_path, None)
                        
                    except Exception as e:
                        import traceback
                        error_detail = traceback.format_exc()
                        logger.error(f"Failed to generate image for page {page_id}: {error_detail}")
                        return (page_id, None, str(e))
            
            # Use ThreadPoolExecutor for parallel generation
            # 关键：提前提取 page.id，不要传递 ORM 对象到子线程
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(generate_single_image, page.id, page_data, i)
                    for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)
                ]
                
                # Process results as they complete
                for future in as_completed(futures):
                    page_id, image_path, error = future.result()
                    
                    db.session.expire_all()
                    
                    # Update page in database (主要是为了更新失败状态)
                    page = Page.query.get(page_id)
                    if page:
                        if error:
                            page.status = 'FAILED'
                            failed += 1
                            db.session.commit()
                        else:
                            # 图片已在子线程中保存并创建版本记录，这里只需要更新计数
                            completed += 1
                            # 刷新页面对象以获取最新状态
                            db.session.refresh(page)
                    
                    # Update task progress
                    task = Task.query.get(task_id)
                    if task:
                        task.update_progress(completed=completed, failed=failed)
                        db.session.commit()
                        logger.info(f"Image Progress: {completed}/{len(pages)} pages completed")
            
            # Mark task as completed
            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED'
                task.completed_at = datetime.now()
                db.session.commit()
                logger.info(f"Task {task_id} COMPLETED - {completed} images generated, {failed} failed")
            
            # Update project status
            from models import Project
            project = Project.query.get(project_id)
            if project and failed == 0:
                project.status = 'COMPLETED'
                db.session.commit()
                logger.info(f"Project {project_id} status updated to COMPLETED")
        
        except Exception as e:
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.now()
                db.session.commit()


def generate_single_page_image_task(task_id: str, project_id: str, page_id: str, 
                                    ai_service, file_service, outline: List[Dict],
                                    use_template: bool = True, aspect_ratio: str = "16:9",
                                    resolution: str = "2K", app=None,
                                    extra_requirements: str = None,
                                    language: str = None):
    """
    Background task for generating a single page image
    
    Note: app instance MUST be passed from the request context
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        try:
            # Update task status to PROCESSING
            task = Task.query.get(task_id)
            if not task:
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            
            # Get page from database
            page = Page.query.get(page_id)
            if not page or page.project_id != project_id:
                raise ValueError(f"Page {page_id} not found")
            
            # Update page status
            page.status = 'GENERATING'
            db.session.commit()
            
            # Get description content
            desc_content = page.get_description_content()
            if not desc_content:
                raise ValueError("No description content for page")
            
            # 获取描述文本（可能是 text 字段或 text_content 数组）
            desc_text = desc_content.get('text', '')
            if not desc_text and desc_content.get('text_content'):
                text_content = desc_content.get('text_content', [])
                if isinstance(text_content, list):
                    desc_text = '\n'.join(text_content)
                else:
                    desc_text = str(text_content)
            
            # 从描述文本中提取图片 URL
            additional_ref_images = []
            has_material_images = False
            
            if desc_text:
                image_urls = ai_service.extract_image_urls_from_markdown(desc_text)
                if image_urls:
                    logger.info(f"Found {len(image_urls)} image(s) in page {page_id} description")
                    additional_ref_images = image_urls
                    has_material_images = True
            
            # Get template path if use_template
            ref_image_path = None
            if use_template:
                ref_image_path = file_service.get_template_path(project_id)
                # 注意：如果有风格描述，即使没有模板图片也允许生成
                # 这个检查已经在 controller 层完成，这里不再检查
            
            # Generate image prompt
            page_data = page.get_outline_content() or {}
            if page.part:
                page_data['part'] = page.part
            
            prompt = ai_service.generate_image_prompt(
                outline, page_data, desc_text, int(page.order_index) + 1,  # Ensure int type - DB column may be VARCHAR
                has_material_images=has_material_images,
                extra_requirements=extra_requirements,
                language=language,
                has_template=use_template
            )
            
            # Generate image
            logger.info(f"🎨 Generating image for page {page_id}...")
            image = ai_service.generate_image(
                prompt, ref_image_path, aspect_ratio, resolution,
                additional_ref_images=additional_ref_images if additional_ref_images else None
            )
            
            if not image:
                raise ValueError("Failed to generate image")
            
            # 保存图片并创建历史版本记录
            image_path, next_version = save_image_with_version(
                image, project_id, page_id, file_service, page_obj=page
            )
            
            # Mark task as completed
            task.status = 'COMPLETED'
            task.completed_at = datetime.utcnow()
            task.set_progress({
                "total": 1,
                "completed": 1,
                "failed": 0
            })
            db.session.commit()
            
            logger.info(f"✅ Task {task_id} COMPLETED - Page {page_id} image generated")
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Task {task_id} FAILED: {error_detail}")
            
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.now()
                db.session.commit()
            
            # Update page status
            page = Page.query.get(page_id)
            if page:
                page.status = 'FAILED'
                db.session.commit()


def edit_page_image_task(task_id: str, project_id: str, page_id: str,
                         edit_instruction: str, ai_service, file_service,
                         aspect_ratio: str = "16:9", resolution: str = "2K",
                         original_description: str = None,
                         additional_ref_images: List[str] = None,
                         temp_dir: str = None, app=None):
    """
    Background task for editing a page image
    
    Note: app instance MUST be passed from the request context
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        try:
            # Update task status to PROCESSING
            task = Task.query.get(task_id)
            if not task:
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            
            # Get page from database
            page = Page.query.get(page_id)
            if not page or page.project_id != project_id:
                raise ValueError(f"Page {page_id} not found")
            
            if not page.generated_image_path:
                raise ValueError("Page must have generated image first")
            
            # Update page status
            page.status = 'GENERATING'
            db.session.commit()
            
            # Get current image path
            current_image_path = file_service.get_absolute_path(page.generated_image_path)
            
            # Edit image
            logger.info(f"🎨 Editing image for page {page_id}...")
            try:
                image = ai_service.edit_image(
                    edit_instruction,
                    current_image_path,
                    aspect_ratio,
                    resolution,
                    original_description=original_description,
                    additional_ref_images=additional_ref_images if additional_ref_images else None
                )
            finally:
                # Clean up temp directory if created
                if temp_dir:
                    import shutil
                    from pathlib import Path
                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir)
            
            if not image:
                raise ValueError("Failed to edit image")
            
            # 保存编辑后的图片并创建历史版本记录
            image_path, next_version = save_image_with_version(
                image, project_id, page_id, file_service, page_obj=page
            )
            
            # Mark task as completed
            task.status = 'COMPLETED'
            task.completed_at = datetime.utcnow()
            task.set_progress({
                "total": 1,
                "completed": 1,
                "failed": 0
            })
            db.session.commit()
            
            logger.info(f"✅ Task {task_id} COMPLETED - Page {page_id} image edited")
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Task {task_id} FAILED: {error_detail}")
            
            # Clean up temp directory on error
            if temp_dir:
                import shutil
                from pathlib import Path
                temp_path = Path(temp_dir)
                if temp_path.exists():
                    shutil.rmtree(temp_dir)
            
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.now()
                db.session.commit()
            
            # Update page status
            page = Page.query.get(page_id)
            if page:
                page.status = 'FAILED'
                db.session.commit()


def generate_material_image_task(task_id: str, project_id: str, prompt: str,
                                 ai_service, file_service,
                                 ref_image_path: str = None,
                                 additional_ref_images: List[str] = None,
                                 aspect_ratio: str = "16:9",
                                 resolution: str = "2K",
                                 temp_dir: str = None, app=None,
                                 user_id: str = None):
    """
    Background task for generating a material image
    复用核心的generate_image逻辑，但保存到Material表而不是Page表
    
    Note: app instance MUST be passed from the request context
    project_id can be None for global materials (but Task model requires a project_id,
    so we use a special value 'global' for task tracking)
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        try:
            # Update task status to PROCESSING
            task = Task.query.get(task_id)
            if not task:
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            
            # Generate image (复用核心逻辑)
            logger.info(f"🎨 Generating material image with prompt: {prompt[:100]}...")
            image = ai_service.generate_image(
                prompt=prompt,
                ref_image_path=ref_image_path,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                additional_ref_images=additional_ref_images or None,
            )
            
            if not image:
                raise ValueError("Failed to generate image")
            
            # 处理project_id：如果为'global'或None，转换为None
            actual_project_id = None if (project_id == 'global' or project_id is None) else project_id
            
            # Save generated material image
            relative_path = file_service.save_material_image(image, actual_project_id)
            relative = Path(relative_path)
            filename = relative.name
            
            # Construct frontend-accessible URL
            image_url = file_service.get_file_url(actual_project_id, 'materials', filename)
            
            # Save material info to database
            # 如果没有传入user_id，默认使用'1'
            material_user_id = user_id or '1'
            material = Material(
                project_id=actual_project_id,
                user_id=material_user_id,
                filename=filename,
                relative_path=relative_path,
                url=image_url
            )
            db.session.add(material)
            db.session.flush()
            
            # Mark task as completed
            task.status = 'COMPLETED'
            task.completed_at = datetime.now()
            task.set_progress({
                "total": 1,
                "completed": 1,
                "failed": 0,
                "material_id": material.id,
                "image_url": image_url
            })
            db.session.commit()
            
            logger.info(f"✅ Task {task_id} COMPLETED - Material {material.id} generated")
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Task {task_id} FAILED: {error_detail}")
            
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.now()
                db.session.commit()
        
        finally:
            # Clean up temp directory
            if temp_dir:
                import shutil
                temp_path = Path(temp_dir)
                if temp_path.exists():
                    shutil.rmtree(temp_dir, ignore_errors=True)


def export_editable_pptx_with_recursive_analysis_task(
    task_id: str, 
    project_id: str, 
    filename: str,
    file_service,
    page_ids: list = None,
    max_depth: int = 2,
    max_workers: int = 4,
    export_extractor_method: str = 'hybrid',
    export_inpaint_method: str = 'hybrid',
    app=None
):
    """
    使用递归图片可编辑化分析导出可编辑PPTX的后台任务
    
    这是新的架构方法，使用ImageEditabilityService进行递归版面分析。
    与旧方法的区别：
    - 不再假设图片是16:9
    - 支持任意尺寸和分辨率
    - 递归分析图片中的子图和图表
    - 更智能的坐标映射和元素提取
    - 不需要 ai_service（使用 ImageEditabilityService 和 MinerU）
    
    Args:
        task_id: 任务ID
        project_id: 项目ID
        filename: 输出文件名
        file_service: 文件服务实例
        page_ids: 可选的页面ID列表（如果提供，只导出这些页面）
        max_depth: 最大递归深度
        max_workers: 并发处理数
        export_extractor_method: 组件提取方法 ('mineru' 或 'hybrid')
        export_inpaint_method: 背景修复方法 ('generative', 'baidu', 'hybrid')
        app: Flask应用实例
    """
    logger.info(f"🚀 Task {task_id} started: export_editable_pptx_with_recursive_analysis (project={project_id}, depth={max_depth}, workers={max_workers}, extractor={export_extractor_method}, inpaint={export_inpaint_method})")
    
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        import os
        from datetime import datetime
        from PIL import Image
        from models import Project
        from services.export_service import ExportService
        
        logger.info(f"开始递归分析导出任务 {task_id} for project {project_id}")
        
        try:
            # Get project
            project = Project.query.get(project_id)
            if not project:
                raise ValueError(f'Project {project_id} not found')
            
            # Get pages (filtered by page_ids if provided)
            pages = get_filtered_pages(project_id, page_ids)
            if not pages:
                raise ValueError('No pages found for project')
            
            image_paths = []
            for page in pages:
                if page.generated_image_path:
                    img_path = file_service.get_absolute_path(page.generated_image_path)
                    if os.path.exists(img_path):
                        image_paths.append(img_path)
            
            if not image_paths:
                raise ValueError('No generated images found for project')
            
            logger.info(f"找到 {len(image_paths)} 张图片")
            
            # 初始化任务进度（包含消息日志）
            task = Task.query.get(task_id)
            task.set_progress({
                "total": 100,  # 使用百分比
                "completed": 0,
                "failed": 0,
                "current_step": "准备中...",
                "percent": 0,
                "messages": ["🚀 开始导出可编辑PPTX..."]  # 消息日志
            })
            db.session.commit()
            
            # 进度回调函数 - 更新数据库中的进度
            progress_messages = ["🚀 开始导出可编辑PPTX..."]
            max_messages = 10  # 最多保留最近10条消息
            
            def progress_callback(step: str, message: str, percent: int):
                """更新任务进度到数据库"""
                nonlocal progress_messages
                try:
                    # 添加新消息到日志
                    new_message = f"[{step}] {message}"
                    progress_messages.append(new_message)
                    # 只保留最近的消息
                    if len(progress_messages) > max_messages:
                        progress_messages = progress_messages[-max_messages:]
                    
                    # 更新数据库
                    task = Task.query.get(task_id)
                    if task:
                        task.set_progress({
                            "total": 100,
                            "completed": percent,
                            "failed": 0,
                            "current_step": message,
                            "percent": percent,
                            "messages": progress_messages.copy()
                        })
                        db.session.commit()
                except Exception as e:
                    logger.warning(f"更新进度失败: {e}")
            
            # Step 1: 准备工作
            logger.info("Step 1: 准备工作...")
            progress_callback("准备", f"找到 {len(image_paths)} 张幻灯片图片", 2)
            
            # 准备输出路径
            exports_dir = os.path.join(app.config['UPLOAD_FOLDER'], project_id, 'exports')
            os.makedirs(exports_dir, exist_ok=True)
            
            # Handle filename collision
            if not filename.endswith('.pptx'):
                filename += '.pptx'
            
            output_path = os.path.join(exports_dir, filename)
            if os.path.exists(output_path):
                base_name = filename.rsplit('.', 1)[0]
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
                filename = f"{base_name}_{timestamp}.pptx"
                output_path = os.path.join(exports_dir, filename)
                logger.info(f"文件名冲突，使用新文件名: {filename}")
            
            # 获取第一张图片的尺寸作为参考
            first_img = Image.open(image_paths[0])
            slide_width, slide_height = first_img.size
            first_img.close()
            
            logger.info(f"幻灯片尺寸: {slide_width}x{slide_height}")
            logger.info(f"递归深度: {max_depth}, 并发数: {max_workers}")
            progress_callback("准备", f"幻灯片尺寸: {slide_width}×{slide_height}", 3)
            
            # Step 2: 创建文字属性提取器
            from services.image_editability import TextAttributeExtractorFactory
            text_attribute_extractor = TextAttributeExtractorFactory.create_caption_model_extractor()
            progress_callback("准备", "文字属性提取器已初始化", 5)
            
            # Step 3: 调用导出方法（使用项目的导出设置）
            logger.info(f"Step 3: 创建可编辑PPTX (extractor={export_extractor_method}, inpaint={export_inpaint_method})...")
            progress_callback("配置", f"提取方法: {export_extractor_method}, 背景修复: {export_inpaint_method}", 6)
            
            _, export_warnings = ExportService.create_editable_pptx_with_recursive_analysis(
                image_paths=image_paths,
                output_file=output_path,
                slide_width_pixels=slide_width,
                slide_height_pixels=slide_height,
                max_depth=max_depth,
                max_workers=max_workers,
                text_attribute_extractor=text_attribute_extractor,
                progress_callback=progress_callback,
                export_extractor_method=export_extractor_method,
                export_inpaint_method=export_inpaint_method
            )
            
            logger.info(f"✓ 可编辑PPTX已创建: {output_path}")
            
            # Step 4: 标记任务完成
            download_path = f"/files/{project_id}/exports/{filename}"
            
            # 添加完成消息
            progress_messages.append("✅ 导出完成！")
            
            # 添加警告信息（如果有）
            warning_messages = []
            if export_warnings and export_warnings.has_warnings():
                warning_messages = export_warnings.to_summary()
                progress_messages.extend(warning_messages)
                logger.warning(f"导出有 {len(warning_messages)} 条警告")
            
            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED'
                task.completed_at = datetime.now()
                task.set_progress({
                    "total": 100,
                    "completed": 100,
                    "failed": 0,
                    "current_step": "✓ 导出完成",
                    "percent": 100,
                    "messages": progress_messages,
                    "download_url": download_path,
                    "filename": filename,
                    "method": "recursive_analysis",
                    "max_depth": max_depth,
                    "warnings": warning_messages,  # 单独的警告列表
                    "warning_details": export_warnings.to_dict() if export_warnings else {}  # 详细警告信息
                })
                db.session.commit()
                logger.info(f"✓ 任务 {task_id} 完成 - 递归分析导出成功（深度={max_depth}）")
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"✗ 任务 {task_id} 失败: {error_detail}")
            
            # 标记任务失败
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.now()
                db.session.commit()
