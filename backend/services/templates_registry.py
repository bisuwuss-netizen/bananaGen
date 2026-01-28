# backend/services/templates_registry.py
"""
模板注册表 - 支持7种职教风格模板
"""

from typing import Dict, Optional, List
from pydantic import BaseModel


class TemplateDefinition(BaseModel):
    """模板定义"""
    id: str
    name: str
    description: str
    applicable_scenes: List[str]  # theory / practice / review
    preview_image: Optional[str] = None

    # 风格配置
    css_theme: str
    css_vars: Dict[str, str]

    # 布局偏好（影响 AI 布局决策）
    preferred_layouts: List[str]
    avoided_layouts: List[str]

    # Prompt 修饰器（注入给布局 Agent）
    system_prompt_modifier: str


VOCATIONAL_TEMPLATES: Dict[str, TemplateDefinition] = {
    # ═══════════════════════════════════════════════════════════════════
    # 理论课系列
    # ═══════════════════════════════════════════════════════════════════
    "theory_professional": TemplateDefinition(
        id="theory_professional",
        name="理论课-专业严谨",
        description="蓝色系专业风格，适合系统性理论讲解",
        applicable_scenes=["theory"],
        css_theme="theme-theory-professional",
        css_vars={
            "color-primary": "#1e3a8a",
            "color-secondary": "#64748b",
            "color-accent": "#3b82f6",
            "color-background": "#f8fafc",
            "color-text": "#1e293b",
            "color-surface": "rgba(255,255,255,0.95)",
            "font-family-title": "'思源黑体', 'Source Han Sans', sans-serif",
            "font-family-body": "'思源宋体', 'Source Han Serif', serif",
            "font-size-title": "38px",
            "font-size-body": "22px",
            "layout-border-radius": "8px",
            "layout-alignment": "left",
        },
        preferred_layouts=["title_bullets_right_img", "concept_comparison", "title_bullets"],
        avoided_layouts=["grid_4"],
        system_prompt_modifier="""
### 风格偏好：理论课-专业严谨
- 布局倾向：左文右图、对比分析
- 避免：过多图片网格
- 语气：专业、严谨、逻辑清晰
"""
    ),

    "theory_elegant": TemplateDefinition(
        id="theory_elegant",
        name="理论课-优雅简约",
        description="灰白色系极简风格，突出内容本身",
        applicable_scenes=["theory"],
        css_theme="theme-theory-elegant",
        css_vars={
            "color-primary": "#374151",
            "color-secondary": "#9ca3af",
            "color-accent": "#6b7280",
            "color-background": "#ffffff",
            "color-text": "#111827",
            "color-surface": "#f9fafb",
            "font-family-title": "'Noto Serif SC', serif",
            "font-family-body": "'Noto Sans SC', sans-serif",
            "font-size-title": "36px",
            "font-size-body": "20px",
            "layout-border-radius": "4px",
            "layout-alignment": "center",
        },
        preferred_layouts=["title_bullets", "center_visual", "split_vertical"],
        avoided_layouts=["operation_steps"],
        system_prompt_modifier="""
### 风格偏好：理论课-优雅简约
- 布局倾向：简洁布局、居中视觉
- 避免：步骤操作类布局
- 语气：简练、优雅、留白感
"""
    ),

    # ═══════════════════════════════════════════════════════════════════
    # 实训课系列
    # ═══════════════════════════════════════════════════════════════════
    "practice_industrial": TemplateDefinition(
        id="practice_industrial",
        name="实训课-工业风格",
        description="绿色系工业风格，适合机械、电气类实训",
        applicable_scenes=["practice"],
        css_theme="theme-practice-industrial",
        css_vars={
            "color-primary": "#166534",
            "color-secondary": "#4ade80",
            "color-accent": "#22c55e",
            "color-background": "#f0fdf4",
            "color-text": "#14532d",
            "color-surface": "rgba(255,255,255,0.9)",
            "font-family-title": "'思源黑体', sans-serif",
            "font-family-body": "'微软雅黑', sans-serif",
            "font-size-title": "36px",
            "font-size-body": "22px",
            "layout-border-radius": "4px",
            "layout-alignment": "left",
        },
        preferred_layouts=["operation_steps", "grid_4", "timeline_horizontal"],
        avoided_layouts=["title_only"],
        system_prompt_modifier="""
### 风格偏好：实训课-工业风格
- 布局倾向：操作步骤、网格展示、时间线
- 避免：纯标题页
- 语气：指导性、操作性、安全提示明确
"""
    ),

    "practice_medical": TemplateDefinition(
        id="practice_medical",
        name="实训课-医护风格",
        description="浅蓝绿色系，适合医卫类护理实训",
        applicable_scenes=["practice"],
        css_theme="theme-practice-medical",
        css_vars={
            "color-primary": "#0891b2",
            "color-secondary": "#67e8f9",
            "color-accent": "#06b6d4",
            "color-background": "#ecfeff",
            "color-text": "#164e63",
            "color-surface": "rgba(255,255,255,0.95)",
            "font-family-title": "'思源黑体', sans-serif",
            "font-family-body": "'微软雅黑', sans-serif",
            "font-size-title": "34px",
            "font-size-body": "20px",
            "layout-border-radius": "12px",
            "layout-alignment": "left",
        },
        preferred_layouts=["operation_steps", "concept_comparison", "title_bullets_right_img"],
        avoided_layouts=[],
        system_prompt_modifier="""
### 风格偏好：实训课-医护风格
- 布局倾向：操作步骤（带安全警示）、对比（正误示范）
- 特殊要求：突出安全注意事项、无菌操作提示
- 语气：规范、严谨、强调标准
"""
    ),

    # ═══════════════════════════════════════════════════════════════════
    # 复习课系列
    # ═══════════════════════════════════════════════════════════════════
    "review_mindmap": TemplateDefinition(
        id="review_mindmap",
        name="复习课-思维导图",
        description="紫色系复习风格，适合知识梳理和回顾",
        applicable_scenes=["review"],
        css_theme="theme-review-mindmap",
        css_vars={
            "color-primary": "#7c3aed",
            "color-secondary": "#c4b5fd",
            "color-accent": "#8b5cf6",
            "color-background": "#faf5ff",
            "color-text": "#4c1d95",
            "color-surface": "rgba(255,255,255,0.9)",
            "font-family-title": "'思源黑体', sans-serif",
            "font-family-body": "'微软雅黑', sans-serif",
            "font-size-title": "36px",
            "font-size-body": "20px",
            "layout-border-radius": "16px",
            "layout-alignment": "center",
        },
        preferred_layouts=["center_visual", "grid_4", "split_vertical"],
        avoided_layouts=["operation_steps"],
        system_prompt_modifier="""
### 风格偏好：复习课-思维导图
- 布局倾向：中心视觉、网格总结、分栏对比
- 避免：操作步骤类（复习课不强调操作）
- 语气：总结性、归纳性、发散联想
"""
    ),

    "review_quiz": TemplateDefinition(
        id="review_quiz",
        name="复习课-测验巩固",
        description="橙色系测验风格，适合习题练习和检测",
        applicable_scenes=["review"],
        css_theme="theme-review-quiz",
        css_vars={
            "color-primary": "#ea580c",
            "color-secondary": "#fed7aa",
            "color-accent": "#f97316",
            "color-background": "#fff7ed",
            "color-text": "#7c2d12",
            "color-surface": "rgba(255,255,255,0.95)",
            "font-family-title": "'思源黑体', sans-serif",
            "font-family-body": "'微软雅黑', sans-serif",
            "font-size-title": "34px",
            "font-size-body": "22px",
            "layout-border-radius": "8px",
            "layout-alignment": "left",
        },
        preferred_layouts=["title_bullets", "concept_comparison", "grid_4"],
        avoided_layouts=["center_visual"],
        system_prompt_modifier="""
### 风格偏好：复习课-测验巩固
- 布局倾向：题目列表、选项对比、分类网格
- 避免：大面积图片
- 语气：检测性、答案解析、知识点强调
"""
    ),

    # ═══════════════════════════════════════════════════════════════════
    # 通用系列
    # ═══════════════════════════════════════════════════════════════════
    "general_tech": TemplateDefinition(
        id="general_tech",
        name="通用-科技风格",
        description="深色系科技风格，适合信息技术类课程",
        applicable_scenes=["theory", "practice", "review"],
        css_theme="theme-general-tech",
        css_vars={
            "color-primary": "#06b6d4",
            "color-secondary": "#22d3ee",
            "color-accent": "#67e8f9",
            "color-background": "#0f172a",
            "color-text": "#e2e8f0",
            "color-surface": "rgba(30,41,59,0.9)",
            "font-family-title": "'JetBrains Mono', monospace",
            "font-family-body": "'Inter', sans-serif",
            "font-size-title": "36px",
            "font-size-body": "20px",
            "layout-border-radius": "6px",
            "layout-alignment": "left",
        },
        preferred_layouts=["title_bullets_right_img", "operation_steps", "grid_4"],
        avoided_layouts=[],
        system_prompt_modifier="""
### 风格偏好：通用-科技风格
- 布局倾向：代码展示、流程图、技术架构
- 特殊要求：适合展示代码片段、技术原理图
- 语气：技术性、前沿感
"""
    ),
}


def get_template(template_id: str) -> Optional[TemplateDefinition]:
    """获取模板定义"""
    return VOCATIONAL_TEMPLATES.get(template_id)


def list_templates() -> list:
    """列出所有模板"""
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "applicable_scenes": t.applicable_scenes,
            "preview_image": t.preview_image,
            "css_theme": t.css_theme
        }
        for t in VOCATIONAL_TEMPLATES.values()
    ]


def get_templates_by_scene(scene: str) -> list:
    """按场景筛选模板"""
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "applicable_scenes": t.applicable_scenes,
            "preview_image": t.preview_image
        }
        for t in VOCATIONAL_TEMPLATES.values()
        if scene in t.applicable_scenes
    ]
