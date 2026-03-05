"""
AI Service Prompts - 集中管理所有 AI 服务的 prompt 模板
"""
import json
import logging
from textwrap import dedent
from typing import List, Dict, Optional, TYPE_CHECKING, Any

if TYPE_CHECKING:
    from services.ai_service import ProjectContext

logger = logging.getLogger(__name__)


# 语言配置映射
LANGUAGE_CONFIG = {
    'zh': {
        'name': '中文',
        'instruction': '请使用全中文输出。',
        'ppt_text': 'PPT文字请使用全中文。'
    },
    'ja': {
        'name': '日本語',
        'instruction': 'すべて日本語で出力してください。',
        'ppt_text': 'PPTのテキストは全て日本語で出力してください。'
    },
    'en': {
        'name': 'English',
        'instruction': 'Please output all in English.',
        'ppt_text': 'Use English for PPT text.'
    },
    'auto': {
        'name': '自动',
        'instruction': '',  # 自动模式不添加语言限制
        'ppt_text': ''
    }
}


def get_default_output_language() -> str:
    """
    获取环境变量中配置的默认输出语言
    
    Returns:
        语言代码: 'zh', 'ja', 'en', 'auto'
    """
    from config import Config
    return getattr(Config, 'OUTPUT_LANGUAGE', 'zh')


def get_language_instruction(language: str = None) -> str:
    """
    获取语言限制指令文本
    
    Args:
        language: 语言代码，如果为 None 则使用默认语言
    
    Returns:
        语言限制指令，如果是自动模式则返回空字符串
    """
    lang = language if language else get_default_output_language()
    config = LANGUAGE_CONFIG.get(lang, LANGUAGE_CONFIG['zh'])
    return config['instruction']


def get_ppt_language_instruction(language: str = None) -> str:
    """
    获取PPT文字语言限制指令
    
    Args:
        language: 语言代码，如果为 None 则使用默认语言
    
    Returns:
        PPT语言限制指令，如果是自动模式则返回空字符串
    """
    lang = language if language else get_default_output_language()
    config = LANGUAGE_CONFIG.get(lang, LANGUAGE_CONFIG['zh'])
    return config['ppt_text']


# HTML 渲染模式下可用的布局类型
HTML_LAYOUT_TYPES = """
Available layout types for HTML rendering mode:
- cover: Cover/title page with main title, subtitle, and optional presenter info
- toc: Table of contents page listing major sections
- section_title: Section divider page with part/section title
- title_content: Title with a main content block (paragraphs, text)
- title_bullets: Title with bullet points list
- two_column: Two-column layout for comparisons or parallel content
- process_steps: Sequential steps or process flow
- image_full: Full-page image with optional caption
- quote: Quote or testimonial with attribution
- ending: Closing/thank you page

Guidelines for choosing layouts:
- First page MUST be 'cover' (mandatory)
- Second page MUST be 'toc' (table of contents) - it should list only major section/chapter titles (section_title pages) as its items, NOT every single page title
- LAST page MUST be 'ending' - this is MANDATORY, the ending page can ONLY appear at the very last position, NEVER in the middle
- Use 'section_title' for part dividers in multi-part presentations
- Use 'title_bullets' only for true list/checklist pages
- Use 'title_content' for explanatory text
- Use 'two_column' for comparisons or contrasting ideas
- Use 'process_steps' for sequential processes or timelines
- Use 'quote' for important quotes - quote pages should be placed near the end (before ending page), NOT in the middle of content

CRITICAL POSITION RULES (MUST follow strictly):
1. 'cover' page MUST be the FIRST page (position 1)
2. 'toc' page MUST be the SECOND page (position 2)
3. 'ending' page MUST be the LAST page (final position) - NEVER place ending anywhere else
4. 'quote' pages should appear in the latter half of the presentation, ideally just before the ending page

IMPORTANT for toc layout: The toc page's 'points' array should contain only the major section/chapter titles (matching section_title pages), NOT every single page title. This keeps the table of contents concise and readable.

Layout diversity requirement (hard constraints):
- Do NOT use only 2-3 layouts. Use a diverse mix from the 10 layout types above.
- When pages >= 10, ensure every layout appears at least once (cover/toc/ending must appear exactly once).
- Avoid more than 2 consecutive pages with the same layout.
- Ratio target for these four layouts (approximate, not hard lock):
  section_title : title_content : title_bullets : two_column = 2 : 4 : 1 : 3
- Make layout_id choices match the page's content intent.
"""


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


def get_outline_generation_prompt(project_context: 'ProjectContext', language: str = None, render_mode: str = 'image', scheme_id: str = None) -> str:
    """
    生成 PPT 大纲的 prompt

    Args:
        project_context: 项目上下文对象，包含所有原始信息
        language: 输出语言代码（'zh', 'ja', 'en', 'auto'），如果为 None 则使用默认语言
        render_mode: 渲染模式 ('image' | 'html')，HTML模式会要求AI为每页选择布局类型

    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    idea_prompt = project_context.idea_prompt or ""

    # HTML模式下的布局说明和示例格式
    if render_mode == 'html':
        layout_instruction = f"""
Available layout types for scheme "{get_layout_scheme(scheme_id).get('name', 'tech_blue')}":
{get_layout_types_description(scheme_id)}

{get_scheme_style_prompt(scheme_id)}

Layout constraints:
{get_layout_constraints(scheme_id)}

For HTML rendering mode, you MUST include a "layout_id" field for each page.
Only use layout_id from the selected scheme above.
"""
        scheme_roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or 'edu_dark', SCHEME_ROLE_LAYOUTS['edu_dark'])
        cover_id = scheme_roles['cover']
        toc_id = scheme_roles['toc']
        ending_id = scheme_roles['ending']
        scheme_layout_ids = [lid for lid in get_layout_scheme(scheme_id).get('layouts', {}).keys()
                             if lid not in {cover_id, toc_id, ending_id}]
        content_id = scheme_layout_ids[0] if scheme_layout_ids else cover_id
        content_id_2 = scheme_layout_ids[1] if len(scheme_layout_ids) > 1 else content_id
        simple_example = f'[{{"title": "title1", "points": ["point1", "point2"], "layout_id": "{cover_id}"}}, {{"title": "title2", "points": ["point1", "point2"], "layout_id": "{content_id}"}}, {{"title": "title3", "points": ["point1", "point2"], "layout_id": "{ending_id}"}}]'
        part_example = f'''[
    {{
    "part": "Part 1: Introduction",
    "pages": [
        {{"title": "Welcome", "points": ["point1", "point2"], "layout_id": "{cover_id}"}},
        {{"title": "Overview", "points": ["point1", "point2"], "layout_id": "{toc_id}"}}
    ]
    }},
    {{
    "part": "Part 2: Main Content",
    "pages": [
        {{"title": "Topic 1", "points": ["point1", "point2"], "layout_id": "{content_id}"}},
        {{"title": "Topic 2", "points": ["point1", "point2"], "layout_id": "{content_id_2}"}}
    ]
    }}
]'''
    else:
        layout_instruction = ""
        simple_example = '[{{"title": "title1", "points": ["point1", "point2"]}}, {{"title": "title2", "points": ["point1", "point2"]}}]'
        part_example = '''[
    {{
    "part": "Part 1: Introduction",
    "pages": [
        {{"title": "Welcome", "points": ["point1", "point2"]}},
        {{"title": "Overview", "points": ["point1", "point2"]}}
    ]
    }},
    {{
    "part": "Part 2: Main Content",
    "pages": [
        {{"title": "Topic 1", "points": ["point1", "point2"]}},
        {{"title": "Topic 2", "points": ["point1", "point2"]}}
    ]
    }}
]'''

    prompt = (f"""\
You are a helpful assistant that generates an outline for a ppt.
{layout_instruction}
You can organize the content in two ways:

1. Simple format (for short PPTs without major sections):
{simple_example}

2. Part-based format (for longer PPTs with major sections):
{part_example}

Choose the format that best fits the content. Use parts when the PPT has clear major sections.
Unless otherwise specified, the first page should be kept simplest, containing only the title, subtitle, and presenter information.

Narrative quality hard constraints (must follow):
- If a page introduces an overview/roadmap with multiple points, each point must be expanded in at least one later page.
- If a page mentions a case/example, include a later follow-up page that explains method, result, and takeaway.
- Avoid topic jumps: adjacent pages should have clear semantic transition.
- Before the ending page, include a summary/Q&A style page to close the story loop.
- Never leave \"promised but missing\" topics in the final outline.

The user's request: {idea_prompt}. Now generate the outline, don't include any other text.
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_generation_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_outline_parsing_prompt(project_context: 'ProjectContext', language: str = None, render_mode: str = 'image', scheme_id: str = None) -> str:
    """
    解析用户提供的大纲文本的 prompt

    Args:
        project_context: 项目上下文对象，包含所有原始信息
        language: 输出语言代码
        render_mode: 渲染模式 ('image' | 'html')，HTML模式会要求AI为每页选择布局类型

    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    outline_text = project_context.outline_text or ""

    # HTML模式下的布局说明和示例格式
    if render_mode == 'html':
        layout_instruction = f"""
Available layout types for scheme "{get_layout_scheme(scheme_id).get('name', 'tech_blue')}":
{get_layout_types_description(scheme_id)}

{get_scheme_style_prompt(scheme_id)}

Layout constraints:
{get_layout_constraints(scheme_id)}

For HTML rendering mode, you MUST include a "layout_id" field for each page based on the content type.
Only use layout_id from the selected scheme above.
"""
        scheme_roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or 'edu_dark', SCHEME_ROLE_LAYOUTS['edu_dark'])
        cover_id = scheme_roles['cover']
        toc_id = scheme_roles['toc']
        ending_id = scheme_roles['ending']
        scheme_layout_ids = [lid for lid in get_layout_scheme(scheme_id).get('layouts', {}).keys()
                             if lid not in {cover_id, toc_id, ending_id}]
        content_id = scheme_layout_ids[0] if scheme_layout_ids else cover_id
        content_id_2 = scheme_layout_ids[1] if len(scheme_layout_ids) > 1 else content_id
        simple_example = f'[{{"title": "title1", "points": ["point1", "point2"], "layout_id": "{cover_id}"}}, {{"title": "title2", "points": ["point1", "point2"], "layout_id": "{content_id}"}}]'
        part_example = f'''[
    {{
    "part": "Part 1: Introduction",
    "pages": [
        {{"title": "Welcome", "points": ["point1", "point2"], "layout_id": "{cover_id}"}},
        {{"title": "Overview", "points": ["point1", "point2"], "layout_id": "{toc_id}"}}
    ]
    }},
    {{
    "part": "Part 2: Main Content",
    "pages": [
        {{"title": "Topic 1", "points": ["point1", "point2"], "layout_id": "{content_id}"}},
        {{"title": "Topic 2", "points": ["point1", "point2"], "layout_id": "{content_id_2}"}}
    ]
    }}
]'''
    else:
        layout_instruction = ""
        simple_example = '[{{"title": "title1", "points": ["point1", "point2"]}}, {{"title": "title2", "points": ["point1", "point2"]}}]'
        part_example = '''[
    {{
    "part": "Part 1: Introduction",
    "pages": [
        {{"title": "Welcome", "points": ["point1", "point2"]}},
        {{"title": "Overview", "points": ["point1", "point2"]}}
    ]
    }},
    {{
    "part": "Part 2: Main Content",
    "pages": [
        {{"title": "Topic 1", "points": ["point1", "point2"]}},
        {{"title": "Topic 2", "points": ["point1", "point2"]}}
    ]
    }}
]'''

    prompt = (f"""\
You are a helpful assistant that parses a user-provided PPT outline text into a structured format.

The user has provided the following outline text:

{outline_text}

