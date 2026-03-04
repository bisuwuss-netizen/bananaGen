"""
File Controller - handles static file serving and HTML upload for PPTX export
"""
from flask import Blueprint, send_from_directory, current_app, request, jsonify
from utils import error_response, not_found
from utils.path_utils import find_file_with_prefix
import os
import uuid
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename

file_bp = Blueprint('files', __name__, url_prefix='/files')


@file_bp.route('/html/upload', methods=['POST'])
def upload_html():
    """
    POST /files/html/upload - Upload HTML content for PPTX export
    
    Request body (JSON):
        - content: HTML content string
        - filename: Optional filename (will be auto-generated if not provided)
    
    Returns:
        - filepath: Relative URL path to access the uploaded HTML
        - url: Full URL to access the uploaded HTML
    """
    try:
        data = request.get_json()
        if not data:
            return error_response('INVALID_REQUEST', 'Request body must be JSON', 400)
        
        html_content = data.get('content')
        if not html_content:
            return error_response('INVALID_REQUEST', 'HTML content is required', 400)
        
        # Generate filename
        filename = data.get('filename')
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            random_id = uuid.uuid4().hex[:8]
            filename = f'{timestamp}_{random_id}.html'
        else:
            # Ensure .html extension
            if not filename.endswith('.html'):
                filename += '.html'
            filename = secure_filename(filename)
        
        # Create html_exports directory
        html_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'html_exports')
        os.makedirs(html_dir, exist_ok=True)
        
        # Save HTML file
        file_path = os.path.join(html_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Generate URL (relative to frontend server for cross-origin iframe access)
        relative_path = f'/files/html_exports/{filename}'
        
        # Get frontend URL from Origin or Referer header
        # This ensures the URL is accessible from the Windows client
        origin = request.headers.get('Origin', '')
        referer = request.headers.get('Referer', '')
        
        # Extract base URL from origin or referer
        if origin:
            base_url = origin.rstrip('/')
        elif referer:
            # Extract scheme://host:port from referer
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            base_url = f'{parsed.scheme}://{parsed.netloc}'
        else:
            # Fallback to X-Forwarded headers or request host
            host = request.headers.get('X-Forwarded-Host', request.host)
            scheme = request.headers.get('X-Forwarded-Proto', request.scheme)
            base_url = f'{scheme}://{host}'
        
        full_url = f'{base_url}{relative_path}'
        
        return jsonify({
            'code': 200,
            'data': {
                'filepath': relative_path,
                'url': full_url,
                'filename': filename
            }
        })
    
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@file_bp.route('/html_exports/<filename>', methods=['GET'])
def serve_html_export(filename):
    """
    GET /files/html_exports/{filename} - Serve exported HTML files
    
    Args:
        filename: HTML file name
    """
    try:
        safe_filename = secure_filename(filename)
        file_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'html_exports')
        
        if not os.path.exists(file_dir):
            return not_found('File')
        
        file_path = os.path.join(file_dir, safe_filename)
        if not os.path.exists(file_path):
            return not_found('File')
        
        return send_from_directory(file_dir, safe_filename, mimetype='text/html')
    
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@file_bp.route('/<project_id>/<file_type>/<filename>', methods=['GET'])
def serve_file(project_id, file_type, filename):
    """
    GET /files/{project_id}/{type}/{filename} - Serve static files
    
    Args:
        project_id: Project UUID
        file_type: 'template' or 'pages'
        filename: File name
    """
    try:
        if file_type not in ['template', 'pages', 'materials', 'exports']:
            return not_found('File')
        
        # Construct file path
        file_dir = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            project_id,
            file_type
        )
        
        # Check if directory exists
        if not os.path.exists(file_dir):
            return not_found('File')
        
        # Check if file exists
        file_path = os.path.join(file_dir, filename)
        if not os.path.exists(file_path):
            return not_found('File')
        
        # Serve file
        return send_from_directory(file_dir, filename)
    
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@file_bp.route('/user-templates/<template_id>/<filename>', methods=['GET'])
def serve_user_template(template_id, filename):
    """
    GET /files/user-templates/{template_id}/{filename} - Serve user template files
    
    Args:
        template_id: Template UUID
        filename: File name
    """
    try:
        # Construct file path
        file_dir = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'user-templates',
            template_id
        )
        
        # Check if directory exists
        if not os.path.exists(file_dir):
            return not_found('File')
        
        # Check if file exists
        file_path = os.path.join(file_dir, filename)
        if not os.path.exists(file_path):
            return not_found('File')
        
        # Serve file
        return send_from_directory(file_dir, filename)
    
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@file_bp.route('/materials/<filename>', methods=['GET'])
def serve_global_material(filename):
    """
    GET /files/materials/{filename} - Serve global material files (not bound to a project)
    
    Args:
        filename: File name
    """
    try:
        safe_filename = secure_filename(filename)
        # Construct file path
        file_dir = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'materials'
        )
        
        # Check if directory exists
        if not os.path.exists(file_dir):
            return not_found('File')
        
        # Check if file exists
        file_path = os.path.join(file_dir, safe_filename)
        if not os.path.exists(file_path):
            return not_found('File')
        
        # Serve file
        return send_from_directory(file_dir, safe_filename)
    
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@file_bp.route('/mineru/<extract_id>/<path:filepath>', methods=['GET'])
def serve_mineru_file(extract_id, filepath):
    """
    GET /files/mineru/{extract_id}/{filepath} - Serve MinerU extracted files.

    Args:
        extract_id: Extract UUID
        filepath: Relative file path within the extract
    """
    try:
        root_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'mineru_files', extract_id)
        full_path = Path(root_dir) / filepath

        # This prevents path traversal attacks
        resolved_root_dir = Path(root_dir).resolve()
        
        try:
            # Check if the path is trying to escape the root directory
            resolved_full_path = full_path.resolve()
            if not str(resolved_full_path).startswith(str(resolved_root_dir)):
                return error_response('INVALID_PATH', 'Invalid file path', 403)
        except Exception:
            # If we can't resolve the path at all, it's invalid
            return error_response('INVALID_PATH', 'Invalid file path', 403)

        # Try to find file with prefix matching
        matched_path = find_file_with_prefix(full_path)
        
        if matched_path is not None:
            # Additional security check for matched path
            try:
                resolved_matched_path = matched_path.resolve(strict=True)
                
                # Verify the matched file is still within the root directory
                if not str(resolved_matched_path).startswith(str(resolved_root_dir)):
                    return error_response('INVALID_PATH', 'Invalid file path', 403)
            except FileNotFoundError:
                return not_found('File')
            except Exception:
                return error_response('INVALID_PATH', 'Invalid file path', 403)
            
            return send_from_directory(str(matched_path.parent), matched_path.name)

        return not_found('File')
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)

