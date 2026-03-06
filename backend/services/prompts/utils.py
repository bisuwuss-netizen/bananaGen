"""Generated modular prompt file for utils."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent

HTML_LAYOUT_TYPES = ('\n'
 'Available layout types for HTML rendering mode:\n'
 '- cover: Cover/title page with main title, subtitle, and optional presenter info\n'
 '- toc: Table of contents page listing major sections\n'
 '- section_title: Section divider page with part/section title\n'
 '- title_content: Title with a main content block (paragraphs, text)\n'
 '- title_bullets: Title with bullet points list\n'
 '- two_column: Two-column layout for comparisons or parallel content\n'
 '- process_steps: Sequential steps or process flow\n'
 '- image_full: Full-page image with optional caption\n'
 '- quote: Quote or testimonial with attribution\n'
 '- ending: Closing/thank you page\n'
 '\n'
 'Guidelines for choosing layouts:\n'
 "- First page MUST be 'cover' (mandatory)\n"
 "- Second page MUST be 'toc' (table of contents) - it should list only major section/chapter titles (section_title "
 'pages) as its items, NOT every single page title\n'
 "- LAST page MUST be 'ending' - this is MANDATORY, the ending page can ONLY appear at the very last position, NEVER "
 'in the middle\n'
 "- Use 'section_title' for part dividers in multi-part presentations\n"
 "- Use 'title_bullets' only for true list/checklist pages\n"
 "- Use 'title_content' for explanatory text\n"
 "- Use 'two_column' for comparisons or contrasting ideas\n"
 "- Use 'process_steps' for sequential processes or timelines\n"
 "- Use 'quote' for important quotes - quote pages should be placed near the end (before ending page), NOT in the "
 'middle of content\n'
 '\n'
 'CRITICAL POSITION RULES (MUST follow strictly):\n'
 "1. 'cover' page MUST be the FIRST page (position 1)\n"
 "2. 'toc' page MUST be the SECOND page (position 2)\n"
 "3. 'ending' page MUST be the LAST page (final position) - NEVER place ending anywhere else\n"
 "4. 'quote' pages should appear in the latter half of the presentation, ideally just before the ending page\n"
 '\n'
 "IMPORTANT for toc layout: The toc page's 'points' array should contain only the major section/chapter titles "
 '(matching section_title pages), NOT every single page title. This keeps the table of contents concise and readable.\n'
 '\n'
 'Layout diversity requirement (hard constraints):\n'
 '- Do NOT use only 2-3 layouts. Use a diverse mix from the 10 layout types above.\n'
 '- When pages >= 10, ensure every layout appears at least once (cover/toc/ending must appear exactly once).\n'
 '- Avoid more than 2 consecutive pages with the same layout.\n'
 '- Ratio target for these four layouts (approximate, not hard lock):\n'
 '  section_title : title_content : title_bullets : two_column = 2 : 4 : 1 : 3\n'
 "- Make layout_id choices match the page's content intent.\n")


def _format_reference_files_xml(reference_files_content: Optional[List[Dict[str, str]]]) -> str:
    """
    Format reference files content as XML structure
    
    Args:
        reference_files_content: List of dicts with 'filename' and 'content' keys
        
    Returns:
        Formatted XML string
    """
    if not reference_files_content:
        return ""
    
    xml_parts = ["<uploaded_files>"]
    for file_info in reference_files_content:
        filename = file_info.get('filename', 'unknown')
        content = file_info.get('content', '')
        xml_parts.append(f'  <file name="{filename}">')
        xml_parts.append('    <content>')
        xml_parts.append(content)
        xml_parts.append('    </content>')
        xml_parts.append('  </file>')
    xml_parts.append('</uploaded_files>')
    xml_parts.append('')  # Empty line after XML
    
    return '\n'.join(xml_parts)



def _flatten_outline_pages(outline: list) -> List[Dict]:
    """Flatten part-based outline to page list for prompt context."""
    pages: List[Dict] = []
    if not isinstance(outline, list):
        return pages

    for item in outline:
        if not isinstance(item, dict):
            continue
        if "part" in item and isinstance(item.get("pages"), list):
            for page in item.get("pages", []):
                if isinstance(page, dict):
                    page_copy = page.copy()
                    page_copy["part"] = item.get("part")
                    pages.append(page_copy)
        else:
            pages.append(item)
    return pages



def _build_compact_outline_context(outline: list, focus_page_index: Optional[int] = None) -> str:
    """
    Build compact outline context for prompts to reduce token cost.

    Returns a short JSON snippet containing:
    - key page sequence (title + first 2 points)
    - optional local window around current page
    """
    pages = _flatten_outline_pages(outline)
    if not pages:
        return "[]"

    compact_pages = []
    for idx, page in enumerate(pages, 1):
        points = page.get("points") if isinstance(page.get("points"), list) else []
        compact_pages.append({
            "index": idx,
            "title": page.get("title", ""),
            "part": page.get("part", ""),
            "points": [str(p) for p in points[:2]]
        })

    selected: List[Dict] = []
    total = len(compact_pages)

    # keep global skeleton
    selected.extend(compact_pages[:3])
    if total > 6:
        selected.extend(compact_pages[-2:])

    # keep local neighborhood around current page
    if focus_page_index is not None and 1 <= focus_page_index <= total:
        start = max(1, focus_page_index - 2)
        end = min(total, focus_page_index + 2)
        for i in range(start, end + 1):
            selected.append(compact_pages[i - 1])

    # de-duplicate by index while preserving order
    seen = set()
    deduped = []
    for item in selected:
        idx = item.get("index")
        if idx in seen:
            continue
        seen.add(idx)
        deduped.append(item)

    return json.dumps(deduped, ensure_ascii=False, indent=2)



def _truncate_prompt_text(text: str, max_chars: int = 1200) -> str:
    """Trim very long free-text context to control token growth."""
    if not text:
        return ""
    value = str(text)
    if len(value) <= max_chars:
        return value
    head = value[: max_chars // 2]
    tail = value[-max_chars // 3:]
    return f"{head}\n...\n{tail}"


