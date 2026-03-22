"""Generated modular prompt file for layouts."""
from typing import List, Dict, Optional, Any
import json
from textwrap import dedent

LAYOUT_DESCRIPTIONS = {'cover': '封面页 - 第一页必须用这个，展示标题、副标题、作者等',
 'ending': '结束页 - 最后一页必须用这个，感谢语',
 'image_full': '全图页 - 展示大图、案例截图',
 'process_steps': '流程步骤 - 适合操作流程、步骤说明',
 'quote': '引用页 - 名言、金句、重要引用',
 'section_title': '章节标题页 - 用于新章节开始，简洁醒目',
 'title_bullets': '标题+要点 - 适合多个并列概念、功能特点',
 'title_content': '标题+正文 - 适合详细说明、解释概念',
 'toc': '目录页 - 列出PPT的章节目录',
 'two_column': '左右双栏 - 适合对比、图文混排'}


LAYOUT_SCHEMES = {'academic': {'layouts': {'academic_narrative': '长文叙述 - 主叙述+边注，适合章节讲解',
                          'academic_practice': '随堂测验/实训 - 题干+选项或操作要求',
                          'case_study': '案例分析 - 场景→问题→分析→结论',
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
                          'edu_summary': '反思总结 - 三列复盘+结语收束',
                          'edu_timeline_steps': '推进时间轴 - 纵向阶段推进，适合实施路径',
                          'edu_toc': '深色目录 - 高对比目录卡片，适合章节导览',
                          'edu_qa_case': '问答与案例 - 适合展示典型提问、专业解答及背后逻辑分析',
                          'edu_tri_compare': '三栏对比 - 痛点/行动/目标三段式结构'},
              'name': '深色教育叙事型',
              'style': {'avoid': '浅色背景、低对比文本、单一列表反复堆叠',
                        'background': '深色渐变与弱光效，中心区域留白保证文字可读',
                        'colors': '深夜蓝 + 青色高亮 + 蓝绿辅助色',
                        'density': '中高密度，强调结构化信息与阶段推进',
                        'graphics': '高对比卡片、发光边框、流程箭头、数据面板',
                        'rhythm': '封面 → 目录 → 对比/模型 → 实施路径 → 数据结果 → 反思总结',
                        'signature': '中心模型页与数据看板页必须至少出现 1 次'}},
 'interactive': {'layouts': {'agenda_path': '学程地图 - 职业能力提升路径图',
                             'case_discussion': '案例研讨 - 问题描述+小组探究引导点',
                             'cover_interactive': '导入封面 - 趣味教学标题+情境图标',
                             'ending_interactive': '评价结语 - 任务点评+下步预告+致谢',
                             'feedback_poll': '即时反馈 - 选择性观点收集卡片',
                             'group_collab': '协作任务 - 具体的任务分工与产出要求',
                             'mind_map_structure': '知识脑图 - 放射状逻辑总结',
                             'quiz_interaction': '交互测验 - 知识点过关检测',
                             'role_play_scenario': '情境模拟 - 角色设定+操作场景描述',
                             'warmup_inquiry': '课前探究 - 启发性提问+思考引导线'},
                 'name': '互动探究型',
                 'style': {'avoid': '枯燥概念堆砌、过亮对比色、非教学性质的卡通装饰',
                           'background': '极简几何线条与网格点阵，营造开放研讨的氛围',
                           'colors': '职教绿 + 澄净青 + 暖阳橙点缀',
                           'density': '中低密度，突出交互控制点与讨论区',
                           'graphics': '气泡框、进度环、互动图标、任务卡片',
                           'rhythm': '导入情境 → 思考启发 → 知识研讨 → 团队交互 → 自测总结',
                           'signature': '案例研讨页/协作任务页在每一章中必选其一'}},
 'modern': {'layouts': {'business_canvas': '业务看板 - 行业要素分析矩阵',
                        'comparison_matrix': '标准对比 - 行业规范/法律条款的横向对照',
                        'cover_modern': '管理封面 - 高清行业背景+专业留白标题',
                        'ending_modern': '总结展望 - 管理要点提炼+行业愿景',
                        'legal_regulation': '规则解析 - 条款原件+专家级解读',
                        'org_structure_flow': '组织架构 - 职能分工与汇报流转',
                        'process_sop_standard': '标杆流程 - 标准化业务流转节点',
                        'stat_report': '运行分析 - 数据化指标与趋势洞察',
                        'strategic_pillars': '核心支柱 - 顶层设计的三足鼎立模型',
                        'toc_modern': '专业导览 - 模块化的章节链接卡片'},
            'name': '管理实务型',
            'style': {'avoid': '散乱的涂鸦元素、低对比度的艺术背景',
                      'background': '职场质感底色与大面积色块分割，体现管理秩序感',
                      'colors': '睿智灰 + 企业蓝 + 商务金强调',
                      'density': '中等密度，强调逻辑的递进与条款的严敏',
                      'graphics': '精细线框、表格矩阵、层级结构图、标准图标',
                      'rhythm': '现状背景 → 政策/规范 → 方案/矩阵 → 执行流程 → 效果预测',
                      'signature': '标准对比页/标杆流程页至少出现 1 次以体现专业深度'}},
 'practical': {'layouts': {'checklist_verification': '核查清单 - 任务前的准备与物料点检',
                           'common_faults': '故障排除 - 常见错漏对照及修复手册',
                           'cover_practical': '实训封面 - 现场设备背景+清晰课题名',
                           'detail_specs': '零件精度 - 高清部组件图+精密参数表',
                           'ending_practical': '实训总结 - 自我评价+成果交付说明',
                           'equipment_orientation': '设备认知 - 器材外形图+功能定义',
                           'safety_protocol': '安全禁令 - 红线预警+强视觉警示图标',
                           'sop_vertical_steps': 'SOP 手册 - 垂直分步骤操作指导',
                           'task_instruction': '工单指令 - 分层级的任务操作要求',
                           'technical_tip': '老师小结 - 绝活/技巧与避坑指南'},
               'name': '工程实训型',
               'style': {'avoid': '艺术化光影、装饰性文字、影响识读的纹理',
                         'background': '铝合金质感底纹、工程刻度辅助线、极简高对比背景',
                         'colors': '工程绿 + 警示黄 + 机械黑',
                         'density': '高密度，但逻辑极其线性，利于现场识读与执行',
                         'graphics': '高警示标识、精密刻度尺、步骤引导线、物料标签',
                         'rhythm': '准备点检 → 安全红线 → 构造认知 → 标准作业 → 纠偏优化 → 成果交付',
                         'signature': '安全禁令页必须在任何操作演示前强行插入'}},
 'tech_blue': {'layouts': {'arch_blocks': '技术架构 - 系统的层级或模块组成',
                           'cover_tech': '技术封面 - 数字底纹+醒目型号/技术名',
                           'ending_tech': '技术演进 - 路线图回顾+未来趋势',
                           'flow_logic_sequence': '逻辑时序 - 程序的先后运行逻辑',
                           'param_dashboard': '性能看板 - 技术指标的多维仪表盘',
                           'protocol_analysis': '协议拆解 - 细化字段及其定义解释',
                           'requirement_specs': '需求规格 - 必须满足的功能性指标列表',
                           'system_comparison': '选型对比 - 类似方案的技术参数对撞',
                           'tech_principle': '技术原理 - 核心逻辑的深度图文拆解',
                           'toc_tech': '技术大纲 - 树状或链路状的导航结构'},
               'name': '技术逻辑型',
               'style': {'avoid': '人文类插画、过于感性的文字、暖色调占主导',
                         'background': '数字流底纹、蓝图底膜、细密格栅网线',
                         'colors': '技术深蓝 + 极光青 + 荧光紫高亮',
                         'density': '中高密度，强调逻辑的严密性与数据的力量感',
                         'graphics': '发光边框、技术节点图、HUD 面板、逻辑连线',
                         'rhythm': '系统概览 → 核心组件 → 运行逻辑 → 性能指标 → 连接演进',
                         'signature': '技术架构页/性能看板页必须展现出明确的系统感'}},
 'visual': {'layouts': {'case_before_after': '修缮对比 - 行业现场修复前后的视觉差异',
                        'cover_field': '现场封面 - 沉浸式实景图+电影感排版',
                        'ending_field': '现场收束 - 意境图+核心愿景',
                        'field_observation': '现场观测 - 带比例尺、标注、记录的实地图像',
                        'gallery_professional': '专业图库 - 行业级高清图集',
                        'infographic_flow': '图文信息流 - 以图载文的视觉故事',
                        'portfolio_industry': '成果品鉴 - 优秀行业作品的陈列展示',
                        'site_survey': '踏勘报告 - 全景+局部细节的多维测绘',
                        'specimen_detail': '标本特写 - 极致细节的显微或微距展示',
                        'timeline_evolution': '演进轴线 - 带有时间戳的行业变迁过程'},
            'name': '行业展示型',
            'style': {'avoid': '过小的配图、低画质图片、喧宾夺主的背景纹理',
                      'background': '中性色大色块、适度暗角、模拟专业档案页',
                      'colors': '深木棕/古籍黄/医疗白 + 职教稳重色',
                      'density': '极低密度，每页聚焦核心图像，文字仅作画外音',
                      'graphics': '全屏大图、比例尺、专业经纬度标签、标注红圈',
                      'rhythm': '定格现场 → 细节切片 → 逻辑对比 → 画廊陈列 → 愿景归宿',
                      'signature': '现场观测页/标本特写页必须具备极高的画面清晰度'}},


 'business_pro': {'layouts': {'cover': '案卷封面 - 机密档案风封面，带格式化编号',
                              'edu_data_board': '核心部件仪表 - 替代原有利润表，显示设备额定运行关键值（避免商业金钱数据）',
                              'timeline': '工艺发展脉络 - 硬派纵横切分流程流转',
                              'edu_core_hub': '根因鱼骨图剖析 - 极细点阵线相连的问题溯源拆解',
                              'comparison_table': '矩阵对比 - 密集的参数对比选型矩阵',
                              'two_column': '典型故障辨析 - 左栏绿字标准操作，右栏红字致死失误',
                              'process_steps': '标准作业程序(SOP) - 带有关卡锁定的操作流图解',
                              'image_full': '场景切片剖析 - 现场故障带标记的高亮诊断图',
                              'detail_zoom': '关联因素下钻 - 树状结构剥离技术细项',
                              'safety_notice': '安全预警 - 黑黄相间或重墨警示规范底线',
                              'edu_summary': '分析结论 - 诊断外推与工程回馈'},
                  'name': '工业精密型(原实战)',
                  'style': {'avoid': '饼图等商业大盘指标、柔和活泼的UI大圆角',
                            'background': 'Dark Mode 深岩晶底色配合高对比的工业强调色（荧光青/警示橙）',
                            'colors': '深海蓝底 + 白字 + 危险警示色(红/绿)',
                            'density': '高密度，用于承接复杂的规程与诊断推演。绝对对齐。',
                            'graphics': '尖锐的机械直角(0px)设计、1px微型实线指示',
                            'rhythm': '档案启封 → 态势面板 → 原理下探 → 致命避坑 → SOP锁定',
                            'signature': '必须包含强烈警示感的标准对故障剖析页面'}},
 'minimal_clean': {'layouts': {'cover': '原理解剖图 - 100%全屏设备透视图底图配合巨大标题',
                               'quote': '大师引言 - 工艺金句强调核心准则',
                               'detail_zoom': '微距与宏观 - 左全景右带引线显微镜特写卡片',
                               'title_content': '透明叠层剖析 - 悬浮的玻璃质感(Glassmorphism)卡片附于底图之上',
                               'section_title': '概念隐喻 - 杂志式转场留空',
                               'two_column': '工程白皮书 - 左精细线框测绘图，右大段密文参数注解',
                               'timeline': '工艺时序演进 - 细长深邃的工艺发生时间轴',
                               'portfolio': '沉浸式画廊 - 合格标本的瀑布流陈列',
                               'title_bullets': '巨幕参数 - 1~2个巨大的字号显示极小公差的参数震撼',
                               'edu_tri_compare': '对比切片 - 两到三栏满血画面切割对比',
                               'ending': '剧终收束 - 电影放映结束光的余晖感'},
                   'name': '沉浸工艺型(原叙事)',
                   'style': {'avoid': '密集的默认项目符号、花哨边框和色彩大杂烩',
                             'background': '海量极致的留白或极深沉浸感纯色图，不设可见的死板边框',
                             'colors': '象牙白 / 钛金灰 / 缟玛瑙黑',
                             'density': '极低密度，单页突出极具张力的主次对比：巨大元素对冲微型注解卡片',
                             'graphics': '毛玻璃悬浮UI、16px大圆滑角或0px极锐利的切割碰撞',
                             'rhythm': '巨幕大观 → 原理剖切 → 流畅过渡 → 局部特写 → 结局',
                             'signature': '必须出现满版大图叠加微调参数卡片的强对比页'}},
 'warm_edu': {'layouts': {'cover': '工作坊实测封面 - 大号行动导向标题带工时倒计时',
                          'learning_objectives': 'SMART学习契约 - 达成技能目标与工时预算卡',
                          'warmup_question': '探究式引子 - 抛出实操排障难点的破冰提问槽',
                          'image_full': '模块化结构拆解 - 图形与轻量卡片相连的透视骨架',
                          'vocational_bullets': '交互式防呆表 - 极其清晰带空心复选框的操作极简指南',
                          'vocational_content': '临床情境剧本 - 交代特定危险工况或设备故障病历表的卡片',
                          'vocational_comparison': '方案优劣对决 - 方案 A 与方案 B 并列讨论对抗预制板',
                          'title_bullets': '常见坑位翻牌 - 以卡片翻牌隐喻交代致命操作错误项',
                          'quiz': '实物状态预判 - 按下执行后的物理量单选或多选',
                          'edu_summary': '结构化复盘矩阵 - Start / Stop / Continue 回顾框架',
                          'ending': '日程推进板 - 带明确下一步实操期限的指令'},
              'name': '实境交互型(原工作坊)',
              'style': {'avoid': '手写体漫游、过于幼稚松散的凌乱便签画板（高职重在规范操作而非自由发散头脑风暴）',
                        'background': '现代明亮的 Mocha 摩卡色、米灰 (Taupe) 或浅象牙白',
                        'colors': '中性暖调（Sage 鼠尾草绿、冷岩沙色）配以悬浮微投影感',
                        'density': '信息量聚集且有极强填表、交互、考核操作感',
                        'graphics': '医疗仪器或现代 SaaS 界面的触控软圆角(8px-12px)、阴影悬浮卡、规范复选框、诊断单据特征',
                        'rhythm': '任务契约 → 难题导入 → 防呆 SOP 推演 → 方案对抗 → 复盘表单',
                        'signature': '防呆核准检验表或情境对抗矩阵必居其一'}}}


