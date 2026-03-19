"""
Template Controller - handles template-related endpoints
"""
import logging
from flask import Blueprint, request, current_app
from sqlalchemy import text
from models import db, Project, UserTemplate, Template
from utils import success_response, error_response, not_found, bad_request, allowed_file
from services import FileService
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

template_bp = Blueprint('templates', __name__, url_prefix='/api/projects')
user_template_bp = Blueprint('user_templates', __name__, url_prefix='/api/user-templates')


@template_bp.route('/<project_id>/template', methods=['POST'])
def upload_template(project_id):
    """
    POST /api/projects/{project_id}/template - Upload template image
    
    Content-Type: multipart/form-data
    Form: template_image=@file.png
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # Check if file is in request
        if 'template_image' not in request.files:
            return bad_request("No file uploaded")
        
        file = request.files['template_image']
        
        if file.filename == '':
            return bad_request("No file selected")
        
        # Validate file extension
        if not allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            return bad_request("Invalid file type. Allowed types: png, jpg, jpeg, gif, webp")
        
        # Save template
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_path = file_service.save_template_image(file, project_id)
        
        # Update project
        project.template_image_path = file_path
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return success_response({
            'template_image_url': f'/files/{project_id}/template/{file_path.split("/")[-1]}'
        })
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@template_bp.route('/<project_id>/template', methods=['DELETE'])
def delete_template(project_id):
    """
    DELETE /api/projects/{project_id}/template - Delete template
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        if not project.template_image_path:
            return bad_request("No template to delete")
        
        # Delete template file
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_service.delete_template(project_id)
        
        # Update project
        project.template_image_path = None
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return success_response(message="Template deleted successfully")
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@template_bp.route('/templates', methods=['GET'])
def get_system_templates():
    """
    GET /api/projects/templates - Get system templates from MySQL templates table
    Query parameters:
        page: 页码（从1开始，默认1）
        page_size: 每页数量（默认8，即2行x4列）
    """
    try:
        # 获取分页参数
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 8, type=int)  # 默认8个，即2行x4列
        
        logger.info(f"Fetching system templates from MySQL templates table - page: {page}, page_size: {page_size}")
        
        # 查询所有启用的模板（status=1），按 id 排序
        query = Template.query.filter(
            (Template.status == 1) | (Template.status.is_(None))
        ).order_by(Template.id)
        
        # 获取总数
        total = query.count()
        
        # 分页查询
        templates = query.offset((page - 1) * page_size).limit(page_size).all()
        logger.info(f"SQLAlchemy query found {len(templates)} templates (page {page}/{((total - 1) // page_size) + 1}, total: {total})")
        
        # 如果查询结果为空，尝试使用原始 SQL 获取数据
        if len(templates) == 0:
            logger.warning("SQLAlchemy query returned empty, trying raw SQL")
            try:
                result = db.session.execute(text("SELECT id, name, preview, status FROM templates WHERE status = 1 OR status IS NULL"))
                raw_templates = result.fetchall()
                logger.info(f"Raw SQL found {len(raw_templates)} templates")
                if raw_templates:
                    logger.info(f"Raw template data: {raw_templates}")
            except Exception as raw_error:
                logger.error(f"Raw SQL query failed: {str(raw_error)}")
        
        templates_data = [template.to_dict() for template in templates]
        logger.info(f"Returning {len(templates_data)} templates to frontend")
        logger.debug(f"Templates data: {templates_data}")
        
        # 计算总页数
        total_pages = ((total - 1) // page_size) + 1 if total > 0 else 0
        
        # 构建响应数据
        response_data = {
            'templates': templates_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        }
        
        # 如果查询结果为空，添加详细的调试信息
        if len(templates_data) == 0:
            try:
                from sqlalchemy import inspect
                inspector = inspect(db.engine)
                tables = inspector.get_table_names()
                
                debug_info = {
                    'table_exists': 'templates' in tables,
                    'all_tables': tables,
                    'database_connected': db.engine is not None,
                    'database_uri': str(db.engine.url).replace(db.engine.url.password or '', '***') if db.engine else 'Not connected'
                }
                
                # 如果表存在，获取更多信息
                if 'templates' in tables:
                    # 获取表结构
                    columns = inspector.get_columns('templates')
                    debug_info['table_columns'] = [{'name': col['name'], 'type': str(col['type'])} for col in columns]
                    
                    # 获取行数
                    try:
                        result = db.session.execute(text("SELECT COUNT(*) FROM templates"))
                        debug_info['row_count'] = result.fetchone()[0]
                    except Exception as count_error:
                        debug_info['row_count_error'] = str(count_error)
                    
                    # 获取示例数据（最多5条，包括所有状态）
                    try:
                        result = db.session.execute(text("SELECT id, name, preview, status FROM templates LIMIT 5"))
                        debug_info['sample_data'] = [
                            {'id': row[0], 'name': row[1], 'preview': row[2], 'status': row[3]} 
                            for row in result.fetchall()
                        ]
                        
                        # 获取启用状态的模板数量
                        result = db.session.execute(text("SELECT COUNT(*) FROM templates WHERE status = 1 OR status IS NULL"))
                        debug_info['enabled_count'] = result.fetchone()[0]
                        
                        # 获取禁用状态的模板数量
                        result = db.session.execute(text("SELECT COUNT(*) FROM templates WHERE status = 0"))
                        debug_info['disabled_count'] = result.fetchone()[0]
                    except Exception as sample_error:
                        debug_info['sample_data_error'] = str(sample_error)
                
                response_data['debug'] = debug_info
                logger.info(f"Debug info: {debug_info}")
            except Exception as debug_error:
                import traceback
                error_msg = f"{str(debug_error)}\n{traceback.format_exc()}"
                response_data['debug'] = {'error': error_msg}
                logger.error(f"Error generating debug info: {error_msg}")
        
        return success_response(response_data)
    
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return error_response('SERVER_ERROR', str(e), 500)


@template_bp.route('/templates/debug', methods=['GET'])
@template_bp.route('/templates-debug', methods=['GET'])  # 备用路由
def debug_templates():
    """
    GET /api/projects/templates/debug - Debug endpoint to check database connection and table structure
    """
    try:
        from sqlalchemy import text, inspect
        from sqlalchemy.engine import reflection
        
        debug_info = {
            'database_uri': str(db.engine.url).replace(db.engine.url.password or '', '***') if db.engine else 'Not connected',
            'table_exists': False,
            'table_columns': [],
            'row_count': 0,
            'sample_data': [],
            'sqlalchemy_query_result': []
        }
        
        # 检查表是否存在
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        debug_info['all_tables'] = tables
        debug_info['table_exists'] = 'templates' in tables
        
        if 'templates' in tables:
            # 获取表结构
            columns = inspector.get_columns('templates')
            debug_info['table_columns'] = [{'name': col['name'], 'type': str(col['type'])} for col in columns]
            
            # 获取行数
            result = db.session.execute(text("SELECT COUNT(*) FROM templates"))
            debug_info['row_count'] = result.fetchone()[0]
            
            # 获取示例数据（最多5条，包括所有状态）
            result = db.session.execute(text("SELECT id, name, preview, status FROM templates LIMIT 5"))
            debug_info['sample_data'] = [
                {'id': row[0], 'name': row[1], 'preview': row[2], 'status': row[3]} 
                for row in result.fetchall()
            ]
            
            # 获取启用状态的模板数量
            result = db.session.execute(text("SELECT COUNT(*) FROM templates WHERE status = 1 OR status IS NULL"))
            debug_info['enabled_count'] = result.fetchone()[0]
            
            # 获取禁用状态的模板数量
            result = db.session.execute(text("SELECT COUNT(*) FROM templates WHERE status = 0"))
            debug_info['disabled_count'] = result.fetchone()[0]
        
        # 尝试使用 SQLAlchemy 查询（只查询启用的模板）
        try:
            templates = Template.query.filter(
                (Template.status == 1) | (Template.status.is_(None))
            ).limit(5).all()
            debug_info['sqlalchemy_query_result'] = [template.to_dict() for template in templates]
        except Exception as sqla_error:
            debug_info['sqlalchemy_error'] = str(sqla_error)
        
        return success_response(debug_info)
    
    except Exception as e:
        import traceback
        return error_response('SERVER_ERROR', f"{str(e)}\n{traceback.format_exc()}", 500)


# ========== User Template Endpoints ==========

@user_template_bp.route('', methods=['POST'])
def upload_user_template():
    """
    POST /api/user-templates - Upload user template image
    
    Content-Type: multipart/form-data
    Form: template_image=@file.png
    Optional: name=Template Name
    """
    try:
        # Check if file is in request
        if 'template_image' not in request.files:
            return bad_request("No file uploaded")
        
        file = request.files['template_image']
        
        if file.filename == '':
            return bad_request("No file selected")
        
        # Validate file extension
        if not allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            return bad_request("Invalid file type. Allowed types: png, jpg, jpeg, gif, webp")
        
        # Get optional name
        name = request.form.get('name', None)
        
        # Get file size before saving
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        # Generate template ID first
        import uuid
        template_id = str(uuid.uuid4())
        
        # 从cookie获取user_id
        user_id_str = request.cookies.get('user_id')
        logger.info(f"upload_user_template - user_id from cookie: {user_id_str}")
        
        # 如果user_id为空，返回错误
        if not user_id_str or (isinstance(user_id_str, str) and user_id_str.strip() == ''):
            logger.warning("upload_user_template - user_id is empty, returning error")
            return bad_request("user_id is required. Please ensure user_id is set in cookie.")
        
        # 将字符串转换为整数
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            logger.warning(f"upload_user_template - invalid user_id format: {user_id_str}")
            return bad_request(f"Invalid user_id format: {user_id_str}")
        
        # Save template file first (using the generated ID)
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_path = file_service.save_user_template(file, template_id)
        
        # 从 Cookie 获取 user_id
        user_id = request.cookies.get('user_id')
        if user_id:
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid user_id in cookie: {user_id}, using default 1")
                user_id = 1
        else:
            # 如果 Cookie 中没有 user_id，使用默认值 1
            user_id = 1
            logger.info("No user_id found in cookie, using default 1")
        
        # Create template record with file_path already set
        # 显式设置时间字段，确保时间准确
        # MySQL DateTime 类型不存储时区信息，所以使用 naive datetime（UTC）
        now_utc = datetime.now()
        template = UserTemplate(
            id=template_id,
            user_id=user_id,  # 从cookie中获取user_id
            name=name,
            file_path=file_path,
            file_size=file_size,
            created_at=now_utc,
            updated_at=now_utc
        )
        db.session.add(template)
        db.session.commit()
        
        return success_response(template.to_dict())
    
    except Exception as e:
        import traceback
        db.session.rollback()
        error_msg = str(e)
        logger.error(f"Error uploading user template: {error_msg}", exc_info=True)
        # 在开发环境中返回详细错误，生产环境返回通用错误
        if current_app.config.get('DEBUG', False):
            return error_response('SERVER_ERROR', f"{error_msg}\n{traceback.format_exc()}", 500)
        else:
            return error_response('SERVER_ERROR', error_msg, 500)


@user_template_bp.route('', methods=['GET'])
def list_user_templates():
    """
    GET /api/user-templates - Get list of user templates
    Query parameters:
        page: 页码（从1开始，默认1）
        page_size: 每页数量（默认8，即2行x4列）
    Note: user_id 从 cookie 中获取，如果为空则返回空数组
    """
    try:
        # 从cookie获取user_id
        user_id_str = request.cookies.get('user_id')
        logger.info(f"list_user_templates - user_id from cookie: {user_id_str}")
        
        # 如果user_id为空，返回空数组
        if not user_id_str or (isinstance(user_id_str, str) and user_id_str.strip() == ''):
            logger.warning("list_user_templates - user_id is empty, returning empty array")
            return success_response({
                'templates': [],
                'pagination': {
                    'page': 1,
                    'page_size': 8,
                    'total': 0,
                    'total_pages': 0,
                    'has_next': False,
                    'has_prev': False
                }
            })
        
        # 将字符串转换为整数
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            logger.warning(f"list_user_templates - invalid user_id format: {user_id_str}, returning empty array")
            return success_response({
                'templates': [],
                'pagination': {
                    'page': 1,
                    'page_size': 8,
                    'total': 0,
                    'total_pages': 0,
                    'has_next': False,
                    'has_prev': False
                }
            })
        
        # 获取分页参数
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 8, type=int)  # 默认8个，即2行x4列
        
        logger.info(f"Fetching user templates for user_id={user_id} - page: {page}, page_size: {page_size}")
        
        # 根据 user_id 查询该用户上传的模版，按创建时间倒序排列
        query = UserTemplate.query.filter(
            UserTemplate.user_id == user_id
        ).order_by(UserTemplate.created_at.desc())
        
        # 获取总数
        total = query.count()
        
        # 分页查询
        templates = query.offset((page - 1) * page_size).limit(page_size).all()
        logger.info(f"Found {len(templates)} templates for user_id={user_id} (page {page}/{((total - 1) // page_size) + 1}, total: {total})")
        
        templates_data = [template.to_dict() for template in templates]
        
        # 计算总页数
        total_pages = ((total - 1) // page_size) + 1 if total > 0 else 0
        
        # 构建响应数据
        response_data = {
            'templates': templates_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        }
        
        return success_response(response_data)
    
    except Exception as e:
        logger.error(f"Error fetching user templates: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return error_response('SERVER_ERROR', str(e), 500)


@user_template_bp.route('/<template_id>', methods=['DELETE'])
def delete_user_template(template_id):
    """
    DELETE /api/user-templates/{template_id} - Delete user template
    """
    try:
        template = UserTemplate.query.get(template_id)
        
        if not template:
            return not_found('UserTemplate')
        
        # Delete template file
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_service.delete_user_template(template_id)
        
        # Delete template record
        db.session.delete(template)
        db.session.commit()
        
        return success_response(message="Template deleted successfully")
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)
