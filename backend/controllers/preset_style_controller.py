"""
Preset Style Controller - handles preset style endpoints
"""
import logging
from flask import Blueprint, request, jsonify
from models import PresetStyle
from utils import success_response, error_response

logger = logging.getLogger(__name__)

preset_style_bp = Blueprint('preset_style', __name__, url_prefix='/api/preset-styles')


@preset_style_bp.route('/', methods=['GET'])
def list_preset_styles():
    """
    GET /api/preset-styles/ - Get list of preset styles
    Query parameters:
        status: Filter by status (default 1)
    """
    try:
        # Default to showing only enabled styles
        status = request.args.get('status', 1, type=int)
        
        logger.info(f"Fetching preset styles with status={status}")
        
        query = PresetStyle.query
        if status is not None:
            query = query.filter_by(status=status)
            
        styles = query.all()
        
        logger.info(f"Found {len(styles)} preset styles")
        
        return success_response({
            'styles': [style.to_dict() for style in styles]
        })
        
    except Exception as e:
        logger.error(f"Error fetching preset styles: {str(e)}")
        return error_response('SERVER_ERROR', str(e), 500)