SCHEME_ROLE_LAYOUTS = {'academic': {'cover': 'cover_academic', 'ending': 'ending_academic', 'toc': 'toc_academic'},
 'edu_dark': {'cover': 'edu_cover', 'ending': 'edu_summary', 'toc': 'edu_toc'},
 'interactive': {'cover': 'cover_interactive', 'ending': 'ending_interactive', 'toc': 'agenda_path'},
 'modern': {'cover': 'cover_modern', 'ending': 'ending_modern', 'toc': 'toc_modern'},
 'practical': {'cover': 'cover_practical', 'ending': 'ending_practical', 'toc': 'checklist_verification'},
 'tech_blue': {'cover': 'cover_tech', 'ending': 'ending_tech', 'toc': 'toc_tech'},
 'visual': {'cover': 'cover_field', 'ending': 'ending_field', 'toc': 'timeline_evolution'},
 'business_pro': {'cover': 'cover', 'ending': 'edu_summary', 'toc': 'timeline'},
 'minimal_clean': {'cover': 'cover', 'ending': 'ending', 'toc': 'section_title'},
 'warm_edu': {'cover': 'cover', 'ending': 'ending', 'toc': 'learning_objectives'}}


LAYOUT_ID_ALIASES = {
    # Academic
    'cover_academic': 'cover',
    'toc_academic': 'toc',
    'key_concepts': 'title_bullets',
    'key_takeaways': 'title_bullets',
    'ending_academic': 'ending',
    # Interactive
    'cover_interactive': 'cover',
    'agenda_path': 'toc',
    'story_narrative': 'title_content',
    'group_collab': 'title_bullets',
    'mind_map_structure': 'image_full',
    'quiz_interaction': 'title_bullets',
    'discussion_card': 'title_content',
    'reflection_quiz': 'title_bullets',
    'role_play_scenario': 'title_content',
    'warmup_inquiry': 'warmup_question',
    'ending_interactive': 'ending',
    'case_discussion': 'title_content',
    # Visual
    'cover_field': 'cover',
    'timeline_evolution': 'timeline',
    'field_observation': 'image_full',
    'gallery_professional': 'portfolio',
    'case_before_after': 'two_column',
    'infographic_flow': 'title_bullets',
    'site_survey': 'image_full',
    'specimen_detail': 'detail_zoom',
    'portfolio_industry': 'portfolio',
    'ending_field': 'ending',
    # Practical
    'cover_practical': 'cover',
    'checklist_verification': 'title_bullets',
    'equipment_orientation': 'two_column',
    'sop_vertical_steps': 'vertical_timeline',
    'common_faults': 'two_column',
    'technical_tip': 'quote',
    'task_instruction': 'title_content',
    'safety_protocol': 'safety_notice',
    'detail_specs': 'title_content',
    'ending_practical': 'ending',
    # Tech Blue
    'cover_tech': 'cover',
    'arch_blocks': 'title_content',
    'flow_logic_sequence': 'process_steps',
    'param_dashboard': 'edu_data_board',
    'protocol_analysis': 'title_bullets',
    'requirement_specs': 'title_bullets',
    'system_comparison': 'two_column',
    'tech_principle': 'title_content',
    'toc_tech': 'toc',
    'ending_tech': 'ending',
    # Modern (Management)
    'cover_modern': 'cover',
    'business_canvas': 'grid_matrix',
    'comparison_matrix': 'two_column',
    'legal_regulation': 'title_content',
    'org_structure_flow': 'title_bullets',
    'process_sop_standard': 'process_steps',
    'stat_report': 'edu_data_board',
    'strategic_pillars': 'tri_column',
    'toc_modern': 'toc',
    'ending_modern': 'ending',
}


