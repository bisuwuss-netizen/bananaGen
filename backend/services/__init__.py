"""Services package"""
from .ai_service import AIService, ProjectContext
from .file_service import FileService
from .export_service import ExportService

# 新的模板化渲染相关服务
from .pedagogy_models import PedagogyMethod, PedagogyDefinition, get_pedagogy, list_pedagogies
from .templates_registry import TemplateDefinition, get_template, list_templates
from .render_schemas import SlidePage, SlideElement, ImageSlotRequest, RenderResult, StyleConfig
from .layout_engine import LayoutEngine
from .html_renderer import HTMLRenderer
from .image_providers import ImageProvider, get_image_provider
from .image_slot_service import ImageSlotService
from .pptx_export_service import PPTXExportService

__all__ = [
    # 原有服务
    'AIService', 'ProjectContext', 'FileService', 'ExportService',
    # 教法模型
    'PedagogyMethod', 'PedagogyDefinition', 'get_pedagogy', 'list_pedagogies',
    # 模板注册表
    'TemplateDefinition', 'get_template', 'list_templates',
    # 渲染数据模型
    'SlidePage', 'SlideElement', 'ImageSlotRequest', 'RenderResult', 'StyleConfig',
    # 布局引擎
    'LayoutEngine',
    # HTML 渲染器
    'HTMLRenderer',
    # 图片生成
    'ImageProvider', 'get_image_provider', 'ImageSlotService',
    # PPTX 导出
    'PPTXExportService',
]

