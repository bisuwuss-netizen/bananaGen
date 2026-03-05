"""
Preset Style Controller - handles preset style endpoints
"""
import logging
from typing import Optional
from flask import Blueprint, request
from sqlalchemy import text
from models import db
from utils import success_response, error_response

logger = logging.getLogger(__name__)

preset_style_bp = Blueprint('preset_style', __name__, url_prefix='/api/preset-styles')


def _detect_preview_column() -> Optional[str]:
    """
    Detect preview image column name in preset_styles table.
    Compatible with both legacy `previewImage` and snake_case `preview_image`.
    """
    try:
        rows = db.session.execute(text("SHOW COLUMNS FROM preset_styles")).fetchall()
        col_names = {row[0] for row in rows}
        if 'preview_image' in col_names:
            return 'preview_image'
        if 'previewImage' in col_names:
            return 'previewImage'
    except Exception as e:
        logger.warning(f"Failed to inspect preset_styles columns: {e}")
    return None


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

        # Use dynamic SQL to support schema differences:
        # - previewImage (legacy camelCase)
        # - preview_image (snake_case)
        preview_col = _detect_preview_column()
        preview_select = f"`{preview_col}` AS preview_image" if preview_col else "NULL AS preview_image"

        sql = f"""
            SELECT
                id,
                name,
                description,
                {preview_select},
                status
            FROM preset_styles
        """
        params = {}
        if status is not None:
            sql += " WHERE status = :status"
            params["status"] = status

        rows = db.session.execute(text(sql), params).mappings().all()
        styles = [
            {
                'id': str(row.get('id')),
                'name': row.get('name'),
                'description': row.get('description') or '',
                'previewImage': row.get('preview_image'),
                'status': row.get('status') if row.get('status') is not None else 1,
            }
            for row in rows
        ]

        logger.info(f"Found {len(styles)} preset styles")
        return success_response({'styles': styles})
        
    except Exception as e:
        logger.error(f"Error fetching preset styles: {str(e)}")
        return error_response('SERVER_ERROR', str(e), 500)