LAYOUT_SCHEMAS = {'cinematic_overlay': '{"label": "标签(如CASE STUDY)", "title": "主标题", "description": "描述文字", "metric": {"value": "90%", '
                      '"label": "指标名称"}, "background_image": "背景图片URL(可选)"}',
 'concentric_focus': '{"label": "标签(如KEY QUESTION)", "title": "聚焦标题", "subtitle": "副标题(可选)", "accent_color": "#4a90e2", "background_image": "背景图片URL(可选)"}',
 'cover': '{"title": "PPT标题", "subtitle": "副标题(可选)", "author": "作者(可选)", "department": "部门(可选)", "date": "日期(可选)", "background_image": "背景图片URL(可选)"}',
 'dark_math': '{"title": "理论标题", "subtitle": "副标题(可选)", "description": "理论描述段落", "note": "注意事项(可选)", "formulas": [{"label": "公式名称", "latex": "LaTeX公式", "explanation": "公式说明"}], "background_image": "背景图片URL(可选)"}',
 'detail_zoom': '{"title": "细节标注", "image_src": "主图URL", "annotations": [{"x": 30, "y": 40, "label": "标注1", "description": "标注说明"}], "background_image": "背景图片URL(可选)"}',
 'diagonal_split': '{"left": {"title": "左侧标题", "subtitle": "左侧副标题(可选)", "accent_color": "#e74c3c", "points": ["要点1", "要点2"]}, "right": {"title": "右侧标题", "subtitle": "右侧副标题(可选)", "accent_color": "#3498db", "points": ["要点1", "要点2"]}, "background_image": "背景图片URL(可选)"}',
 'academic_practice': '{"title": "随堂测验/实训要求", "task_type": "quiz或者task", "description": "题目/任务说明", "requirements": ["评分标准或操作要求1"], "options": ["选项A", "选项B"], "hint": "提示或踩分点", "background_image": "背景图片URL(可选)"}',
 'case_study': '{"title": "典型案例分析", "scenario": "场景描述/背景", "challenge": "面临挑战或抛出的问题(可选)", "points": [{"title": "分析要点标题", "description": "分析说明"}], "conclusion": "案例启示/总结(可选)", "image": "案例图片URL(可选)", "background_image": "背景图片URL(可选)"}',
 'comparison_table': '{"title": "对比分析", "subtitle": "副标题(可选)", "items": [{"name": "对比项名称", "description": "简述(可选)", "features": ["特性1", "特性2"]}], "conclusion": "综合评价(可选)", "background_image": "背景图片URL(可选)"}',
 'diagram_illustration': '{"title": "原理图解", "subtitle": "副标题(可选)", "explanations": [{"label": "核心部件/步骤名称", "description": "具体解析"}], "summary": "图解要点结论(可选)", "diagram_url": "原理图URL(必填)", "background_image": "背景图片URL(可选)"}',
 'academic_narrative': '{"title": "知识讲解标题", "narrative": ["大段正文讲授1", "大段正文讲授2"], "margin_notes": [{"title": "旁注标题(如核心概念)", "content": "旁注解释内容"}], "pull_quote": "可选核心金句段落(独立成块)", "background_image": "背景图片URL(可选)"}',
 'edu_core_hub': '{"title": "核心模型标题", "subtitle": "副标题(可选)", "center_label": "中心概念", "nodes": [{"title": "关联节点1"}, '
                 '{"title": "关联节点2"}, {"title": "关联节点3"}, {"title": "关联节点4"}], "background_image": "背景图片URL(可选)"}',
 'edu_cover': '{"title": "封面标题", "subtitle": "副标题(可选)", "author": "汇报人(可选)", "department": "单位(可选)", "date": "日期(可选)", '
              '"hero_image": "封面主图URL(可选)", "background_image": "背景图片URL(可选)"}',
 'edu_data_board': '{"title": "数据看板标题", "subtitle": "右上角指标说明(可选)", "metrics": [{"value": "+45%", "label": "指标名称", '
                   '"note": "指标备注(可选)"}], "bars": [{"label": "维度名称", "baseline": 60, "current": 85}], "bullets": [{"text": "核心要点标题", "description": "解释内容"}], "insight": '
                   '"结果洞察(可选)", "background_image": "背景图片URL(可选)"}',
 'edu_logic_flow': '{"title": "逻辑演进标题", "stages": [{"title": "阶段标题", "description": "阶段说明"}, {"title": "阶段标题", '
                   '"description": "阶段说明"}, {"title": "阶段标题", "description": "阶段说明"}], "background_image": "背景图片URL(可选)"}',
 'edu_qa_case': '{"title": "问答/案例标题", "subtitle": "副标题(可选)", "question": "问题描述", "answer": "标准答案/核心方案", "analysis": [{"title": "分析点1标题", "content": "分析内容"}, {"title": "分析点2标题", "content": "分析内容"}], "conclusion": "总结金句/核心提示(可选)", "background_image": "背景图片URL(可选)"}',
 'edu_summary': '{"title": "总结页标题", "columns": [{"title": "分栏标题", "points": ["要点1", "要点2"]}, {"title": "分栏标题", '
                '"points": ["要点1"]}, {"title": "分栏标题", "points": ["要点1"]}], "closing": "结语总结(可选)", "background_image": "背景图片URL(可选)"}',
 'edu_timeline_steps': '{"title": "推进步骤标题", "subtitle": "副标题(可选)", "steps": [{"title": "阶段标题", "description": "阶段说明", '
                       '"highlights": ["动作1", "动作2"]}], "background_image": "背景图片URL(可选)"}',
 'edu_toc': '{"title": "目录标题", "subtitle": "目录说明(可选)", "items": [{"index": 1, "text": "章节标题"}], "background_image": "背景图片URL(可选)"}',
 'edu_tri_compare': '{"title": "三栏对比标题", "badge": "右上角结论标签(可选)", "columns": [{"title": "列标题", "points": ["要点1", "要点2", '
                    '"要点3"]}, {"title": "列标题", "points": ["要点1", "要点2"]}, {"title": "列标题", "points": ["要点1", "要点2"]}], "background_image": "背景图片URL(可选)"}',
 'ending': '{"title": "感谢观看", "subtitle": "副标题(可选)", "contact": "联系方式(可选)", "reflection_blocks": [{"title": "反思维度标题", '
           '"items": ["要点1", "要点2"]}], "closing": "总结金句(可选)"}',
 'ending_academic': '{"title": "本章小结", "summary_points": ["核心知识点回顾1", "核心知识点回顾2"], "homework": ["课后作业1(可选)"], "next_chapter": "下节预告(可选)", "background_image": "背景图片URL(可选)"}',
 'flow_process': '{"title": "流程标题", "steps": [{"number": 1, "label": "步骤名", "description": "步骤说明"}], "background_image": "背景图片URL(可选)"}',
 'grid_matrix': '{"title": "矩阵标题", "subtitle": "副标题(可选)", "items": [{"title": "单元格标题", "description": "单元格描述", "tag": '
                '"标签(可选)", "accent_color": "#e74c3c"}], "background_image": "背景图片URL(可选)"}',
 'image_full': '{"title": "图片标题(可选)", "image_src": "图片URL", "image_alt": "图片描述", "caption": "图片说明(可选)", "background_image": "背景图片URL(可选, 用于叠层)"}',
 'learning_objectives': '{"title": "学习目标", "objectives": [{"text": "目标描述", "level": "记忆/理解/应用/分析/综合/评价", "hours": 2, '
                        '"checked": false}], "course_code": "课程代码(可选)", "background_image": "背景图片URL(可选)"}',
 'overlap': '{"background_text": "背景大文字(如03)", "label": "标签(如核心概念解析)", "title": "主标题", "description": "描述文字段落", "key_point": "关键点提示", "accent_color": "#e74c3c", "background_image": "背景图片URL(可选)"}',
 'poll_interactive': '{"question": "投票问题", "options": [{"text": "选项A", "emoji": "😊"}, {"text": "选项B", "emoji": "🤔"}], '
                     '"instruction": "投票说明(可选)", "background_image": "背景图片URL(可选)"}',
 'portfolio': '{"title": "作品展示", "subtitle": "副标题(可选)", "items": [{"image_src": "", "title": "作品标题", "description": '
              '"作品描述", "tags": ["标签1", "标签2"]}], "layout": "grid", "background_image": "背景图片URL(可选)"}',
 'process_steps': '{"title": "页面标题", "subtitle": "副标题(可选)", "steps": [{"number": 1, "label": "步骤名", "description": "说明", "icon": "fa-icon"}], "image": {"src": "", "alt": "图片描述", "width": "50%"}, "background_image": "背景图片URL(可选)"}',
 'quote': '{"quote": "引用的名言或金句", "author": "作者", "source": "来源(可选)", "background_image": "背景图片URL(可选)"}',
 'safety_notice': '{"title": "安全须知", "warnings": [{"level": "danger/warning/caution", "text": "警告内容", "icon": "⚠️"}], '
                  '"summary": "总结说明(可选)", "background_image": "背景图片URL(可选)"}',
 'section_title': '{"section_number": "01", "title": "章节标题", "subtitle": "副标题(可选)", "background_image": "背景图片URL(可选)"}',
 'sidebar_card': '{"title": "目录标题(如01)", "subtitle": "副标题(可选)", "items": [{"index": 1, "title": "章节名", "subtitle": '
                 '"章节副标题(可选)"}], "background_image": "背景图片URL(可选)"}',
 'theory_explanation': '{"title": "理论推导", "theory": ["理论段落1", "理论段落2"], "formulas": [{"latex": "LaTeX公式", '
                       '"explanation": "公式说明"}], "references": ["参考文献1", "参考文献2"], "background_image": "背景图片URL(可选)"}',
 'timeline': '{"title": "发展历程", "events": [{"year": "2020", "title": "事件标题", "description": "事件描述", "icon": "📅"}], '
             '"orientation": "horizontal", "background_image": "背景图片URL(可选)"}',
 'title_bullets': '{"title": "页面标题", "subtitle": "副标题(可选)", "bullets": [{"icon": "fa-icon", "text": "要点标题", '
                  '"description": "详细说明", "example": "具体案例(可选)", "note": "注意事项(可选)", "dataPoint": {"value": "70%", '
                  '"unit": "提升效率", "source": "数据来源(可选)"}}], "keyTakeaway": "页面核心要点总结(可选)", "image": {"src": "", "alt": '
                  '"图片描述", "position": "right", "width": "35%"}}',
 'title_content': '{"title": "页面标题", "content": ["段落1内容", "段落2内容"], "highlight": "高亮引用文字(可选)", "image": {"src": "", '
                  '"alt": "图片描述", "position": "right", "width": "40%"}}',
 'toc': '{"title": "目录", "items": [{"index": 1, "text": "章节名"}, {"index": 2, "text": "章节名"}], "background_image": "背景图片URL(可选)"}',
 'tri_column': '{"title": "三列标题", "columns": [{"number": 1, "title": "列标题", "description": "列描述", "accent_color": "#3498db"}], "background_image": "背景图片URL(可选)"}',
 'two_column': '{"title": "页面标题", "left": {"type": "text|image|bullets", "header": "左栏标题", "content": ["纯文字段落"], '
               '"bullets": [{"icon": "fa-icon", "text": "要点文字"}]}, "right": {"type": "text|image|bullets", "header": '
               '"右栏标题", "content": ["纯文字段落"], "bullets": [{"icon": "fa-icon", "text": '
               '"要点文字"}]}}',
 'vertical_timeline': '{"title": "时间线标题", "events": [{"title": "事件标题", "description": "事件描述", "is_highlighted": '
                      'false}], "accent_color": "#27ae60", "background_image": "背景图片URL(可选)"}',
 'warmup_question': '{"question": "思考问题", "thinkTime": 30, "hints": ["提示1", "提示2"], "background_image": "背景图片URL(可选)"}'}


