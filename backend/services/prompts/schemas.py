"""Generated modular prompt file for schemas."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent

LAYOUT_SCHEMAS = {'cinematic_overlay': '{"label": "标签(如CASE STUDY)", "title": "主标题", "description": "描述文字", "metric": {"value": "90%", '
                      '"label": "指标名称"}, "background_image": "背景图片URL(可选)"}',
 'concentric_focus': '{"label": "标签(如KEY QUESTION)", "title": "聚焦标题", "subtitle": "副标题(可选)", "accent_color": '
                     '"#4a90e2"}',
 'cover': '{"title": "PPT标题", "subtitle": "副标题(可选)", "author": "作者(可选)", "department": "部门(可选)", "date": "日期(可选)"}',
 'dark_math': '{"title": "理论标题", "subtitle": "副标题(可选)", "description": "理论描述段落", "note": "注意事项(可选)", "formulas": '
              '[{"label": "公式名称", "latex": "LaTeX公式", "explanation": "公式说明"}]}',
 'detail_zoom': '{"title": "细节标注", "image_src": "", "annotations": [{"x": 30, "y": 40, "label": "标注1", "description": '
                '"标注说明"}]}',
 'diagonal_split': '{"left": {"title": "左侧标题", "subtitle": "左侧副标题(可选)", "accent_color": "#e74c3c", "points": ["要点1", '
                   '"要点2"]}, "right": {"title": "右侧标题", "subtitle": "右侧副标题(可选)", "accent_color": "#3498db", "points": '
                   '["要点1", "要点2"]}}',
 'edu_core_hub': '{"title": "核心模型标题", "subtitle": "副标题(可选)", "center_label": "中心概念", "nodes": [{"title": "关联节点1"}, '
                 '{"title": "关联节点2"}, {"title": "关联节点3"}, {"title": "关联节点4"}]}',
 'edu_cover': '{"title": "封面标题", "subtitle": "副标题(可选)", "author": "汇报人(可选)", "department": "单位(可选)", "date": "日期(可选)", '
              '"hero_image": "封面主图URL(可选)"}',
 'edu_data_board': '{"title": "数据看板标题", "subtitle": "右上角指标说明(可选)", "metrics": [{"value": "+45%", "label": "指标名称", '
                   '"note": "指标备注(可选)"}], "bars": [{"label": "维度名称", "baseline": 60, "current": 85}], "insight": '
                   '"结果洞察(可选)"}',
 'edu_logic_flow': '{"title": "逻辑演进标题", "stages": [{"title": "阶段标题", "description": "阶段说明"}, {"title": "阶段标题", '
                   '"description": "阶段说明"}, {"title": "阶段标题", "description": "阶段说明"}]}',
 'edu_qa_case': '{"title": "问答/案例标题", "question": "问题描述", "answer": "标准答案/核心方案", "analysis": [{"title": "分析点1标题", "content": "分析内容"}, {"title": "分析点2标题", "content": "分析内容"}], "conclusion": "总结金句/核心提示(可选)"}',
 'edu_summary': '{"title": "总结页标题", "columns": [{"title": "分栏标题", "points": ["要点1", "要点2"]}, {"title": "分栏标题", '
                '"points": ["要点1"]}, {"title": "分栏标题", "points": ["要点1"]}], "closing": "结语总结(可选)"}',
 'edu_timeline_steps': '{"title": "推进步骤标题", "subtitle": "副标题(可选)", "steps": [{"title": "阶段标题", "description": "阶段说明", '
                       '"highlights": ["动作1", "动作2"]}]}',
 'edu_toc': '{"title": "目录标题", "subtitle": "目录说明(可选)", "items": [{"index": 1, "text": "章节标题"}]}',
 'edu_tri_compare': '{"title": "三栏对比标题", "badge": "右上角结论标签(可选)", "columns": [{"title": "列标题", "points": ["要点1", "要点2", '
                    '"要点3"]}, {"title": "列标题", "points": ["要点1", "要点2"]}, {"title": "列标题", "points": ["要点1", "要点2"]}]}',
 'ending': '{"title": "感谢观看", "subtitle": "副标题(可选)", "contact": "联系方式(可选)", "reflection_blocks": [{"title": "反思维度标题", '
           '"items": ["要点1", "要点2"]}], "closing": "总结金句(可选)"}',
 'flow_process': '{"title": "流程标题", "steps": [{"number": 1, "label": "步骤名", "description": "步骤说明"}]}',
 'grid_matrix': '{"title": "矩阵标题", "subtitle": "副标题(可选)", "items": [{"title": "单元格标题", "description": "单元格描述", "tag": '
                '"标签(可选)", "accent_color": "#e74c3c"}]}',
 'image_full': '{"title": "图片标题(可选)", "image_src": "", "image_alt": "图片描述", "caption": "图片说明(可选)"}',
 'learning_objectives': '{"title": "学习目标", "objectives": [{"text": "目标描述", "level": "记忆/理解/应用/分析/综合/评价", "hours": 2, '
                        '"checked": false}], "course_code": "课程代码(可选)"}',
 'overlap': '{"background_text": "背景大文字(如03)", "label": "标签(如核心概念解析)", "title": "主标题", "description": "描述文字段落", '
            '"key_point": "关键点提示", "accent_color": "#e74c3c"}',
 'poll_interactive': '{"question": "投票问题", "options": [{"text": "选项A", "emoji": "😊"}, {"text": "选项B", "emoji": "🤔"}], '
                     '"instruction": "投票说明(可选)"}',
 'portfolio': '{"title": "作品展示", "subtitle": "副标题(可选)", "items": [{"image_src": "", "title": "作品标题", "description": '
              '"作品描述", "tags": ["标签1", "标签2"]}], "layout": "grid"}',
 'process_steps': '{"title": "页面标题", "subtitle": "副标题(可选)", "steps": [{"number": 1, "label": "步骤名", "description": '
                  '"说明", "icon": "fa-icon"}], "image": {"src": "", "alt": "图片描述", "width": "50%"}}',
 'quote': '{"quote": "引用的名言或金句", "author": "作者", "source": "来源(可选)"}',
 'safety_notice': '{"title": "安全须知", "warnings": [{"level": "danger/warning/caution", "text": "警告内容", "icon": "⚠️"}], '
                  '"summary": "总结说明(可选)"}',
 'section_title': '{"section_number": "01", "title": "章节标题", "subtitle": "副标题(可选)"}',
 'sidebar_card': '{"title": "目录标题(如01)", "subtitle": "副标题(可选)", "items": [{"index": 1, "title": "章节名", "subtitle": '
                 '"章节副标题(可选)"}]}',
 'theory_explanation': '{"title": "理论推导", "theory": ["理论段落1", "理论段落2"], "formulas": [{"latex": "LaTeX公式", '
                       '"explanation": "公式说明"}], "references": ["参考文献1", "参考文献2"]}',
 'timeline': '{"title": "发展历程", "events": [{"year": "2020", "title": "事件标题", "description": "事件描述", "icon": "📅"}], '
             '"orientation": "horizontal"}',
 'title_bullets': '{"title": "页面标题", "subtitle": "副标题(可选)", "bullets": [{"icon": "fa-icon", "text": "要点标题", '
                  '"description": "详细说明", "example": "具体案例(可选)", "note": "注意事项(可选)", "dataPoint": {"value": "70%", '
                  '"unit": "提升效率", "source": "数据来源(可选)"}}], "keyTakeaway": "页面核心要点总结(可选)", "image": {"src": "", "alt": '
                  '"图片描述", "position": "right", "width": "35%"}}',
 'title_content': '{"title": "页面标题", "content": ["段落1内容", "段落2内容"], "highlight": "高亮引用文字(可选)", "image": {"src": "", '
                  '"alt": "图片描述", "position": "right", "width": "40%"}}',
 'toc': '{"title": "目录", "items": [{"index": 1, "text": "章节名"}, {"index": 2, "text": "章节名"}]}',
 'tri_column': '{"title": "三列标题", "columns": [{"number": 1, "title": "列标题", "description": "列描述", "accent_color": '
               '"#3498db"}]}',
 'two_column': '{"title": "页面标题", "left": {"type": "text|image|bullets", "header": "左栏标题", "content": ["纯文字段落"], '
               '"bullets": [{"icon": "fa-icon", "text": "要点文字"}]}, "right": {"type": "text|image|bullets", "header": '
               '"右栏标题", "content": ["纯文字段落"], "bullets": [{"icon": "fa-icon", "text": '
               '"要点文字"}]}}（注意：type=text时用content数组放纯文本，type=bullets时用bullets数组放要点对象，不要在content中嵌入HTML标签）',
 'vertical_timeline': '{"title": "时间线标题", "events": [{"title": "事件标题", "description": "事件描述", "is_highlighted": '
                      'false}], "accent_color": "#27ae60"}',
 'warmup_question': '{"question": "思考问题", "thinkTime": 30, "hints": ["提示1", "提示2"]}'}


LAYOUT_SCHEMES = {'academic': {'layouts': {'case_study': '案例分析 - 场景→问题→分析→结论',
                          'comparison_table': '对比表格 - 多维度对比',
                          'cover_academic': '学术封面 - 校徽/课程号/简洁标题',
                          'diagram_illustration': '图解页 - 结构图/流程图+说明',
                          'ending_academic': '学术结束 - 参考文献+延伸阅读+致谢',
                          'key_concepts': '核心概念 - 术语定义卡片',
                          'key_takeaways': '要点总结 - 知识图谱式总结',
                          'learning_objectives': '学习目标 - SMART目标卡片',
                          'theory_explanation': '理论讲解 - 左理论右公式/推导',
                          'toc_academic': '学术目录 - 章节编号+页码'},
              'name': '学术严谨型',
              'style': {'avoid': '夸张装饰、强视觉冲击插画',
                        'background': '轻纸感纹理与学术网格，透明度低且不干扰阅读',
                        'colors': '石板蓝 + 冷灰 + 金棕强调',
                        'density': '信息密度较高但段落分层清楚，便于讲授',
                        'graphics': '表格线框、公式块、脚注条，避免夸张装饰',
                        'rhythm': '定义 → 原理/推导 → 例题/应用 → 边界条件 → 总结',
                        'signature': '理论讲解页（含推导/公式感）必须出现至少 1 次'}},
 'edu_dark': {'layouts': {'edu_core_hub': '中心模型 - 中心节点+四向关联，适合核心框架说明',
                          'edu_cover': '深色封面 - 左文右图，适合课程主题发布',
                          'edu_data_board': '数据看板 - 指标卡+图表区，适合结果呈现',
                          'edu_logic_flow': '逻辑演进 - 三阶段卡片+箭头，适合课前课中课后链路',
                          'edu_qa_case': '问答与案例 - 适合展示典型提问、专业解答及背后逻辑分析',
                          'edu_summary': '反思总结 - 三列复盘+结语收束',
                          'edu_timeline_steps': '推进时间轴 - 纵向阶段推进，适合实施路径',
                          'edu_toc': '深色目录 - 高对比目录卡片，适合章节导览',
                          'edu_tri_compare': '三栏对比 - 痛点/行动/目标三段式结构'},
              'name': '深色教育叙事型',
              'style': {'avoid': '浅色背景、低对比文本、单一列表反复堆叠',
                        'background': '深色渐变与弱光效，中心区域留白保证文字可读',
                        'colors': '深夜蓝 + 青色高亮 + 蓝绿辅助色',
                        'density': '中高密度，强调结构化信息与阶段推进',
                        'graphics': '高对比卡片、发光边框、流程箭头、数据面板',
                        'rhythm': '封面 → 目录 → 对比/模型 → 实施路径 → 数据结果 → 反思总结',
                        'signature': '中心模型页与数据看板页必须至少出现 1 次'}},
 'interactive': {'layouts': {'agenda_interactive': '课程地图 - 路线图/时间线导航',
                             'cover_interactive': '趣味封面 - 大标题+趣味图标',
                             'discussion_prompt': '讨论引导 - 开放性问题+角度提示',
                             'ending_interactive': '互动结束 - 作业+预告+感谢',
                             'group_activity': '小组活动 - 任务说明+分组',
                             'mind_map': '思维导图 - 放射状主题结构',
                             'poll_interactive': '投票互动 - 选择题选项卡片',
                             'quiz_check': '随堂测验 - 填空/选择+反馈',
                             'story_narrative': '故事叙述 - 起承转合叙事',
                             'warmup_question': '热身问题 - 提问+思考空间'},
                 'name': '互动活泼型',
                 'style': {'avoid': '大段学术文本、严肃灰暗风',
                           'background': '贴纸、对话气泡、手势箭头，仅边缘点缀',
                           'colors': '天空蓝 + 活力青 + 橙色点缀，亮但不刺眼',
                           'density': '留白较多，交互提示清楚，阅读负担低',
                           'graphics': '投票卡片、进度条、问答提示框',
                           'rhythm': '问题引入 → 投票选择 → 讲解要点 → 小测 → 讨论/结语',
                           'signature': '投票/测验页必须出现至少 1 次'}},
 'modern': {'layouts': {'cinematic_overlay': '沉浸全图 - 全屏背景图+底部玻璃态内容面板，适合案例展示、震撼封面',
                        'concentric_focus': '同心聚焦 - 同心圆目标效果，适合关键问题、转场页',
                        'dark_math': '科技深色分割 - 深色背景+公式卡片，适合硬核概念、技术原理',
                        'diagonal_split': '动感斜切 - 115度斜切分割背景，适合对比展示',
                        'flow_process': '横向流程图解 - 横向步骤流+连接线，适合流程图解',
                        'grid_matrix': '矩阵宫格 - 2x2宫格布局，适合多点并列、特性对比',
                        'overlap': '破格叠加 - 60/40非对称分割+叠加效果，适合核心概念引入',
                        'sidebar_card': '左侧导航卡片 - 左侧深色锚点+右侧悬浮卡片，适合目录、多点列举',
                        'tri_column': '三柱支撑 - 三列等分+顶部色条，适合三大要素、特点展示',
                        'vertical_timeline': '垂直脉络 - 左侧垂直时间线，适合历史回顾、大纲'},
            'name': '现代创新型',
            'style': {'avoid': '传统对称布局、小字体密集文字',
                      'background': '大胆渐变、玻璃态与非对称切割，强调空间层次',
                      'colors': '深海军蓝 + 钢青 + 橙色高亮',
                      'density': '中等密度，强调视觉冲击与阅读平衡',
                      'graphics': '悬浮卡片、柔阴影、几何线条、大标题',
                      'rhythm': '沉浸封面 → 导航目录 → 核心概念 → 流程/对比 → 聚焦总结',
                      'signature': '沉浸全图页/破格叠加页必须出现至少 1 次'}},
 'practical': {'layouts': {'checklist_practical': '准备清单 - 检查列表',
                           'common_mistakes': '常见错误 - 错误/正确对照',
                           'cover_practical': '实操封面 - 工具图标+操作主题',
                           'detail_zoom': '细节放大 - 主图+局部放大',
                           'ending_practical': '实操结束 - 成果展示+下步预告',
                           'equipment_intro': '器材介绍 - 标注图片+说明',
                           'practice_exercise': '练习任务 - 操作要求+检查点',
                           'safety_notice': '安全提示 - 警告标志+要点',
                           'step_by_step': '分步操作 - 垂直编号步骤',
                           'tip_trick': '技巧提示 - 快捷方法/效率提升'},
               'name': '实践操作型',
               'style': {'avoid': '艺术化背景、叙事大图过强',
                         'background': '工具轮廓与警示条仅边缘出现，操作区域整洁',
                         'colors': '工程绿 + 工业橙 + 中性灰白',
                         'density': '步骤导向，单屏信息不要过载',
                         'graphics': '步骤编号、风险标签、检查清单组件',
                         'rhythm': '准备清单 → 安全提示 → 器材介绍 → 分步操作 → 常见错误 → 练习任务',
                         'signature': '安全提示/常见错误页必须出现至少 1 次'}},
 'tech_blue': {'layouts': {'cover': '封面页 - 第一页必须用这个，展示标题、副标题、作者等',
                           'ending': '结束页 - 最后一页必须用这个，感谢语',
                           'image_full': '全图页 - 展示大图、案例截图',
                           'process_steps': '流程步骤 - 适合操作流程、步骤说明',
                           'quote': '引用页 - 名言、金句、重要引用',
                           'section_title': '章节标题页 - 用于新章节开始，简洁醒目',
                           'title_bullets': '标题+要点 - 适合多个并列概念、功能特点',
                           'title_content': '标题+正文 - 适合详细说明、解释概念',
                           'toc': '目录页 - 列出PPT的章节目录',
                           'two_column': '左右双栏 - 适合对比、图文混排'},
               'name': '通用科技风',
               'style': {'avoid': '大面积杂色、卡通过度、边缘信息过满',
                         'background': '细网格或科技线条仅用于边缘，主体区域保持干净明亮',
                         'colors': '企业蓝 + 雾灰 + 琥珀强调色（禁止高饱和霓虹）',
                         'density': '中等密度，标题留白充足，内容区块层次明确',
                         'graphics': '统一线性图标、简洁卡片、细分隔线',
                         'rhythm': '问题背景 → 核心要点 → 对比/流程 → 案例图示 → 小结',
                         'signature': '流程步骤页/对比双栏页必须出现至少 1 次'}},
 'visual': {'layouts': {'before_after': '对比展示 - 前后/左右对比',
                        'cover_visual': '视觉封面 - 全图背景+文字叠加',
                        'ending_visual': '视觉结束 - 全图背景+感谢',
                        'gallery_grid': '画廊网格 - 多图网格',
                        'hero_image': '主视觉页 - 全屏图片+底部文字',
                        'infographic': '信息图表 - 数据可视化',
                        'portfolio_showcase': '作品集页 - 案例展示',
                        'split_screen': '分屏页 - 左图右文/右图左文',
                        'timeline_navigation': '时间线导航 - 横向时间轴',
                        'video_placeholder': '视频占位 - 视频封面+播放按钮'},
            'name': '视觉叙事型',
            'style': {'avoid': '密集卡片、文字过多',
                      'background': '海报级光影与胶片颗粒，中心信息区保持干净',
                      'colors': '黑白灰主调 + 珊瑚红强调色',
                      'density': '图像主导，文字克制且句子短',
                      'graphics': '大图叙事、时间线、分镜式故事板',
                      'rhythm': '场景大图 → 叙事/时间线 → 前后对比 → 画廊/作品集 → 总结',
                      'signature': '时间线/画廊网格页必须出现至少 1 次'}}}


SCHEME_ROLE_LAYOUTS = {'academic': {'cover': 'cover_academic', 'ending': 'ending_academic', 'toc': 'toc_academic'},
 'edu_dark': {'cover': 'edu_cover', 'ending': 'edu_summary', 'toc': 'edu_toc'},
 'interactive': {'cover': 'cover_interactive', 'ending': 'ending_interactive', 'toc': 'agenda_interactive'},
 'modern': {'cover': 'cinematic_overlay', 'ending': 'cinematic_overlay', 'toc': 'sidebar_card'},
 'practical': {'cover': 'cover_practical', 'ending': 'ending_practical', 'toc': 'checklist_practical'},
 'tech_blue': {'cover': 'cover', 'ending': 'ending', 'toc': 'toc'},
 'visual': {'cover': 'cover_visual', 'ending': 'ending_visual', 'toc': 'timeline_navigation'}}


LAYOUT_ID_ALIASES = {'agenda_interactive': 'toc',
 'before_after': 'two_column',
 'case_study': 'title_content',
 'checklist_practical': 'title_bullets',
 'common_mistakes': 'two_column',
 'comparison_table': 'two_column',
 'cover_academic': 'cover',
 'cover_interactive': 'cover',
 'cover_practical': 'cover',
 'cover_visual': 'cover',
 'diagram_illustration': 'image_full',
 'discussion_prompt': 'title_content',
 'edu_core_hub': 'title_content',
 'edu_cover': 'cover',
 'edu_data_board': 'title_bullets',
 'edu_logic_flow': 'process_steps',
 'edu_summary': 'ending',
 'edu_timeline_steps': 'process_steps',
 'edu_toc': 'toc',
 'edu_tri_compare': 'two_column',
 'ending_academic': 'ending',
 'ending_interactive': 'ending',
 'ending_practical': 'ending',
 'ending_visual': 'ending',
 'equipment_intro': 'two_column',
 'gallery_grid': 'image_full',
 'group_activity': 'title_bullets',
 'hero_image': 'image_full',
 'infographic': 'title_bullets',
 'key_concepts': 'title_bullets',
 'key_takeaways': 'title_bullets',
 'mind_map': 'image_full',
 'practice_exercise': 'title_content',
 'quiz_check': 'title_bullets',
 'split_screen': 'two_column',
 'step_by_step': 'process_steps',
 'story_narrative': 'title_content',
 'timeline_navigation': 'toc',
 'tip_trick': 'title_bullets',
 'toc_academic': 'toc',
 'video_placeholder': 'image_full'}


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

