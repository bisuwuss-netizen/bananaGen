"""Generated modular prompt file for description."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent
import logging

from services.ai.base import ProjectContext
from .utils import (
    _format_reference_files_xml,
    _truncate_prompt_text,
    _build_compact_outline_context
)
from .language import get_language_instruction

logger = logging.getLogger(__name__)


def _build_layout_context(page_outline: dict, page_index: int) -> str:
    """Extract layout_id and narrative contract from page_outline for prompt injection."""
    if not isinstance(page_outline, dict):
        return ""
    layout_id = page_outline.get('layout_id', '')
    must_cover = page_outline.get('must_cover', [])
    promises_close = page_outline.get('promises_close', [])
    promises_open = page_outline.get('promises_open', [])

    layout_guidance_map = {
        'title_content': '深度讲解型：正文段落形式，每段"定义→原理→应用"递进，字数可较多（150-200字）',
        'title_bullets': '要点列表型：每条bullet包含"核心概念｜关键解释｜应用提示"三层，不要只写标题，要有实质解释',
        'two_column': '左右对比型：左栏与右栏需有明确对标维度（如"传统方法 vs 新方法"），各自内容对称',
        'process_steps': '步骤流程型：每步必须有具体动作描述（动词开头），并给出成功标志或注意要点',
        'case_study': '案例分析型：必须完整包含"场景背景→面临挑战→解决方法→结果启示"四个部分',
        'academic_narrative': '学术叙述型：正文要有"定义→原理→应用"递进，旁注解释关键术语，引用真实资料',
        'academic_practice': '实训任务型：必须给出可执行的操作要求，并列出评价标准，禁止概念堆砌',
        'theory_explanation': '理论讲解型：左侧理论阐述+右侧关键公式/推导，内容要有学术深度',
        'comparison_table': '对比表格型：多维度对比（至少3个维度），每个对比项要有具体数据或示例',
        'learning_objectives': '学习目标型：每条目标按SMART原则，标注认知层级（记忆/理解/应用/分析）',
        'edu_qa_case': '问答案例型：必须给出真实问题场景、专业解答逻辑和背后分析要点',
        'edu_data_board': '数据看板型：需要具体指标数值，禁止使用模糊描述（如"显著提升"），要给出量化结果',
        'sop_vertical_steps': 'SOP操作型：每步骤需有具体操作动作，配合注意事项或风险提示',
        'vocational_bullets': '职教要点型：每条包含专业规范要求，结合职业场景，不能只是概念性内容',
        'vocational_content': '职教讲解型：结合实际操作场景，内容要有实训价值，可引用规范标准',
        'safety_notice': '安全须知型：必须列出具体禁忌操作和违规后果，语气严肃，图标辅助',
        'warmup_question': '互动引入型：抛出开放性问题，提供2-3个思考角度，不要直接给答案',
    }

    lines = []
    if layout_id:
        guidance = layout_guidance_map.get(layout_id, '')
        lines.append(f"【当前页布局】{layout_id}" + (f"：{guidance}" if guidance else ""))

    if must_cover:
        items = '、'.join(str(p) for p in must_cover[:5])
        lines.append(f"【大纲要求覆盖】{items}（以上要点必须全部体现在描述中）")

    if promises_close:
        items = '、'.join(str(p) for p in promises_close[:3])
        lines.append(f"【需要关闭的前期承诺】{items}（前面页面已提及，本页必须兑现）")

    if promises_open and page_index > 1:
        items = '、'.join(str(p) for p in promises_open[:2])
        lines.append(f"【本页可引出的下一话题】{items}（在结尾用一句过渡语自然引出）")

    return '\n'.join(lines)


def get_page_description_prompt(project_context: ProjectContext, outline: list,
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
        page_title = page_outline.get('title', '') if page_outline else ''
        original_input = (
            f"用户提供的大纲（仅供主题参照）：\n{project_context.outline_text}\n\n"
            f"当前页面主题：{page_title}\n"
            f"请聚焦于当前页面主题，用大纲作为背景参照，不要把整份大纲的内容都塞进当前页面。"
        )
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input = f"用户提供的描述：\n{project_context.description_text}"
    else:
        original_input = project_context.idea_prompt or ""
    original_input = _truncate_prompt_text(original_input, max_chars=1200)

    outline_context = _build_compact_outline_context(outline, focus_page_index=page_index)
    layout_context = _build_layout_context(page_outline, page_index)

    prompt = (f"""\