def get_layout_scheme(scheme_id: Optional[str] = None) -> dict:
    scheme = scheme_id or 'edu_dark'
    return LAYOUT_SCHEMES.get(scheme, LAYOUT_SCHEMES['edu_dark'])



def get_layout_types_description(scheme_id: Optional[str] = None) -> str:
    scheme = get_layout_scheme(scheme_id)
    layouts = scheme['layouts']
    return "\n".join([f"- {lid}: {desc}" for lid, desc in layouts.items()])



def get_scheme_style_prompt(scheme_id: Optional[str] = None) -> str:
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
  * academic_narrative（长文叙述）：用于章节性知识讲授，正文要有“定义→原理→应用”递进，边注解释关键术语
  * academic_practice（随堂实训）：用于测验或任务页，必须给出可执行要求与评价标准，禁止只写口号
  * 所有页面（除封面/结束页）显示页脚（课程代码/日期）
  * 内容真实性：优先使用课本级通用事实与稳定结论
""",
        'interactive': """
- 专属布局使用场景：
  * warmup_inquiry（课前探究）：利用真实行业问题导入，设置思考时间，引导学生进入沉浸式探究状态。
  * case_discussion（案例研讨）：提供行业典型案例背景，要求学生从多维度进行分析，侧边给出讨论引导。
  * role_play_scenario（情境模拟）：设定职业岗位角色，描述复杂的操作环境，要求学生思考应对方案。
