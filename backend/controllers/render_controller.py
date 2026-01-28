"""
Render Controller - 处理模板化 PPT 渲染相关的 API 端点
"""
import logging
from datetime import datetime
from flask import Blueprint, request, current_app

from models import db, Project, Page, Task
from services.templates_registry import list_templates, get_templates_by_scene, get_template
from services.pedagogy_models import list_pedagogies, get_pedagogies_by_scene, get_pedagogy
from services.render_schemas import SlidePage, StyleConfig, page_to_slide_page
from services.html_renderer import HTMLRenderer
from services.image_slot_service import ImageSlotService
from services.pptx_export_service import PPTXExportService
from services.task_manager import task_manager
from utils import success_response, error_response, not_found, bad_request

logger = logging.getLogger(__name__)

render_bp = Blueprint('render', __name__, url_prefix='/api')


# ═══════════════════════════════════════════════════════════════════════════════
# 模板相关 API
# ═══════════════════════════════════════════════════════════════════════════════

@render_bp.route('/templates', methods=['GET'])
def get_templates():
    """
    GET /api/templates - 获取所有可用模板
    
    Query params:
    - scene: 可选，按场景筛选 (theory / practice / review)
    """
    try:
        scene = request.args.get('scene')
        
        if scene:
            templates = get_templates_by_scene(scene)
        else:
            templates = list_templates()
        
        return success_response({
            'templates': templates,
            'total': len(templates)
        })
    
    except Exception as e:
        logger.error(f"get_templates failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@render_bp.route('/templates/<template_id>', methods=['GET'])
def get_template_detail(template_id):
    """
    GET /api/templates/{template_id} - 获取模板详情
    """
    try:
        template = get_template(template_id)
        
        if not template:
            return not_found('Template')
        
        return success_response(template.dict())
    
    except Exception as e:
        logger.error(f"get_template_detail failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


# ═══════════════════════════════════════════════════════════════════════════════
# 教法模型相关 API
# ═══════════════════════════════════════════════════════════════════════════════

@render_bp.route('/pedagogies', methods=['GET'])
def get_pedagogies():
    """
    GET /api/pedagogies - 获取所有可用教法模型
    
    Query params:
    - scene: 可选，按场景筛选 (theory / practice / review / mixed)
    """
    try:
        scene = request.args.get('scene')
        
        if scene:
            pedagogies = get_pedagogies_by_scene(scene)
        else:
            pedagogies = list_pedagogies()
        
        return success_response({
            'pedagogies': pedagogies,
            'total': len(pedagogies)
        })
    
    except Exception as e:
        logger.error(f"get_pedagogies failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@render_bp.route('/pedagogies/<pedagogy_id>', methods=['GET'])
def get_pedagogy_detail(pedagogy_id):
    """
    GET /api/pedagogies/{pedagogy_id} - 获取教法模型详情
    """
    try:
        pedagogy = get_pedagogy(pedagogy_id)
        
        if not pedagogy:
            return not_found('Pedagogy')
        
        return success_response(pedagogy.dict())
    
    except Exception as e:
        logger.error(f"get_pedagogy_detail failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


# ═══════════════════════════════════════════════════════════════════════════════
# HTML 渲染相关 API
# ═══════════════════════════════════════════════════════════════════════════════

@render_bp.route('/projects/<project_id>/render/html', methods=['POST'])
def render_html(project_id):
    """
    POST /api/projects/{project_id}/render/html - 生成 HTML 预览
    
    Request body:
    {
        "template_id": "theory_professional",  # 可选，默认 theory_professional
        "pedagogy_method": "five_step"  # 可选，默认 five_step
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json() or {}
        template_id = data.get('template_id', 'theory_professional')
        pedagogy_method = data.get('pedagogy_method', 'five_step')
        
        # 获取项目页面
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        
        if not pages:
            return bad_request("No pages found for project")
        
        # 转换为 SlidePage 对象
        slide_pages = []
        for i, page in enumerate(pages):
            slide_page = page_to_slide_page(page, i)
            
            # 设置教法环节（如果有）
            outline = page.get_outline_content()
            if outline:
                slide_page.pedagogy_phase = outline.get('pedagogy_phase', '')
            
            slide_pages.append(slide_page)
        
        # 获取模板并构建样式配置
        template = get_template(template_id)
        if template:
            style_config = StyleConfig(
                style_name=template_id,
                color={k.replace('color-', ''): v for k, v in template.css_vars.items() if k.startswith('color-')},
                font={k.replace('font-', ''): v for k, v in template.css_vars.items() if k.startswith('font-')},
                layout={k.replace('layout-', ''): v for k, v in template.css_vars.items() if k.startswith('layout-')}
            )
        else:
            style_config = StyleConfig(style_name=template_id)
        
        # 输出目录
        output_dir = f"{current_app.config['UPLOAD_FOLDER']}/{project_id}/html_output"
        
        # 渲染 HTML
        result = HTMLRenderer.render(
            pages=slide_pages,
            style_config=style_config,
            deck_title=project.idea_prompt[:50] if project.idea_prompt else "演示文稿",
            session_id=project_id,
            output_dir=output_dir,
            template_id=template_id
        )
        
        logger.info(f"HTML 渲染完成: 项目 {project_id}, {result.total_pages} 页")
        
        return success_response({
            'html_path': f"/files/{project_id}/html_output/index.html",
            'image_slots': [s.to_dict() for s in result.image_slots],
            'layouts_used': result.layouts_used,
            'total_pages': result.total_pages,
            'warnings': result.warnings
        })
    
    except Exception as e:
        logger.error(f"render_html failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


# ═══════════════════════════════════════════════════════════════════════════════
# HTML 预览 API（返回 URL）
# ═══════════════════════════════════════════════════════════════════════════════

@render_bp.route('/projects/<project_id>/render/html-preview', methods=['POST'])
def render_html_preview(project_id):
    """
    POST /api/projects/{project_id}/render/html-preview - 生成 HTML 预览并返回 URL
    
    Request body:
    {
        "template_id": "theory_professional",  # 模板 ID
        "pedagogy_method": "five_step"  # 教法模式
    }
    
    Response:
    {
        "html_url": "/files/{project_id}/html_output/index.html",
        "html_content": null,  # 可选，直接返回 HTML 内容
        "image_slots": [...],
        "layouts_used": {...},
        "total_pages": 10
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json() or {}
        template_id = data.get('template_id', 'theory_professional')
        pedagogy_method = data.get('pedagogy_method', 'five_step')
        
        # 获取项目页面
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        
        if not pages:
            return bad_request("No pages found for project")
        
        # 转换为 SlidePage 对象
        slide_pages = []
        for i, page in enumerate(pages):
            slide_page = page_to_slide_page(page, i)
            
            # 设置教法环节（如果有）
            outline = page.get_outline_content()
            if outline:
                slide_page.pedagogy_phase = outline.get('pedagogy_phase', '')
            
            slide_pages.append(slide_page)
        
        # 获取模板并构建样式配置
        template = get_template(template_id)
        if template:
            style_config = StyleConfig(
                style_name=template_id,
                color={k.replace('color-', ''): v for k, v in template.css_vars.items() if k.startswith('color-')},
                font={k.replace('font-', ''): v for k, v in template.css_vars.items() if k.startswith('font-')},
                layout={k.replace('layout-', ''): v for k, v in template.css_vars.items() if k.startswith('layout-')}
            )
        else:
            style_config = StyleConfig(style_name=template_id)
        
        # 输出目录
        output_dir = f"{current_app.config['UPLOAD_FOLDER']}/{project_id}/html_output"
        
        # 渲染 HTML
        result = HTMLRenderer.render(
            pages=slide_pages,
            style_config=style_config,
            deck_title=project.idea_prompt[:50] if project.idea_prompt else "演示文稿",
            session_id=project_id,
            output_dir=output_dir,
            template_id=template_id
        )
        
        logger.info(f"HTML 预览生成完成: 项目 {project_id}, {result.total_pages} 页")
        
        # 转换图片插槽为字典格式
        image_slots_data = []
        for slot in result.image_slots:
            slot_dict = slot.to_dict() if hasattr(slot, 'to_dict') else {
                'slot_id': slot.slot_id,
                'page_index': slot.page_index,
                'theme': slot.theme,
                'keywords': slot.keywords,
                'visual_style': slot.visual_style,
                'aspect_ratio': slot.aspect_ratio,
                'context': slot.context,
                'layout_position': slot.layout_position,
                'x': slot.x,
                'y': slot.y,
                'w': slot.w,
                'h': slot.h,
                'priority': slot.priority
            }
            image_slots_data.append(slot_dict)
        
        return success_response({
            'html_url': f"/files/{project_id}/html_output/index.html",
            'html_content': None,  # 可选：直接返回 HTML 内容
            'image_slots': image_slots_data,
            'layouts_used': result.layouts_used,
            'total_pages': result.total_pages
        })
    
    except Exception as e:
        logger.error(f"render_html_preview failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


# ═══════════════════════════════════════════════════════════════════════════════
# 图片生成相关 API
# ═══════════════════════════════════════════════════════════════════════════════

@render_bp.route('/projects/<project_id>/render/generate-images', methods=['POST'])
def generate_slot_images(project_id):
    """
    POST /api/projects/{project_id}/render/generate-images - 启动图片插槽生成任务
    
    Request body:
    {
        "image_slots": [...],  # 图片插槽列表
        "subject": "职业教育"  # 可选，学科领域
    }
    
    支持 WebSocket 实时进度通知，客户端可订阅 task_{project_id}_{task_id} 房间
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json() or {}
        slots_data = data.get('image_slots', [])
        subject = data.get('subject', '职业教育')
        
        if not slots_data:
            return bad_request("image_slots is required")
        
        # 转换为 ImageSlotRequest 对象
        from services.render_schemas import ImageSlotRequest
        slots = []
        for s in slots_data:
            slots.append(ImageSlotRequest(
                slot_id=s.get('slot_id'),
                page_index=s.get('page_index', 0),
                theme=s.get('theme', ''),
                keywords=s.get('keywords', []),
                visual_style=s.get('visual_style', 'photo'),
                aspect_ratio=s.get('aspect_ratio', '16:9'),
                context=s.get('context', ''),
                layout_position=s.get('layout_position', 'right'),
                x=s.get('x', 0.5),
                y=s.get('y', 0.2),
                w=s.get('w', 0.4),
                h=s.get('h', 0.6),
                priority=s.get('priority', 1)
            ))
        
        # 创建任务
        task = Task(
            project_id=project_id,
            task_type='GENERATE_SLOT_IMAGES',
            status='PENDING'
        )
        task.set_progress({
            'total': len(slots),
            'completed': 0,
            'failed': 0
        })
        
        db.session.add(task)
        db.session.commit()
        
        task_id = task.id
        
        # 获取 app 实例
        app = current_app._get_current_object()
        
        # 定义任务函数
        def task_func(tid):
            with app.app_context():
                try:
                    task_obj = Task.query.get(tid)
                    if not task_obj:
                        return {'error': 'Task not found'}
                    
                    task_obj.status = 'RUNNING'
                    db.session.commit()
                    
                    # 尝试导入 WebSocket 通知服务
                    try:
                        from services.websocket_service import (
                            notify_slot_started, notify_slot_completed, 
                            notify_slot_failed, notify_task_completed, notify_task_failed
                        )
                        ws_enabled = True
                    except ImportError:
                        ws_enabled = False
                    
                    # 创建服务并生成
                    service = ImageSlotService()
                    completed_count = 0
                    failed_count = 0
                    results = {}
                    
                    for slot in slots:
                        # 通知开始
                        if ws_enabled:
                            notify_slot_started(project_id, tid, slot.slot_id)
                        
                        try:
                            # 生成单个插槽
                            result = service.generate_single(slot, subject)
                            results[slot.slot_id] = result
                            
                            if result.get('status') == 'done':
                                completed_count += 1
                                if ws_enabled:
                                    notify_slot_completed(
                                        project_id, tid, slot.slot_id,
                                        result.get('image_path', ''),
                                        {'total': len(slots), 'completed': completed_count, 'failed': failed_count}
                                    )
                            else:
                                failed_count += 1
                                if ws_enabled:
                                    notify_slot_failed(
                                        project_id, tid, slot.slot_id,
                                        result.get('error', 'Unknown error'),
                                        {'total': len(slots), 'completed': completed_count, 'failed': failed_count}
                                    )
                        except Exception as slot_error:
                            failed_count += 1
                            results[slot.slot_id] = {'status': 'failed', 'error': str(slot_error)}
                            if ws_enabled:
                                notify_slot_failed(
                                    project_id, tid, slot.slot_id,
                                    str(slot_error),
                                    {'total': len(slots), 'completed': completed_count, 'failed': failed_count}
                                )
                        
                        # 更新数据库进度
                        task_obj.set_progress({
                            'total': len(slots),
                            'completed': completed_count,
                            'failed': failed_count
                        })
                        db.session.commit()
                    
                    # 更新最终任务状态
                    task_obj.status = 'COMPLETED' if failed_count == 0 else 'PARTIAL'
                    task_obj.result = results
                    db.session.commit()
                    
                    # 通知任务完成
                    if ws_enabled:
                        notify_task_completed(
                            project_id, tid,
                            {'total': len(slots), 'completed': completed_count, 'failed': failed_count}
                        )
                    
                    return results
                    
                except Exception as e:
                    logger.error(f"generate_slot_images task failed: {e}", exc_info=True)
                    task_obj = Task.query.get(tid)
                    if task_obj:
                        task_obj.status = 'FAILED'
                        task_obj.error_message = str(e)
                        db.session.commit()
                    
                    # 通知任务失败
                    try:
                        from services.websocket_service import notify_task_failed
                        notify_task_failed(project_id, tid, str(e))
                    except ImportError:
                        pass
                    
                    return {'error': str(e)}
        
        # 提交任务
        task_manager.submit_task(task_id, task_func, task_id)
        
        return success_response({
            'task_id': task_id,
            'status': 'PENDING',
            'total_slots': len(slots),
            'websocket_room': f"task_{project_id}_{task_id}"  # 返回 WebSocket 房间名
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_slot_images failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@render_bp.route('/projects/<project_id>/render/image-status/<task_id>', methods=['GET'])
def get_image_status(project_id, task_id):
    """
    GET /api/projects/{project_id}/render/image-status/{task_id} - 获取图片生成状态
    """
    try:
        task = Task.query.get(task_id)
        
        if not task or task.project_id != project_id:
            return not_found('Task')
        
        progress = task.get_progress()
        
        return success_response({
            'task_id': task_id,
            'status': task.status,
            'progress': progress,
            'result': task.result if task.status in ['COMPLETED', 'PARTIAL'] else None,
            'error': task.error_message if task.status == 'FAILED' else None
        })
    
    except Exception as e:
        logger.error(f"get_image_status failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@render_bp.route('/projects/<project_id>/render/regenerate-slot/<slot_id>', methods=['POST'])
def regenerate_single_slot(project_id, slot_id):
    """
    POST /api/projects/{project_id}/render/regenerate-slot/{slot_id} - 单图重绘（独立计费）
    
    Request body:
    {
        "slot_data": {...},  # 图片插槽数据
        "subject": "职业教育"  # 可选，学科领域
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json() or {}
        slot_data = data.get('slot_data', {})
        subject = data.get('subject', '职业教育')
        
        if not slot_data:
            return bad_request("slot_data is required")
        
        # 确保 slot_id 一致
        slot_data['slot_id'] = slot_id
        
        # 转换为 ImageSlotRequest 对象
        from services.render_schemas import ImageSlotRequest
        slot = ImageSlotRequest(
            slot_id=slot_data.get('slot_id'),
            page_index=slot_data.get('page_index', 0),
            theme=slot_data.get('theme', ''),
            keywords=slot_data.get('keywords', []),
            visual_style=slot_data.get('visual_style', 'photo'),
            aspect_ratio=slot_data.get('aspect_ratio', '16:9'),
            context=slot_data.get('context', ''),
            layout_position=slot_data.get('layout_position', 'right'),
            x=slot_data.get('x', 0.5),
            y=slot_data.get('y', 0.2),
            w=slot_data.get('w', 0.4),
            h=slot_data.get('h', 0.6),
            priority=slot_data.get('priority', 1)
        )
        
        # 创建任务
        task = Task(
            project_id=project_id,
            task_type='REGENERATE_SINGLE_SLOT',
            status='PENDING'
        )
        task.set_progress({
            'total': 1,
            'completed': 0,
            'failed': 0,
            'slot_id': slot_id
        })
        
        db.session.add(task)
        db.session.commit()
        
        # 获取 app 实例
        app = current_app._get_current_object()
        
        # 定义任务函数
        def task_func(task_id):
            with app.app_context():
                try:
                    task_obj = Task.query.get(task_id)
                    if not task_obj:
                        return {'error': 'Task not found'}
                    
                    task_obj.status = 'RUNNING'
                    db.session.commit()
                    
                    # 创建服务并生成
                    service = ImageSlotService()
                    results = service.generate_batch([slot], subject)
                    
                    # 获取结果
                    result = results.get(slot_id, {})
                    is_success = result.get('status') == 'done'
                    
                    task_obj.status = 'COMPLETED' if is_success else 'FAILED'
                    task_obj.set_progress({
                        'total': 1,
                        'completed': 1 if is_success else 0,
                        'failed': 0 if is_success else 1,
                        'slot_id': slot_id,
                        'image_path': result.get('image_path')
                    })
                    task_obj.result = result
                    if not is_success:
                        task_obj.error_message = result.get('error', 'Unknown error')
                    db.session.commit()
                    
                    return result
                    
                except Exception as e:
                    logger.error(f"regenerate_single_slot task failed: {e}", exc_info=True)
                    task_obj = Task.query.get(task_id)
                    if task_obj:
                        task_obj.status = 'FAILED'
                        task_obj.error_message = str(e)
                        db.session.commit()
                    return {'error': str(e)}
        
        # 提交任务
        task_manager.submit_task(task.id, task_func, task.id)
        
        return success_response({
            'task_id': task.id,
            'status': 'PENDING',
            'slot_id': slot_id,
            'billing': 'independent'  # 标记独立计费
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"regenerate_single_slot failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@render_bp.route('/projects/<project_id>/render/upload-slot-image/<slot_id>', methods=['POST'])
def upload_slot_image(project_id, slot_id):
    """
    POST /api/projects/{project_id}/render/upload-slot-image/{slot_id} - 上传替换图片（临时缓存）
    
    Request: multipart/form-data with 'image' file
    """
    import os
    from werkzeug.utils import secure_filename
    
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        if 'image' not in request.files:
            return bad_request("No image file provided")
        
        file = request.files['image']
        
        if file.filename == '':
            return bad_request("No selected file")
        
        # 验证文件类型
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_ext not in allowed_extensions:
            return bad_request(f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
        
        # 验证文件大小 (10MB)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        if file_size > 10 * 1024 * 1024:
            return bad_request("File size exceeds 10MB limit")
        
        # 保存到临时目录
        temp_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], project_id, 'temp_slots')
        os.makedirs(temp_dir, exist_ok=True)
        
        filename = secure_filename(f"{slot_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_ext}")
        file_path = os.path.join(temp_dir, filename)
        file.save(file_path)
        
        # 返回临时 URL
        relative_path = f"/files/{project_id}/temp_slots/{filename}"
        
        logger.info(f"图片上传成功: slot={slot_id}, path={file_path}")
        
        return success_response({
            'slot_id': slot_id,
            'image_path': file_path,
            'image_url': relative_path,
            'storage': 'temporary',  # 标记为临时存储
            'expires_in': '24h'  # 临时文件 24 小时后可清理
        })
    
    except Exception as e:
        logger.error(f"upload_slot_image failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@render_bp.route('/projects/<project_id>/render/batch-regenerate', methods=['POST'])
def batch_regenerate_slots(project_id):
    """
    POST /api/projects/{project_id}/render/batch-regenerate - 批量重绘（带确认）
    
    Request body:
    {
        "slot_ids": ["slot_1", "slot_2"],  # 要重绘的插槽 ID 列表
        "slots_data": {...},  # 插槽数据映射
        "subject": "职业教育"
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json() or {}
        slot_ids = data.get('slot_ids', [])
        slots_data = data.get('slots_data', {})
        subject = data.get('subject', '职业教育')
        
        if not slot_ids:
            return bad_request("slot_ids is required")
        
        # 转换为 ImageSlotRequest 对象列表
        from services.render_schemas import ImageSlotRequest
        slots = []
        for slot_id in slot_ids:
            slot_data = slots_data.get(slot_id, {})
            slots.append(ImageSlotRequest(
                slot_id=slot_id,
                page_index=slot_data.get('page_index', 0),
                theme=slot_data.get('theme', ''),
                keywords=slot_data.get('keywords', []),
                visual_style=slot_data.get('visual_style', 'photo'),
                aspect_ratio=slot_data.get('aspect_ratio', '16:9'),
                context=slot_data.get('context', ''),
                layout_position=slot_data.get('layout_position', 'right'),
                x=slot_data.get('x', 0.5),
                y=slot_data.get('y', 0.2),
                w=slot_data.get('w', 0.4),
                h=slot_data.get('h', 0.6),
                priority=slot_data.get('priority', 1)
            ))
        
        # 创建任务
        task = Task(
            project_id=project_id,
            task_type='BATCH_REGENERATE_SLOTS',
            status='PENDING'
        )
        task.set_progress({
            'total': len(slots),
            'completed': 0,
            'failed': 0
        })
        
        db.session.add(task)
        db.session.commit()
        
        # 获取 app 实例
        app = current_app._get_current_object()
        
        # 定义任务函数
        def task_func(task_id):
            with app.app_context():
                try:
                    task_obj = Task.query.get(task_id)
                    if not task_obj:
                        return {'error': 'Task not found'}
                    
                    task_obj.status = 'RUNNING'
                    db.session.commit()
                    
                    # 创建服务并生成
                    service = ImageSlotService()
                    
                    def progress_callback(done, total, status):
                        task_obj.set_progress({
                            'total': total,
                            'completed': done,
                            'failed': 0
                        })
                        db.session.commit()
                    
                    results = service.generate_batch(slots, subject, progress_callback=progress_callback)
                    
                    # 更新任务状态
                    done_count = sum(1 for r in results.values() if r.get('status') == 'done')
                    failed_count = sum(1 for r in results.values() if r.get('status') == 'failed')
                    
                    task_obj.status = 'COMPLETED' if failed_count == 0 else 'PARTIAL'
                    task_obj.set_progress({
                        'total': len(slots),
                        'completed': done_count,
                        'failed': failed_count
                    })
                    task_obj.result = results
                    db.session.commit()
                    
                    return results
                    
                except Exception as e:
                    logger.error(f"batch_regenerate_slots task failed: {e}", exc_info=True)
                    task_obj = Task.query.get(task_id)
                    if task_obj:
                        task_obj.status = 'FAILED'
                        task_obj.error_message = str(e)
                        db.session.commit()
                    return {'error': str(e)}
        
        # 提交任务
        task_manager.submit_task(task.id, task_func, task.id)
        
        return success_response({
            'task_id': task.id,
            'status': 'PENDING',
            'total_slots': len(slots),
            'billing': 'independent_per_slot'  # 每个插槽独立计费
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"batch_regenerate_slots failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


# ═══════════════════════════════════════════════════════════════════════════════
# PPTX 导出相关 API
# ═══════════════════════════════════════════════════════════════════════════════

@render_bp.route('/projects/<project_id>/export/pptx-template', methods=['POST'])
def export_pptx_template(project_id):
    """
    POST /api/projects/{project_id}/export/pptx-template - 导出模板化可编辑 PPTX
    
    Request body:
    {
        "template_id": "theory_professional",  # 可选
        "image_paths": {"slot_id": "file_path"}  # 可选，图片路径映射
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json() or {}
        template_id = data.get('template_id', 'theory_professional')
        image_paths = data.get('image_paths', {})
        
        # 获取项目页面
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        
        if not pages:
            return bad_request("No pages found for project")
        
        # 转换为 SlidePage 对象
        slide_pages = []
        for i, page in enumerate(pages):
            slide_page = page_to_slide_page(page, i)
            slide_pages.append(slide_page)
        
        # 获取模板样式
        template = get_template(template_id)
        if template:
            style_config = StyleConfig(
                style_name=template_id,
                color={k.replace('color-', ''): v for k, v in template.css_vars.items() if k.startswith('color-')},
                font={},
                layout={}
            )
        else:
            style_config = StyleConfig(style_name=template_id)
        
        # 输出路径
        output_path = f"{current_app.config['UPLOAD_FOLDER']}/{project_id}/export/{project_id}_template.pptx"
        
        # 创建 PPTX
        builder = PPTXExportService(style_config)
        result_path = builder.create_from_slides(slide_pages, output_path, image_paths)
        
        logger.info(f"PPTX 导出完成: {result_path}")
        
        return success_response({
            'pptx_path': result_path,
            'download_url': f"/files/{project_id}/export/{project_id}_template.pptx"
        })
    
    except Exception as e:
        logger.error(f"export_pptx_template failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


# ═══════════════════════════════════════════════════════════════════════════════
# 布局相关 API
# ═══════════════════════════════════════════════════════════════════════════════

@render_bp.route('/layouts', methods=['GET'])
def get_layouts():
    """
    GET /api/layouts - 获取所有可用布局
    """
    try:
        from services.layout_engine import LayoutEngine
        
        layouts = LayoutEngine.list_all_layouts()
        
        return success_response({
            'layouts': layouts,
            'total': len(layouts)
        })
    
    except Exception as e:
        logger.error(f"get_layouts failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)
