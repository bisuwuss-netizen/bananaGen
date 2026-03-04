"""
Project Controller - handles project-related endpoints
"""
import json
import logging
import traceback
from datetime import datetime

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import desc
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import BadRequest

from models import db, Project, Page, Task, ReferenceFile
from services import ProjectContext
from services.ai_service_manager import get_ai_service
from services.image_prompt_optimizer import optimize_html_image_slots
from services.prompts import LAYOUT_SCHEMES
from services.task_manager import (
    task_manager,
    generate_descriptions_task,
    generate_images_task,
    auto_fail_stale_task,
)
from utils import (
    success_response, error_response, not_found, bad_request,
    parse_page_ids_from_body, get_filtered_pages
)

logger = logging.getLogger(__name__)

project_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


def _get_project_reference_files_content(project_id: str) -> list:
    """
    Get reference files content for a project
    
    Args:
        project_id: Project ID
        
    Returns:
        List of dicts with 'filename' and 'content' keys
    """
    reference_files = ReferenceFile.query.filter_by(
        project_id=project_id,
        parse_status='completed'
    ).all()
    
    files_content = []
    for ref_file in reference_files:
        if ref_file.markdown_content:
            files_content.append({
                'filename': ref_file.filename,
                'content': ref_file.markdown_content
            })
    
    return files_content


def _reconstruct_outline_from_pages(pages: list) -> list:
    """
    Reconstruct outline structure from Page objects
    
    Args:
        pages: List of Page objects ordered by order_index
        
    Returns:
        Outline structure (list) with optional part grouping
    """
    outline = []
    current_part = None
    current_part_pages = []
    
    for page in pages:
        outline_content = page.get_outline_content()
        if not outline_content:
            continue
            
        page_data = outline_content.copy()
        
        # Include layout_id from page model so downstream functions can identify page types
        if page.layout_id:
            page_data['layout_id'] = page.layout_id
        
        # 如果当前页面属于一个 part
        if page.part:
            # 如果这是新的 part，先保存之前的 part（如果有）
            if current_part and current_part != page.part:
                outline.append({
                    "part": current_part,
                    "pages": current_part_pages
                })
                current_part_pages = []
            
            current_part = page.part
            # 移除 part 字段，因为它在顶层
            if 'part' in page_data:
                del page_data['part']
            current_part_pages.append(page_data)
        else:
            # 如果当前页面不属于任何 part，先保存之前的 part（如果有）
            if current_part:
                outline.append({
                    "part": current_part,
                    "pages": current_part_pages
                })
                current_part = None
                current_part_pages = []
            
            # 直接添加页面
            outline.append(page_data)
    
    # 保存最后一个 part（如果有）
    if current_part:
        outline.append({
            "part": current_part,
            "pages": current_part_pages
        })
    
    return outline


