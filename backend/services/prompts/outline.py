"""Generated modular prompt file for outline."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent

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


