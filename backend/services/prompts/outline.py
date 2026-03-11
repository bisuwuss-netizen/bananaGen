"""Generated modular prompt file for outline."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent
import logging

from services.ai.base import ProjectContext
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


def _get_outline_source_block(project_context: ProjectContext) -> str:
    if project_context.creation_type == 'outline' and project_context.outline_text:
        return f"用户提供的大纲文本：\n{project_context.outline_text}"
    if project_context.creation_type == 'descriptions' and project_context.description_text:
        return f"用户提供的长描述：\n{project_context.description_text}"
    return f"用户主题：\n{project_context.idea_prompt or ''}"


def get_outline_generation_prompt(project_context: ProjectContext, language: str = None, render_mode: str = 'image', scheme_id: str = None) -> str:
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


def get_outline_blueprint_prompt(project_context: ProjectContext, language: str = None, render_mode: str = 'image', scheme_id: str = None) -> str:
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
    project_context: ProjectContext,
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



def get_outline_parsing_prompt(project_context: ProjectContext, language: str = None, render_mode: str = 'image', scheme_id: str = None) -> str:
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
你是一位专业的PPT大纲解析专家。请将用户提供的大纲文本解析成结构化格式。

用户提供的大纲文本：

{outline_text}

你的任务：
1. **准确理解**：仔细分析用户输入的大纲结构，识别章节、标题、要点之间的层次关系
2. **保持原意**：保留用户原始内容的核心主题和关键信息，不要改变主题含义
3. **合理拆分**：将大纲文本拆分为多个页面，每个页面有明确的标题和1-3个要点
4. **识别章节**：如果大纲中有明确的"第一部分"、"第二部分"等章节标识，使用 part-based 格式
5. **提取要点**：从每个标题下提取关键要点，保持原文本的表述方式

解析原则：
- **必须保留**：用户明确提到的所有主题、章节、标题和要点
- **可以优化**：页面标题可以更精炼，但必须反映原意；要点可以合并或拆分，但核心内容不变
- **结构识别**：识别"第一部分"、"第二部分"等章节结构，正确分配到 part 字段
- **逻辑顺序**：保持用户输入的逻辑顺序，不要随意调整

{layout_instruction}
你可以使用两种格式：

1. 简单格式（适用于没有明确章节的短PPT）：
{simple_example}

2. 章节格式（适用于有明确章节的长PPT）：
{part_example}

重要规则：
- 如果大纲中有"第一部分"、"第二部分"等章节标识，必须使用章节格式
- 每个章节下的内容要正确分配到对应的 part 中
- 页面标题要准确反映用户输入的内容，可以适当精炼但不要改变主题
- 要点要从用户输入中提取，可以适当优化表述但核心内容必须保留
- 不要添加用户没有提到的内容
- 不要删除用户明确提到的主题

现在请解析上述大纲文本，返回结构化格式。只返回JSON，不要包含其他文字。
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_parsing_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_outline_enhancement_prompt(
    parsed_outline: List[Dict],
    project_context: ProjectContext,
    language: str = None,
    render_mode: str = 'image',
    scheme_id: str = None
) -> str:
    """
    基于解析结果对大纲进行丰富和优化的 prompt
    
    Args:
        parsed_outline: 解析后的初步大纲
        project_context: 项目上下文对象
        language: 输出语言代码
        render_mode: 渲染模式 ('image' | 'html')
        scheme_id: 布局方案ID
    
    Returns:
        格式化后的 prompt 字符串
    """
    from .utils import _format_reference_files_xml
    from .layouts import (
        get_layout_types_description,
        get_layout_scheme,
        SCHEME_ROLE_LAYOUTS,
        get_scheme_style_prompt,
        get_layout_constraints,
    )
    from .language import get_language_instruction
    
    files_xml = _format_reference_files_xml(project_context.reference_files_content)
    outline_text = project_context.outline_text or ""
    idea_prompt = project_context.idea_prompt or ""
    
    # HTML模式下的布局说明
    if render_mode == 'html':
        layout_instruction = f"""