""",
        'modern': """
- 专属布局使用场景：
  * comparison_matrix（标准对比）：用于对比不同国家标准、行业规范或法律条款的细微差异，确保合规性教育。
  * legal_regulation（规则解析）：展示正式法律条文或管理制度原件，并配以专家视角的深度逻辑拆解。
  * strategic_pillars（核心支柱）：用于解释企业愿景、品牌价值或管理模式的核心支撑点。
""",
        'practical': """
- 专属布局使用场景：
  * safety_protocol（安全禁令）：实训开始前的绝对红线，图标与配色必须具备极强的冲击力。
  * sop_vertical_steps (SOP手册)：严格的垂直流式操作步骤，每一步需对应具体的动作要求。
  * common_faults（故障排除）：以对照组形式展示“错误操作”与“正确修复”，强化避坑意识。
""",
        'tech_blue': """
- 专属布局使用场景：
  * arch_blocks（技术架构）：展示复杂的软硬件分层结构，或系统的模块化拓扑关系。
  * flow_logic_sequence（逻辑时序）：展示时序图或程序运行链路，体现严密的逻辑推演。
  * param_dashboard（性能看板）：汇聚多个关键技术指标，通过数字化面板展现系统的运行状态。
""",
        'visual': """
- 专属布局使用场景：
  * field_observation（现场观测）：利用带坐标或比例尺的现场高清大图，进行实地性的行业观测展示。
  * case_before_after (修缮对比)：直观展现修补前、修复后的效果，体现技艺的价值。
  * specimen_detail（标本特写）：针对农学、医教等细微观察需求，通过局部放大镜展示核心特征。
