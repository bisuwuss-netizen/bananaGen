# backend/services/html_renderer.py
"""
HTML 渲染器 - 基于 reveal.js 和 Jinja2 生成可预览的 HTML 幻灯片
"""

import os
import shutil
import logging
from pathlib import Path
from typing import List, Dict, Optional

from jinja2 import Environment, FileSystemLoader

from .render_schemas import SlidePage, ImageSlotRequest, StyleConfig, RenderResult
from .templates_registry import get_template
from .layout_engine import LayoutEngine

logger = logging.getLogger(__name__)


class HTMLRenderer:
    """HTML 渲染器 - 基于 reveal.js"""

    TEMPLATE_DIR = Path(__file__).parent / "render_templates"
    STATIC_DIR = Path(__file__).parent / "render_static"

    # 布局对应的图片插槽配置
    LAYOUT_IMAGE_SLOTS = {
        "title_only_center": [],
        "title_bullets": [],
        "toc_sidebar_right": [],
        "title_bullets_right_img": [
            {"position": "right", "x": 0.58, "y": 0.18, "w": 0.38, "h": 0.72}
        ],
        "operation_steps": [
            {"position": "left", "x": 0.04, "y": 0.18, "w": 0.42, "h": 0.72}
        ],
        "concept_comparison": [
            {"position": "left", "x": 0.04, "y": 0.25, "w": 0.42, "h": 0.50},
            {"position": "right", "x": 0.54, "y": 0.25, "w": 0.42, "h": 0.50}
        ],
        "grid_4": [
            {"position": "grid_0", "x": 0.05, "y": 0.20, "w": 0.42, "h": 0.35},
            {"position": "grid_1", "x": 0.53, "y": 0.20, "w": 0.42, "h": 0.35},
            {"position": "grid_2", "x": 0.05, "y": 0.58, "w": 0.42, "h": 0.35},
            {"position": "grid_3", "x": 0.53, "y": 0.58, "w": 0.42, "h": 0.35}
        ],
        "center_visual": [
            {"position": "center", "x": 0.20, "y": 0.20, "w": 0.60, "h": 0.65}
        ],
        "split_vertical": [
            {"position": "top", "x": 0.10, "y": 0.15, "w": 0.80, "h": 0.40}
        ],
        "timeline_horizontal": [],
    }

    @classmethod
    def render(
        cls,
        pages: List[SlidePage],
        style_config: StyleConfig,
        deck_title: str,
        session_id: str,
        output_dir: str,
        template_id: str = "theory_professional"
    ) -> RenderResult:
        """
        渲染主入口
        
        Args:
            pages: 幻灯片页面列表
            style_config: 风格配置
            deck_title: 演示文稿标题
            session_id: 会话 ID
            output_dir: 输出目录
            template_id: 模板 ID
        
        Returns:
            RenderResult 渲染结果
        """

        logger.info(f"[HTMLRenderer] 开始渲染: {deck_title}, 共 {len(pages)} 页")

        # 1. 准备 Jinja2 环境
        env = Environment(
            loader=FileSystemLoader(str(cls.TEMPLATE_DIR)),
            autoescape=True
        )

        slides_data = []
        all_image_slots = []
        layouts_used = {}
        warnings = []
        previous_layout = None

        # 2. 处理每一页
        for page in pages:
            # 决定布局
            layout_id = LayoutEngine.resolve_layout(page, template_id, previous_layout)
            page.layout_id = layout_id
            previous_layout = layout_id

            # 统计布局使用
            layouts_used[layout_id] = layouts_used.get(layout_id, 0) + 1

            # 生成图片插槽
            image_slots = cls._generate_image_slots(page, layout_id)
            all_image_slots.extend(image_slots)

            # 提取要点
            bullets = cls._extract_bullets(page)

            # 文本溢出检测
            total_chars = sum(len(b) for b in bullets)
            if total_chars > 300:
                warnings.append(f"第 {page.index + 1} 页文字过多 ({total_chars} 字)")

            slides_data.append({
                "index": page.index,
                "layout_id": layout_id,
                "slide_type": page.slide_type,
                "title": page.title,
                "bullets": bullets,
                "image_slots": [s.to_dict() for s in image_slots],
                "pedagogy_phase": page.pedagogy_phase,
                "speaker_notes": page.speaker_notes,
            })

        # 3. 生成 CSS 变量
        css_variables = cls._generate_css_variables(style_config, template_id)

        # 4. 渲染 HTML
        template = env.get_template("base.html")
        html_content = template.render(
            deck_title=deck_title,
            slides=slides_data,
            theme_name=template_id,
            css_variables=css_variables,
            session_id=session_id,
            total_image_slots=len(all_image_slots),
        )

        # 5. 离线模式：CSS 内联化（可选）
        if os.getenv("OFFLINE_MODE", "false").lower() == "true":
            html_content = cls._inline_css(html_content)

        # 6. 复制静态资源
        cls._copy_assets(output_dir)

        # 7. 保存文件
        out_path = Path(output_dir) / "index.html"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        logger.info(f"[HTMLRenderer] 渲染完成: {out_path}")

        return RenderResult(
            session_id=session_id,
            html_path=str(out_path),
            image_slots=all_image_slots,
            layouts_used=layouts_used,
            total_pages=len(pages),
            warnings=warnings
        )

    @classmethod
    def _generate_image_slots(cls, page: SlidePage, layout_id: str) -> List[ImageSlotRequest]:
        """生成图片插槽"""
        slots = []
        slot_configs = cls.LAYOUT_IMAGE_SLOTS.get(layout_id, [])

        for i, cfg in enumerate(slot_configs):
            # 从页面内容提取关键词
            keywords = [page.slide_type]
            if page.title:
                # 提取标题中的关键词
                title_words = page.title.replace("：", " ").replace(":", " ").split()
                keywords.extend(title_words[:3])

            # 确定图片风格
            visual_style = cls._determine_visual_style(page.slide_type, layout_id)

            slots.append(ImageSlotRequest(
                slot_id=f"p{page.index}_slot{i}",
                page_index=page.index,
                theme=page.title,
                keywords=keywords,
                visual_style=visual_style,
                context=page.speaker_notes or page.title,
                layout_position=cfg["position"],
                x=cfg["x"],
                y=cfg["y"],
                w=cfg["w"],
                h=cfg["h"],
                priority=1 if i == 0 else 2
            ))

        return slots

    @classmethod
    def _determine_visual_style(cls, slide_type: str, layout_id: str) -> str:
        """根据页面类型和布局确定图片风格"""
        if slide_type in ["steps", "demonstration"]:
            return "photo"  # 实训类用真实照片
        elif slide_type in ["concept", "intro"]:
            return "schematic"  # 概念类用示意图
        elif layout_id == "grid_4":
            return "icon"  # 网格类用图标
        elif layout_id == "center_visual":
            return "diagram"  # 中心视觉用图表
        else:
            return "illustration"  # 默认用插画

    @classmethod
    def _extract_bullets(cls, page: SlidePage) -> List[str]:
        """提取要点列表"""
        bullets = []
        for elem in page.elements:
            if elem.type == "bullets":
                if isinstance(elem.content, dict):
                    bullets.extend(elem.content.get("items", []))
                elif isinstance(elem.content, list):
                    bullets.extend(elem.content)
        return bullets

    @classmethod
    def _generate_css_variables(cls, style: StyleConfig, template_id: str) -> str:
        """生成 CSS 变量"""
        template = get_template(template_id)

        # 合并：模板默认 + 风格覆盖
        css_vars = {}
        if template:
            css_vars.update(template.css_vars)

        # 风格配置覆盖
        if style.color:
            for key, value in style.color.items():
                css_vars[f"color-{key}"] = value
        if style.font:
            for key, value in style.font.items():
                css_vars[f"font-{key}"] = str(value)
        if style.layout:
            for key, value in style.layout.items():
                css_vars[f"layout-{key}"] = str(value)

        # 生成 CSS 字符串
        lines = [f"--{k}: {v};" for k, v in css_vars.items()]
        return "\n            ".join(lines)

    @classmethod
    def _copy_assets(cls, output_dir: str):
        """复制静态资源"""
        target = Path(output_dir) / "static"
        try:
            if target.exists():
                shutil.rmtree(target)
            if cls.STATIC_DIR.exists():
                shutil.copytree(
                    cls.STATIC_DIR,
                    target,
                    dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("*.pyc", "__pycache__")
                )
                logger.debug(f"[HTMLRenderer] 静态资源已复制到: {target}")
        except Exception as e:
            logger.warning(f"[HTMLRenderer] 静态资源复制失败: {e}")

    @classmethod
    def _inline_css(cls, html_content: str) -> str:
        """CSS 内联化（离线模式）"""
        try:
            from premailer import transform
            return transform(html_content)
        except ImportError:
            logger.warning("[HTMLRenderer] premailer 未安装，跳过 CSS 内联化")
            return html_content

    @classmethod
    def update_image_in_html(
        cls,
        html_path: str,
        slot_id: str,
        image_url: str
    ) -> bool:
        """
        更新 HTML 中的图片占位符
        
        Args:
            html_path: HTML 文件路径
            slot_id: 插槽 ID
            image_url: 图片 URL
        
        Returns:
            是否更新成功
        """
        try:
            with open(html_path, "r", encoding="utf-8") as f:
                content = f.read()

            # 查找并替换占位符
            placeholder_pattern = f'data-slot-id="{slot_id}"'
            if placeholder_pattern in content:
                # 构建新的图片 HTML
                new_img_html = f'''
                    <img src="{image_url}" 
                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"
                         alt="配图" />
                '''
                
                # 简单替换：将占位符内容替换为图片
                # 这是一个简化的实现，实际可能需要更复杂的 HTML 解析
                import re
                pattern = rf'(<div[^>]*data-slot-id="{slot_id}"[^>]*>)[\s\S]*?(</div>)'
                replacement = rf'\1{new_img_html}\2'
                new_content = re.sub(pattern, replacement, content, count=1)

                with open(html_path, "w", encoding="utf-8") as f:
                    f.write(new_content)

                logger.info(f"[HTMLRenderer] 图片已更新: {slot_id}")
                return True
            else:
                logger.warning(f"[HTMLRenderer] 未找到插槽: {slot_id}")
                return False

        except Exception as e:
            logger.error(f"[HTMLRenderer] 更新图片失败: {e}")
            return False
