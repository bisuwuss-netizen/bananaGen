# backend/services/pedagogy_models.py
"""
教法模型定义 - 支持10种职教经典教法模式
"""

from enum import Enum
from typing import Dict, List
from pydantic import BaseModel


class PedagogyMethod(str, Enum):
    """教法模式枚举"""
    FIVE_STEP = "five_step"                 # 五步教学法（默认）
    ACTION_ORIENTED = "action_oriented"      # 行动导向法（六步）
    BOPPPS = "boppps"                        # BOPPPS 模型
    CASE_DRIVEN = "case_driven"              # 案例驱动法
    PROJECT_BASED = "project_based"          # 项目教学法
    TASK_DRIVEN = "task_driven"              # 任务驱动法
    INQUIRY_BASED = "inquiry_based"          # 探究式教学法
    FLIPPED_CLASSROOM = "flipped_classroom"  # 翻转课堂
    SITUATIONAL = "situational"              # 情境教学法
    DEMONSTRATION = "demonstration"          # 演示教学法


class PedagogyDefinition(BaseModel):
    """教法定义"""
    id: str
    name: str
    name_en: str
    description: str
    applicable_scenes: List[str]  # theory / practice / review / mixed
    structure: List[str]          # 教学环节结构
    slide_type_mapping: Dict[str, str]  # 环节 → 推荐页面类型
    prompt_guidance: str          # 给 AI 的引导语


