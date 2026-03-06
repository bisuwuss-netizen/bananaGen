import os
import re

PATH = "backend/services/tasks/description_task.py"

with open(PATH, "r") as f:
    orig = f.read()

# Make the main function async
code = orig.replace(
    "def generate_descriptions_task(",
    "async def generate_descriptions_task("
)

# Fix imports
code = code.replace(
    "from concurrent.futures import (",
    "import asyncio\\nfrom sqlalchemy import select\\nfrom deps import async_session_factory\\nfrom concurrent.futures import ("
)

# The entire block uses DB. Let's switch from `with runtime_context` to `async with async_session_factory() as session:`
# We'll just replace `task = Task.query.get(task_id)` and adjust the indentations logically by rewriting the top parts.

code = code.replace(
    "        try:\\n            task = Task.query.get(task_id)",
    "        async with async_session_factory() as session:\\n            try:\\n                task = await session.get(Task, task_id)"
)
code = code.replace("            if not task:\\n                logger.error", "                if not task:\\n                    logger.error")

# Manual string replacements for common DB queries
code = code.replace("db.session.commit()", "await session.commit()")
code = code.replace("db.session.expire_all()", "# await session.flush()  # replacing expire_all")

code = code.replace(
    "            pages = Page.query.filter_by(project_id=project_id).order_by(Page.numeric_order()).all()",
    "                result = await session.execute(select(Page).where(Page.project_id == project_id).order_by(Page.numeric_order()))\\n                pages = result.scalars().all()"
)

code = code.replace(
    "            def update_page_result(page_id, result_data, error, count_stats: bool = True):\\n                nonlocal completed, failed\\n                page = Page.query.get(page_id)",
    "            async def update_page_result(page_id, result_data, error, count_stats: bool = True):\\n                nonlocal completed, failed\\n                page = await session.get(Page, page_id)"
)
code = code.replace("update_page_result(", "await update_page_result(")

code = code.replace("Task.query.get(task_id)", "await session.get(Task, task_id)")
code = code.replace("Page.query.get(page_id)", "await session.get(Page, page_id)")
code = code.replace("Project.query.get(project_id)", "await session.get(Project, project_id)")

# Refactoring inner functions to async
code = code.replace("def generate_single_desc(", "async def generate_single_desc(")
code = code.replace("def generate_chapter(", "async def generate_chapter(")
code = code.replace("def generate_desc_batch(", "async def generate_desc_batch(")

# Replace get_ai_service with get_ai_service_async
code = code.replace(
    "from services.ai_service_manager import get_ai_service",
    "from services.ai_service_manager import get_ai_service_async"
)
code = code.replace(
    "scoped_ai_service = get_ai_service()",
    "scoped_ai_service = await get_ai_service_async()"
)
code = code.replace(
    "chapter_ai_service = get_ai_service()",
    "chapter_ai_service = await get_ai_service_async()"
)

# Fix ai_service.calls
code = code.replace(
    "scoped_ai_service.generate_structured_page_content(",
    "await scoped_ai_service.call_async('generate_structured_page_content', "
)
code = code.replace(
    "chapter_ai_service.generate_structured_page_content_batch(",
    "await chapter_ai_service.call_async('generate_structured_page_content_batch', "
)
code = code.replace(
    "scoped_ai_service.generate_page_description(",
    "await scoped_ai_service.call_async('generate_page_description', "
)
code = code.replace(
    "scoped_ai_service.generate_page_descriptions_batch(",
    "await scoped_ai_service.call_async('generate_page_descriptions_batch', "
)
code = code.replace(
    "ai_service.review_structured_document_continuity(",
    "await ai_service.call_async('review_structured_document_continuity', "
)
code = code.replace(
    "ai_service._plan_rewrites_from_reports(",
    "await ai_service.call_async('_plan_rewrites_from_reports', "
)

# The most complex part: ThreadPoolExecutors

orig_rewrite = '''                            rewrite_executor = ThreadPoolExecutor(max_workers=1)
                            rewrite_future = rewrite_executor.submit(
                                generate_single_desc,
                                page_id=job["db_page_id"],
                                page_outline=job["page_outline"],
                                page_index=job["page_index"],
                                page_layout_id=job["layout_id"],
                                logical_page_id=job["logical_page_id"],
                                continuity_context=continuity_context,
                                rewrite_instruction=rewrite_instruction,
                                thinking_budget=rewrite_budget,
                            )
                            try:
                                page_id, rewrite_data, rewrite_error = rewrite_future.result(timeout=rewrite_timeout_seconds)
                            except FutureTimeoutError:
                                rewrite_future.cancel()
                                page_id = job["db_page_id"]
                                rewrite_data = None
                                rewrite_error = f"页面重写超时({rewrite_timeout_seconds}s)"
                            finally:
                                rewrite_executor.shutdown(wait=False, cancel_futures=True)'''

new_rewrite = '''                            try:
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
                                rewrite_error = f"页面重写超时({rewrite_timeout_seconds}s)"'''

code = code.replace(orig_rewrite, new_rewrite)