Your task is to analyze this text and convert it into a structured JSON format WITHOUT modifying any of the original text content.
You should only reorganize and structure the existing content, preserving all titles, points, and text exactly as provided.
{layout_instruction}
You can organize the content in two ways:

1. Simple format (for short PPTs without major sections):
{simple_example}

2. Part-based format (for longer PPTs with major sections):
{part_example}

Important rules:
- DO NOT modify, rewrite, or change any text from the original outline
- DO NOT add new content that wasn't in the original text
- DO NOT remove any content from the original text
- Only reorganize the existing content into the structured format
- Preserve all titles, bullet points, and text exactly as they appear
- If the text has clear sections/parts, use the part-based format
- Extract titles and points from the original text, keeping them exactly as written

Now parse the outline text above into the structured format. Return only the JSON, don't include any other text.
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_parsing_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_page_description_prompt(project_context: 'ProjectContext', outline: list,
                                page_outline: dict, page_index: int,
                                part_info: str = "",
                                language: str = None) -> str:
    """
    生成单个页面描述的 prompt
    
    Args:
        project_context: 项目上下文对象，包含所有原始信息
        outline: 完整大纲
        page_outline: 当前页面的大纲
        page_index: 页面编号（从1开始）
        part_info: 可选的章节信息
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    # 根据项目类型选择最相关的原始输入
    if project_context.creation_type == 'idea' and project_context.idea_prompt:
        original_input = project_context.idea_prompt
    elif project_context.creation_type == 'outline' and project_context.outline_text:
        original_input = f"用户提供的大纲：\n{project_context.outline_text}"
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input = f"用户提供的描述：\n{project_context.description_text}"
    else:
        original_input = project_context.idea_prompt or ""
    original_input = _truncate_prompt_text(original_input, max_chars=1200)
    
    outline_context = _build_compact_outline_context(outline, focus_page_index=page_index)

    prompt = (f"""\
我们正在为PPT的每一页生成内容描述。
用户的原始需求是：\n{original_input}\n
我们已经有了压缩后的大纲上下文（仅保留关键页和当前页附近页面）：\n{outline_context}\n{part_info}
现在请为第 {page_index} 页生成描述：
{page_outline}
{"**除非特殊要求，第一页的内容需要保持极简，只放标题副标题以及演讲人等（输出到标题后）, 不添加任何素材。**" if page_index == 1 else ""}

【重要提示】生成的"页面文字"部分会直接渲染到PPT页面上，因此请务必注意：
1. 【内容深度要求】每条要点包含三层信息：
   - 核心概念（10-15字）：是什么
   - 关键解释（25-35字）：为什么重要/如何理解
   - 应用提示（15-25字，可选）：怎么用/注意什么
   示例："机器学习 | 让计算机从数据中自动学习规律，无需显式编程 | 适用于模式识别、预测等场景"
2. 每页总字数：120-180字（适合学生阅读和复习）
3. 条理清晰，使用列表形式组织内容
4. 确保内容可读性强，适合在教学时展示
5. 不要包含任何额外的说明性文字或注释
6. 必须覆盖当前页面大纲中的每个 points 条目，不能遗漏承诺点
7. 每个 bullet 必须是完整句，禁止半句、断句、占位词（如“待补充”“...”）
8. 如果当前页是案例/示例页，必须包含：问题背景、方法动作、结果启示
9. 与前后页保持衔接：本页结尾要能自然引出下一页主题（简短一句即可）

输出格式示例：
页面标题：原始社会：与自然共生
{"副标题：人类祖先和自然的相处之道" if page_index == 1 else ""}

页面文字：
- 狩猎采集文明：人类活动规模小，对环境影响有限
- 依赖性强：生活完全依赖自然资源的直接供给
- 适应而非改造：通过观察学习自然，发展生存技能
- 影响特点：局部、短期、低强度，生态可自我恢复

其他页面素材（如果文件中存在请积极添加，包括markdown图片链接、公式、表格等）

【关于图片】如果参考文件中包含以 /files/ 开头的本地文件URL图片（例如 /files/mineru/xxx/image.png），请将这些图片以markdown格式输出，例如：![图片描述](/files/mineru/xxx/image.png)。这些图片会被包含在PPT页面中。

