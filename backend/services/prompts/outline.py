"""Generated modular prompt file for outline."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent
import logging

from .utils import _format_reference_files_xml
from .layouts import (
    get_layout_scheme,
    get_layout_types_description,
    get_scheme_style_prompt,
    get_layout_constraints,
    SCHEME_ROLE_LAYOUTS
)
from .language import get_language_instruction

logger = logging.getLogger(__name__)


def _get_outline_source_block(project_context: 'ProjectContext') -> str:
    if project_context.creation_type == 'outline' and project_context.outline_text:
        return f"用户提供的大纲文本：\n{project_context.outline_text}"
    if project_context.creation_type == 'descriptions' and project_context.description_text:
        return f"用户提供的长描述：\n{project_context.description_text}"
    return f"用户主题：\n{project_context.idea_prompt or ''}"


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


def get_outline_blueprint_prompt(project_context: 'ProjectContext', language: str = None, render_mode: str = 'image', scheme_id: str = None) -> str:
    """
    生成用于流式渲染的 outline 骨架。

    输出是按最终顺序排好的扁平页面数组，每页只包含标题、章节和精简要点，
    便于后端随后逐页扩写并实时推送到前端。
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    source_block = _get_outline_source_block(project_context)

    if render_mode == 'html':
        layout_instruction = f"""
可用 layout_id（方案：{get_layout_scheme(scheme_id).get('name', 'tech_blue')}）：
{get_layout_types_description(scheme_id)}

{get_scheme_style_prompt(scheme_id)}

布局约束：
{get_layout_constraints(scheme_id)}

每页都必须包含 layout_id，并且只能使用上述方案中的 layout_id。
"""
        page_schema = dedent(
            """\
            {
              "page_id": "p01",
              "title": "页面标题",
              "part": "章节名（可选）",
              "layout_id": "cover",
              "points": ["精简要点1", "精简要点2"],
              "has_image": false,
              "keywords": []
            }
            """
        )
    else:
        layout_instruction = ""
        page_schema = dedent(
            """\
            {
              "page_id": "p01",
              "title": "页面标题",
              "part": "章节名（可选）",
              "points": ["精简要点1", "精简要点2"]
            }
            """
        )

    if project_context.creation_type == 'outline' and project_context.outline_text:
        task_instruction = """
你的任务是把用户提供的大纲文本解析成页面骨架。
- 尽量保留原文措辞，不要改写主题含义
- 按页面拆分，确保每页有标题和 1-3 个精简要点
- 只做结构化整理，不要添加大量新内容
"""
    else:
        task_instruction = """
你的任务是先规划出整份 PPT 的页面骨架，供系统后续逐页生成。
- 先决定最终顺序，再输出完整页面数组
- 每页只写 1-3 个“精简要点”，作为后续逐页扩写的种子
- 标题要明确，避免空泛重复
- 默认包含：封面、导览/目录（如适合）、主体内容、总结/收尾
"""

    prompt = f"""\
你是一位专业的 PPT 结构规划师。请先输出“页面骨架”，用于后续逐页生成。

{source_block}

{task_instruction}

输出要求：
- 仅返回严格 JSON 数组，不要输出解释
- 数组必须是最终页面顺序，不要嵌套 pages
- 页数控制在 8-14 页之间；如果用户输入本身较短，可少于 8 页
- 每页 points 只保留 1-3 个短句，便于后续逐页扩写
- 相邻页面要有清晰递进关系
- 不要连续出现两个纯章节过渡页
- 倒数 2-3 页之间要出现总结/回顾/答疑类页面
{layout_instruction}

单页 JSON 结构示例：
{page_schema}

现在直接返回页面骨架 JSON 数组。
{get_language_instruction(language)}
"""

    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_blueprint_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_outline_page_expansion_prompt(
    project_context: 'ProjectContext',
    page_outline: Dict[str, Any],
    full_outline: List[Dict[str, Any]],
    page_index: int,
    language: str = None,
    render_mode: str = 'image',
    scheme_id: str = None,
) -> str:
    """
    将单个页面骨架扩写成最终 outline 页面。
    """
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    source_block = _get_outline_source_block(project_context)
    page_json = json.dumps(page_outline, ensure_ascii=False, indent=2)
    outline_json = json.dumps(full_outline, ensure_ascii=False, indent=2)

    if render_mode == 'html':
        layout_instruction = f"""
当前页面必须保留 layout_id，并结合该 layout_id 输出合理字段：
- has_image: true/false
- keywords: 0-5 个与配图内容相关的关键词

方案样式：
{get_scheme_style_prompt(scheme_id)}
"""
    else:
        layout_instruction = ""

    if project_context.creation_type == 'outline' and project_context.outline_text:
        content_rule = """
- 这页来源于用户原始大纲，优先保留原意和原始措辞
- 可以做轻微整理和去重，但不要引入用户没提到的核心主题
- points 保持 1-4 条即可
"""
    else:
        content_rule = """
- 在不改变整份 PPT 结构的前提下，把当前页扩写得更完整
- points 生成 3-5 条，句子简洁但要有信息量
- 标题与本页角色要一致，不要改成别的主题
- 如果本页是封面/目录/总结/感谢页，输出应符合该页面角色
"""

    prompt = f"""\
你现在只负责扩写 PPT 大纲中的第 {page_index + 1} 页。

原始输入：
{source_block}

整份页面骨架（仅供参考，不要改动顺序）：
{outline_json}

当前要扩写的页面骨架：
{page_json}

请返回当前页的最终 JSON，对象结构要求：
- 必须保留 title
- 必须输出 points 数组
- 如果当前页有 part，保留 part
- 如果当前页有 page_id，保留 page_id
{layout_instruction}

内容规则：
{content_rule}

只返回当前页 JSON，不要输出解释。
{get_language_instruction(language)}
"""

    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_page_expansion_prompt] Final prompt:\n{final_prompt}")
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