""",
        'edu_dark': """
- 专属布局使用场景：
  * edu_core_hub（中心模型）：用于解释核心概念体系，中心节点放最核心概念，四周节点放关联要素，适合"X的核心要素/维度/机制"类页面。
  * edu_data_board（数据看板）：展现量化成果对比，指标卡放具体数值（如"提升37%"），柱状区放对比组数据，适合数据驱动的结论页。
  * edu_tri_compare（三栏对比）：三个并列概念/阶段/角色的深度对比，每栏有标题+要点列表，适合"痛点/行动/目标"或"过去/现在/未来"结构。
  * edu_timeline_steps（推进时间轴）：纵向阶段推进，每阶段有标题+描述+高亮要点，适合实施路径、教学进度、发展历程。
  * edu_qa_case（问答与案例）：必须给出真实问题情境+专业解答+分析逻辑，不能只是概念堆砌，适合典型案例展示页。
  * edu_logic_flow（逻辑演进）：三阶段卡片+箭头，适合"课前预习→课中研讨→课后实训"等线性推进链路。
  * 所有内容页（除封面/目录/结束）优先使用以上专属布局，仅在无法匹配时退回通用布局。
""",
        'business_pro': """
- 专属布局使用场景（工业精密型，使用数据终端风格渲染）：
  * 彻底剔除 KPI、增长率、商业汇报指标，替换为设备额定参数、误差范围等工程数据。
  * edu_data_board（仪表看板）：展示额定电压/电流/转速/压力等物理量，绝不含金钱或增长率。
  * edu_core_hub（根因分析）：追溯机械/工艺故障根因，使用因果链或鱼骨图逻辑。
  * two_column（故障辨析）：左栏绿字标准操作，右栏红字致命错误对比，强化识别。
  * process_steps（SOP流程）：每步有明确操作动作、参数要求和检验标准，类似标准作业程序。
  * safety_notice（安全预警）：必须包含强冲击力的禁止操作清单与违规后果。
  * 每页结构要绝对对齐，信息密度高，格式感强，避免装饰性软圆角和暖色。
