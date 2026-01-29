# backend/services/render_schemas.py
"""
渲染数据模型 - 定义幻灯片页面、元素、图片插槽等核心数据结构
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class SlideType(str, Enum):
    """页面类型枚举"""
    TITLE = "title"
    TOC = "toc"
    SECTION = "section"
    INTRO = "intro"
    CONCEPT = "concept"
    STEPS = "steps"
    COMPARISON = "comparison"
    EXERCISES = "exercises"
    SUMMARY = "summary"
    THANK_YOU = "thank_you"


class ImageStyle(str, Enum):
    """图片风格枚举"""
    PHOTO = "photo"              # 真实照片
    SCHEMATIC = "schematic"      # 示意图
    DIAGRAM = "diagram"          # 图表
    ICON = "icon"                # 图标
    ILLUSTRATION = "illustration" # 插画


class AspectRatio(str, Enum):
    """宽高比枚举"""
    RATIO_16_9 = "16:9"
    RATIO_4_3 = "4:3"
    RATIO_1_1 = "1:1"
    RATIO_21_9 = "21:9"


@dataclass
class SlideElement:
    """幻灯片元素"""
    id: str
    type: str  # text / bullets / image / table / diagram
    content: Any
    x: float = 0.0      # 归一化 X 坐标 (0-1)
    y: float = 0.0      # 归一化 Y 坐标 (0-1)
    w: float = 1.0      # 归一化宽度 (0-1)
    h: float = 1.0      # 归一化高度 (0-1)
    style: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "id": self.id,
            "type": self.type,
            "content": self.content,
            "x": self.x,
            "y": self.y,
            "w": self.w,
            "h": self.h,
            "style": self.style
        }


@dataclass
class SlidePage:
    """渲染用幻灯片页面"""
    index: int
    slide_type: str
    title: str
    elements: List[SlideElement] = field(default_factory=list)
    layout_id: str = "title_bullets"
    speaker_notes: str = ""

    # 元数据
    pedagogy_phase: str = ""  # 教法环节名称

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "index": self.index,
            "slide_type": self.slide_type,
            "title": self.title,
            "elements": [e.to_dict() for e in self.elements],
            "layout_id": self.layout_id,
            "speaker_notes": self.speaker_notes,
            "pedagogy_phase": self.pedagogy_phase
        }


@dataclass
class ImageSlotRequest:
    """图片插槽请求"""
    slot_id: str
    page_index: int
    theme: str                    # 主题描述
    keywords: List[str] = field(default_factory=list)
    visual_style: str = "photo"   # ImageStyle
    aspect_ratio: str = "16:9"    # AspectRatio
    context: str = ""             # 上下文描述
    layout_position: str = "right" # left / right / center / grid_0 等
    x: float = 0.5
    y: float = 0.2
    w: float = 0.4
    h: float = 0.6
    priority: int = 1             # 1-5，1最高

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "slot_id": self.slot_id,
            "page_index": self.page_index,
            "theme": self.theme,
            "keywords": self.keywords,
            "visual_style": self.visual_style,
            "aspect_ratio": self.aspect_ratio,
            "context": self.context,
            "layout_position": self.layout_position,
            "x": self.x,
            "y": self.y,
            "w": self.w,
            "h": self.h,
            "priority": self.priority
        }


@dataclass
class RenderResult:
    """渲染结果"""
    session_id: str
    html_path: str
    image_slots: List[ImageSlotRequest]
    layouts_used: Dict[str, int]
    total_pages: int
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "session_id": self.session_id,
            "html_path": self.html_path,
            "image_slots": [s.to_dict() for s in self.image_slots],
            "layouts_used": self.layouts_used,
            "total_pages": self.total_pages,
            "warnings": self.warnings
        }


@dataclass
class StyleConfig:
    """风格配置"""
    style_name: str
    color: Dict[str, str] = field(default_factory=dict)
    font: Dict[str, Any] = field(default_factory=dict)
    layout: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "style_name": self.style_name,
            "color": self.color,
            "font": self.font,
            "layout": self.layout
        }


def page_to_slide_page(page_data: Any, index: int) -> SlidePage:
    """
    将现有 Page 模型数据转换为 SlidePage
    
    Args:
        page_data: 来自数据库的页面数据（Page 模型或字典）
        index: 页面索引
    
    Returns:
        SlidePage 对象
    """
    title = ''
    bullets = []
    slide_type = 'concept'
    speaker_notes = ''
    
    # 处理 SQLAlchemy 模型
    if hasattr(page_data, 'get_outline_content'):
        # 从 outline_content 提取标题和要点
        outline = page_data.get_outline_content()
        if outline:
            title = outline.get('title', '') or ''
            bullets = outline.get('points', []) or []
        
        # 从 description_content 提取更详细的内容（如果有）
        description = page_data.get_description_content()
        if description:
            desc_text = description.get('text', '') if isinstance(description, dict) else str(description)
            speaker_notes = desc_text
            
            # 如果没有从 outline 获取到要点，尝试从描述中提取
            if not bullets and desc_text:
                for line in desc_text.split('\n'):
                    line = line.strip()
                    if line.startswith('- ') or line.startswith('• '):
                        bullets.append(line[2:].strip())
                    elif line.startswith('* '):
                        bullets.append(line[2:].strip())
        
        # 获取页面类型（从 part 字段推断）
        part = getattr(page_data, 'part', None)
        if part:
            if 'theory' in part.lower() or '理论' in part:
                slide_type = 'concept'
            elif 'practice' in part.lower() or '实训' in part:
                slide_type = 'steps'
    
    # 处理字典格式
    elif isinstance(page_data, dict):
        # 尝试从 outline_content 提取
        outline = page_data.get('outline_content', {})
        if isinstance(outline, dict):
            title = outline.get('title', '') or page_data.get('title', '')
            bullets = outline.get('points', []) or []
        else:
            title = page_data.get('title', '')
        
        # 从 description_content 提取
        description = page_data.get('description_content', {})
        if isinstance(description, dict):
            speaker_notes = description.get('text', '')
        elif description:
            speaker_notes = str(description)
        
        slide_type = page_data.get('slide_type', 'concept')
    
    # 创建元素
    elements = []
    if bullets:
        elements.append(SlideElement(
            id=f"bullets_{index}",
            type="bullets",
            content={"items": bullets}
        ))
    
    # 确定页面类型
    if index == 0:
        final_slide_type = "title"
    elif slide_type:
        final_slide_type = slide_type
    else:
        final_slide_type = "concept"
    
    return SlidePage(
        index=index,
        slide_type=final_slide_type,
        title=title,
        elements=elements,
        speaker_notes=speaker_notes
    )