我们正在为PPT的每一页生成内容描述。
用户的原始需求是：\n{original_input}\n
我们已经有了压缩后的大纲上下文（仅保留关键页和当前页附近页面）：\n{outline_context}\n{part_info}
现在请为第 {page_index} 页生成描述：
{page_outline}
{"**除非特殊要求，第一页的内容需要保持极简，只放标题副标题以及演讲人等（输出到标题后）, 不添加任何素材。**" if page_index == 1 else ""}
{(chr(10) + layout_context) if layout_context else ""}
【重要提示】生成的"页面文字"部分会直接渲染到PPT页面上，因此请务必注意：
1. 【内容深度要求】根据布局类型调整深度——
   - 讲解型（title_content、academic_narrative、theory_explanation）：每段"定义→原理→应用"递进，字数150-200字
   - 要点型（title_bullets、vocational_bullets、learning_objectives）：每条"核心概念｜关键解释｜应用提示"，每条50-75字
   - 案例型（case_study、edu_qa_case）：完整的"背景→挑战→方法→结论"四段式，字数160-220字
   - 流程型（process_steps、sop_vertical_steps）：每步"动作描述（30-50字）+成功标志"
   默认：每条要点包含"核心概念（10-15字）｜关键解释（25-35字）｜应用提示（可选）"
2. 每页总字数：120-200字（适合学生阅读和复习）
3. 条理清晰，使用列表形式组织内容
4. 确保内容可读性强，适合在教学时展示
5. 不要包含任何额外的说明性文字或注释
6. 必须覆盖当前页面大纲中的每个 points 条目，不能遗漏承诺点
7. 每个 bullet 必须是完整句，禁止半句、断句、占位词（如"待补充""..."）
8. 如果当前页是案例/示例页，必须包含：问题背景、方法动作、结果启示
9. 与前后页保持衔接：本页结尾要能自然引出下一页主题（简短一句即可）

输出格式示例：
页面标题：原始社会：与自然共生
{"副标题：人类祖先和自然的相处之道" if page_index == 1 else ""}

页面文字：
- 狩猎采集文明：人类活动规模小，对环境影响有限，这种低碳足迹为现代可持续发展提供了启示
- 依赖性强：生活完全依赖自然资源的直接供给，限制了文明扩张速度，反而保护了生态
- 适应而非改造：通过观察学习自然规律，发展出契合生态周期的生存技能
- 影响特点：局部、短期、低强度，生态系统能够自我调节恢复

其他页面素材（如果文件中存在请积极添加，包括markdown图片链接、公式、表格等）

【关于图片】如果参考文件中包含以 /files/ 开头的本地文件URL图片（例如 /files/reference_files/xxx/image.png），请将这些图片以markdown格式输出，例如：![图片描述](/files/reference_files/xxx/image.png)。这些图片会被包含在PPT页面中。

{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_page_description_prompt] Final prompt:\n{final_prompt}")
    return final_prompt



def get_page_descriptions_batch_prompt(project_context: ProjectContext,
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
        original_input = (
            f"用户提供的大纲（仅供主题参照）：\n{project_context.outline_text}\n\n"
            f"注意：批量生成时，每页内容应聚焦于该页自身的主题，而非重复整份大纲。"
        )
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
3. 使用"页面标题 + 页面文字（bullet）"格式。
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



def get_description_split_prompt(project_context: ProjectContext, 
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