""",
        'minimal_clean': """
- 专属布局使用场景（沉浸工艺型，使用工业蓝图风格渲染）：
  * 每页聚焦单一核心概念，大面积留白，文字极精简，视觉冲击来自元素本身的强度。
  * detail_zoom（微距标注）：极致高清的部件特写+引线标注，体现精密工艺的视觉力量。
  * title_bullets（参数展示）：1-2个巨大字号显示关键参数（如 0.01mm公差），配以微型注解。
  * two_column（工程白皮书）：左侧精细线框测绘图，右侧密集参数注解，专业感极强。
  * timeline（工艺演进）：细长深邃的时间轴展示工艺发展，每步有里程碑技术突破。
  * section_title（概念隐喻）：杂志式转场，大量留白+单行关键词，制造强烈的阅读节奏感。
  * 所有页面应呈现毛玻璃质感卡片或极锐利的0px切割感，颜色不超过3种（黑/白/一个强调色）。
""",
        'warm_edu': """
- 禁忌自由与散漫感，工作坊必须聚焦操作纪律！
  * vocational_bullets：将其理解为医学诊断中的临床防差错 CheckList 或者车间的必须执行清单。
"""
    }

    if scheme_id and scheme_id in scheme_specific_guidance:
        lines.append(scheme_specific_guidance[scheme_id])

    return "方案视觉与结构规范（必须遵循）：\n" + "\n".join(lines)



def resolve_layout_id(layout_id: str) -> str:
    return LAYOUT_ID_ALIASES.get(layout_id, layout_id)



def get_layout_constraints(scheme_id: Optional[str] = None) -> str:
    scheme = scheme_id or 'edu_dark'
    style = get_layout_scheme(scheme_id).get('style', {})
    layout_count = max(3, len(get_layout_scheme(scheme_id).get('layouts', {})) or 10)
    base = [
        "不要只用 2-3 种布局，整体布局要有明显变化。",
        f"当总页数 >= {layout_count} 时，确保该方案的 {layout_count} 种布局都至少出现 1 次（封面/目录/结束页各 1 次）。",
        "避免连续 3 页使用同一种布局。",
        "优先保证标题可读性与视觉焦点，任何装饰元素不得压住正文。"
    ]
    signature = style.get('signature')
    if signature:
        base.append(f"招牌页要求：{signature}")
    return "\n".join([f"- {line}" for line in base])