可用 layout_id（方案：{get_layout_scheme(scheme_id).get('name', 'tech_blue')}）：
{get_layout_types_description(scheme_id)}

{get_scheme_style_prompt(scheme_id)}

布局约束：
{get_layout_constraints(scheme_id)}

每页都必须包含 layout_id，并且只能使用上述方案中的 layout_id。
"""
        scheme_roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or 'edu_dark', SCHEME_ROLE_LAYOUTS['edu_dark'])
        cover_id = scheme_roles['cover']
        toc_id = scheme_roles['toc']
        ending_id = scheme_roles['ending']
    else:
        layout_instruction = ""
        cover_id = "cover"
        toc_id = "toc"
        ending_id = "ending"
    
    import json
    parsed_outline_json = json.dumps(parsed_outline, ensure_ascii=False, indent=2)
    
    prompt = f"""\
你是一位专业的PPT大纲设计师。请基于用户提供的大纲，对其进行丰富和优化。

用户原始输入：
{outline_text if outline_text else idea_prompt}

已解析的初步大纲结构：
{parsed_outline_json}

你的任务：
1. **保持核心内容**：必须保留用户输入的所有主题、章节和要点，不能删除或改变核心主题
2. **丰富和优化**：
   - 优化页面标题，使其更清晰、专业，但必须反映用户输入的原意
   - 为每个页面补充1-3个关键要点，要点要基于用户输入的内容，可以适当扩展但不要偏离主题
   - 如果用户输入比较简略，可以适当补充相关内容，但必须与主题相关
3. **完善结构**：
   - 添加封面页（标题基于用户输入的主题）
   - 如果页数较多（>6页），添加目录页
   - 在最后添加总结/回顾页
4. **章节处理**：
   - 如果初步大纲中有章节（part），保持章节结构
   - 每个章节下至少要有2-3页内容页
   - 章节标题要清晰反映用户输入的内容
5. **逻辑优化**：
   - 确保页面之间的逻辑顺序合理
   - 确保内容连贯，有清晰的递进关系
   - 避免重复和冗余

{layout_instruction}
输出格式要求：
- 如果初步大纲使用了章节格式（有 part 字段），输出也要使用章节格式
- 如果初步大纲是简单格式，输出也使用简单格式
- 每页必须包含 title 和 points（1-3个要点）
- HTML模式必须为每页添加 layout_id
- 封面页使用 {cover_id}，目录页使用 {toc_id}，结束页使用 {ending_id}

输出示例（简单格式）：
[
  {{
    "title": "封面标题（基于用户输入主题）",
    "points": ["主题概述"],
    "layout_id": "{cover_id}"
  }},
  {{
    "title": "目录",
    "points": ["章节1", "章节2", "章节3"],
    "layout_id": "{toc_id}"
  }},
  {{
    "title": "页面标题（基于用户输入）",
    "points": ["要点1（基于用户输入）", "要点2（可以适当扩展）", "要点3（与主题相关）"],
    "layout_id": "title_content"
  }},
  ...
  {{
    "title": "总结",
    "points": ["核心要点回顾", "学习收获"],
    "layout_id": "{ending_id}"
  }}
]

输出示例（章节格式）：
[
  {{
    "part": "第一部分：章节名（基于用户输入）",
    "pages": [
      {{
        "title": "页面标题",
        "points": ["要点1", "要点2"],
        "layout_id": "title_content"
      }}
    ]
  }},
  {{
    "part": "第二部分：章节名",
    "pages": [...]
  }}
]

重要约束：
- **必须保留**：用户输入的所有主题和核心内容
- **可以优化**：标题表述、要点补充、结构完善
- **不能偏离**：所有补充内容必须与用户输入的主题相关
- **逻辑清晰**：页面顺序和内容要有清晰的逻辑关系

现在请基于上述初步大纲，进行丰富和优化，返回优化后的结构化大纲。只返回JSON，不要包含其他文字。
{get_language_instruction(language)}
"""
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_enhancement_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_description_to_outline_prompt(project_context: ProjectContext, language: str = None, render_mode: str = 'image', scheme_id: str = None) -> str:
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