@project_bp.route('', methods=['GET'])
def list_projects():
    """
    GET /api/projects - Get all projects (for history)
    
    Query params:
    - limit: number of projects to return (default: 50, max: 100)
    - offset: offset for pagination (default: 0)
    - user_id: user ID to filter projects (optional)
    """
    try:
        # Parameter validation
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        user_id = request.args.get('user_id', type=str)
        
        logger.info(f"list_projects - user_id: {user_id}")
        
        # Enforce limits to prevent performance issues
        limit = min(max(1, limit), 100)  # Between 1-100
        offset = max(0, offset)  # Non-negative
        
        # 如果user_id为空或None，返回空数据
        if not user_id or user_id.strip() == '':
            return success_response({
                'projects': [],
                'has_more': False,
                'limit': limit,
                'offset': offset
            })
        
        # Build query with user_id filter
        query = Project.query\
            .options(joinedload(Project.pages))\
            .filter(Project.user_id == user_id)
        
        # Fetch limit + 1 items to check for more pages efficiently
        # This avoids a second database query
        projects_with_extra = query\
            .order_by(desc(Project.updated_at))\
            .limit(limit + 1)\
            .offset(offset)\
            .all()
        
        # Check if there are more items beyond the current page
        has_more = len(projects_with_extra) > limit
        # Return only the requested limit
        projects = projects_with_extra[:limit]
        
        return success_response({
            'projects': [project.to_dict(include_pages=True) for project in projects],
            'has_more': has_more,
            'limit': limit,
            'offset': offset
        })
    
    except Exception as e:
        logger.error(f"list_projects failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('', methods=['POST'])
def create_project():
    """
    POST /api/projects - Create a new project
    
    Request body:
    {
        "creation_type": "idea|outline|descriptions",
        "idea_prompt": "...",  # required for idea type
        "outline_text": "...",  # required for outline type
        "description_text": "...",  # required for descriptions type
        "template_id": "optional"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return bad_request("Request body is required")
        
        # creation_type is required
        if 'creation_type' not in data:
            return bad_request("creation_type is required")
        
        creation_type = data.get('creation_type')
        
        if creation_type not in ['idea', 'outline', 'descriptions']:
            return bad_request("Invalid creation_type")
        
        # Create project
        # 如果没有传入user_id，默认设置为'1'
        user_id = data.get('user_id') or '1'
        logger.info(f"create_project - user_id: {user_id}")
        
        # 获取当前时间（本地时间）
        current_time = datetime.now()
        logger.info(f"create_project - current_time: {current_time}")
        
        # 获取渲染模式（默认为 image）
        render_mode = data.get('render_mode', 'image')
        if render_mode not in ['image', 'html']:
            render_mode = 'image'

        scheme_id = data.get('scheme_id') or 'tech_blue'
        if scheme_id not in LAYOUT_SCHEMES:
            scheme_id = 'tech_blue'

        project = Project(
            creation_type=creation_type,
            idea_prompt=data.get('idea_prompt'),
            outline_text=data.get('outline_text'),
            description_text=data.get('description_text'),
            template_style=data.get('template_style'),
            scheme_id=scheme_id,
            render_mode=render_mode,
            user_id=user_id,  # 自动设置user_id为1（如果未传入）
            status='DRAFT',
            created_at=current_time,  # 显式设置创建时间为当前时间
            updated_at=current_time    # 显式设置更新时间为当前时间
        )
        
        db.session.add(project)
        db.session.commit()
        
        return success_response({
            'project_id': project.id,
            'status': project.status,
            'pages': []
        }, status_code=201)
    
    except BadRequest as e:
        # Handle JSON parsing errors (invalid JSON body)
        db.session.rollback()
        logger.warning(f"create_project: Invalid JSON body - {str(e)}")
        return bad_request("Invalid JSON in request body")
    
    except Exception as e:
        db.session.rollback()
        error_trace = traceback.format_exc()
        logger.error(f"create_project failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    """
    GET /api/projects/{project_id} - Get project details
    """
    try:
        # Use eager loading to load project and related pages
        project = Project.query\
            .options(joinedload(Project.pages))\
            .filter(Project.id == project_id)\
            .first()
        
        if not project:
            return not_found('Project')
        
        return success_response(project.to_dict(include_pages=True))
    
    except Exception as e:
        logger.error(f"get_project failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>', methods=['PUT'])
def update_project(project_id):
    """
    PUT /api/projects/{project_id} - Update project
    
    Request body:
    {
        "idea_prompt": "...",
        "pages_order": ["page-uuid-1", "page-uuid-2", ...]
    }
    """
    try:
        # Use eager loading to load project and pages (for page order updates)
        project = Project.query\
            .options(joinedload(Project.pages))\
            .filter(Project.id == project_id)\
            .first()
        
        if not project:
            return not_found('Project')
        
        data = request.get_json()
        
        # Update idea_prompt if provided
        if 'idea_prompt' in data:
            project.idea_prompt = data['idea_prompt']
        
        # Update extra_requirements if provided
        if 'extra_requirements' in data:
            project.extra_requirements = data['extra_requirements']
        
        # Update template_style if provided
        if 'template_style' in data:
            project.template_style = data['template_style']

        # Update scheme_id if provided
        if 'scheme_id' in data:
            scheme_id = data.get('scheme_id') or 'tech_blue'
            if scheme_id in LAYOUT_SCHEMES:
                project.scheme_id = scheme_id
        
        # Update export settings if provided
        if 'export_extractor_method' in data:
            project.export_extractor_method = data['export_extractor_method']
        if 'export_inpaint_method' in data:
            project.export_inpaint_method = data['export_inpaint_method']

        # Update render_mode if provided
        if 'render_mode' in data:
            render_mode = data['render_mode']
            if render_mode in ['image', 'html']:
                project.render_mode = render_mode

        # Update page order if provided
        if 'pages_order' in data:
            pages_order = data['pages_order']
            # Optimization: batch query all pages to update, avoiding N+1 queries
            pages_to_update = Page.query.filter(
                Page.id.in_(pages_order),
                Page.project_id == project_id
            ).all()
            
            # Create page_id -> page mapping for O(1) lookup
            pages_map = {page.id: page for page in pages_to_update}
            
            # Batch update order
            for index, page_id in enumerate(pages_order):
                if page_id in pages_map:
                    pages_map[page_id].order_index = index
        
        project.updated_at = datetime.now()
        db.session.commit()
        
        return success_response(project.to_dict(include_pages=True))
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"update_project failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """
    DELETE /api/projects/{project_id} - Delete project
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # Delete project files
        from services import FileService
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_service.delete_project_files(project_id)
        
        # Delete project from database (cascade will delete pages and tasks)
        db.session.delete(project)
        db.session.commit()
        
        return success_response(message="Project deleted successfully")
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"delete_project failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/outline', methods=['POST'])
def generate_outline(project_id):
    """
    POST /api/projects/{project_id}/generate/outline - Generate outline
    
    For 'idea' type: Generate outline from idea_prompt
    For 'outline' type: Parse outline_text into structured format
    
    Request body (optional):
    {
        "idea_prompt": "...",  # for idea type
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get request data and language parameter
        data = request.get_json() or {}
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Get reference files content and create project context
        reference_files_content = _get_project_reference_files_content(project_id)
        if reference_files_content:
            logger.info(f"Found {len(reference_files_content)} reference files for project {project_id}")
            for rf in reference_files_content:
                logger.info(f"  - {rf['filename']}: {len(rf['content'])} characters")
        else:
            logger.info(f"No reference files found for project {project_id}")
        
        # 获取渲染模式（用于HTML模式生成layout_id）
        render_mode = project.render_mode or 'image'

        # 根据项目类型选择不同的处理方式
        if project.creation_type == 'outline':
            # 从大纲生成：解析用户输入的大纲文本
            if not project.outline_text:
                return bad_request("outline_text is required for outline type project")

            # Create project context and parse outline text into structured format
            project_context = ProjectContext(project, reference_files_content)
            outline = ai_service.parse_outline_text(project_context, language=language, render_mode=render_mode)
        elif project.creation_type == 'descriptions':
            # 从描述生成：这个类型应该使用专门的端点
            return bad_request("Use /generate/from-description endpoint for descriptions type")
        else:
            # 一句话生成：从idea生成大纲
            idea_prompt = data.get('idea_prompt') or project.idea_prompt

            if not idea_prompt:
                return bad_request("idea_prompt is required")

            project.idea_prompt = idea_prompt

            # Create project context and generate outline from idea
            project_context = ProjectContext(project, reference_files_content)
            outline = ai_service.generate_outline(project_context, language=language, render_mode=render_mode)
        
        # Flatten outline to pages
        pages_data = ai_service.flatten_outline(outline)
        
        # Delete existing pages (using ORM session to trigger cascades)
        # Note: Cannot use bulk delete as it bypasses ORM cascades for PageImageVersion
        old_pages = Page.query.filter_by(project_id=project_id).all()
        for old_page in old_pages:
            db.session.delete(old_page)
        
        # Create pages from outline
        pages_list = []
        for i, page_data in enumerate(pages_data):
            page = Page(
                project_id=project_id,
                order_index=i,
                part=page_data.get('part'),
                status='DRAFT',
                layout_id=page_data.get('layout_id')  # HTML模式下由AI生成的布局ID
            )
            page.set_outline_content({
                'title': page_data.get('title'),
                'points': page_data.get('points', [])
            })
            
            db.session.add(page)
            pages_list.append(page)
        
        # Update project status
        project.status = 'OUTLINE_GENERATED'
        project.updated_at = datetime.now()
        
        db.session.commit()
        
        logger.info(f"大纲生成完成: 项目 {project_id}, 创建了 {len(pages_list)} 个页面")
        
        # Return pages
        return success_response({
            'pages': [page.to_dict() for page in pages_list]
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_outline failed: {str(e)}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@project_bp.route('/<project_id>/generate/from-description', methods=['POST'])
def generate_from_description(project_id):
    """
    POST /api/projects/{project_id}/generate/from-description - Generate outline and page descriptions from description text
    
    This endpoint:
    1. Parses the description_text to extract outline structure
    2. Splits the description_text into individual page descriptions
    3. Creates pages with both outline and description content filled
    4. Sets project status to DESCRIPTIONS_GENERATED
    
    Request body (optional):
    {
        "description_text": "...",  # if not provided, uses project.description_text
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        if project.creation_type != 'descriptions':
            return bad_request("This endpoint is only for descriptions type projects")
        
        # Get description text and language
        data = request.get_json() or {}
        description_text = data.get('description_text') or project.description_text
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        if not description_text:
            return bad_request("description_text is required")
        
        project.description_text = description_text
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        reference_files_content = _get_project_reference_files_content(project_id)
        project_context = ProjectContext(project, reference_files_content)
        
        # Get render mode for HTML mode support
        render_mode = project.render_mode or 'image'

        logger.info(f"开始从描述生成大纲和页面描述: 项目 {project_id}, render_mode={render_mode}")

        # Step 1: Parse description to outline
        logger.info("Step 1: 解析描述文本到大纲结构...")
        outline = ai_service.parse_description_to_outline(project_context, language=language, render_mode=render_mode)
        logger.info(f"大纲解析完成，共 {len(ai_service.flatten_outline(outline))} 页")
        
        # Step 2: Split description into page descriptions
        logger.info("Step 2: 切分描述文本到每页描述...")
        page_descriptions = ai_service.parse_description_to_page_descriptions(project_context, outline, language=language)
        logger.info(f"描述切分完成，共 {len(page_descriptions)} 页")
        
        # Step 3: Flatten outline to pages
        pages_data = ai_service.flatten_outline(outline)
        
        if len(pages_data) != len(page_descriptions):
            logger.warning(f"页面数量不匹配: 大纲 {len(pages_data)} 页, 描述 {len(page_descriptions)} 页")
            
            if len(page_descriptions) < len(pages_data):
                # 描述少于大纲，为缺失的页面生成默认描述
                for i in range(len(page_descriptions), len(pages_data)):
                    page_data = pages_data[i]
                    default_desc = f"页面标题：{page_data.get('title', '未命名')}\n\n页面要点：\n"
                    for point in page_data.get('points', []):
                        default_desc += f"- {point}\n"
                    page_descriptions.append(default_desc)
                    logger.info(f"为第 {i+1} 页 '{page_data.get('title')}' 生成默认描述")
            else:
                # 描述多于大纲，截断多余的描述
                page_descriptions = page_descriptions[:len(pages_data)]
                logger.info(f"截断多余描述，保留 {len(pages_data)} 页")
        
        # Step 4: Delete existing pages (using ORM session to trigger cascades)
        old_pages = Page.query.filter_by(project_id=project_id).all()
        for old_page in old_pages:
            db.session.delete(old_page)
        
        # Get render mode for HTML mode support
        render_mode = project.render_mode or 'image'

        # Step 5: Create pages with both outline and description/html_model
        pages_list = []
        for i, (page_data, page_desc) in enumerate(zip(pages_data, page_descriptions)):
            # For HTML mode, use layout_id from page_data (set during outline parsing)
            layout_id = page_data.get('layout_id') if render_mode == 'html' else None

            page = Page(
                project_id=project_id,
                order_index=i,
                part=page_data.get('part'),
                layout_id=layout_id,
                status='HTML_MODEL_GENERATED' if render_mode == 'html' else 'DESCRIPTION_GENERATED'
            )

            # Set outline content
            page.set_outline_content({
                'title': page_data.get('title'),
                'points': page_data.get('points', [])
            })

            if render_mode == 'html':
                # HTML mode: generate structured content for html_model
                structured_page_outline = {
                    'page_id': f'p{i+1:02d}',
                    'title': page_data.get('title', ''),
                    'layout_id': layout_id or 'title_bullets',
                    'has_image': False,
                    'keywords': page_data.get('points', [])[:3]
                }
                if 'section_number' in page_data:
                    structured_page_outline['section_number'] = page_data.get('section_number')
                if 'subtitle' in page_data:
                    structured_page_outline['subtitle'] = page_data.get('subtitle')

                full_outline_context = {
                    'title': project_context.idea_prompt or description_text[:100],
                    'pages': [
                        {
                            'page_id': f'p{j+1:02d}',
                            'title': p.get('title', ''),
                            'layout_id': p.get('layout_id', 'title_bullets'),
                            'keywords': p.get('points', [])[:3]
                        }
                        for j, p in enumerate(pages_data)
                    ]
                }

                model = ai_service.generate_structured_page_content(
                    page_outline=structured_page_outline,
                    full_outline=full_outline_context,
                    language=language,
                    scheme_id=project.scheme_id or 'tech_blue'
                )
                page.set_html_model(model)
            else:
                # Traditional mode: set description content
                desc_content = {
                    "text": page_desc,
                    "generated_at": datetime.utcnow().isoformat()
                }
                page.set_description_content(desc_content)

            db.session.add(page)
            pages_list.append(page)
        
        # Update project status
        project.status = 'DESCRIPTIONS_GENERATED'
        project.updated_at = datetime.now()
        
        db.session.commit()
        
        logger.info(f"从描述生成完成: 项目 {project_id}, 创建了 {len(pages_list)} 个页面，已填充大纲和描述")
        
        # Return pages
        return success_response({
            'pages': [page.to_dict() for page in pages_list],
            'status': 'DESCRIPTIONS_GENERATED'
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_from_description failed: {str(e)}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@project_bp.route('/<project_id>/generate/descriptions', methods=['POST'])
def generate_descriptions(project_id):
    """
    POST /api/projects/{project_id}/generate/descriptions - Generate descriptions
    
    Request body:
    {
        "max_workers": 5,
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # Allow retry when previous task failed (status stuck at GENERATING_*)
        allowed_statuses = ['OUTLINE_GENERATED', 'DRAFT', 'DESCRIPTIONS_GENERATED', 'GENERATING_DESCRIPTIONS', 'GENERATING_IMAGES']
        if project.status not in allowed_statuses:
            return bad_request("Project must have outline generated first")
        
        # IMPORTANT: Expire cached objects to ensure fresh data
        db.session.expire_all()
        
        # Get pages
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.numeric_order()).all()
        
        if not pages:
            return bad_request("No pages found for project")
        
        # Reconstruct outline from pages with part structure
        outline = _reconstruct_outline_from_pages(pages)
        
        data = request.get_json() or {}
        # 从配置中读取默认并发数，如果请求中提供了则使用请求的值
        max_workers = data.get('max_workers', current_app.config.get('MAX_DESCRIPTION_WORKERS', 5))
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Create task
        task = Task(
            project_id=project_id,
            task_type='GENERATE_DESCRIPTIONS',
            status='PENDING'
        )
        task.set_progress({
            'total': len(pages),
            'completed': 0,
            'failed': 0
        })
        
        db.session.add(task)
        db.session.commit()
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        reference_files_content = _get_project_reference_files_content(project_id)
        project_context = ProjectContext(project, reference_files_content)
        
        # Get app instance for background task
        app = current_app._get_current_object()

        # Get render mode for the project
        render_mode = project.render_mode or 'image'

        # Submit background task
        task_manager.submit_task(
            task.id,
            generate_descriptions_task,
            project_id,
            ai_service,
            project_context,
            outline,
            max_workers,
            app,
            language,
            render_mode
        )
        
        # Update project status
        project.status = 'GENERATING_DESCRIPTIONS'
        db.session.commit()
        
        return success_response({
            'task_id': task.id,
            'status': 'GENERATING_DESCRIPTIONS',
            'total_pages': len(pages)
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_descriptions failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/images', methods=['POST'])
def generate_images(project_id):
    """
    POST /api/projects/{project_id}/generate/images - Generate images
    
    Request body:
    {
        "max_workers": 8,
        "use_template": true,
        "language": "zh",  # output language: zh, en, ja, auto
        "page_ids": ["id1", "id2"]  # optional: specific page IDs to generate (if not provided, generates all)
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # if project.status not in ['DESCRIPTIONS_GENERATED', 'OUTLINE_GENERATED']:
        #     return bad_request("Project must have descriptions generated first")
        
        # IMPORTANT: Expire cached objects to ensure fresh data
        db.session.expire_all()
        
        data = request.get_json() or {}
        
        # Get page_ids from request body and fetch filtered pages
        selected_page_ids = parse_page_ids_from_body(data)
        pages = get_filtered_pages(project_id, selected_page_ids if selected_page_ids else None)
        
        if not pages:
            return bad_request("No pages found for project")
        
        # Reconstruct outline from pages with part structure
        outline = _reconstruct_outline_from_pages(pages)
        
        # 从配置中读取默认并发数，如果请求中提供了则使用请求的值
        max_workers = data.get('max_workers', current_app.config.get('MAX_IMAGE_WORKERS', 8))
        use_template = data.get('use_template', True)
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Create task
        task = Task(
            project_id=project_id,
            task_type='GENERATE_IMAGES',
            status='PENDING'
        )
        task.set_progress({
            'total': len(pages),
            'completed': 0,
            'failed': 0
        })
        
        db.session.add(task)
        db.session.commit()
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        from services import FileService
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        
        # 合并额外要求和风格描述
        combined_requirements = project.extra_requirements or ""
        if project.template_style:
            style_requirement = f"\n\nppt页面风格描述：\n\n{project.template_style}"
            combined_requirements = combined_requirements + style_requirement
        
        # Get app instance for background task
        app = current_app._get_current_object()
        
        # Submit background task
        task_manager.submit_task(
            task.id,
            generate_images_task,
            project_id,
            ai_service,
            file_service,
            outline,
            use_template,
            max_workers,
            current_app.config['DEFAULT_ASPECT_RATIO'],
            current_app.config['DEFAULT_RESOLUTION'],
            app,
            combined_requirements if combined_requirements.strip() else None,
            language,
            selected_page_ids if selected_page_ids else None
        )
        
        # Update project status
        project.status = 'GENERATING_IMAGES'
        db.session.commit()
        
        return success_response({
            'task_id': task.id,
            'status': 'GENERATING_IMAGES',
            'total_pages': len(pages)
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_images failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/tasks/<task_id>', methods=['GET'])
def get_task_status(project_id, task_id):
    """
    GET /api/projects/{project_id}/tasks/{task_id} - Get task status
    """
    try:
        task = Task.query.get(task_id)
        
        if not task or task.project_id != project_id:
            return not_found('Task')

        # Guard against zombie tasks stuck in PENDING/PROCESSING forever.
        # This runs on polling path, so stale tasks are auto-closed as FAILED.
        auto_fail_stale_task(task)
        
        return success_response(task.to_dict())
    
    except Exception as e:
        logger.error(f"get_task_status failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/refine/outline', methods=['POST'])
def refine_outline(project_id):
    """
    POST /api/projects/{project_id}/refine/outline - Refine outline based on user requirements
    
    Request body:
    {
        "user_requirement": "用户要求，例如：增加一页关于XXX的内容",
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json()
        
        if not data or not data.get('user_requirement'):
            return bad_request("user_requirement is required")
        
        user_requirement = data['user_requirement']
        
        # IMPORTANT: Expire all cached objects to ensure we get fresh data from database
        # This prevents issues when multiple refine operations are called in sequence
        db.session.expire_all()
        
        # Get current outline from pages
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.numeric_order()).all()
        
        # Reconstruct current outline from pages (如果没有页面，使用空列表)
        if not pages:
            logger.info(f"项目 {project_id} 当前没有页面，将从空开始生成")
            current_outline = []  # 空大纲
        else:
            current_outline = _reconstruct_outline_from_pages(pages)
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        reference_files_content = _get_project_reference_files_content(project_id)
        if reference_files_content:
            logger.info(f"Found {len(reference_files_content)} reference files for refine_outline")
            for rf in reference_files_content:
                logger.info(f"  - {rf['filename']}: {len(rf['content'])} characters")
        else:
            logger.info(f"No reference files found for project {project_id}")
        
        project_context = ProjectContext(project.to_dict(), reference_files_content)
        
        # Get previous requirements and language from request
        previous_requirements = data.get('previous_requirements', [])
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Refine outline
        logger.info(f"开始修改大纲: 项目 {project_id}, 用户要求: {user_requirement}, 历史要求数: {len(previous_requirements)}")
        refined_outline = ai_service.refine_outline(
            current_outline=current_outline,
            user_requirement=user_requirement,
            project_context=project_context,
            previous_requirements=previous_requirements,
            language=language
        )
        
        # Flatten outline to pages
        pages_data = ai_service.flatten_outline(refined_outline)
        
        # 在删除旧页面之前，先保存已有的页面描述（按标题匹配）
        old_pages = Page.query.filter_by(project_id=project_id).order_by(Page.numeric_order()).all()
        descriptions_map = {}  # {title: description_content}
        old_status_map = {}  # {title: status} 用于保留状态
        old_layout_map = {}  # {title: layout_id} 用于保留布局ID
        old_html_model_map = {}  # {title: html_model} 用于保留HTML模式的结构化内容
        
        # 同时按页面索引保存 layout_id，用于第一页/最后一页等特殊位置的匹配
        old_layout_by_index = {}  # {order_index: layout_id}
        
        for old_page in old_pages:
            old_outline = old_page.get_outline_content()
            if old_outline and old_outline.get('title'):
                title = old_outline.get('title')
                if old_page.description_content:
                    descriptions_map[title] = old_page.description_content
                # 如果旧页面已经有描述，保留状态
                if old_page.status in ['DESCRIPTION_GENERATED', 'IMAGE_GENERATED', 'HTML_MODEL_GENERATED']:
                    old_status_map[title] = old_page.status
                # 保存 layout_id（HTML模式需要）
                if old_page.layout_id:
                    old_layout_map[title] = old_page.layout_id
                # 保存 html_model（HTML模式需要）
                if old_page.html_model:
                    old_html_model_map[title] = old_page.html_model
            
            # 按索引保存 layout_id，用于特殊位置匹配（第一页封面、最后一页结束页等）
            if old_page.layout_id:
                old_layout_by_index[old_page.order_index] = old_page.layout_id
        
        # Delete existing pages (using ORM session to trigger cascades)
        for old_page in old_pages:
            db.session.delete(old_page)
        
        # Create pages from refined outline
        pages_list = []
        has_descriptions = False
        preserved_count = 0
        new_count = 0
        
        total_new_pages = len(pages_data)
        
        # 检测大纲结构是否发生变化（用于判断是否需要重新生成目录等依赖全局结构的页面）
        old_titles_set = set(old_layout_map.keys())
        new_titles_set = set(p.get('title', '') for p in pages_data)
        outline_structure_changed = (old_titles_set != new_titles_set) or (len(old_pages) != total_new_pages)
        
        for i, page_data in enumerate(pages_data):
            title = page_data.get('title')
            
            # 确定 layout_id：优先使用 AI 返回的，然后按标题匹配旧页面的，最后使用位置启发式规则
            layout_id = page_data.get('layout_id')  # AI 可能返回 layout_id
            if not layout_id and title in old_layout_map:
                # 按标题匹配旧页面的 layout_id
                layout_id = old_layout_map[title]
            if not layout_id:
                # 使用位置启发式规则：第一页是封面，最后一页是结束页
                if i == 0:
                    # 检查旧的第一页是否是封面
                    if old_layout_by_index.get(0) == 'cover':
                        layout_id = 'cover'
                elif i == total_new_pages - 1:
                    # 检查旧的最后一页是否是结束页
                    old_last_index = len(old_pages) - 1 if old_pages else -1
                    if old_layout_by_index.get(old_last_index) == 'ending':
                        layout_id = 'ending'
            
            page = Page(
                project_id=project_id,
                order_index=i,
                part=page_data.get('part'),
                layout_id=layout_id,  # 设置恢复/推断的 layout_id
                status='DRAFT'
            )
            page.set_outline_content({
                'title': title,
                'points': page_data.get('points', [])
            })
            
            # 尝试匹配并恢复已有的描述和 html_model
            # 注意：如果大纲结构发生变化，目录页(toc)和结束页(ending)等依赖全局结构的页面需要重新生成
            should_skip_html_restore = False
            if outline_structure_changed and layout_id in ['toc', 'ending']:
                # 目录页和结束页依赖于整体大纲结构，需要重新生成
                should_skip_html_restore = True
            
            if title in descriptions_map:
                # 恢复描述内容
                page.description_content = descriptions_map[title]
                # 恢复状态（如果有）
                if title in old_status_map:
                    page.status = old_status_map[title]
                else:
                    page.status = 'DESCRIPTION_GENERATED'
                has_descriptions = True
                preserved_count += 1
            elif title in old_html_model_map and not should_skip_html_restore:
                # 恢复 html_model（HTML模式），但跳过需要重新生成的页面
                page.html_model = old_html_model_map[title]
                if title in old_status_map:
                    page.status = old_status_map[title]
                else:
                    page.status = 'HTML_MODEL_GENERATED'
                has_descriptions = True
                preserved_count += 1
            else:
                # 新页面或标题改变的页面，描述为空
                # 这包括：新增的页面、合并的页面、标题改变的页面、需要重新生成的特殊页面
                page.status = 'DRAFT'
                new_count += 1
            
            db.session.add(page)
            pages_list.append(page)
        
        logger.info(f"描述匹配完成: 保留了 {preserved_count} 个页面的描述, {new_count} 个页面需要重新生成描述")
        
        # Update project status
        # 如果所有页面都有描述，保持 DESCRIPTION_GENERATED 状态
        # 否则降级为 OUTLINE_GENERATED
        if has_descriptions and all(p.description_content for p in pages_list):
            project.status = 'DESCRIPTIONS_GENERATED'
        else:
            project.status = 'OUTLINE_GENERATED'
        project.updated_at = datetime.now()
        
        db.session.commit()
        
        logger.info(f"大纲修改完成: 项目 {project_id}, 创建了 {len(pages_list)} 个页面")
        
        # Return pages
        return success_response({
            'pages': [page.to_dict() for page in pages_list],
            'message': '大纲修改成功'
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"refine_outline failed: {str(e)}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@project_bp.route('/<project_id>/refine/descriptions', methods=['POST'])
def refine_descriptions(project_id):
    """
    POST /api/projects/{project_id}/refine/descriptions - Refine page descriptions based on user requirements
    
    Request body:
    {
        "user_requirement": "用户要求，例如：让描述更详细一些",
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json()
        
        if not data or not data.get('user_requirement'):
            return bad_request("user_requirement is required")
        
        user_requirement = data['user_requirement']
        
        # Get render_mode for different processing logic
        render_mode = project.render_mode if hasattr(project, 'render_mode') else 'image'
        
        db.session.expire_all()
        
        # Get current pages
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.numeric_order()).all()
        
        if not pages:
            logger.info(f"项目 {project_id} 当前没有页面，无法修改描述")
            return bad_request("No pages found for project. Please generate outline first.")
        
        # Reconstruct outline from pages
        outline = _reconstruct_outline_from_pages(pages)
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        reference_files_content = _get_project_reference_files_content(project_id)
        if reference_files_content:
            logger.info(f"Found {len(reference_files_content)} reference files for refine_descriptions")
            for rf in reference_files_content:
                logger.info(f"  - {rf['filename']}: {len(rf['content'])} characters")
        else:
            logger.info(f"No reference files found for project {project_id}")
        
        project_context = ProjectContext(project.to_dict(), reference_files_content)
        
        # Get previous requirements and language from request
        previous_requirements = data.get('previous_requirements', [])
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Handle differently based on render_mode
        if render_mode == 'html':
            # HTML mode: refine html_model (structured JSON)
            logger.info(f"开始修改结构化内容 (HTML模式): 项目 {project_id}, 用户要求: {user_requirement}")
            
            # Prepare current html_models
            current_html_models = []
            for i, page in enumerate(pages):
                outline_content = page.get_outline_content()
                html_model = page.get_html_model()
                
                current_html_models.append({
                    'index': i,
                    'title': outline_content.get('title', '未命名') if outline_content else '未命名',
                    'layout_id': page.layout_id or 'title_bullets',
                    'html_model': html_model if html_model else {}
                })
            
            # Refine html_models
            refined_html_models = ai_service.refine_html_models(
                current_html_models=current_html_models,
                user_requirement=user_requirement,
                project_context=project_context,
                outline=outline,
                previous_requirements=previous_requirements,
                language=language
            )
            
            # Validate count
            if len(refined_html_models) != len(pages):
                error_msg = f"AI 返回的内容数量不匹配: 期望 {len(pages)} 个页面，实际返回 {len(refined_html_models)} 个。"
                logger.error(error_msg)
                if len(refined_html_models) > len(pages):
                    error_msg += " 提示：如需增加页面，请在大纲页面进行操作。"
                elif len(refined_html_models) < len(pages):
                    error_msg += " 提示：如需删除页面，请在大纲页面进行操作。"
                return bad_request(error_msg)
            
            # Update pages with refined html_models
            for page, refined_model in zip(pages, refined_html_models):
                page.set_html_model(refined_model)
                page.status = 'HTML_MODEL_GENERATED'
            
            # Update project status
            project.status = 'HTML_MODEL_GENERATED'
            project.updated_at = datetime.now()
            
            db.session.commit()
            
            logger.info(f"结构化内容修改完成: 项目 {project_id}, 更新了 {len(pages)} 个页面")
        else:
            # Traditional image mode: refine description_content (text)
            logger.info(f"开始修改页面描述: 项目 {project_id}, 用户要求: {user_requirement}, 历史要求数: {len(previous_requirements)}")
            
            # Check if pages have descriptions
            has_descriptions = any(page.description_content for page in pages)
            if not has_descriptions:
                logger.info(f"项目 {project_id} 当前没有描述，将基于大纲生成新描述")
            
            # Prepare current descriptions
            current_descriptions = []
            for i, page in enumerate(pages):
                outline_content = page.get_outline_content()
                desc_content = page.get_description_content()
                
                current_descriptions.append({
                    'index': i,
                    'title': outline_content.get('title', '未命名') if outline_content else '未命名',
                    'description_content': desc_content if desc_content else ''
                })
            
            refined_descriptions = ai_service.refine_descriptions(
                current_descriptions=current_descriptions,
                user_requirement=user_requirement,
                project_context=project_context,
                outline=outline,
                previous_requirements=previous_requirements,
                language=language
            )
            
            # Validate count
            if len(refined_descriptions) != len(pages):
                error_msg = ""
                logger.error(f"AI 返回的描述数量不匹配: 期望 {len(pages)} 个页面，实际返回 {len(refined_descriptions)} 个描述。")
                if len(refined_descriptions) > len(pages):
                    error_msg += " 提示：如需增加页面，请在大纲页面进行操作。"
                elif len(refined_descriptions) < len(pages):
                    error_msg += " 提示：如需删除页面，请在大纲页面进行操作。"
                return bad_request(error_msg)
            
            # Update pages with refined descriptions
            for page, refined_desc in zip(pages, refined_descriptions):
                desc_content = {
                    "text": refined_desc,
                    "generated_at": datetime.utcnow().isoformat()
                }
                page.set_description_content(desc_content)
                page.status = 'DESCRIPTION_GENERATED'
            
            # Update project status
            project.status = 'DESCRIPTIONS_GENERATED'
            project.updated_at = datetime.now()
            
            db.session.commit()
            
            logger.info(f"页面描述修改完成: 项目 {project_id}, 更新了 {len(pages)} 个页面")
        
        # Return pages
        return success_response({
            'pages': [page.to_dict() for page in pages],
            'message': '页面描述修改成功'
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"refine_descriptions failed: {str(e)}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@project_bp.route('/<project_id>/html-images/generate', methods=['POST'])
def generate_html_images(project_id: str):
    """
    为 HTML 模式批量生成图片（SSE 流式响应）
    
    每生成一张图片就立即通过 SSE 推送给前端，而不是等待全部完成。
    
    Request Body:
    {
        "slots": [
            {"page_id": "xxx", "slot_path": "image.src", "prompt": "描述..."},
            {"page_id": "yyy", "slot_path": "left.image_src", "prompt": "描述..."}
        ]
    }
    
    SSE Response Events:
    - data: {"type": "progress", "current": 1, "total": 5}
    - data: {"type": "image", "page_id": "xxx", "slot_path": "image.src", "image_base64": "..."}
    - data: {"type": "error", "page_id": "yyy", "slot_path": "...", "error": "..."}
    - data: {"type": "complete", "summary": {"total": 5, "success": 4, "error": 1}}
    """
    from flask import Response
    from services.ai_providers import get_image_provider
    from tenacity import RetryError
    from io import BytesIO
    import base64
    import json
    
    # 验证项目存在
    project = Project.query.get(project_id)
    if not project:
        return not_found(f'项目 {project_id} 不存在')
    
    data = request.get_json()
    if not data or 'slots' not in data:
        return bad_request('缺少 slots 参数')
    
    slots = data['slots']
    if not slots or len(slots) == 0:
        return bad_request('slots 列表不能为空')

    # 规则 + 小模型改写：提升 prompt 语义对齐和可控性
    try:
        slots = optimize_html_image_slots(slots, project)
    except Exception as e:
        # fail-open：优化失败时回退到前端原始 prompt，不阻断图片生成链路
        logger.warning(f"HTML 图片 prompt 优化失败，回退原始 prompt: {e}", exc_info=True)

    image_model = current_app.config.get('IMAGE_MODEL')
    default_aspect_ratio = current_app.config.get('DEFAULT_ASPECT_RATIO', '16:9')
    default_resolution = current_app.config.get('DEFAULT_RESOLUTION', '2K')

    # Use unified provider factory so qwen-image / wanx / gemini all route correctly.
    try:
        image_provider = get_image_provider(model=image_model)
    except Exception as e:
        logger.error(f"初始化图片生成器失败: model={image_model}, error={e}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', f'初始化图片生成器失败: {str(e)}', 503)

    def _friendly_error(err: Exception) -> str:
        """Convert low-level provider exception into concise user-facing message."""
        msg = str(err) if err else '图片生成失败'

        if isinstance(err, RetryError):
            try:
                last_err = err.last_attempt.exception()
                if last_err:
                    msg = str(last_err)
            except Exception:
                msg = "模型请求重试后仍失败"

        low = msg.lower()
        if 'limit_requests' in low or '429' in low:
            return "请求过于频繁（429限流），请稍后重试"
        if 'api key' in low or 'invalid api' in low or 'authentication' in low:
            return "图片服务鉴权失败，请检查 API Key 配置"
        if 'timeout' in low or 'timed out' in low:
            return "图片生成超时，请稍后重试"
        if 'retryerror' in low:
            return "模型请求重试后仍失败，请稍后重试"
        return msg

    logger.info(f"开始为 HTML 模式生成 {len(slots)} 张图片 (SSE): 项目 {project_id}")
    
    def generate():
        """SSE 生成器"""
        total = len(slots)
        success_count = 0
        error_count = 0
        
        for i, slot in enumerate(slots):
            page_id = slot.get('page_id', '')
            slot_path = slot.get('slot_path', '')
            prompt = slot.get('prompt', '')
            
            # 发送进度事件
            progress_event = {
                'type': 'progress',
                'current': i + 1,
                'total': total,
                'page_id': page_id,
                'slot_path': slot_path
            }
            yield f"data: {json.dumps(progress_event, ensure_ascii=False)}\n\n"
            
            if not prompt:
                error_event = {
                    'type': 'error',
                    'page_id': page_id,
                    'slot_path': slot_path,
                    'error': '缺少 prompt'
                }
                yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
                error_count += 1
                continue
            
            try:
                logger.info(f"正在生成图片 {i+1}/{total}: page_id={page_id}, slot_path={slot_path}")
                
                # 生成图片
                image = image_provider.generate_image(
                    prompt=prompt,
                    aspect_ratio=default_aspect_ratio,
                    resolution=default_resolution,
                )
                
                if image is None:
                    error_event = {
                        'type': 'error',
                        'page_id': page_id,
                        'slot_path': slot_path,
                        'error': '图片生成失败'
                    }
                    yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
                    error_count += 1
                    continue
                
                # 转换为 base64
                buffered = BytesIO()
                image.save(buffered, format="WEBP", quality=85)
                img_base64 = base64.b64encode(buffered.getvalue()).decode()
                
                # 发送图片数据
                image_event = {
                    'type': 'image',
                    'page_id': page_id,
                    'slot_path': slot_path,
                    'image_base64': f"data:image/webp;base64,{img_base64}"
                }
                yield f"data: {json.dumps(image_event, ensure_ascii=False)}\n\n"
                success_count += 1
                logger.info(f"图片生成成功 {i+1}/{total}")
                
            except Exception as e:
                logger.error(f"生成图片失败: {e}")
                error_event = {
                    'type': 'error',
                    'page_id': page_id,
                    'slot_path': slot_path,
                    'error': _friendly_error(e)
                }
                yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
                error_count += 1
        
        # 发送完成事件
        complete_event = {
            'type': 'complete',
            'summary': {
                'total': total,
                'success': success_count,
                'error': error_count
            }
        }
        yield f"data: {json.dumps(complete_event, ensure_ascii=False)}\n\n"
        logger.info(f"HTML 图片生成完成 (SSE): 成功 {success_count}, 失败 {error_count}")
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',  # 禁用 nginx 缓冲
            'Connection': 'keep-alive'
        }
    )
