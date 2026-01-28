# backend/services/layout_engine.py
"""
布局决策引擎 - 根据页面类型和内容自动选择最优布局
"""

from typing import Optional, List
from .render_schemas import SlidePage
from .templates_registry import get_template


class LayoutEngine:
    """布局决策引擎"""

    # 页面类型 → 默认布局映射
    TYPE_LAYOUT_MAP = {
        "title": "title_only_center",
        "toc": "toc_sidebar_right",
        "section": "title_only_center",
        "intro": "title_bullets_right_img",
        "concept": "title_bullets_right_img",
        "steps": "operation_steps",
        "comparison": "concept_comparison",
        "exercises": "title_bullets",
        "summary": "title_bullets",
        "thank_you": "title_only_center",
    }

    # 关键词触发布局
    KEYWORD_TRIGGERS = {
        "operation_steps": ["步骤", "操作", "流程", "实施", "演示", "实训", "实验", "制作"],
        "concept_comparison": ["对比", "比较", "区别", "异同", "优劣", "优缺点", "VS", "vs"],
        "grid_4": ["分类", "类型", "四种", "4种", "工具", "设备", "特点", "要素"],
        "timeline_horizontal": ["发展", "历程", "阶段", "演变", "时间线", "进程"],
        "center_visual": ["原理图", "示意图", "架构", "结构", "模型", "框架"],
    }

    # 所有可用布局
    ALL_LAYOUTS = [
        "title_only_center",
        "title_bullets",
        "title_bullets_right_img",
        "operation_steps",
        "concept_comparison",
        "grid_4",
        "center_visual",
        "split_vertical",
        "timeline_horizontal",
        "toc_sidebar_right",
    ]

    @classmethod
    def resolve_layout(
        cls,
        page: SlidePage,
        template_id: str,
        previous_layout: Optional[str] = None
    ) -> str:
        """
        决定页面布局
        
        Args:
            page: 幻灯片页面数据
            template_id: 模板 ID
            previous_layout: 上一页的布局（用于避免重复）
        
        Returns:
            布局 ID
        """

        template = get_template(template_id)

        # 1. 按页面类型快速匹配
        base_layout = cls.TYPE_LAYOUT_MAP.get(page.slide_type, "title_bullets_right_img")

        # 2. 关键词触发升级
        title_content = page.title + " " + " ".join(
            [str(e.content) for e in page.elements if e.type == "bullets"]
        )
        
        for layout_id, keywords in cls.KEYWORD_TRIGGERS.items():
            if any(kw in title_content for kw in keywords):
                # 检查是否在模板偏好中
                if template and layout_id in template.preferred_layouts:
                    base_layout = layout_id
                    break
                elif template and layout_id not in template.avoided_layouts:
                    base_layout = layout_id
                    break

        # 3. 避免重复（与上一页不同）
        if base_layout == previous_layout:
            alternatives = cls._get_alternatives(base_layout, template)
            if alternatives:
                base_layout = alternatives[0]

        # 4. 模板偏好过滤
        if template and base_layout in template.avoided_layouts:
            base_layout = template.preferred_layouts[0] if template.preferred_layouts else "title_bullets"

        return base_layout

    @classmethod
    def _get_alternatives(cls, current: str, template) -> List[str]:
        """获取替代布局"""
        all_layouts = cls.ALL_LAYOUTS.copy()
        alternatives = [l for l in all_layouts if l != current]

        if template and template.preferred_layouts:
            # 优先使用模板偏好布局
            preferred = [l for l in template.preferred_layouts if l != current]
            alternatives = preferred + [l for l in alternatives if l not in preferred]

        return alternatives[:3]  # 返回最多3个备选

    @classmethod
    def get_layout_info(cls, layout_id: str) -> dict:
        """获取布局信息"""
        layout_info = {
            "title_only_center": {
                "name": "居中标题",
                "description": "用于封面、过渡页",
                "image_slots": 0
            },
            "title_bullets": {
                "name": "标题+要点",
                "description": "用于目录、总结",
                "image_slots": 0
            },
            "title_bullets_right_img": {
                "name": "左文右图",
                "description": "最常用，概念讲解",
                "image_slots": 1
            },
            "operation_steps": {
                "name": "左图右步骤",
                "description": "实训操作",
                "image_slots": 1
            },
            "concept_comparison": {
                "name": "左右对比",
                "description": "对比分析",
                "image_slots": 2
            },
            "grid_4": {
                "name": "四宫格",
                "description": "分类展示",
                "image_slots": 4
            },
            "center_visual": {
                "name": "中心视觉",
                "description": "重点图示",
                "image_slots": 1
            },
            "split_vertical": {
                "name": "上下分栏",
                "description": "图文对照",
                "image_slots": 1
            },
            "timeline_horizontal": {
                "name": "水平时间线",
                "description": "流程步骤",
                "image_slots": 0
            },
            "toc_sidebar_right": {
                "name": "右侧目录",
                "description": "目录导航",
                "image_slots": 0
            },
        }
        return layout_info.get(layout_id, {
            "name": layout_id,
            "description": "未知布局",
            "image_slots": 0
        })

    @classmethod
    def list_all_layouts(cls) -> list:
        """列出所有可用布局"""
        return [
            {"id": layout_id, **cls.get_layout_info(layout_id)}
            for layout_id in cls.ALL_LAYOUTS
        ]