{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_page_description_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_page_descriptions_batch_prompt(project_context: 'ProjectContext',
                                       outline: list,
                                       batch_pages: List[Dict[str, Any]],
                                       language: str = None) -> str:
    """
    生成批量页面描述 prompt（一次请求生成多个页面），用于提速。

    batch_pages item format:
    {
      "page_index": 3,
      "page_outline": {"title": "...", "points": [...], ...}
    }
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)

    if project_context.creation_type == 'idea' and project_context.idea_prompt:
        original_input = project_context.idea_prompt
    elif project_context.creation_type == 'outline' and project_context.outline_text:
        original_input = f"用户提供的大纲：\n{project_context.outline_text}"
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input = f"用户提供的描述：\n{project_context.description_text}"
    else:
        original_input = project_context.idea_prompt or ""
    original_input = _truncate_prompt_text(original_input, max_chars=1200)

    compact_outline_context = _build_compact_outline_context(outline, focus_page_index=None)
    batch_payload = json.dumps(batch_pages, ensure_ascii=False, indent=2)

    prompt = f"""\
我们正在为PPT批量生成页面描述，请一次性完成以下页面。

用户原始需求：
{original_input}

大纲关键上下文（压缩版）：
{compact_outline_context}

待生成页面列表（严格按 page_index 顺序返回）：
{batch_payload}

输出要求（每一页都必须满足）：
1. 覆盖该页 page_outline.points 的全部核心语义，不得遗漏。
2. 每页总字数 120-180 字。
3. 使用“页面标题 + 页面文字（bullet）”格式。
4. 每个 bullet 必须是完整句，禁止半句、断句、占位词。
5. 案例页必须包含：问题背景、方法动作、结果启示。
6. 与前后页保持衔接，结尾可用一句过渡语。

请返回严格 JSON 数组，格式如下：
[
  {{"page_index": 1, "description": "页面标题：...\\n\\n页面文字：\\n- ...\\n- ..."}},
  {{"page_index": 2, "description": "页面标题：...\\n\\n页面文字：\\n- ...\\n- ..."}}
]

注意：
- page_index 必须和输入一致，不能漏页、不能新增页。
- 只返回 JSON，不要返回其他解释文本。
{get_language_instruction(language)}
"""

    final_prompt = files_xml + prompt
    logger.debug(f"[get_page_descriptions_batch_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_image_generation_prompt(page_desc: str, outline_text: str, 
                                current_section: str,
                                has_material_images: bool = False,
                                extra_requirements: str = None,
                                language: str = None,
                                has_template: bool = True,
                                page_index: int = 1) -> str:
    """
    生成图片生成 prompt
    
    Args:
        page_desc: 页面描述文本
        outline_text: 大纲文本
        current_section: 当前章节
        has_material_images: 是否有素材图片
        extra_requirements: 额外的要求（可能包含风格描述）
        language: 输出语言
        has_template: 是否有模板图片（False表示无模板图模式）
        
    Returns:
        格式化后的 prompt 字符串
    """
    # 如果有素材图片，在 prompt 中明确告知 AI
    material_images_note = ""
    if has_material_images:
        material_images_note = (
            "\n\n提示：" + ("除了模板参考图片（用于风格参考）外，还提供了额外的素材图片。" if has_template else "用户提供了额外的素材图片。") +
            "这些素材图片是可供挑选和使用的元素，你可以从这些素材图片中选择合适的图片、图标、图表或其他视觉元素"
            "直接整合到生成的PPT页面中。请根据页面内容的需要，智能地选择和组合这些素材图片中的元素。"
        )
    
    # 添加额外要求到提示词
    extra_req_text = ""
    if extra_requirements and extra_requirements.strip():
        extra_req_text = f"\n\n额外要求（请务必遵循）：\n{extra_requirements}\n"

    # 根据是否有模板生成不同的设计指南内容（保持原prompt要点顺序）
    template_style_guideline = "- 配色和设计语言和模板图片严格相似。" if has_template else "- 严格按照风格描述进行设计。"
    forbidden_template_text_guidline = "- 只参考风格设计，禁止出现模板中的文字。\n" if has_template else ""

    # 该处参考了@歸藏的A工具箱
    prompt = (f"""\
你是一位专家级UI UX演示设计师，专注于生成设计良好的PPT页面。
当前PPT页面的页面描述如下:
<page_description>
{page_desc}
</page_description>

<reference_information>
整个PPT的大纲为：
{outline_text}

当前位于章节：{current_section}
</reference_information>


<design_guidelines>
- 要求文字清晰锐利, 画面为4K分辨率，16:9比例。
{template_style_guideline}
- 视觉层级必须明确：主标题 > 分组标题 > 正文 > 注释，字号和字重要有明显区分。
- 页面遵循 60/30/10 配色比例：主色占大面、辅助色构建结构、强调色只用于关键数字或关键词。
- 保持专业留白：四周安全边距充足，模块之间有稳定间距，避免元素贴边和拥挤。
- 单页最多使用 2 种字体风格，不要出现花哨艺术字、描边字、荧光字。
- 根据内容自动设计最完美的构图，不重不漏地渲染"页面描述"中的文本。
- 如非必要，禁止出现 markdown 格式符号（如 # 和 * 等）。
{forbidden_template_text_guidline}- 使用大小恰当的装饰性图形或插画对空缺位置进行填补。
- 图标、插图、数据图表必须采用统一视觉语言，避免混搭风格。
- 优先保证可读性和商务质感，禁止炫技特效（过强发光、重噪点、夸张透视、花哨纹理堆叠）。
</design_guidelines>
{get_ppt_language_instruction(language)}
{material_images_note}{extra_req_text}

{"**注意：当前页面为ppt的封面页，请你采用专业的封面设计美学技巧，务必凸显出页面标题，分清主次，确保一下就能抓住观众的注意力。**" if page_index == 1 else ""}
""")
    
    logger.debug(f"[get_image_generation_prompt] Final prompt:\n{prompt}")
    return prompt


def get_image_edit_prompt(edit_instruction: str, original_description: str = None) -> str:
    """
    生成图片编辑 prompt
    
    Args:
        edit_instruction: 编辑指令
        original_description: 原始页面描述（可选）
        
    Returns:
        格式化后的 prompt 字符串
    """
    if original_description:
        # 删除"其他页面素材："之后的内容，避免被前面的图影响
        if "其他页面素材" in original_description:
            original_description = original_description.split("其他页面素材")[0].strip()
        
        prompt = (f"""\
该PPT页面的原始页面描述为：
{original_description}

现在，根据以下指令修改这张PPT页面：{edit_instruction}

要求维持原有的文字内容和设计风格，只按照指令进行修改。提供的参考图中既有新素材，也有用户手动框选出的区域，请你根据原图和参考图的关系智能判断用户意图。
""")
    else:
        prompt = f"根据以下指令修改这张PPT页面：{edit_instruction}\n保持原有的内容结构和设计风格，只按照指令进行修改。提供的参考图中既有新素材，也有用户手动框选出的区域，请你根据原图和参考图的关系智能判断用户意图。"
    
    logger.debug(f"[get_image_edit_prompt] Final prompt:\n{prompt}")
    return prompt


def get_description_to_outline_prompt(project_context: 'ProjectContext', language: str = None, render_mode: str = 'image', scheme_id: str = None) -> str:
    """
    从描述文本解析出大纲的 prompt

    Args:
        project_context: 项目上下文对象，包含所有原始信息
        language: 输出语言代码
        render_mode: 渲染模式 ('image' | 'html')，HTML模式会要求AI为每页选择布局类型

    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    description_text = project_context.description_text or ""

    # HTML模式下的布局说明和示例格式
    if render_mode == 'html':
        layout_instruction = f"""
Available layout types for scheme "{get_layout_scheme(scheme_id).get('name', 'tech_blue')}":
{get_layout_types_description(scheme_id)}

{get_scheme_style_prompt(scheme_id)}

Layout constraints:
{get_layout_constraints(scheme_id)}

For HTML rendering mode, you MUST include a "layout_id" field for each page based on the content type.
Only use layout_id from the selected scheme above.
"""
        scheme_roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or 'edu_dark', SCHEME_ROLE_LAYOUTS['edu_dark'])
        cover_id = scheme_roles['cover']
        toc_id = scheme_roles['toc']
        ending_id = scheme_roles['ending']
        scheme_layout_ids = [lid for lid in get_layout_scheme(scheme_id).get('layouts', {}).keys()
                             if lid not in {cover_id, toc_id, ending_id}]
        content_id = scheme_layout_ids[0] if scheme_layout_ids else cover_id
        content_id_2 = scheme_layout_ids[1] if len(scheme_layout_ids) > 1 else content_id
        simple_example = f'[{{"title": "title1", "points": ["point1", "point2"], "layout_id": "{cover_id}"}}, {{"title": "title2", "points": ["point1", "point2"], "layout_id": "{content_id}"}}]'
        part_example = f'''[
    {{
    "part": "Part 1: Introduction",
    "pages": [
        {{"title": "Welcome", "points": ["point1", "point2"], "layout_id": "{cover_id}"}},
        {{"title": "Overview", "points": ["point1", "point2"], "layout_id": "{toc_id}"}}
    ]
    }},
    {{
    "part": "Part 2: Main Content",
    "pages": [
        {{"title": "Topic 1", "points": ["point1", "point2"], "layout_id": "{content_id}"}},
        {{"title": "Topic 2", "points": ["point1", "point2"], "layout_id": "{content_id_2}"}}
    ]
    }}
]'''
    else:
        layout_instruction = ""
        simple_example = '[{{"title": "title1", "points": ["point1", "point2"]}}, {{"title": "title2", "points": ["point1", "point2"]}}]'
        part_example = '''[
    {{
    "part": "Part 1: Introduction",
    "pages": [
        {{"title": "Welcome", "points": ["point1", "point2"]}},
        {{"title": "Overview", "points": ["point1", "point2"]}}
    ]
    }},
    {{
    "part": "Part 2: Main Content",
    "pages": [
        {{"title": "Topic 1", "points": ["point1", "point2"]}},
        {{"title": "Topic 2", "points": ["point1", "point2"]}}
    ]
    }}
]'''

    prompt = (f"""\
You are a helpful assistant that analyzes a user-provided PPT description text and extracts the outline structure from it.

The user has provided the following description text:

{description_text}

Your task is to analyze this text and extract the outline structure (titles and key points) for each page.
You should identify:
1. How many pages are described
2. The title for each page
3. The key points or content structure for each page
{layout_instruction}
You can organize the content in two ways:

1. Simple format (for short PPTs without major sections):
{simple_example}

2. Part-based format (for longer PPTs with major sections):
{part_example}

Important rules:
- Extract the outline structure from the description text
- Identify page titles and key points
- If the text has clear sections/parts, use the part-based format
- Preserve the logical structure and organization from the original text
- The points should be concise summaries of the main content for each page
- If one page contains roadmap/overview points, later pages must cover those points (no orphan promises)
- If a page mentions case/example, reserve a later page for case breakdown or takeaway
- Ensure there is a summary/Q&A style page before the ending page

Now extract the outline structure from the description text above. Return only the JSON, don't include any other text.
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_description_to_outline_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_description_split_prompt(project_context: 'ProjectContext', 
                                 outline: List[Dict], 
                                 language: str = None) -> str:
    """
    从描述文本切分出每页描述的 prompt
    
    Args:
        project_context: 项目上下文对象，包含所有原始信息
        outline: 已解析出的大纲结构
        
    Returns:
        格式化后的 prompt 字符串
    """
    outline_json = json.dumps(outline, ensure_ascii=False, indent=2)
    description_text = project_context.description_text or ""
    
    prompt = (f"""\
You are a helpful assistant that splits a complete PPT description text into individual page descriptions.

The user has provided a complete description text:

{description_text}

We have already extracted the outline structure:

{outline_json}

Your task is to split the description text into individual page descriptions based on the outline structure.
For each page in the outline, extract the corresponding description from the original text.

Return a JSON array where each element corresponds to a page in the outline (in the same order).
Each element should be a string containing the page description in the following format:

页面标题：[页面标题]

页面文字：
- [要点1]
- [要点2]
...

Example output format:
[
    "页面标题：人工智能的诞生\\n页面文字：\\n- 1950 年，图灵提出"图灵测试"...",
    "页面标题：AI 的发展历程\\n页面文字：\\n- 1950年代：符号主义...",
    ...
]

Important rules:
- Split the description text according to the outline structure
- Each page description should match the corresponding page in the outline
- Preserve all important content from the original text
- Keep the format consistent with the example above
- If a page in the outline doesn't have a clear description in the text, create a reasonable description based on the outline
- For each page, every item in that page's outline points must appear in the final page description
- Do not leave half sentences or broken bullet fragments; every bullet must be a complete sentence
- Keep cross-page continuity: if a page promises \"case/step/comparison\", the related page descriptions must be explicitly linked

Now split the description text into individual page descriptions. Return only the JSON array, don't include any other text.
{get_language_instruction(language)}
""")
    
    logger.debug(f"[get_description_split_prompt] Final prompt:\n{prompt}")
    return prompt


def get_outline_refinement_prompt(current_outline: List[Dict], user_requirement: str,
                                   project_context: 'ProjectContext',
                                   previous_requirements: Optional[List[str]] = None,
                                   language: str = None) -> str:
    """
    根据用户要求修改已有大纲的 prompt
    
    Args:
        current_outline: 当前的大纲结构
        user_requirement: 用户的新要求
        project_context: 项目上下文对象，包含所有原始信息
        previous_requirements: 之前的修改要求列表（可选）
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    
    # 处理空大纲的情况
    if not current_outline or len(current_outline) == 0:
        outline_text = "(当前没有内容)"
    else:
        outline_text = json.dumps(current_outline, ensure_ascii=False, indent=2)
    
    # 构建之前的修改历史记录
    previous_req_text = ""
    if previous_requirements and len(previous_requirements) > 0:
        prev_list = "\n".join([f"- {req}" for req in previous_requirements])
        previous_req_text = f"\n\n之前用户提出的修改要求：\n{prev_list}\n"
    
    # 构建原始输入信息（根据项目类型显示不同的原始内容）
    original_input_text = "\n原始输入信息：\n"
    if project_context.creation_type == 'idea' and project_context.idea_prompt:
        original_input_text += f"- PPT构想：{project_context.idea_prompt}\n"
    elif project_context.creation_type == 'outline' and project_context.outline_text:
        original_input_text += f"- 用户提供的大纲文本：\n{project_context.outline_text}\n"
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input_text += f"- 用户提供的页面描述文本：\n{project_context.description_text}\n"
    elif project_context.idea_prompt:
        original_input_text += f"- 用户输入：{project_context.idea_prompt}\n"
    
    prompt = (f"""\
You are a helpful assistant that modifies PPT outlines based on user requirements.
{original_input_text}
当前的 PPT 大纲结构如下：

{outline_text}
{previous_req_text}
**用户现在提出新的要求：{user_requirement}**

请根据用户的要求修改和调整大纲。你可以：
- 添加、删除或重新排列页面
- 修改页面标题和要点
- 调整页面的组织结构
- 添加或删除章节（part）
- 合并或拆分页面
- 根据用户要求进行任何合理的调整
- 如果当前没有内容，请根据用户要求和原始输入信息创建新的大纲

输出格式可以选择：

1. 简单格式（适用于没有主要章节的短 PPT）：
[{{"title": "title1", "points": ["point1", "point2"]}}, {{"title": "title2", "points": ["point1", "point2"]}}]

2. 基于章节的格式（适用于有明确主要章节的长 PPT）：
[
    {{
    "part": "第一部分：引言",
    "pages": [
        {{"title": "欢迎", "points": ["point1", "point2"]}},
        {{"title": "概述", "points": ["point1", "point2"]}}
    ]
    }},
    {{
    "part": "第二部分：主要内容",
    "pages": [
        {{"title": "主题1", "points": ["point1", "point2"]}},
        {{"title": "主题2", "points": ["point1", "point2"]}}
    ]
    }}
]

选择最适合内容的格式。当 PPT 有清晰的主要章节时使用章节格式。

质量与连贯性硬约束：
- 若有概述/框架页，其中 points 的每个主题都必须在后续页面被展开。
- 若出现案例/示例，必须有后续复盘或结果启示页。
- 保持相邻页面语义连续，避免主题突变。
- 结束页前必须有总结或答疑页面，形成闭环。

现在请根据用户要求修改大纲，只输出 JSON 格式的大纲，不要包含其他文字。
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_refinement_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_descriptions_refinement_prompt(current_descriptions: List[Dict], user_requirement: str,
                                       project_context: 'ProjectContext',
                                       outline: List[Dict] = None,
                                       previous_requirements: Optional[List[str]] = None,
                                       language: str = None) -> str:
    """
    根据用户要求修改已有页面描述的 prompt
    
    Args:
        current_descriptions: 当前的页面描述列表，每个元素包含 {index, title, description_content}
        user_requirement: 用户的新要求
        project_context: 项目上下文对象，包含所有原始信息
        outline: 完整的大纲结构（可选）
        previous_requirements: 之前的修改要求列表（可选）
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    
    # 构建之前的修改历史记录
    previous_req_text = ""
    if previous_requirements and len(previous_requirements) > 0:
        prev_list = "\n".join([f"- {req}" for req in previous_requirements])
        previous_req_text = f"\n\n之前用户提出的修改要求：\n{prev_list}\n"
    
    # 构建原始输入信息
    original_input_text = "\n原始输入信息：\n"
    if project_context.creation_type == 'idea' and project_context.idea_prompt:
        original_input_text += f"- PPT构想：{project_context.idea_prompt}\n"
    elif project_context.creation_type == 'outline' and project_context.outline_text:
        original_input_text += f"- 用户提供的大纲文本：\n{project_context.outline_text}\n"
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input_text += f"- 用户提供的页面描述文本：\n{project_context.description_text}\n"
    elif project_context.idea_prompt:
        original_input_text += f"- 用户输入：{project_context.idea_prompt}\n"
    
    # 构建大纲文本
    outline_text = ""
    if outline:
        outline_json = json.dumps(outline, ensure_ascii=False, indent=2)
        outline_text = f"\n\n完整的 PPT 大纲：\n{outline_json}\n"
    
    # 构建所有页面描述的汇总
    all_descriptions_text = "当前所有页面的描述：\n\n"
    has_any_description = False
    for desc in current_descriptions:
        page_num = desc.get('index', 0) + 1
        title = desc.get('title', '未命名')
        content = desc.get('description_content', '')
        if isinstance(content, dict):
            content = content.get('text', '')
        
        if content:
            has_any_description = True
            all_descriptions_text += f"--- 第 {page_num} 页：{title} ---\n{content}\n\n"
        else:
            all_descriptions_text += f"--- 第 {page_num} 页：{title} ---\n(当前没有内容)\n\n"
    
    if not has_any_description:
        all_descriptions_text = "当前所有页面的描述：\n\n(当前没有内容，需要基于大纲生成新的描述)\n\n"
    
    prompt = (f"""\
You are a helpful assistant that modifies PPT page descriptions based on user requirements.
{original_input_text}{outline_text}
{all_descriptions_text}
{previous_req_text}
**用户现在提出新的要求：{user_requirement}**

请根据用户的要求修改和调整所有页面的描述。你可以：
- 修改页面标题和内容
- 调整页面文字的详细程度
- 添加或删除要点
- 调整描述的结构和表达
- 确保所有页面描述都符合用户的要求
- 如果当前没有内容，请根据大纲和用户要求创建新的描述
- 每一页必须覆盖该页 outline points，不得遗漏
- 所有 bullet 必须是完整句，禁止“半句/截断句/占位词”
- 案例页必须包含：背景问题、方法动作、结果启示

请为每个页面生成修改后的描述，格式如下：

页面标题：[页面标题]

页面文字：
- [要点1]
- [要点2]
...
其他页面素材（如果有请加上，包括markdown图片链接等）

提示：如果参考文件中包含以 /files/ 开头的本地文件URL图片（例如 /files/mineru/xxx/image.png），请将这些图片以markdown格式输出，例如：![图片描述](/files/mineru/xxx/image.png)，而不是作为普通文本。

请返回一个 JSON 数组，每个元素是一个字符串，对应每个页面的修改后描述（按页面顺序）。

示例输出格式：
[
    "页面标题：人工智能的诞生\\n页面文字：\\n- 1950 年，图灵提出\\"图灵测试\\"...",
    "页面标题：AI 的发展历程\\n页面文字：\\n- 1950年代：符号主义...",
    ...
]

现在请根据用户要求修改所有页面描述，只输出 JSON 数组，不要包含其他文字。
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_descriptions_refinement_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_html_model_refinement_prompt(current_html_models: List[Dict], user_requirement: str,
                                      project_context: 'ProjectContext',
                                      outline: List[Dict] = None,
                                      previous_requirements: Optional[List[str]] = None,
                                      language: str = None) -> str:
    """
    根据用户要求修改已有页面的结构化内容 (html_model) 的 prompt
    
    Args:
        current_html_models: 当前的页面结构化内容列表，每个元素包含 {index, title, layout_id, html_model}
        user_requirement: 用户的新要求
        project_context: 项目上下文对象，包含所有原始信息
        outline: 完整的大纲结构（可选）
        previous_requirements: 之前的修改要求列表（可选）
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    
    # 构建之前的修改历史记录
    previous_req_text = ""
    if previous_requirements and len(previous_requirements) > 0:
        prev_list = "\n".join([f"- {req}" for req in previous_requirements])
        previous_req_text = f"\n\n之前用户提出的修改要求：\n{prev_list}\n"
    
    # 构建原始输入信息
    original_input_text = "\n原始输入信息：\n"
    if project_context.creation_type == 'idea' and project_context.idea_prompt:
        original_input_text += f"- PPT构想：{project_context.idea_prompt}\n"
    elif project_context.creation_type == 'outline' and project_context.outline_text:
        original_input_text += f"- 用户提供的大纲文本：\n{project_context.outline_text}\n"
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input_text += f"- 用户提供的页面描述文本：\n{project_context.description_text}\n"
    elif project_context.idea_prompt:
        original_input_text += f"- 用户输入：{project_context.idea_prompt}\n"
    
    scheme_id = getattr(project_context, 'scheme_id', None) or 'edu_dark'

    # 构建大纲文本
    outline_text = ""
    if outline:
        outline_json = json.dumps(outline, ensure_ascii=False, indent=2)
        outline_text = f"\n\n完整的 PPT 大纲：\n{outline_json}\n"
    
    # 构建所有页面html_model的汇总
    all_models_text = "当前所有页面的结构化内容：\n\n"
    for model_info in current_html_models:
        page_num = model_info.get('index', 0) + 1
        title = model_info.get('title', '未命名')
        layout_id = model_info.get('layout_id', 'title_bullets')
        html_model = model_info.get('html_model', {})
        resolved_layout_id = resolve_layout_id(layout_id)
        schema_template = LAYOUT_SCHEMAS.get(resolved_layout_id, LAYOUT_SCHEMAS['title_bullets'])
        model_json = json.dumps(html_model, ensure_ascii=False, indent=2)
        
        all_models_text += f"--- 第 {page_num} 页：{title} (布局: {layout_id}) ---\n"
        all_models_text += f"当前内容：\n{model_json}\n"
        all_models_text += f"布局Schema参考：\n{schema_template}\n\n"
    
    prompt = (f"""\
You are a helpful assistant that modifies PPT page structured content (html_model) based on user requirements.
{original_input_text}{outline_text}
{get_scheme_style_prompt(scheme_id)}
{all_models_text}
{previous_req_text}
**用户现在提出新的要求：{user_requirement}**

请根据用户的要求修改和调整所有页面的结构化内容（html_model）。你可以：
- 修改页面标题和内容
- 调整页面的各个字段（如 bullets、items、steps 等）
- 添加或删除内容项
- 调整描述的详细程度
- 确保所有修改都符合对应布局的 Schema 格式

重要规则：
1. 必须保持每个页面的 layout_id 不变（不能改变布局类型）
2. 输出的 JSON 结构必须符合对应布局的 Schema
3. 只修改需要修改的内容，其他内容保持原样
4. 返回的页面数量必须与输入相同

请返回一个 JSON 数组，每个元素是一个对象（对应每个页面的修改后 html_model），按页面顺序排列。

示例输出格式：
[
    {{"title": "人工智能的诞生", "author": "张三"}},
    {{"title": "AI的发展历程", "bullets": [{{"text": "要点1", "description": "描述1"}}]}},
    ...
]

注意：
- 每个对象必须是完整的 html_model，不是部分修改
- 数组长度必须等于页面数量（{len(current_html_models)}）
- 只输出 JSON 数组，不要包含其他文字

{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_html_model_refinement_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_clean_background_prompt() -> str:
    """
    生成纯背景图的 prompt（去除文字和插画）
    用于从完整的PPT页面中提取纯背景
    """
    prompt = """\
你是一位专业的图片文字&图片擦除专家。你的任务是从原始图片中移除文字和配图，输出一张无任何文字和图表内容、干净纯净的底板图。
<requirements>
- 彻底移除页面中的所有文字、插画、图表。必须确保所有文字都被完全去除。
- 保持原背景设计的完整性（包括渐变、纹理、图案、线条、色块等）。保留原图的文本框和色块。
- 对于被前景元素遮挡的背景区域，要智能填补，使背景保持无缝和完整，就像被移除的元素从来没有出现过。
- 输出图片的尺寸、风格、配色必须和原图完全一致。
- 请勿新增任何元素。
</requirements>

注意，**任意位置的, 所有的**文字和图表都应该被彻底移除，**输出不应该包含任何文字和图表。**
"""
    logger.debug(f"[get_clean_background_prompt] Final prompt:\n{prompt}")
    return prompt


def get_text_attribute_extraction_prompt(content_hint: str = "") -> str:
    """
    生成文字属性提取的 prompt
    
    提取文字内容、颜色、公式等信息。模型输出的文字将替代 OCR 结果。
    
    Args:
        content_hint: 文字内容提示（OCR 结果参考），如果提供则会在 prompt 中包含
    
    Returns:
        格式化后的 prompt 字符串
    """
    prompt = """你的任务是精确识别这张图片中的文字内容和样式，返回JSON格式的结果。

{content_hint}

## 核心任务
请仔细观察图片，精确识别：
1. **文字内容** - 输出你实际看到的文字符号。
2. **颜色** - 每个字/词的实际颜色
3. **空格** - 精确识别文本中空格的位置和数量
4. **公式** - 如果是数学公式，输出 LaTeX 格式

## 注意事项
- **空格识别**：必须精确还原空格数量，多个连续空格要完整保留，不要合并或省略
- **颜色分割**：一行文字可能有多种颜色，按颜色分割成片段，一般来说只有两种颜色。
- **公式识别**：如果片段是数学公式，设置 is_latex=true 并用 LaTeX 格式输出
- **相邻合并**：相同颜色的相邻普通文字应合并为一个片段

## 输出格式
- colored_segments: 文字片段数组，每个片段包含：
  - text: 文字内容（公式时为 LaTeX 格式，如 "x^2"、"\\sum_{{i=1}}^n"）
  - color: 颜色，十六进制格式 "#RRGGBB"
  - is_latex: 布尔值，true 表示这是一个 LaTeX 公式片段（可选，默认 false）

只返回JSON对象，不要包含任何其他文字。
示例输出：
```json
{{
    "colored_segments": [
        {{"text": "·  创新合成", "color": "#000000"}},
        {{"text": "1827个任务环境", "color": "#26397A"}},
        {{"text": "与", "color": "#000000"}},
        {{"text": "8.5万提示词", "color": "#26397A"}},
        {{"text": "突破数据瓶颈", "color": "#000000"}},
        {{"text": "x^2 + y^2 = z^2", "color": "#FF0000", "is_latex": true}}
    ]
}}
```
""".format(content_hint=content_hint)
    
    # logger.debug(f"[get_text_attribute_extraction_prompt] Final prompt:\n{prompt}")
    return prompt


def get_batch_text_attribute_extraction_prompt(text_elements_json: str) -> str:
    """
    生成批量文字属性提取的 prompt
    
    新逻辑：给模型提供全图和所有文本元素的 bbox 及内容，
    让模型一次性分析所有文本的样式属性。
    
    Args:
        text_elements_json: 文本元素列表的 JSON 字符串，每个元素包含：
            - element_id: 元素唯一标识
            - bbox: 边界框 [x0, y0, x1, y1]
            - content: 文字内容
    
    Returns:
        格式化后的 prompt 字符串
    """
    prompt = f"""你是一位专业的 PPT/文档排版分析专家。请分析这张图片中所有标注的文字区域的样式属性。

我已经从图片中提取了以下文字元素及其位置信息：

```json
{text_elements_json}
```

请仔细观察图片，对比每个文字区域在图片中的实际视觉效果，为每个元素分析以下属性：

1. **font_color**: 字体颜色的十六进制值，格式为 "#RRGGBB"
   - 请仔细观察文字的实际颜色，不要只返回黑色
   - 常见颜色如：白色 "#FFFFFF"、蓝色 "#0066CC"、红色 "#FF0000" 等

2. **is_bold**: 是否为粗体 (true/false)
   - 观察笔画粗细，标题通常是粗体

3. **is_italic**: 是否为斜体 (true/false)

4. **is_underline**: 是否有下划线 (true/false)

5. **text_alignment**: 文字对齐方式
   - "left": 左对齐
   - "center": 居中对齐
   - "right": 右对齐
   - "justify": 两端对齐
   - 如果无法判断，根据文字在其区域内的位置推测

请返回一个 JSON 数组，数组中每个对象对应输入的一个元素（按相同顺序），包含以下字段：
- element_id: 与输入相同的元素ID
- text_content: 文字内容
- font_color: 颜色十六进制值
- is_bold: 布尔值
- is_italic: 布尔值
- is_underline: 布尔值
- text_alignment: 对齐方式字符串

只返回 JSON 数组，不要包含其他文字：
```json
[
    {{
        "element_id": "xxx",
        "text_content": "文字内容",
        "font_color": "#RRGGBB",
        "is_bold": true/false,
        "is_italic": true/false,
        "is_underline": true/false,
        "text_alignment": "对齐方式"
    }},
    ...
]
```
"""
    
    # logger.debug(f"[get_batch_text_attribute_extraction_prompt] Final prompt:\n{prompt}")
    return prompt


# ==================== HTML渲染器专用 Prompt ====================

# 布局ID与用途说明
LAYOUT_DESCRIPTIONS = {
    'cover': '封面页 - 第一页必须用这个，展示标题、副标题、作者等',
    'toc': '目录页 - 列出PPT的章节目录',
    'section_title': '章节标题页 - 用于新章节开始，简洁醒目',
    'title_content': '标题+正文 - 适合详细说明、解释概念',
    'title_bullets': '标题+要点 - 适合多个并列概念、功能特点',
    'two_column': '左右双栏 - 适合对比、图文混排',
    'process_steps': '流程步骤 - 适合操作流程、步骤说明',
    'image_full': '全图页 - 展示大图、案例截图',
    'quote': '引用页 - 名言、金句、重要引用',
    'ending': '结束页 - 最后一页必须用这个，感谢语'
}

# 布局方案（模板体系）
LAYOUT_SCHEMES = {
    'tech_blue': {
        'name': '通用科技风',
        'layouts': LAYOUT_DESCRIPTIONS,
        'style': {
            'colors': '企业蓝 + 雾灰 + 琥珀强调色（禁止高饱和霓虹）',
            'background': '细网格或科技线条仅用于边缘，主体区域保持干净明亮',
            'graphics': '统一线性图标、简洁卡片、细分隔线',
            'density': '中等密度，标题留白充足，内容区块层次明确',
            'rhythm': '问题背景 → 核心要点 → 对比/流程 → 案例图示 → 小结',
            'signature': '流程步骤页/对比双栏页必须出现至少 1 次',
            'avoid': '大面积杂色、卡通过度、边缘信息过满'
        }
    },
    'academic': {
        'name': '学术严谨型',
        'layouts': {
            'cover_academic': '学术封面 - 校徽/课程号/简洁标题',
            'toc_academic': '学术目录 - 章节编号+页码',
            'learning_objectives': '学习目标 - SMART目标卡片',
            'key_concepts': '核心概念 - 术语定义卡片',
            'theory_explanation': '理论讲解 - 左理论右公式/推导',
            'case_study': '案例分析 - 场景→问题→分析→结论',
            'comparison_table': '对比表格 - 多维度对比',
            'diagram_illustration': '图解页 - 结构图/流程图+说明',
            'key_takeaways': '要点总结 - 知识图谱式总结',
            'ending_academic': '学术结束 - 参考文献+延伸阅读+致谢'
        },
        'style': {
            'colors': '石板蓝 + 冷灰 + 金棕强调',
            'background': '轻纸感纹理与学术网格，透明度低且不干扰阅读',
            'graphics': '表格线框、公式块、脚注条，避免夸张装饰',
            'density': '信息密度较高但段落分层清楚，便于讲授',
            'rhythm': '定义 → 原理/推导 → 例题/应用 → 边界条件 → 总结',
            'signature': '理论讲解页（含推导/公式感）必须出现至少 1 次',
            'avoid': '夸张装饰、强视觉冲击插画'
        }
    },
    'interactive': {
        'name': '互动活泼型',
        'layouts': {
            'cover_interactive': '趣味封面 - 大标题+趣味图标',
            'agenda_interactive': '课程地图 - 路线图/时间线导航',
            'warmup_question': '热身问题 - 提问+思考空间',
            'poll_interactive': '投票互动 - 选择题选项卡片',
            'story_narrative': '故事叙述 - 起承转合叙事',
            'group_activity': '小组活动 - 任务说明+分组',
            'mind_map': '思维导图 - 放射状主题结构',
            'quiz_check': '随堂测验 - 填空/选择+反馈',
            'discussion_prompt': '讨论引导 - 开放性问题+角度提示',
            'ending_interactive': '互动结束 - 作业+预告+感谢'
        },
        'style': {
            'colors': '天空蓝 + 活力青 + 橙色点缀，亮但不刺眼',
            'background': '贴纸、对话气泡、手势箭头，仅边缘点缀',
            'graphics': '投票卡片、进度条、问答提示框',
            'density': '留白较多，交互提示清楚，阅读负担低',
            'rhythm': '问题引入 → 投票选择 → 讲解要点 → 小测 → 讨论/结语',
            'signature': '投票/测验页必须出现至少 1 次',
            'avoid': '大段学术文本、严肃灰暗风'
        }
    },
    'visual': {
        'name': '视觉叙事型',
        'layouts': {
            'cover_visual': '视觉封面 - 全图背景+文字叠加',
            'timeline_navigation': '时间线导航 - 横向时间轴',
            'hero_image': '主视觉页 - 全屏图片+底部文字',
            'gallery_grid': '画廊网格 - 多图网格',
            'before_after': '对比展示 - 前后/左右对比',
            'infographic': '信息图表 - 数据可视化',
            'split_screen': '分屏页 - 左图右文/右图左文',
            'video_placeholder': '视频占位 - 视频封面+播放按钮',
            'portfolio_showcase': '作品集页 - 案例展示',
            'ending_visual': '视觉结束 - 全图背景+感谢'
        },
        'style': {
            'colors': '黑白灰主调 + 珊瑚红强调色',
            'background': '海报级光影与胶片颗粒，中心信息区保持干净',
            'graphics': '大图叙事、时间线、分镜式故事板',
            'density': '图像主导，文字克制且句子短',
            'rhythm': '场景大图 → 叙事/时间线 → 前后对比 → 画廊/作品集 → 总结',
            'signature': '时间线/画廊网格页必须出现至少 1 次',
            'avoid': '密集卡片、文字过多'
        }
    },
    'practical': {
        'name': '实践操作型',
        'layouts': {
            'cover_practical': '实操封面 - 工具图标+操作主题',
            'checklist_practical': '准备清单 - 检查列表',
            'safety_notice': '安全提示 - 警告标志+要点',
            'equipment_intro': '器材介绍 - 标注图片+说明',
            'step_by_step': '分步操作 - 垂直编号步骤',
            'detail_zoom': '细节放大 - 主图+局部放大',
            'common_mistakes': '常见错误 - 错误/正确对照',
            'tip_trick': '技巧提示 - 快捷方法/效率提升',
            'practice_exercise': '练习任务 - 操作要求+检查点',
            'ending_practical': '实操结束 - 成果展示+下步预告'
        },
        'style': {
            'colors': '工程绿 + 工业橙 + 中性灰白',
            'background': '工具轮廓与警示条仅边缘出现，操作区域整洁',
            'graphics': '步骤编号、风险标签、检查清单组件',
            'density': '步骤导向，单屏信息不要过载',
            'rhythm': '准备清单 → 安全提示 → 器材介绍 → 分步操作 → 常见错误 → 练习任务',
            'signature': '安全提示/常见错误页必须出现至少 1 次',
            'avoid': '艺术化背景、叙事大图过强'
        }
    },
    'modern': {
        'name': '现代创新型',
        'layouts': {
            'cinematic_overlay': '沉浸全图 - 全屏背景图+底部玻璃态内容面板，适合案例展示、震撼封面',
            'sidebar_card': '左侧导航卡片 - 左侧深色锚点+右侧悬浮卡片，适合目录、多点列举',
            'dark_math': '科技深色分割 - 深色背景+公式卡片，适合硬核概念、技术原理',
            'flow_process': '横向流程图解 - 横向步骤流+连接线，适合流程图解',
            'overlap': '破格叠加 - 60/40非对称分割+叠加效果，适合核心概念引入',
            'grid_matrix': '矩阵宫格 - 2x2宫格布局，适合多点并列、特性对比',
            'diagonal_split': '动感斜切 - 115度斜切分割背景，适合对比展示',
            'concentric_focus': '同心聚焦 - 同心圆目标效果，适合关键问题、转场页',
            'vertical_timeline': '垂直脉络 - 左侧垂直时间线，适合历史回顾、大纲',
            'tri_column': '三柱支撑 - 三列等分+顶部色条，适合三大要素、特点展示'
        },
        'style': {
            'colors': '深海军蓝 + 钢青 + 橙色高亮',
            'background': '大胆渐变、玻璃态与非对称切割，强调空间层次',
            'graphics': '悬浮卡片、柔阴影、几何线条、大标题',
            'density': '中等密度，强调视觉冲击与阅读平衡',
            'rhythm': '沉浸封面 → 导航目录 → 核心概念 → 流程/对比 → 聚焦总结',
            'signature': '沉浸全图页/破格叠加页必须出现至少 1 次',
            'avoid': '传统对称布局、小字体密集文字'
        }
    },
    'edu_dark': {
        'name': '深色教育叙事型',
        'layouts': {
            'edu_cover': '深色封面 - 左文右图，适合课程主题发布',
            'edu_toc': '深色目录 - 高对比目录卡片，适合章节导览',
            'edu_tri_compare': '三栏对比 - 痛点/行动/目标三段式结构',
            'edu_core_hub': '中心模型 - 中心节点+四向关联，适合核心框架说明',
            'edu_timeline_steps': '推进时间轴 - 纵向阶段推进，适合实施路径',
            'edu_logic_flow': '逻辑演进 - 三阶段卡片+箭头，适合课前课中课后链路',
            'edu_data_board': '数据看板 - 指标卡+图表区，适合结果呈现',
            'edu_summary': '反思总结 - 三列复盘+结语收束'
        },
        'style': {
            'colors': '深夜蓝 + 青色高亮 + 蓝绿辅助色',
            'background': '深色渐变与弱光效，中心区域留白保证文字可读',
            'graphics': '高对比卡片、发光边框、流程箭头、数据面板',
            'density': '中高密度，强调结构化信息与阶段推进',
            'rhythm': '封面 → 目录 → 对比/模型 → 实施路径 → 数据结果 → 反思总结',
            'signature': '中心模型页与数据看板页必须至少出现 1 次',
            'avoid': '浅色背景、低对比文本、单一列表反复堆叠'
        }
    }
}

# 方案对应的封面/目录/结束布局ID
SCHEME_ROLE_LAYOUTS = {
    'tech_blue': {'cover': 'cover', 'toc': 'toc', 'ending': 'ending'},
    'academic': {'cover': 'cover_academic', 'toc': 'toc_academic', 'ending': 'ending_academic'},
    'interactive': {'cover': 'cover_interactive', 'toc': 'agenda_interactive', 'ending': 'ending_interactive'},
    'visual': {'cover': 'cover_visual', 'toc': 'timeline_navigation', 'ending': 'ending_visual'},
    'practical': {'cover': 'cover_practical', 'toc': 'checklist_practical', 'ending': 'ending_practical'},
    'modern': {'cover': 'cinematic_overlay', 'toc': 'sidebar_card', 'ending': 'cinematic_overlay'},
    'edu_dark': {'cover': 'edu_cover', 'toc': 'edu_toc', 'ending': 'edu_summary'},
}

# 布局ID别名映射（用于复用现有Schema）
LAYOUT_ID_ALIASES = {
    # academic - 专属布局（learning_objectives, theory_explanation）保持独立
    'cover_academic': 'cover',
    'toc_academic': 'toc',
    # 'learning_objectives': 独立组件，不映射
    'key_concepts': 'title_bullets',
    # 'theory_explanation': 独立组件，不映射
    'case_study': 'title_content',
    'comparison_table': 'two_column',
    'diagram_illustration': 'image_full',
    'key_takeaways': 'title_bullets',
    'ending_academic': 'ending',
    # interactive - 专属布局（warmup_question, poll_interactive）保持独立
    'cover_interactive': 'cover',
    'agenda_interactive': 'toc',
    # 'warmup_question': 独立组件，不映射
    # 'poll_interactive': 独立组件，不映射
    'story_narrative': 'title_content',
    'group_activity': 'title_bullets',
    'mind_map': 'image_full',
    'quiz_check': 'title_bullets',
    'discussion_prompt': 'title_content',
    'ending_interactive': 'ending',
    # visual - 专属布局（timeline, portfolio）保持独立
    'cover_visual': 'cover',
    'timeline_navigation': 'toc',
    'hero_image': 'image_full',
    'gallery_grid': 'image_full',
    'before_after': 'two_column',
    'infographic': 'title_bullets',
    'split_screen': 'two_column',
    'video_placeholder': 'image_full',
    # 'portfolio_showcase': 独立组件，不映射（使用portfolio布局ID）
    'ending_visual': 'ending',
    # practical - 专属布局（safety_notice, detail_zoom）保持独立
    'cover_practical': 'cover',
    'checklist_practical': 'title_bullets',
    # 'safety_notice': 独立组件，不映射
    'equipment_intro': 'two_column',
    'step_by_step': 'process_steps',
    # 'detail_zoom': 独立组件，不映射
    'common_mistakes': 'two_column',
    'tip_trick': 'title_bullets',
    'practice_exercise': 'title_content',
    'ending_practical': 'ending',
    # modern - 现代创新型方案（所有布局都是独立的，不映射）
    # 'sidebar_card': 独立组件，不映射
    # 'dark_math': 独立组件，不映射
    # 'flow_process': 独立组件，不映射
    # 'overlap': 独立组件，不映射
    # 'grid_matrix': 独立组件，不映射
    # 'diagonal_split': 独立组件，不映射
    # 'concentric_focus': 独立组件，不映射
    # 'vertical_timeline': 独立组件，不映射
    # 'tri_column': 独立组件，不映射
    # 'cinematic_overlay': 独立组件，不映射
    # edu_dark - 深色教育叙事型
    'edu_cover': 'cover',
    'edu_toc': 'toc',
    'edu_tri_compare': 'two_column',
    'edu_core_hub': 'title_content',
    'edu_timeline_steps': 'process_steps',
    'edu_logic_flow': 'process_steps',
    'edu_data_board': 'title_bullets',
    'edu_summary': 'ending',
}


def get_layout_scheme(scheme_id: str = None) -> dict:
    scheme = scheme_id or 'edu_dark'
    return LAYOUT_SCHEMES.get(scheme, LAYOUT_SCHEMES['edu_dark'])


def get_layout_types_description(scheme_id: str = None) -> str:
    scheme = get_layout_scheme(scheme_id)
    layouts = scheme['layouts']
    return "\n".join([f"- {lid}: {desc}" for lid, desc in layouts.items()])


def get_scheme_style_prompt(scheme_id: str = None) -> str:
    scheme = get_layout_scheme(scheme_id)
    style = scheme.get('style')
    if not style:
        return ""
    lines = [
        f"- 色系：{style.get('colors')}",
        f"- 背景元素：{style.get('background')}",
        f"- 图形语言：{style.get('graphics')}",
        f"- 版面密度：{style.get('density')}",
        f"- 章节节奏：{style.get('rhythm')}",
        f"- 招牌页：{style.get('signature')}",
        f"- 禁忌：{style.get('avoid')}",
        "- 图像规则：背景图与配图均禁止出现文字、数字、Logo、水印或可识别标记。",
    ]

    # 为每个方案添加专属布局使用指导
    scheme_specific_guidance = {
        'academic': """
- 专属布局使用场景：
  * learning_objectives（学习目标）：在教学内容开始时，列出SMART目标，标注认知层级（记忆/理解/应用/分析）和预计学时
  * theory_explanation（理论讲解）：需要公式推导或理论阐述时使用，左栏文字阐述，右栏LaTeX公式（如β̂=(XᵀX)⁻¹Xᵀy），底部添加参考文献
  * 避免使用表情符号，保持学术严肃感
  * 所有页面（除封面/结束页）显示页脚（课程代码/日期）
""",
        'interactive': """
- 专属布局使用场景：
  * warmup_question（热身问题）：课程开始或新章节引入时使用，提出引导性问题，设置思考时间（如30秒），提供2-3个提示
  * poll_interactive（投票互动）：需要学生参与决策或观点收集时使用，每个选项配上表情符号（如😊🤔💡），显示百分比进度条
  * 必须包含互动元素（投票/测验）至少1次
  * 语气轻松活泼，可适当使用表情符号
""",
        'visual': """
- 专属布局使用场景：
  * timeline（时间轴）：讲述历史发展、项目进度时使用，支持横向/垂直两种方向，每个事件配图标和年份
  * portfolio（作品展示）：展示案例、作品集时使用，网格布局展示多个项目，每个项目包含图片、标题、描述、标签
  * 图像优先，文字克制（每页文字不超过100字）
  * 至少60%的页面应包含大图
""",
        'practical': """
- 专属布局使用场景：
  * safety_notice（安全提示）：操作前的安全说明，使用危险等级（danger/warning/caution）和警告图标（⚠️⚡），配不同颜色（红/橙/黄）
  * detail_zoom（细节标注）：需要详细说明操作细节时使用，主图+标注点（X/Y坐标百分比），每个标注点配说明文字
  * 必须在操作步骤前包含安全提示页
  * 步骤说明具体明确，避免模糊表述
""",
        'edu_dark': """
- 专属布局使用场景：
  * edu_tri_compare（三栏对比）：用于“问题-方案-目标”或“三维对比”页，三栏语义必须不同，禁止重复复述
  * edu_core_hub（中心模型）：用于解释核心机制，center_label 放核心对象，nodes 放四个关键支撑点
  * edu_timeline_steps（推进时间轴）：用于阶段计划，steps 中每阶段需包含“动作+结果”
  * edu_data_board（数据看板）：用于量化结果，metrics 展示关键指标，bars 展示基线与当前对比
  * edu_summary（反思总结）：用于收束与改进，columns 输出 3 组改进点，closing 输出一句总目标
"""
    }

    if scheme_id in scheme_specific_guidance:
        lines.append(scheme_specific_guidance[scheme_id])

    return "方案视觉与结构规范（必须遵循）：\n" + "\n".join(lines)


def resolve_layout_id(layout_id: str) -> str:
    if layout_id in LAYOUT_SCHEMAS:
        return layout_id
    return LAYOUT_ID_ALIASES.get(layout_id, layout_id)


def get_layout_constraints(scheme_id: str = None) -> str:
    scheme = scheme_id or 'edu_dark'
    style = get_layout_scheme(scheme_id).get('style', {})
    layout_count = max(3, len(get_layout_scheme(scheme_id).get('layouts', {})) or 10)
    base = [
        "不要只用 2-3 种布局，整体布局要有明显变化。",
        f"当总页数 >= {layout_count} 时，确保该方案的 {layout_count} 种布局都至少出现 1 次（封面/目录/结束页各 1 次）。",
        "避免连续 3 页使用同一种布局。",
        "每个章节内至少使用 2 种不同的内容布局（避免整章都是同一种样式）。",
        "每页最多 1 个主结论 + 3-5 个支撑点，禁止把整段长文直接铺满页面。",
        "优先保证标题可读性与视觉焦点，任何装饰元素不得压住正文。"
    ]
    signature = style.get('signature')
    if signature:
        base.append(f"招牌页要求：{signature}")
    if scheme == 'tech_blue':
        base.append("tech_blue 内容页建议比例：section_title : title_content : title_bullets : two_column ≈ 2 : 4 : 1 : 3（建议值，允许按语义调整）。")
    return "\n".join([f"- {line}" for line in base])

# 各布局的 Schema 模板
LAYOUT_SCHEMAS = {
    'cover': '{"title": "PPT标题", "subtitle": "副标题(可选)", "author": "作者(可选)", "department": "部门(可选)", "date": "日期(可选)"}',

    'toc': '{"title": "目录", "items": [{"index": 1, "text": "章节名"}, {"index": 2, "text": "章节名"}]}',

    'section_title': '{"section_number": "01", "title": "章节标题", "subtitle": "副标题(可选)"}',

    'title_content': '{"title": "页面标题", "content": ["段落1内容", "段落2内容"], "highlight": "高亮引用文字(可选)", "image": {"src": "", "alt": "图片描述", "position": "right", "width": "40%"}}',

    'title_bullets': '{"title": "页面标题", "subtitle": "副标题(可选)", "bullets": [{"icon": "fa-icon", "text": "要点标题", "description": "详细说明", "example": "具体案例(可选)", "note": "注意事项(可选)", "dataPoint": {"value": "70%", "unit": "提升效率", "source": "数据来源(可选)"}}], "keyTakeaway": "页面核心要点总结(可选)", "image": {"src": "", "alt": "图片描述", "position": "right", "width": "35%"}}',

    'two_column': '{"title": "页面标题", "left": {"type": "text|image|bullets", "header": "左栏标题", "content": ["纯文字段落"], "bullets": [{"icon": "fa-icon", "text": "要点文字"}]}, "right": {"type": "text|image|bullets", "header": "右栏标题", "content": ["纯文字段落"], "bullets": [{"icon": "fa-icon", "text": "要点文字"}]}}（注意：type=text时用content数组放纯文本，type=bullets时用bullets数组放要点对象，不要在content中嵌入HTML标签）',

    'process_steps': '{"title": "页面标题", "subtitle": "副标题(可选)", "steps": [{"number": 1, "label": "步骤名", "description": "说明", "icon": "fa-icon"}], "image": {"src": "", "alt": "图片描述", "width": "50%"}}',

    'image_full': '{"title": "图片标题(可选)", "image_src": "", "image_alt": "图片描述", "caption": "图片说明(可选)"}',

    'quote': '{"quote": "引用的名言或金句", "author": "作者", "source": "来源(可选)"}',

    'ending': '{"title": "感谢观看", "subtitle": "副标题(可选)", "contact": "联系方式(可选)", "reflection_blocks": [{"title": "反思维度标题", "items": ["要点1", "要点2"]}], "closing": "总结金句(可选)"}',

    # 学术方案专属布局
    'learning_objectives': '{"title": "学习目标", "objectives": [{"text": "目标描述", "level": "记忆/理解/应用/分析/综合/评价", "hours": 2, "checked": false}], "course_code": "课程代码(可选)"}',

    'theory_explanation': '{"title": "理论推导", "theory": ["理论段落1", "理论段落2"], "formulas": [{"latex": "LaTeX公式", "explanation": "公式说明"}], "references": ["参考文献1", "参考文献2"]}',

    # 互动方案专属布局
    'warmup_question': '{"question": "思考问题", "thinkTime": 30, "hints": ["提示1", "提示2"]}',

    'poll_interactive': '{"question": "投票问题", "options": [{"text": "选项A", "emoji": "😊"}, {"text": "选项B", "emoji": "🤔"}], "instruction": "投票说明(可选)"}',

    # 视觉方案专属布局
    'timeline': '{"title": "发展历程", "events": [{"year": "2020", "title": "事件标题", "description": "事件描述", "icon": "📅"}], "orientation": "horizontal"}',

    'portfolio': '{"title": "作品展示", "subtitle": "副标题(可选)", "items": [{"image_src": "", "title": "作品标题", "description": "作品描述", "tags": ["标签1", "标签2"]}], "layout": "grid"}',

    # 实践方案专属布局
    'safety_notice': '{"title": "安全须知", "warnings": [{"level": "danger/warning/caution", "text": "警告内容", "icon": "⚠️"}], "summary": "总结说明(可选)"}',

    'detail_zoom': '{"title": "细节标注", "image_src": "", "annotations": [{"x": 30, "y": 40, "label": "标注1", "description": "标注说明"}]}',

    # 现代创新型方案专属布局
    'sidebar_card': '{"title": "目录标题(如01)", "subtitle": "副标题(可选)", "items": [{"index": 1, "title": "章节名", "subtitle": "章节副标题(可选)"}]}',

    'dark_math': '{"title": "理论标题", "subtitle": "副标题(可选)", "description": "理论描述段落", "note": "注意事项(可选)", "formulas": [{"label": "公式名称", "latex": "LaTeX公式", "explanation": "公式说明"}]}',

    'flow_process': '{"title": "流程标题", "steps": [{"number": 1, "label": "步骤名", "description": "步骤说明"}]}',

    'overlap': '{"background_text": "背景大文字(如03)", "label": "标签(如核心概念解析)", "title": "主标题", "description": "描述文字段落", "key_point": "关键点提示", "accent_color": "#e74c3c"}',

    'grid_matrix': '{"title": "矩阵标题", "subtitle": "副标题(可选)", "items": [{"title": "单元格标题", "description": "单元格描述", "tag": "标签(可选)", "accent_color": "#e74c3c"}]}',

    'diagonal_split': '{"left": {"title": "左侧标题", "subtitle": "左侧副标题(可选)", "accent_color": "#e74c3c", "points": ["要点1", "要点2"]}, "right": {"title": "右侧标题", "subtitle": "右侧副标题(可选)", "accent_color": "#3498db", "points": ["要点1", "要点2"]}}',

    'concentric_focus': '{"label": "标签(如KEY QUESTION)", "title": "聚焦标题", "subtitle": "副标题(可选)", "accent_color": "#4a90e2"}',

    'vertical_timeline': '{"title": "时间线标题", "events": [{"title": "事件标题", "description": "事件描述", "is_highlighted": false}], "accent_color": "#27ae60"}',

    'tri_column': '{"title": "三列标题", "columns": [{"number": 1, "title": "列标题", "description": "列描述", "accent_color": "#3498db"}]}',

    'cinematic_overlay': '{"label": "标签(如CASE STUDY)", "title": "主标题", "description": "描述文字", "metric": {"value": "90%", "label": "指标名称"}, "background_image": "背景图片URL(可选)"}',

    # 深色教育叙事方案专属布局
    'edu_cover': '{"title": "封面标题", "subtitle": "副标题(可选)", "author": "汇报人(可选)", "department": "单位(可选)", "date": "日期(可选)", "hero_image": "封面主图URL(可选)"}',

    'edu_toc': '{"title": "目录标题", "subtitle": "目录说明(可选)", "items": [{"index": 1, "text": "章节标题"}]}',

    'edu_tri_compare': '{"title": "三栏对比标题", "badge": "右上角结论标签(可选)", "columns": [{"title": "列标题", "points": ["要点1", "要点2", "要点3"]}, {"title": "列标题", "points": ["要点1", "要点2"]}, {"title": "列标题", "points": ["要点1", "要点2"]}]}',

    'edu_core_hub': '{"title": "核心模型标题", "subtitle": "副标题(可选)", "center_label": "中心概念", "nodes": [{"title": "关联节点1"}, {"title": "关联节点2"}, {"title": "关联节点3"}, {"title": "关联节点4"}]}',

    'edu_timeline_steps': '{"title": "推进步骤标题", "subtitle": "副标题(可选)", "steps": [{"title": "阶段标题", "description": "阶段说明", "highlights": ["动作1", "动作2"]}]}',

    'edu_logic_flow': '{"title": "逻辑演进标题", "stages": [{"title": "阶段标题", "description": "阶段说明"}, {"title": "阶段标题", "description": "阶段说明"}, {"title": "阶段标题", "description": "阶段说明"}]}',

    'edu_data_board': '{"title": "数据看板标题", "subtitle": "右上角指标说明(可选)", "metrics": [{"value": "+45%", "label": "指标名称", "note": "指标备注(可选)"}], "bars": [{"label": "维度名称", "baseline": 60, "current": 85}], "insight": "结果洞察(可选)"}',

    'edu_summary': '{"title": "总结页标题", "columns": [{"title": "分栏标题", "points": ["要点1", "要点2"]}, {"title": "分栏标题", "points": ["要点1"]}, {"title": "分栏标题", "points": ["要点1"]}], "closing": "结语总结(可选)"}'
}


def get_structured_outline_prompt(topic: str, requirements: str = "", language: str = None, scheme_id: str = None) -> str:
    """
    生成带布局信息的结构化大纲 prompt（用于HTML渲染器）

    Args:
        topic: PPT主题
        requirements: 额外要求
        language: 输出语言

    Returns:
        格式化后的 prompt 字符串
    """
    layout_list = get_layout_types_description(scheme_id)
    scheme_name = get_layout_scheme(scheme_id).get('name', 'tech_blue')
    layout_count = max(3, len(get_layout_scheme(scheme_id).get('layouts', {})) or 10)
    scheme_roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or 'edu_dark', SCHEME_ROLE_LAYOUTS['edu_dark'])
    cover_id = scheme_roles['cover']
    toc_id = scheme_roles['toc']
    ending_id = scheme_roles['ending']

    prompt = f"""\
你是一位专业的PPT大纲设计师。请为以下主题生成PPT大纲，返回严格的JSON格式。

主题：{topic}
{"额外要求：" + requirements if requirements else ""}

请生成包含 layout_id + 叙事约束字段 的结构化大纲，格式如下：

{{
  "title": "PPT总标题",
  "narrative_version": 1,
  "pages": [
    {{
      "page_id": "p01",
      "title": "页面标题",
      "layout_id": "cover",
      "has_image": false,
      "keywords": ["关键词1", "关键词2"],
      "depends_on": [],
      "must_cover": ["本页必须覆盖的主题1"],
      "promises_open": [
        {{
          "promise_id": "pr_p03_1",
          "text": "后续需要展开的主题",
          "must_cover": ["关键点A", "关键点B"],
          "target_page_ids": ["p04", "p05"]
        }}
      ],
      "promises_close": ["pr_p02_1"]
    }},
    {{
      "page_id": "p02",
      "title": "目录",
      "layout_id": "toc",
      "has_image": false,
      "keywords": []
    }},
    ...
  ]
}}

可用的 layout_id 及其用途（方案：{scheme_name}）：
{layout_list}

{get_scheme_style_prompt(scheme_id)}

布局约束（需尽量满足）：
{get_layout_constraints(scheme_id)}

布局选择原则：
1. 第一页必须是 {cover_id}（封面）
2. 最后一页必须是 {ending_id}（结束页）
3. 内容丰富的说明用 title_content
4. 多个并列要点用 title_bullets
5. 有操作步骤/流程的用 process_steps
6. 需要对比的内容用 two_column
7. 章节开头用 section_title，**但每个章节必须紧跟2-4页内容页**
8. 有重要图片展示的用 image_full
9. 有名言金句的用 quote
10. 目录页用 {toc_id}

**章节结构硬约束（必须严格遵守）**：
- 如果使用 section_title 作为章节标题页，该章节必须包含至少2-4个内容页
- 章节结构必须是：section_title → 内容页1 → 内容页2 → [可选内容页3-4]
- 内容页可以是：title_content, title_bullets, two_column, process_steps, image_full 等
- **禁止连续两个 section_title**，两个章节之间必须有内容页
- **禁止 section_title 直接跟 ending**，最后一个章节也必须有内容页
- 示例正确结构：cover → toc → section_title("第一章") → title_content → title_bullets → section_title("第二章") → two_column → process_steps → ending

叙事契约硬约束（必须严格遵守）：
- 每页都必须输出 depends_on（依赖页ID列表，首屏可为空）
- 每页都必须输出 must_cover（该页必须覆盖的主题，可为空数组）
- 当页面提出“后续会展开/接下来分析/案例稍后详解”等承诺时，必须在 promises_open 中登记
- promises_open 的每个对象必须包含 promise_id/text，推荐补 target_page_ids
- 后续兑现承诺的页面必须在 promises_close 中写入对应 promise_id
- 严禁出现“promises_open 登记了，但全文没有 promises_close 对应”的情况
- 若本页是概述页且列出3个要点，必须把这3个要点写入 must_cover 或 promises_open

布局多样性约束（硬约束，需尽量满足）：
- 不要只用 2-3 种布局。
- 当总页数 >= {layout_count} 时，确保 {layout_count} 种布局都出现至少 1 次（cover/toc/ending 只能各 1 次）。
- 避免连续 3 页使用同一种布局。
- tech_blue 的内容页比例建议：section_title : title_content : title_bullets : two_column ≈ 2 : 4 : 1 : 3（建议值，不是死规则）。
- “重点展开/原理讲解/概念定义”优先使用 title_content；只有确实是“清单/并列项”才使用 title_bullets，避免连续堆叠。

内容与布局匹配硬约束：
- 标题包含“学习资源/资源推荐/参考资料/工具推荐/学习路径/课程推荐”时，必须使用标题+要点类布局（title_bullets 或其方案对应布局），并设置 has_image=false。
- “对比/差异/优缺点/选择”优先使用对比布局（two_column 或其方案对应布局）。
- “流程/步骤/路径/操作”优先使用步骤布局（process_steps 或其方案对应布局）。

内容连贯性硬约束（必须严格遵守）：
- 若某页是“概述/框架/要点总览”页，points 中每个要点都必须在后续至少一页被展开说明。
- 若某页标题或 points 提到“案例/示例”，必须在后续安排“案例复盘/结果启示”页。
- 页间必须有语义桥接：避免从 A 主题直接跳到无关 B 主题。
- 倒数第二到倒数第四页之间必须出现“总结/回顾/答疑”类页面，形成闭环。
- 严禁出现“提到了但后面完全没讲”的断链主题。

关于 has_image 字段（图片插槽）：
- image_full 布局必须设置 has_image=true（布局核心就是图片）
- title_content/title_bullets/process_steps/two_column 仅在“图片能明显提升理解”时设置 has_image=true，其他情况优先 false
- cover 布局如需背景图可设置 has_image=true
- toc、section_title、quote、ending 通常设置 has_image=false
- 建议整份PPT图片页占比约 20%-35%，并避免连续 3 页以上都需要配图

关于 keywords 字段：
- 如果 has_image=true，必须填写2-5个用于图片生成的关键词，描述图片应该呈现的内容
- 如果 has_image=false，可以留空数组
- 关键词需体现方案风格（如：科技感/学术感/互动贴纸/叙事摄影/工业实操等），并避免出现文字类关键词

请生成15-20页左右的大纲，只返回JSON，不要包含其他文字。
{get_language_instruction(language)}
"""
    return prompt


def get_structured_page_content_prompt(page_outline: dict,
                                       full_outline: dict = None,
                                       language: str = None,
                                       scheme_id: str = None,
                                       continuity_context: dict = None,
                                       rewrite_instruction: str = "") -> str:
    """
    根据大纲生成单个页面的结构化内容（用于HTML渲染器）

    Args:
        page_outline: 当前页面的大纲信息 (page_id, title, layout_id, has_image, keywords)
        full_outline: 完整的PPT大纲（可选，用于上下文参考）
        language: 输出语言

    Returns:
        格式化后的 prompt 字符串
    """
    layout_id = page_outline.get('layout_id', 'title_content')
    resolved_layout_id = resolve_layout_id(layout_id)
    schema_template = LAYOUT_SCHEMAS.get(resolved_layout_id, LAYOUT_SCHEMAS['title_content'])
    has_image = page_outline.get('has_image', False)
    layout_variant = str(page_outline.get('layout_variant') or 'a').strip().lower()
    layout_archetype = page_outline.get('layout_archetype', '')

    # 如果不需要图片，从schema中移除image字段的描述
    if not has_image and 'image' in schema_template:
        # 简化提示，告知不需要image字段
        image_note = "\n注意：此页面不需要配图，请不要在输出中包含 image 字段。"
    else:
        image_note = "\n注意：如果 has_image=true，image.src 字段留空（后续会填充图片）。"

    context_info = ""
    if full_outline:
        context_info = f"\n\n完整PPT大纲（供参考）：\n{json.dumps(full_outline, ensure_ascii=False, indent=2)}"

    continuity_info = ""
    if continuity_context:
        continuity_info = f"""

叙事连续性上下文（必须遵守）：
- 当前页契约（page_contract）：{json.dumps(continuity_context.get('page_contract', {}), ensure_ascii=False)}
- 本页必须关闭承诺（required_close_promise_ids）：{continuity_context.get('required_close_promise_ids', [])}
- 必须关闭承诺详情（required_close_promises）：{json.dumps(continuity_context.get('required_close_promises', []), ensure_ascii=False)}
- 当前未闭环承诺（open_promises，最多3条）：{json.dumps(continuity_context.get('open_promises', []), ensure_ascii=False)}
- 前序页面摘要（prior_page_summaries）：{json.dumps(continuity_context.get('prior_page_summaries', []), ensure_ascii=False)}
- 模板容量限制（template_constraints）：{json.dumps(continuity_context.get('template_constraints', {}), ensure_ascii=False)}
"""

    rewrite_info = ""
    rewrite_instruction = (rewrite_instruction or "").strip()
    if rewrite_instruction:
        rewrite_info = f"""

重写任务（必须严格执行）：
- {rewrite_instruction}
"""

    # TOC 布局特殊指令：必须列出所有章节（section_title）
    if resolved_layout_id == 'toc':
        toc_instruction = """

**目录页特殊要求**：
-- items 数组必须匹配「完整PPT大纲」中所有 section_title 页的标题
-- 每个 item 的 text 必须与对应 section_title 的 title 一致
-- 不要列出内容页，不要添加大纲中不存在的章节
-- items 数量 = section_title 页的数量"""
    else:
        toc_instruction = ""

    # Section title special instruction
    if resolved_layout_id == 'section_title':
        section_instruction = """
**章节页特殊要求**：
- 必须输出 section_number 字段
- 如果页面信息中提供了 section_number，请直接使用，不要改动
- 标题要与目录章节名称一致"""
    else:
        section_instruction = ""

    if resolved_layout_id == 'ending' and layout_variant == 'b':
        variant_instruction = """
**变体约束（ending, variant=b）**：
- 必须输出 reflection_blocks，且至少 3 个 block
- 每个 block 必须包含 title + items（items 至少 1 条）
- 必须输出 closing 作为总结金句"""
    elif resolved_layout_id == 'process_steps' and layout_variant == 'b':
        variant_instruction = """
**变体约束（process_steps, variant=b）**：
- steps 保持 3-4 步，强调阶段递进，适配横向步骤条
- 每步 description 用完整句，不少于 12 字"""
    elif resolved_layout_id == 'title_bullets' and layout_variant == 'b':
        variant_instruction = """
**变体约束（title_bullets, variant=b）**：
- bullets 优先输出 3-5 条，便于右侧纵向卡片堆叠
- 每条 description 用完整句，不少于 15 字"""
    elif layout_id == 'edu_tri_compare' and layout_variant == 'b':
        variant_instruction = """
**变体约束（edu_tri_compare, variant=b）**：
- 采用左右4:6分割布局，左侧为标题区，右侧为3行横向卡片堆叠
- columns 必须恰好 3 个，每列 points 恰好 3 条，每条不超过 6 个字
- 三列语义必须分别对应"痛点/行动/目标"或类似递进关系"""
    elif layout_id == 'edu_timeline_steps' and layout_variant == 'b':
        variant_instruction = """
**变体约束（edu_timeline_steps, variant=b）**：
- 采用水平横向步骤条布局，适配3-4步并排展示
- steps 保持 3 步（推荐），每步 title 不超过 10 字
- 第一步 description 用分条（highlights），其余步骤用段落式描述"""
    elif layout_id == 'edu_summary' and layout_variant == 'b':
        variant_instruction = """
**变体约束（edu_summary, variant=b）**：
- 采用左右3:7不对称分割，左侧放总结金句，右侧堆叠反思卡片
- columns 必须恰好 3 个，每列 points 恰好 3 条
- closing 必须输出，作为左侧核心金句，不超过 30 字"""
    else:
        variant_instruction = ""

    prompt = f"""\
你是一位专业的PPT内容撰写者。请根据以下页面大纲生成详细的页面内容。

页面信息：
- 页面ID: {page_outline.get('page_id', 'unknown')}
- 标题: {page_outline.get('title', '未命名')}
- 布局: {layout_id}
- 语义类型: {layout_archetype or "未指定"}
- 视觉变体: {layout_variant}
- 是否配图: {has_image}
- 关键词: {page_outline.get('keywords', [])}
{context_info}
{continuity_info}
{rewrite_info}

请严格按照以下 JSON 格式输出：
{{
  "model": {schema_template},
  "closed_promise_ids": ["pr_xxx"]
}}

其中：
- model 必须完全符合对应布局 Schema
- closed_promise_ids 表示本页已完成收束的 promise_id 列表
- 若 required_close_promise_ids 非空，closed_promise_ids 必须包含全部 required_close_promise_ids（硬约束）
- 若本页无可关闭承诺，closed_promise_ids 返回 []
{image_note}

{get_scheme_style_prompt(scheme_id)}

内容要求：
1. 方案风格必须符合：{get_layout_scheme(scheme_id).get('name', 'tech_blue')}（遵循该方案的色系、语气与结构风格）
2. 页面正文总字数约 120-180 字（不含标题），确保信息完整，包含定义、原理和应用
3. 必须回答三个层次：是什么（定义/现象，30-40字）→ 为什么重要（原理/意义，50-70字）→ 怎么用（应用/条件，40-60字）
4. 列表页（title_bullets）：每个要点必须包含 text + description，description 25-40 字，至少 3 个要点
5. 概念页（title_content）：content 至少 2 段，每段 1 句，且包含应用或例子
6. 对比页（two_column）：左右信息必须形成对比，并在其中一栏明确结论或选择建议
7. 步骤页（process_steps）：每步包含“动作 + 目的/结果”说明
8. 如果是 bullets 或 steps，提供合适的 FontAwesome 图标（如 fa-check、fa-star、fa-lightbulb 等）
9. 每页要点/段落不超过6个（目录页 toc 布局除外，必须列出所有章节）
10. 如果页面标题包含“学习资源/资源推荐/参考资料/工具推荐/学习路径/课程推荐”，必须输出可执行的资源清单（资源名称+用途/适用人群+使用建议），不要只放图片
11. 页面内容必须覆盖该页大纲 points 的核心语义，不得遗漏要点
12. 所有描述必须是完整句，禁止半句、截断句、占位词（如“待补充”“...”）
13. 案例相关页面必须包含：背景问题、方法动作、结果启示
14. 若是过渡页/总结页，必须明确与前后页的衔接关系（至少一句）
15. 若提供了 open_promises，本页需优先兑现与本页相关的承诺，并保证“承诺->展开->收束”闭环
16. 若提供了 required_close_promise_ids，这是硬约束：必须在正文覆盖对应内容，并在 closed_promise_ids 中返回完整 id 列表
17. 若提供了 must_cover，必须逐项覆盖，不可遗漏
18. 必须遵守 template_constraints，禁止输出超出模板容量的列表或过长文案
{toc_instruction}
{section_instruction}
{variant_instruction}
只返回 JSON 对象，不要包含其他文字。
{get_language_instruction(language)}
"""
    return prompt


def get_structured_page_content_batch_prompt(batch_requests: List[dict],
                                             language: str = None,
                                             scheme_id: str = None) -> str:
    """
    批量生成多个页面的结构化内容（用于减少 API 往返次数）。

    batch_requests item:
    {
      "page_outline": {...},
      "continuity_context": {...},
      "rewrite_instruction": "..."
    }
    """
    normalized_items: List[Dict[str, Any]] = []
    for item in batch_requests or []:
        if not isinstance(item, dict):
            continue
        page_outline = item.get('page_outline') if isinstance(item.get('page_outline'), dict) else {}
        page_id = page_outline.get('page_id')
        layout_id = page_outline.get('layout_id', 'title_content')
        resolved_layout_id = resolve_layout_id(layout_id)
        schema_template = LAYOUT_SCHEMAS.get(resolved_layout_id, LAYOUT_SCHEMAS['title_content'])
        normalized_items.append({
            "page_id": page_id,
            "title": page_outline.get('title', ''),
            "layout_id": layout_id,
            "has_image": bool(page_outline.get('has_image', False)),
            "keywords": page_outline.get('keywords', []),
            "section_number": page_outline.get('section_number'),
            "subtitle": page_outline.get('subtitle'),
            "schema_template": schema_template,
            "continuity_context": item.get('continuity_context') if isinstance(item.get('continuity_context'), dict) else {},
            "rewrite_instruction": str(item.get('rewrite_instruction') or '').strip(),
        })

    payload = json.dumps(normalized_items, ensure_ascii=False, indent=2)
    prompt = f"""\
你是一位专业的PPT内容撰写者。请一次性为多个页面生成结构化内容。

输入页面（按顺序处理）：
{payload}

输出格式（必须严格符合）：
[
  {{
    "page_id": "p03",
    "model": {{ ...对应该页 schema_template... }},
    "closed_promise_ids": ["pr_xxx"]
  }}
]

硬约束：
1. 返回数组长度必须与输入页面数量一致，且 page_id 一一对应。
2. 每页 model 必须严格符合该页 schema_template。
3. 若 continuity_context.required_close_promise_ids 非空，closed_promise_ids 必须包含全部这些 id。
4. 每页必须覆盖 continuity_context.page_contract.must_cover（如果提供）。
5. 必须遵守 continuity_context.template_constraints。
6. 文案要求完整句，避免截断；案例页必须包含背景问题、方法动作、结果启示。

{get_scheme_style_prompt(scheme_id)}

只返回 JSON 数组，不要包含其他文字。
{get_language_instruction(language)}
"""
    return prompt


def get_quality_enhancement_prompt(inpainted_regions: list = None) -> str:
    """
    生成画质提升的 prompt
    用于在百度图像修复后，使用生成式模型提升整体画质
    
    Args:
        inpainted_regions: 被修复区域列表，每个区域包含百分比坐标：
            - left, top, right, bottom: 相对于图片宽高的百分比 (0-100)
            - width_percent, height_percent: 区域宽高占图片的百分比
    """
    import json
    
    # 构建区域信息
    regions_info = ""
    if inpainted_regions and len(inpainted_regions) > 0:
        regions_json = json.dumps(inpainted_regions, ensure_ascii=False, indent=2)
        regions_info = f"""
以下是被抹除工具处理过的具体区域（共 {len(inpainted_regions)} 个矩形区域），请重点修复这些位置：

```json
{regions_json}
```

坐标说明（所有数值都是相对于图片宽高的百分比，范围0-100%）：
- left: 区域左边缘距离图片左边缘的百分比
- top: 区域上边缘距离图片上边缘的百分比  
- right: 区域右边缘距离图片左边缘的百分比
- bottom: 区域下边缘距离图片上边缘的百分比
- width_percent: 区域宽度占图片宽度的百分比
- height_percent: 区域高度占图片高度的百分比

例如：left=10 表示区域从图片左侧10%的位置开始。
"""
    
    prompt = f"""\
你是一位专业的图像修复专家。这张ppt页面图片刚刚经过了文字/对象抹除操作，抹除工具在指定区域留下了一些修复痕迹，包括：
- 色块不均匀、颜色不连贯
- 模糊的斑块或涂抹痕迹
- 与周围背景不协调的区域，比如不和谐的渐变色块
- 可能的纹理断裂或图案不连续
{regions_info}
你的任务是修复这些抹除痕迹，让图片看起来像从未有过对象抹除操作一样自然。

要求：
- **重点修复上述标注的区域**：这些区域刚刚经过抹除处理，需要让它们与周围背景完美融合
- 保持纹理、颜色、图案的连续性
- 提升整体画质，消除模糊、噪点、伪影
- 保持图片的原始构图、布局、色调风格
- 禁止添加任何文字、图表、插画、图案、边框等元素
- 除了上述区域，其他区域不要做任何修改，保持和原图像素级别地一致。
- 输出图片的尺寸必须与原图一致

请输出修复后的高清ppt页面背景图片，不要遗漏修复任何一个被涂抹的区域。
"""
#     prompt = f"""
# 你是一位专业的图像修复专家。请你修复上传的图像，去除其中的涂抹痕迹，消除所有的模糊、噪点、伪影，输出处理后的高清图像，其他区域保持和原图**完全相同**，颜色、布局、线条、装饰需要完全一致.
# {regions_info}
# """
    return prompt
