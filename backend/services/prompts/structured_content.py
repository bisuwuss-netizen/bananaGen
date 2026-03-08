"""Generated modular prompt file for structured_content."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent
import logging

from .layouts import (
    get_layout_types_description,
    get_layout_scheme,
    SCHEME_ROLE_LAYOUTS,
    get_scheme_style_prompt,
    get_layout_constraints,
    resolve_layout_id,
    LAYOUT_SCHEMAS
)
from .language import get_language_instruction

logger = logging.getLogger(__name__)


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
    schema_layout_id = layout_id if layout_id in LAYOUT_SCHEMAS else resolved_layout_id
    schema_template = LAYOUT_SCHEMAS.get(schema_layout_id, LAYOUT_SCHEMAS['title_content'])
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

    if schema_layout_id == 'ending' and layout_variant == 'b':
        variant_instruction = """
**变体约束（ending, variant=b）**：
- 必须输出 reflection_blocks，且至少 3 个 block
- 每个 block 必须包含 title + items（items 至少 1 条）
- 必须输出 closing 作为总结金句"""
    elif schema_layout_id == 'process_steps' and layout_variant == 'b':
        variant_instruction = """
**变体约束（process_steps, variant=b）**：
- steps 保持 3-4 步，强调阶段递进，适配横向步骤条
- 每步 description 用完整句，不少于 12 字"""
    elif schema_layout_id == 'title_bullets' and layout_variant == 'b':
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

    academic_quality_instruction = ""
    if (scheme_id or "").strip().lower() == "academic":
        academic_quality_instruction = """
学术内容质量硬约束（必须遵守）：
- 内容应接近真实教材写法：术语准确、结论稳健、避免夸张营销语。
- 禁止编造精确统计数据、出处和机构结论；不确定时用“通常/一般/常见场景”表达。
- 每页至少包含一个可教学的专业点（概念定义、原理机制、公式含义、案例结论或实训标准）。
- 上下页需形成知识递进（定义→推导/分析→应用/练习→总结），禁止同义重复堆砌。
"""

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
19. 禁止输出空字符串、空对象、纯占位符条目（如“...”“待补充”）；列表项必须是可读内容
{toc_instruction}
{section_instruction}
{variant_instruction}
{academic_quality_instruction}
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
        schema_layout_id = layout_id if layout_id in LAYOUT_SCHEMAS else resolved_layout_id
        schema_template = LAYOUT_SCHEMAS.get(schema_layout_id, LAYOUT_SCHEMAS['title_content'])
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

