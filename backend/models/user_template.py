"""
User Template model - stores user-uploaded templates
"""
import uuid
from datetime import datetime, timezone
from . import db, format_datetime_to_iso


class UserTemplate(db.Model):
    """
    User Template model - represents a user-uploaded template
    """
    __tablename__ = 'user_templates'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(100), nullable=True, index=True)  # 用户ID，用于多用户隔离
    name = db.Column(db.String(200), nullable=True)  # Optional template name
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)  # File size in bytes
    # MySQL DateTime 类型不存储时区信息，所以使用 naive datetime（假设是 UTC）
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now())
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(), onupdate=lambda: datetime.now())
    
    def to_dict(self):
        """Convert to dictionary"""
        # Format created_at and updated_at with UTC timezone indicator for proper frontend parsing
        def format_utc_time(dt):
            """格式化时间为 UTC ISO 格式（带 Z 后缀）"""
            if not dt:
                return None
            # 如果时间没有时区信息，假设是 UTC
            if dt.tzinfo is None:
                # 添加 UTC 时区信息
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                # 转换为 UTC
                dt = dt.astimezone(timezone.utc)
            # 格式化为 ISO 格式并添加 Z 后缀
            iso_str = dt.isoformat()
            # 将 +00:00 替换为 Z，或者如果已经是 Z 格式则保持不变
            if iso_str.endswith('+00:00'):
                iso_str = iso_str[:-6] + 'Z'
            elif not iso_str.endswith('Z'):
                iso_str = iso_str + 'Z'
            return iso_str
        
        created_at_str = format_utc_time(self.created_at)
        updated_at_str = format_utc_time(self.updated_at)
        
        return {
            'template_id': self.id,
            'name': self.name,
            'template_image_url': f'/files/user-templates/{self.id}/{self.file_path.split("/")[-1]}',
            'created_at': created_at_str,
            'updated_at': updated_at_str,
       }
    
    def __repr__(self):
        return f'<UserTemplate {self.id}: {self.name or "Unnamed"}>'
