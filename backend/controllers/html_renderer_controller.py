"""
HTML渲染器 API 控制器
提供与前端 html-renderer 集成的 API 端点
"""
import logging
from flask import Blueprint, request, jsonify
from services.ai_service import AIService
from utils.response import success_response, error_response

logger = logging.getLogger(__name__)

html_renderer_bp = Blueprint('html_renderer', __name__, url_prefix='/api/html-renderer')


@html_renderer_bp.route('/outline', methods=['POST'])
def generate_outline():
    """
    生成带布局信息的结构化大纲

    Request Body:
    {
        "topic": "PPT主题",
        "requirements": "额外要求（可选）",
        "language": "zh"  # 输出语言（可选，默认zh）
    }

    Response:
    {
        "code": 0,
        "data": {
            "title": "PPT标题",
            "pages": [
                {
                    "page_id": "p01",
                    "title": "页面标题",
                    "layout_id": "cover",
                    "has_image": false,
                    "keywords": []
                },
                ...
            ]
        }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("请求数据为空", 400)

        topic = data.get('topic')
        if not topic:
            return error_response("缺少必填字段: topic", 400)

        requirements = data.get('requirements', '')
        language = data.get('language', 'zh')
        scheme_id = data.get('scheme_id') or 'tech_blue'

        ai_service = AIService()
        outline = ai_service.generate_structured_outline(
            topic=topic,
            requirements=requirements,
            language=language,
            scheme_id=scheme_id
        )

        return success_response(outline)

    except Exception as e:
        logger.error(f"生成大纲失败: {str(e)}", exc_info=True)
        return error_response(f"生成大纲失败: {str(e)}", 500)


@html_renderer_bp.route('/page-content', methods=['POST'])
def generate_page_content():
    """
    根据大纲生成单个页面的结构化内容

    Request Body:
    {
        "page_outline": {
            "page_id": "p01",
            "title": "页面标题",
            "layout_id": "title_content",
            "has_image": true,
            "keywords": ["关键词1", "关键词2"]
        },
        "full_outline": { ... },  # 完整大纲（可选）
        "language": "zh"
    }

    Response:
    {
        "code": 0,
        "data": {
            "page_id": "p01",
            "layout_id": "title_content",
            "model": { ... }
        }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("请求数据为空", 400)

        page_outline = data.get('page_outline')
        if not page_outline:
            return error_response("缺少必填字段: page_outline", 400)

        full_outline = data.get('full_outline')
        language = data.get('language', 'zh')

        ai_service = AIService()
        scheme_id = data.get('scheme_id') or 'tech_blue'
        model = ai_service.generate_structured_page_content(
            page_outline=page_outline,
            full_outline=full_outline,
            language=language,
            scheme_id=scheme_id
        )

        return success_response({
            'page_id': page_outline.get('page_id'),
            'layout_id': page_outline.get('layout_id'),
            'model': model
        })

    except Exception as e:
        logger.error(f"生成页面内容失败: {str(e)}", exc_info=True)
        return error_response(f"生成页面内容失败: {str(e)}", 500)


@html_renderer_bp.route('/full-document', methods=['POST'])
def generate_full_document():
    """
    生成完整的PPT文档数据

    Request Body:
    {
        "topic": "PPT主题",
        "requirements": "额外要求（可选）",
        "language": "zh",
        "scheme_id": "tech_blue/academic/interactive/visual/practical（可选，默认tech_blue）",
        "content_depth": "concise/balanced/detailed（可选，默认balanced）"
    }

    content_depth说明：
    - concise（简明版）: 80-120字/页，适合演讲配图
    - balanced（平衡版）: 120-180字/页，适合大多数教学场景（默认）
    - detailed（详细版）: 180-280字/页，适合深度教学文档

    Response:
    {
        "code": 0,
        "data": {
            "project_id": "ai-gen-xxx",
            "ppt_meta": {
                "title": "PPT标题",
                "theme_id": "tech_blue",
                "aspect_ratio": "16:9"
            },
            "pages": [
                {
                    "page_id": "p01",
                    "order_index": 0,
                    "layout_id": "cover",
                    "model": { ... }
                },
                ...
            ]
        }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("请求数据为空", 400)

        topic = data.get('topic')
        if not topic:
            return error_response("缺少必填字段: topic", 400)

        requirements = data.get('requirements', '')
        language = data.get('language', 'zh')
        scheme_id = data.get('scheme_id') or 'tech_blue'
        content_depth = data.get('content_depth', 'balanced')  # concise/balanced/detailed

        ai_service = AIService()
        ppt_document = ai_service.generate_full_ppt_document(
            topic=topic,
            requirements=requirements,
            language=language,
            scheme_id=scheme_id,
            content_depth=content_depth
        )

        return success_response(ppt_document)

    except Exception as e:
        logger.error(f"生成PPT文档失败: {str(e)}", exc_info=True)
        return error_response(f"生成PPT文档失败: {str(e)}", 500)


@html_renderer_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return success_response({"status": "ok", "service": "html-renderer"})
