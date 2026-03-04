"""Database models package"""
from datetime import datetime
from dateutil import parser
from flask_sqlalchemy import SQLAlchemy

# 创建 SQLAlchemy 实例
# 注意：数据库连接配置在 config.py 中的 SQLALCHEMY_ENGINE_OPTIONS 设置
# 这里不设置 engine_options，让 Flask-SQLAlchemy 使用 config.py 中的配置
db = SQLAlchemy()


def format_datetime_to_iso(dt_value, add_utc_z=True):
    """
    安全地将 datetime 字段转换为 ISO 格式字符串
    
    处理 MySQL 可能返回字符串的情况，确保兼容性
    
    Args:
        dt_value: datetime 对象或字符串
        add_utc_z: 如果 datetime 没有时区信息，是否添加 'Z' 后缀表示 UTC
        
    Returns:
        ISO 格式的字符串，如果输入为 None 则返回 None
    """
    if dt_value is None:
        return None
    
    # 如果是字符串，先解析为 datetime 对象
    if isinstance(dt_value, str):
        try:
            dt_value = parser.parse(dt_value)
        except (ValueError, TypeError):
            # 如果解析失败，返回原字符串或 None
            return None
    
    # 确保是 datetime 对象
    if not isinstance(dt_value, datetime):
        return None
    
    # 转换为 ISO 格式
    if add_utc_z and not dt_value.tzinfo:
        return dt_value.isoformat() + 'Z'
    else:
        return dt_value.isoformat()

from .project import Project
from .page import Page
from .task import Task
from .user_template import UserTemplate
from .template import Template
from .page_image_version import PageImageVersion
from .material import Material
from .reference_file import ReferenceFile
from .settings import Settings
from .preset_style import PresetStyle

__all__ = ['db', 'Project', 'Page', 'Task', 'UserTemplate', 'Template', 'PageImageVersion', 'Material', 'ReferenceFile', 'Settings', 'PresetStyle']