orig_chap_exec = '''                worker_count = max(1, min(max_workers, chapter_parallelism, len(chapter_jobs)))
                first_pass_map: Dict[str, Any] = {}
                with ThreadPoolExecutor(max_workers=worker_count) as executor:
                    futures = [executor.submit(generate_chapter, items) for items in chapter_jobs]
                    for future in as_completed(futures):
                        chapter_results = future.result()
                        for page_id, result_data, error in chapter_results:
                            first_pass_map[str(page_id)] = (result_data, error)'''

new_chap_exec = '''                worker_count = max(1, min(max_workers, chapter_parallelism, len(chapter_jobs)))
                first_pass_map: Dict[str, Any] = {}
                sem = asyncio.Semaphore(worker_count)
                
                async def sem_run(items):
                    async with sem:
                        return await generate_chapter(items)
                
                tasks = [sem_run(items) for items in chapter_jobs]
                results = await asyncio.gather(*tasks)
                
                for chapter_results in results:
                    for page_id, result_data, error in chapter_results:
                        first_pass_map[str(page_id)] = (result_data, error)'''

code = code.replace(orig_chap_exec, new_chap_exec)

orig_desc_exec = '''                with ThreadPoolExecutor(max_workers=worker_count) as executor:
                    futures = [executor.submit(generate_desc_batch, batch_items) for batch_items in batches]
                    for future in as_completed(futures):
                        batch_results = future.result()
                        # await session.flush()  # replacing expire_all
                        for page_id, result_data, error in batch_results:
                            await update_page_result(page_id, result_data, error)
                        await session.commit()
                        task = await session.get(Task, task_id)
                        if task:
                            task.update_progress(completed=completed, failed=failed)
                            await session.commit()'''

new_desc_exec = '''                sem = asyncio.Semaphore(worker_count)
                async def sem_batch(batch_items):
                    async with sem:
                        return await generate_desc_batch(batch_items)
                        
                tasks = [sem_batch(batch_items) for batch_items in batches]
                results = await asyncio.gather(*tasks)
                
                for batch_results in results:
                    for page_id, result_data, error in batch_results:
                        await update_page_result(page_id, result_data, error)
                    await session.commit()
                    task = await session.get(Task, task_id)
                    if task:
                        task.update_progress(completed=completed, failed=failed)
                        await session.commit()'''

if "db.session.expire_all()" in orig_desc_exec:
    print("Mismatched expire all")
# Using a fallback replace if the exact `orig_desc_exec` is slightly mutated
code = re.sub(r"with ThreadPoolExecutor\(max_workers=worker_count\) as executor:.*?await session.commit\(\)", new_desc_exec, code, flags=re.DOTALL)


orig_single_exec = '''                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    futures = [
                        executor.submit(generate_single_desc, page.id, page_data, i, page.layout_id)
                        for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)
                    ]
                    for future in as_completed(futures):
                        page_id, result_data, error = future.result()
                        # await session.flush()  # replacing expire_all
                        await update_page_result(page_id, result_data, error)
                        await session.commit()
                        task = await session.get(Task, task_id)
                        if task:
                            task.update_progress(completed=completed, failed=failed)
                            await session.commit()'''

new_single_exec = '''                sem_single = asyncio.Semaphore(max_workers)
                
                async def sem_single_run(page_obj, page_data_obj, idx):
                    async with sem_single:
                        return await generate_single_desc(page_obj.id, page_data_obj, idx, page_obj.layout_id)
                        
                tasks = [
                    sem_single_run(page, page_data, i)
                    for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)
                ]
                results = await asyncio.gather(*tasks)
                
                for page_id, result_data, error in results:
                    await update_page_result(page_id, result_data, error)
                    await session.commit()
                    task = await session.get(Task, task_id)
                    if task:
                        task.update_progress(completed=completed, failed=failed)
                        await session.commit()'''

code = re.sub(r"with ThreadPoolExecutor\(max_workers=max_workers\) as executor:.*?await session.commit\(\)", new_single_exec, code, flags=re.DOTALL)


orig_desc_batch_inner = "results.append(generate_single_desc(page_id, page_outline, idx, page_layout_id))"
new_desc_batch_inner = "results.append(await generate_single_desc(page_id, page_outline, idx, page_layout_id))"
code = code.replace(orig_desc_batch_inner, new_desc_batch_inner)

orig_chap_inner = "page_id, result_data, error = generate_single_desc("
new_chap_inner = "page_id, result_data, error = await generate_single_desc("
code = code.replace(orig_chap_inner, new_chap_inner)

lines = code.split("\\n")
new_lines = []
in_async_session = False
for i, line in enumerate(lines):
    if "async with async_session_factory() as session:" in line:
        in_async_session = True
        new_lines.append(line)
        continue
    
    if in_async_session:
        # Detect end of `with runtime_context` block to end indentation
        if line.startswith("        ") and not line.startswith("            "):
            pass
            
        if line.startswith("        "):
            new_lines.append("    " + line)
        elif line.strip() == "":
            new_lines.append(line)
        else:
            in_async_session = False
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(PATH, "w") as f:
    f.write("\\n".join(new_lines))

print("Done Refactoring Description Task")
