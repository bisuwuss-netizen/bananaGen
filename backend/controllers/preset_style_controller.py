"""
Preset Style Controller - handles preset style endpoints
"""
import logging
from flask import Blueprint, request
from sqlalchemy import inspect, text
from models import PresetStyle, db
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
        
        try:
            query = PresetStyle.query
            if status is not None:
                query = query.filter_by(status=status)
            styles = query.all()
            logger.info(f"Found {len(styles)} preset styles (ORM)")
            return success_response({
                'styles': [style.to_dict() for style in styles]
            })
        except Exception as orm_error:
            # Backward compatibility: some legacy DBs use `previewImage` instead of `preview_image`.
            logger.warning(f"ORM query failed, fallback to raw SQL: {orm_error}")

            inspector = inspect(db.engine)
            if 'preset_styles' not in inspector.get_table_names():
                return success_response({'styles': []})

            columns = {col['name'] for col in inspector.get_columns('preset_styles')}
            preview_col = 'preview_image' if 'preview_image' in columns else ('previewImage' if 'previewImage' in columns else None)
            status_col = 'status' if 'status' in columns else None

            select_cols = ["id", "name", "description"]
            if preview_col:
                select_cols.append(f"`{preview_col}` AS preview_image")
            else:
                select_cols.append("NULL AS preview_image")
            if status_col:
                select_cols.append("status")
            else:
                select_cols.append("1 AS status")

            sql = f"SELECT {', '.join(select_cols)} FROM preset_styles"
            params = {}
            if status is not None and status_col:
                sql += " WHERE status = :status"
                params['status'] = status

            rows = db.session.execute(text(sql), params).mappings().all()
            styles = [
                {
                    'id': row.get('id'),
                    'name': row.get('name'),
                    'description': row.get('description') or '',
                    'previewImage': row.get('preview_image'),
                    'status': row.get('status') if row.get('status') is not None else 1,
                }
                for row in rows
            ]
            logger.info(f"Found {len(styles)} preset styles (SQL fallback)")
            return success_response({'styles': styles})
        
    except Exception as e:
        logger.error(f"Error fetching preset styles: {str(e)}")
        return error_response('SERVER_ERROR', str(e), 500)