PEDAGOGY_DEFINITIONS: Dict[str, PedagogyDefinition] = {
    # ════════════════════════════════════════════════════════════════════
    # 1. 五步教学法（默认）
    # ════════════════════════════════════════════════════════════════════
    "five_step": PedagogyDefinition(
        id="five_step",
        name="五步教学法",
        name_en="Five-Step Teaching Method",
        description="经典的职教课堂结构，适用于理论课和混合课",
        applicable_scenes=["theory", "mixed"],
        structure=[
            "情境导入",      # Situation Introduction
            "探究新知",      # Knowledge Exploration
            "示范演练",      # Demonstration & Practice
            "巩固拓展",      # Consolidation & Extension
            "总结评价"       # Summary & Evaluation
        ],
        slide_type_mapping={
            "情境导入": "intro",
            "探究新知": "concept",
            "示范演练": "steps",
            "巩固拓展": "exercises",
            "总结评价": "summary"
        },
        prompt_guidance="""
遵循【五步教学法】设计大纲：
1. 情境导入：通过案例、问题或生活实例引入主题，激发学习兴趣
2. 探究新知：讲解核心概念、原理、定义，注重知识的系统性
3. 示范演练：教师示范 + 学生跟练，理论联系实际
4. 巩固拓展：习题练习、知识迁移、举一反三
5. 总结评价：梳理知识点、强调重难点、布置课后任务

特点：知识递进、循序渐进、适合系统性理论教学
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 2. 行动导向法（六步）
    # ════════════════════════════════════════════════════════════════════
    "action_oriented": PedagogyDefinition(
        id="action_oriented",
        name="行动导向法",
        name_en="Action-Oriented Learning (Six Steps)",
        description="以学生为中心的实训教学模式，强调任务驱动和自主学习",
        applicable_scenes=["practice", "mixed"],
        structure=[
            "资讯",    # Information
            "计划",    # Planning
            "决策",    # Decision
            "实施",    # Implementation
            "检查",    # Check
            "评估"     # Evaluation
        ],
        slide_type_mapping={
            "资讯": "intro",
            "计划": "concept",
            "决策": "comparison",
            "实施": "steps",
            "检查": "exercises",
            "评估": "summary"
        },
        prompt_guidance="""
遵循【行动导向法（六步）】设计大纲：
1. 资讯：呈现任务背景、工作情境、相关资料
2. 计划：学生分析任务、制定工作计划、分配角色
3. 决策：讨论方案、选择最优路径、明确标准
4. 实施：按计划操作、教师巡视指导、记录过程
5. 检查：对照标准自查、互查、发现问题
6. 评估：展示成果、师生点评、反思改进

特点：以学生为中心、任务驱动、强调实操能力培养
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 3. BOPPPS 模型
    # ════════════════════════════════════════════════════════════════════
    "boppps": PedagogyDefinition(
        id="boppps",
        name="BOPPPS 模型",
        name_en="BOPPPS Model",
        description="北美高校流行的教学设计模型，适合精品课和微课",
        applicable_scenes=["theory", "mixed"],
        structure=[
            "导引",           # Bridge-in
            "学习目标",       # Objective
            "前测",           # Pre-assessment
            "参与式学习",     # Participatory Learning
            "后测",           # Post-assessment
            "总结"            # Summary
        ],
        slide_type_mapping={
            "导引": "intro",
            "学习目标": "concept",
            "前测": "exercises",
            "参与式学习": "steps",
            "后测": "exercises",
            "总结": "summary"
        },
        prompt_guidance="""
遵循【BOPPPS 模型】设计大纲：
1. 导引(Bridge-in)：吸引注意力，建立与已有知识的桥梁
2. 学习目标(Objective)：明确告知本节课要掌握什么
3. 前测(Pre-assessment)：快速了解学生现有水平
4. 参与式学习(Participatory Learning)：核心教学，多种互动方式
5. 后测(Post-assessment)：检验学习效果，及时反馈
6. 总结(Summary)：回顾要点，布置后续任务

特点：目标明确、强调互动、注重评估反馈
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 4. 案例驱动法
    # ════════════════════════════════════════════════════════════════════
    "case_driven": PedagogyDefinition(
        id="case_driven",
        name="案例驱动法",
        name_en="Case-Driven Method",
        description="通过真实案例引导学习，适合医卫、经管、法律类专业",
        applicable_scenes=["theory", "mixed"],
        structure=[
            "案例展示",    # Case Presentation
            "问题提炼",    # Problem Identification
            "原理剖析",    # Theory Analysis
            "方案制定",    # Solution Development
            "反思总结"     # Reflection
        ],
        slide_type_mapping={
            "案例展示": "intro",
            "问题提炼": "concept",
            "原理剖析": "concept",
            "方案制定": "steps",
            "反思总结": "summary"
        },
        prompt_guidance="""
遵循【案例驱动法】设计大纲：
1. 案例展示：呈现真实、典型的工作场景或问题情境
2. 问题提炼：从案例中抽取核心问题，引导思考
3. 原理剖析：讲解相关理论知识、专业原理
4. 方案制定：针对问题设计解决方案，讨论优劣
5. 反思总结：回顾案例、总结规律、迁移应用

特点：情境真实、问题导向、理论与实践紧密结合
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 5. 项目教学法
    # ════════════════════════════════════════════════════════════════════
    "project_based": PedagogyDefinition(
        id="project_based",
        name="项目教学法",
        name_en="Project-Based Learning",
        description="以完整项目为载体，培养综合职业能力",
        applicable_scenes=["practice", "mixed"],
        structure=[
            "项目导入",    # Project Introduction
            "项目分析",    # Project Analysis
            "方案设计",    # Design
            "项目实施",    # Implementation
            "成果展示",    # Presentation
            "评价反馈"     # Evaluation
        ],
        slide_type_mapping={
            "项目导入": "intro",
            "项目分析": "concept",
            "方案设计": "comparison",
            "项目实施": "steps",
            "成果展示": "summary",
            "评价反馈": "exercises"
        },
        prompt_guidance="""
遵循【项目教学法】设计大纲：
1. 项目导入：介绍项目背景、目标、预期成果
2. 项目分析：分解任务、确定知识点、明确能力要求
3. 方案设计：学生设计实施方案，教师指导
4. 项目实施：分步骤完成项目，记录过程
5. 成果展示：展示作品、汇报过程、分享经验
6. 评价反馈：多元评价（自评、互评、师评）

特点：以项目为主线、强调过程、培养综合能力
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 6. 任务驱动法
    # ════════════════════════════════════════════════════════════════════
    "task_driven": PedagogyDefinition(
        id="task_driven",
        name="任务驱动法",
        name_en="Task-Driven Learning",
        description="以具体任务为导向，边学边做",
        applicable_scenes=["practice"],
        structure=[
            "任务发布",    # Task Assignment
            "知识准备",    # Knowledge Preparation
            "任务实施",    # Task Execution
            "成果检验",    # Result Verification
            "归纳总结"     # Summary
        ],
        slide_type_mapping={
            "任务发布": "intro",
            "知识准备": "concept",
            "任务实施": "steps",
            "成果检验": "exercises",
            "归纳总结": "summary"
        },
        prompt_guidance="""
遵循【任务驱动法】设计大纲：
1. 任务发布：明确任务目标、要求、评价标准
2. 知识准备：讲解完成任务所需的知识和技能
3. 任务实施：学生动手操作，教师巡视辅导
4. 成果检验：检查任务完成情况，纠正问题
5. 归纳总结：提炼方法规律，强化关键点

特点：任务具体明确、做中学、即时反馈
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 7. 探究式教学法
    # ════════════════════════════════════════════════════════════════════
    "inquiry_based": PedagogyDefinition(
        id="inquiry_based",
        name="探究式教学法",
        name_en="Inquiry-Based Learning",
        description="以问题为起点，引导学生自主探索发现",
        applicable_scenes=["theory", "mixed"],
        structure=[
            "情境创设",    # Context Creation
            "问题提出",    # Question Raising
            "自主探究",    # Independent Inquiry
            "合作交流",    # Collaborative Discussion
            "总结提升"     # Summary & Enhancement
        ],
        slide_type_mapping={
            "情境创设": "intro",
            "问题提出": "concept",
            "自主探究": "steps",
            "合作交流": "comparison",
            "总结提升": "summary"
        },
        prompt_guidance="""
遵循【探究式教学法】设计大纲：
1. 情境创设：设置问题情境，激发探究欲望
2. 问题提出：明确核心问题，引导思考方向
3. 自主探究：学生独立思考、查阅资料、尝试解答
4. 合作交流：小组讨论、分享观点、碰撞思维
5. 总结提升：教师点拨、归纳规律、深化理解

特点：问题导向、自主发现、培养批判性思维
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 8. 翻转课堂
    # ════════════════════════════════════════════════════════════════════
    "flipped_classroom": PedagogyDefinition(
        id="flipped_classroom",
        name="翻转课堂",
        name_en="Flipped Classroom",
        description="课前自学、课中深化，适合混合式教学",
        applicable_scenes=["theory", "mixed"],
        structure=[
            "课前任务回顾",    # Pre-class Review
            "疑难点拨",        # Difficult Points
            "深度探讨",        # In-depth Discussion
            "实践应用",        # Practice
            "拓展延伸"         # Extension
        ],
        slide_type_mapping={
            "课前任务回顾": "intro",
            "疑难点拨": "concept",
            "深度探讨": "comparison",
            "实践应用": "steps",
            "拓展延伸": "summary"
        },
        prompt_guidance="""
遵循【翻转课堂】设计大纲：
1. 课前任务回顾：检查自学情况，了解学生困惑
2. 疑难点拨：针对共性问题重点讲解
3. 深度探讨：围绕核心问题展开深入讨论
4. 实践应用：通过练习或项目应用所学知识
5. 拓展延伸：提供进阶内容、布置课后任务

特点：先学后教、以学定教、课堂时间高效利用
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 9. 情境教学法
    # ════════════════════════════════════════════════════════════════════
    "situational": PedagogyDefinition(
        id="situational",
        name="情境教学法",
        name_en="Situational Teaching Method",
        description="创设真实工作情境，在情境中学习",
        applicable_scenes=["practice", "mixed"],
        structure=[
            "情境引入",    # Situation Introduction
            "角色分配",    # Role Assignment
            "情境体验",    # Situation Experience
            "问题解决",    # Problem Solving
            "总结反思"     # Reflection
        ],
        slide_type_mapping={
            "情境引入": "intro",
            "角色分配": "concept",
            "情境体验": "steps",
            "问题解决": "exercises",
            "总结反思": "summary"
        },
        prompt_guidance="""
遵循【情境教学法】设计大纲：
1. 情境引入：创设真实或模拟的工作场景
2. 角色分配：学生扮演不同职业角色
3. 情境体验：在情境中完成工作任务
4. 问题解决：应对情境中的突发问题
5. 总结反思：跳出情境，归纳经验教训

特点：真实感强、角色代入、职业能力培养
"""
    ),

    # ════════════════════════════════════════════════════════════════════
    # 10. 演示教学法
    # ════════════════════════════════════════════════════════════════════
    "demonstration": PedagogyDefinition(
        id="demonstration",
        name="演示教学法",
        name_en="Demonstration Teaching Method",
        description="教师演示、学生模仿，适合技能操作类课程",
        applicable_scenes=["practice"],
        structure=[
            "操作说明",    # Operation Introduction
            "教师演示",    # Teacher Demonstration
            "分步讲解",    # Step-by-step Explanation
            "学生模仿",    # Student Practice
            "纠错强化"     # Error Correction
        ],
        slide_type_mapping={
            "操作说明": "intro",
            "教师演示": "steps",
            "分步讲解": "concept",
            "学生模仿": "exercises",
            "纠错强化": "summary"
        },
        prompt_guidance="""
遵循【演示教学法】设计大纲：
1. 操作说明：介绍操作目的、工具设备、安全要求
2. 教师演示：完整演示操作过程
3. 分步讲解：拆解动作要领，强调关键点
4. 学生模仿：学生跟随练习，教师巡视
5. 纠错强化：纠正错误动作，反复强化

特点：示范清晰、动作规范、强调标准操作
"""
    ),
}


def get_pedagogy(method_id: str) -> PedagogyDefinition:
    """获取教法定义"""
    return PEDAGOGY_DEFINITIONS.get(method_id, PEDAGOGY_DEFINITIONS["five_step"])


def list_pedagogies() -> list:
    """列出所有教法"""
    return [
        {
            "id": p.id,
            "name": p.name,
            "name_en": p.name_en,
            "description": p.description,
            "applicable_scenes": p.applicable_scenes,
            "structure": p.structure
        }
        for p in PEDAGOGY_DEFINITIONS.values()
    ]


def get_pedagogies_by_scene(scene: str) -> list:
    """按场景筛选教法"""
    return [
        {
            "id": p.id,
            "name": p.name,
            "name_en": p.name_en,
            "description": p.description,
            "applicable_scenes": p.applicable_scenes
        }
        for p in PEDAGOGY_DEFINITIONS.values()
        if scene in p.applicable_scenes
    ]
