"""Generated modular prompt file for description."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent

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


