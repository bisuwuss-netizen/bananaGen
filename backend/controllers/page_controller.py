"""
Page Controller - handles page-related endpoints
"""
import logging
from flask import Blueprint, request, current_app
from models import db, Project, Page, PageImageVersion, Task
from utils import success_response, error_response, not_found, bad_request
from services import FileService, ProjectContext
from services.ai_service_manager import get_ai_service
from services.narrative_continuity import (
    NarrativeRuntimeTracker,
    enrich_outline_with_narrative_contract,
)
from services.task_manager import task_manager, generate_single_page_image_task, edit_page_image_task
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename
import shutil
import tempfile
import json

logger = logging.getLogger(__name__)

page_bp = Blueprint('pages', __name__, url_prefix='/api/projects')


@page_bp.route('/<project_id>/pages', methods=['POST'])
def create_page(project_id):
    """
    POST /api/projects/{project_id}/pages - Add new page
    
    Request body:
    {
        "order_index": 2,
        "part": "optional",
        "outline_content": {"title": "...", "points": [...]}
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json()
        
        if not data or 'order_index' not in data:
            return bad_request("order_index is required")
        
        # Create new page
        page = Page(
            project_id=project_id,
            order_index=data['order_index'],
            part=data.get('part'),
            status='DRAFT'
        )
        
        if 'outline_content' in data:
            page.set_outline_content(data['outline_content'])
        
        db.session.add(page)
        
        # Update other pages' order_index if necessary
        other_pages = Page.query.filter(
            Page.project_id == project_id,
            Page.order_index >= data['order_index']
        ).all()
        
        for p in other_pages:
            if p.id != page.id:
                p.order_index += 1
        
        project.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response(page.to_dict(), status_code=201)
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@page_bp.route('/<project_id>/pages/<page_id>', methods=['PUT'])
def update_page(project_id, page_id):
    """
    PUT /api/projects/{project_id}/pages/{page_id} - Update page fields (html_model, layout_id, etc.)
    """
    try:
        page = Page.query.get(page_id)
        if not page or page.project_id != project_id:
            return not_found('Page')

        data = request.get_json() or {}

        if 'html_model' in data:
            page.set_html_model(data['html_model'])
        if 'layout_id' in data:
            page.layout_id = data['layout_id']

        page.updated_at = datetime.utcnow()

        project = Project.query.get(project_id)
        if project:
            project.updated_at = datetime.utcnow()

        db.session.commit()
        return success_response(page.to_dict())

    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@page_bp.route('/<project_id>/pages/<page_id>', methods=['DELETE'])
def delete_page(project_id, page_id):
    """
    DELETE /api/projects/{project_id}/pages/{page_id} - Delete page
    """
    try:
        page = Page.query.get(page_id)
        
        if not page or page.project_id != project_id:
            return not_found('Page')
        
        # Delete page image if exists
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_service.delete_page_image(project_id, page_id)
        
        # Delete page
        db.session.delete(page)
        
        # Update project
        project = Project.query.get(project_id)
        if project:
            project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return success_response(message="Page deleted successfully")
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@page_bp.route('/<project_id>/pages/<page_id>/outline', methods=['PUT'])
def update_page_outline(project_id, page_id):
    """
    PUT /api/projects/{project_id}/pages/{page_id}/outline - Edit page outline
    
    Request body:
    {
        "outline_content": {"title": "...", "points": [...]}
    }
    """
    try:
        page = Page.query.get(page_id)
        
        if not page or page.project_id != project_id:
            return not_found('Page')
        
        data = request.get_json()
        
        if not data or 'outline_content' not in data:
            return bad_request("outline_content is required")
        
        page.set_outline_content(data['outline_content'])
        page.updated_at = datetime.utcnow()

        # Outline 修改后，清空已生成内容，确保 Detail 与 Outline 一致
        project = Project.query.get(project_id)
        if project and (project.render_mode or 'image') == 'html':
            page.set_html_model(None)
            page.status = 'DRAFT'
        else:
            page.set_description_content(None)
            page.generated_image_path = None
            page.status = 'DRAFT'
        
        # Update project
        project = Project.query.get(project_id)
        if project:
            project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return success_response(page.to_dict())
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@page_bp.route('/<project_id>/pages/<page_id>/description', methods=['PUT'])
def update_page_description(project_id, page_id):
    """
    PUT /api/projects/{project_id}/pages/{page_id}/description - Edit description
    
    Request body:
    {
        "description_content": {
            "title": "...",
            "text_content": ["...", "..."],
            "layout_suggestion": "..."
        }
    }
    """
    try:
        page = Page.query.get(page_id)
        
        if not page or page.project_id != project_id:
            return not_found('Page')
        
        data = request.get_json()
        
        if not data or 'description_content' not in data:
            return bad_request("description_content is required")
        
        page.set_description_content(data['description_content'])
        page.updated_at = datetime.utcnow()
        
        # Update project
        project = Project.query.get(project_id)
        if project:
            project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return success_response(page.to_dict())
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@page_bp.route('/<project_id>/pages/<page_id>/generate/description', methods=['POST'])
def generate_page_description(project_id, page_id):
    """
    POST /api/projects/{project_id}/pages/{page_id}/generate/description - Generate single page description
    
    Request body:
    {
        "force_regenerate": false
    }
    """
    try:
        page = Page.query.get(page_id)
        
        if not page or page.project_id != project_id:
            return not_found('Page')
        
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')
        
        data = request.get_json() or {}
        force_regenerate = data.get('force_regenerate', False)
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Get render mode for the project
        render_mode = project.render_mode or 'image'
        
        # Check if already generated (based on render_mode)
        if render_mode == 'html':
            has_content = page.get_html_model() and len(page.get_html_model()) > 0
        else:
            has_content = page.get_description_content() is not None
        
        if has_content and not force_regenerate:
            return bad_request("Content already exists. Set force_regenerate=true to regenerate")
        
        # Get outline content
        outline_content = page.get_outline_content()
        if not outline_content:
            return bad_request("Page must have outline content first")
        
        # Reconstruct full outline
        all_pages = Page.query.filter_by(project_id=project_id).order_by(Page.numeric_order()).all()
        outline = []
        for p in all_pages:
            oc = p.get_outline_content()
            if oc:
                page_data_item = oc.copy()
                if p.part:
                    page_data_item['part'] = p.part
                if p.layout_id:
                    page_data_item['layout_id'] = p.layout_id
                outline.append(page_data_item)
        
        # Initialize AI service
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        from controllers.project_controller import _get_project_reference_files_content
        reference_files_content = _get_project_reference_files_content(project_id)
        project_context = ProjectContext(project, reference_files_content)
        
        # Generate content based on render_mode
        page_data = outline_content.copy()
        if page.part:
            page_data['part'] = page.part
        
        if render_mode == 'html':
            # HTML mode: generate structured JSON for html_model
            layout_id = page.layout_id or page_data.get('layout_id', 'title_content')

            current_index = 0
            ordered_outline_pages = []
            for i, p in enumerate(all_pages, 1):
                if p.id == page.id:
                    current_index = i
                oc = p.get_outline_content() or {}
                ordered_outline_pages.append({
                    'page_id': f'p{i:02d}',
                    'title': oc.get('title', ''),
                    'layout_id': p.layout_id or oc.get('layout_id', 'title_content'),
                    'has_image': bool(oc.get('has_image', False)),
                    'keywords': oc.get('keywords', oc.get('points', [])[:3]),
                    'points': oc.get('points', []),
                    'depends_on': oc.get('depends_on', []),
                    'must_cover': oc.get('must_cover', []),
                    'promises_open': oc.get('promises_open', []),
                    'promises_close': oc.get('promises_close', []),
                    'required_close_promise_ids': oc.get('required_close_promise_ids', oc.get('promises_close', [])),
                })

            full_outline_context = enrich_outline_with_narrative_contract({
                'title': project_context.idea_prompt or project.idea_prompt or '',
                'pages': ordered_outline_pages
            })

            logical_page_id = f'p{current_index:02d}' if current_index > 0 else f'p{int(page.order_index) + 1:02d}'
            page_outline_context = next(
                (item for item in full_outline_context.get('pages', []) if item.get('page_id') == logical_page_id),
                {}
            )

            # Build page_outline format expected by generate_structured_page_content
            structured_page_outline = {
                'page_id': logical_page_id,
                'title': page_data.get('title', page_outline_context.get('title', '')),
                'layout_id': layout_id,
                'has_image': bool(page_outline_context.get('has_image', False)),
                'keywords': page_outline_context.get('keywords', page_data.get('points', [])[:3]),
                'depends_on': page_outline_context.get('depends_on', []),
                'must_cover': page_outline_context.get('must_cover', []),
                'promises_open': page_outline_context.get('promises_open', []),
                'promises_close': page_outline_context.get('promises_close', []),
                'required_close_promise_ids': page_outline_context.get('required_close_promise_ids', page_outline_context.get('promises_close', [])),
            }
            if 'section_number' in page_data:
                structured_page_outline['section_number'] = page_data.get('section_number')
            if 'subtitle' in page_data:
                structured_page_outline['subtitle'] = page_data.get('subtitle')

            tracker = NarrativeRuntimeTracker(full_outline_context)
            for i, p in enumerate(all_pages, 1):
                if i >= current_index:
                    break
                existing_model = p.get_html_model()
                if not existing_model:
                    continue
                prev_outline = ordered_outline_pages[i - 1] if i - 1 < len(ordered_outline_pages) else {}
                tracker.apply_generated_page(
                    page_id=f'p{i:02d}',
                    layout_id=p.layout_id or prev_outline.get('layout_id', 'title_content'),
                    title=prev_outline.get('title', ''),
                    model=existing_model
                )

            continuity_context = tracker.build_context_for_page(logical_page_id)
            
            # Generate structured content
            model = ai_service.generate_structured_page_content(
                page_outline=structured_page_outline,
                full_outline=full_outline_context,
                language=language,
                scheme_id=project.scheme_id or 'edu_dark',
                continuity_context=continuity_context
            )
            
            # Save html_model
            page.set_html_model(model)
            if layout_id:
                page.layout_id = layout_id
            page.status = 'HTML_MODEL_GENERATED'
        else:
            # Traditional image mode: generate free-text description
            desc_text = ai_service.generate_page_description(
                project_context,
                outline,
                page_data,
                int(page.order_index) + 1,
                language=language
            )
            
            # Save description
            desc_content = {
                "text": desc_text,
                "generated_at": datetime.utcnow().isoformat()
            }
            
            page.set_description_content(desc_content)
            page.status = 'DESCRIPTION_GENERATED'
        
        page.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response(page.to_dict())
    
    except Exception as e:
        db.session.rollback()
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@page_bp.route('/<project_id>/pages/<page_id>/generate/image', methods=['POST'])
def generate_page_image(project_id, page_id):
    """
    POST /api/projects/{project_id}/pages/{page_id}/generate/image - Generate single page image
    
    Request body:
    {
        "use_template": true,
        "force_regenerate": false
    }
    """
    try:
        page = Page.query.get(page_id)
        
        if not page or page.project_id != project_id:
            return not_found('Page')
        
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')
        
        data = request.get_json() or {}
        use_template = data.get('use_template', True)
        force_regenerate = data.get('force_regenerate', False)
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Check if already generated
        if page.generated_image_path and not force_regenerate:
            return bad_request("Image already exists. Set force_regenerate=true to regenerate")
        
        # Get description content
        desc_content = page.get_description_content()
        if not desc_content:
            return bad_request("Page must have description content first")
        
        # Reconstruct full outline with part structure
        all_pages = Page.query.filter_by(project_id=project_id).order_by(Page.numeric_order()).all()
        outline = []
        current_part = None
        current_part_pages = []
        
        for p in all_pages:
            oc = p.get_outline_content()
            if not oc:
                continue
                
            page_data = oc.copy()
            
            # Include layout_id from page model
            if p.layout_id:
                page_data['layout_id'] = p.layout_id
            
            # 如果当前页面属于一个 part
            if p.part:
                # 如果这是新的 part，先保存之前的 part（如果有）
                if current_part and current_part != p.part:
                    outline.append({
                        "part": current_part,
                        "pages": current_part_pages
                    })
                    current_part_pages = []
                
                current_part = p.part
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
        
        # Initialize services
        ai_service = get_ai_service()
        
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        
        # Get template path
        ref_image_path = None
        if use_template:
            ref_image_path = file_service.get_template_path(project_id)
        
        # 检查是否有模板图片或风格描述
        # 如果都没有，则返回错误
        if not ref_image_path and not project.template_style:
            return bad_request("No template image or style description found for project")
        
        # Generate prompt
        page_data = page.get_outline_content() or {}
        if page.part:
            page_data['part'] = page.part
        
        # 获取描述文本（可能是 text 字段或 text_content 数组）
        desc_text = desc_content.get('text', '')
        if not desc_text and desc_content.get('text_content'):
            # 如果 text 字段不存在，尝试从 text_content 数组获取
            text_content = desc_content.get('text_content', [])
            if isinstance(text_content, list):
                desc_text = '\n'.join(text_content)
            else:
                desc_text = str(text_content)
        
        # 从当前页面的描述内容中提取图片 URL（在生成 prompt 之前提取，以便告知 AI）
        additional_ref_images = []
        has_material_images = False
        
        # 从描述文本中提取图片
        if desc_text:
            image_urls = ai_service.extract_image_urls_from_markdown(desc_text)
            if image_urls:
                logger.info(f"Found {len(image_urls)} image(s) in page {page_id} description")
                additional_ref_images = image_urls
                has_material_images = True
        
        # 合并额外要求和风格描述
        combined_requirements = project.extra_requirements or ""
        if project.template_style:
            style_requirement = f"\n\nppt页面风格描述：\n\n{project.template_style}"
            combined_requirements = combined_requirements + style_requirement
        
        # Create async task for image generation
        task = Task(
            project_id=project_id,
            task_type='GENERATE_PAGE_IMAGE',
            status='PENDING'
        )
        task.set_progress({
            'total': 1,
            'completed': 0,
            'failed': 0
        })
        db.session.add(task)
        db.session.commit()
        
        # Get app instance for background task
        app = current_app._get_current_object()
        
        # Submit background task
        task_manager.submit_task(
            task.id,
            generate_single_page_image_task,
            project_id,
            page_id,
            ai_service,
            file_service,
            outline,
            use_template,
            current_app.config['DEFAULT_ASPECT_RATIO'],
            current_app.config['DEFAULT_RESOLUTION'],
            app,
            combined_requirements if combined_requirements.strip() else None,
            language
        )
        
        # Return task_id immediately
        return success_response({
            'task_id': task.id,
            'page_id': page_id,
            'status': 'PENDING'
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@page_bp.route('/<project_id>/pages/<page_id>/edit/image', methods=['POST'])
def edit_page_image(project_id, page_id):
    """
    POST /api/projects/{project_id}/pages/{page_id}/edit/image - Edit page image
    
    Request body (JSON or multipart/form-data):
    {
        "edit_instruction": "更改文本框样式为虚线",
        "context_images": {
            "use_template": true,  // 是否使用template图片
            "desc_image_urls": ["url1", "url2"],  // desc中的图片URL列表
            "uploaded_image_ids": ["file1", "file2"]  // 上传的图片文件ID列表（在multipart中）
        }
    }
    
    For multipart/form-data:
    - edit_instruction: text field
    - use_template: text field (true/false)
    - desc_image_urls: JSON array string
    - context_images: file uploads (multiple files with key "context_images")
    """
    try:
        page = Page.query.get(page_id)
        
        if not page or page.project_id != project_id:
            return not_found('Page')
        
        if not page.generated_image_path:
            return bad_request("Page must have generated image first")
        
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')
        
        # Initialize services
        ai_service = get_ai_service()
        
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        
        # Parse request data (support both JSON and multipart/form-data)
        if request.is_json:
            data = request.get_json()
            uploaded_files = []
        else:
            # multipart/form-data
            data = request.form.to_dict()
            # Get uploaded files
            uploaded_files = request.files.getlist('context_images')
            # Parse JSON fields
            if 'desc_image_urls' in data and data['desc_image_urls']:
                try:
                    data['desc_image_urls'] = json.loads(data['desc_image_urls'])
                except:
                    data['desc_image_urls'] = []
            else:
                data['desc_image_urls'] = []
        
        if not data or 'edit_instruction' not in data:
            return bad_request("edit_instruction is required")
        
        # Get current image path
        current_image_path = file_service.get_absolute_path(page.generated_image_path)
        
        # Get original description if available
        original_description = None
        desc_content = page.get_description_content()
        if desc_content:
            # Extract text from description_content
            original_description = desc_content.get('text') or ''
            # If text is not available, try to construct from text_content
            if not original_description and desc_content.get('text_content'):
                if isinstance(desc_content['text_content'], list):
                    original_description = '\n'.join(desc_content['text_content'])
                else:
                    original_description = str(desc_content['text_content'])
        
        # Collect additional reference images
        additional_ref_images = []
        
        # 1. Add template image if requested
        context_images = data.get('context_images', {})
        if isinstance(context_images, dict):
            use_template = context_images.get('use_template', False)
        else:
            use_template = data.get('use_template', 'false').lower() == 'true'
        
        if use_template:
            template_path = file_service.get_template_path(project_id)
            if template_path:
                additional_ref_images.append(template_path)
        
        # 2. Add desc image URLs if provided
        if isinstance(context_images, dict):
            desc_image_urls = context_images.get('desc_image_urls', [])
        else:
            desc_image_urls = data.get('desc_image_urls', [])
        
        if desc_image_urls:
            if isinstance(desc_image_urls, str):
                try:
                    desc_image_urls = json.loads(desc_image_urls)
                except:
                    desc_image_urls = []
            if isinstance(desc_image_urls, list):
                additional_ref_images.extend(desc_image_urls)
        
        # 3. Save and add uploaded files to a persistent location
        temp_dir = None
        if uploaded_files:
            # Create a temporary directory in the project's upload folder
            import tempfile
            import shutil
            from werkzeug.utils import secure_filename
            temp_dir = Path(tempfile.mkdtemp(dir=current_app.config['UPLOAD_FOLDER']))
            try:
                for uploaded_file in uploaded_files:
                    if uploaded_file.filename:
                        # Save to temp directory
                        temp_path = temp_dir / secure_filename(uploaded_file.filename)
                        uploaded_file.save(str(temp_path))
                        additional_ref_images.append(str(temp_path))
            except Exception as e:
                # Clean up temp directory on error
                if temp_dir and temp_dir.exists():
                    shutil.rmtree(temp_dir)
                raise e
        
        # Create async task for image editing
        task = Task(
            project_id=project_id,
            task_type='EDIT_PAGE_IMAGE',
            status='PENDING'
        )
        task.set_progress({
            'total': 1,
            'completed': 0,
            'failed': 0
        })
        db.session.add(task)
        db.session.commit()
        
        # Get app instance for background task
        app = current_app._get_current_object()
        
        # Submit background task
        task_manager.submit_task(
            task.id,
            edit_page_image_task,
            project_id,
            page_id,
            data['edit_instruction'],
            ai_service,
            file_service,
            current_app.config['DEFAULT_ASPECT_RATIO'],
            current_app.config['DEFAULT_RESOLUTION'],
            original_description,
            additional_ref_images if additional_ref_images else None,
            str(temp_dir) if temp_dir else None,
            app
        )
        
        # Return task_id immediately
        return success_response({
            'task_id': task.id,
            'page_id': page_id,
            'status': 'PENDING'
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        return error_response('AI_SERVICE_ERROR', str(e), 503)



@page_bp.route('/<project_id>/pages/<page_id>/image-versions', methods=['GET'])
def get_page_image_versions(project_id, page_id):
    """
    GET /api/projects/{project_id}/pages/{page_id}/image-versions - Get all image versions for a page
    """
    try:
        page = Page.query.get(page_id)
        
        if not page or page.project_id != project_id:
            return not_found('Page')
        
        versions = PageImageVersion.query.filter_by(page_id=page_id)\
            .order_by(PageImageVersion.version_number.desc()).all()
        
        return success_response({
            'versions': [v.to_dict() for v in versions]
        })
    
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@page_bp.route('/<project_id>/pages/<page_id>/image-versions/<version_id>/set-current', methods=['POST'])
def set_current_image_version(project_id, page_id, version_id):
    """
    POST /api/projects/{project_id}/pages/{page_id}/image-versions/{version_id}/set-current
    Set a specific version as the current one
    """
    try:
        page = Page.query.get(page_id)
        
        if not page or page.project_id != project_id:
            return not_found('Page')
        
        version = PageImageVersion.query.get(version_id)
        
        if not version or version.page_id != page_id:
            return not_found('Image Version')
        
        # Mark all versions as not current
        PageImageVersion.query.filter_by(page_id=page_id).update({'is_current': False})
        
        # Set this version as current
        version.is_current = True
        page.generated_image_path = version.image_path
        page.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return success_response(page.to_dict(include_versions=True))
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)
