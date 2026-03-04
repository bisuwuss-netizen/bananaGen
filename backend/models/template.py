"""
Template model - stores system templates from MySQL templates table
"""
from . import db


class Template(db.Model):
    """
    Template model - represents a system template from templates table
    Fields: id, name, preview, status
    """
    __tablename__ = 'templates'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(200), nullable=True)  # Template name
    preview = db.Column(db.String(500), nullable=True)  # Template preview image URL
    status = db.Column(db.Integer, nullable=True, default=1)  # 状态：1启用，0禁用
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'template_id': self.id,
            'name': self.name,
            'template_image_url': self.preview or '',
            'status': self.status if self.status is not None else 1,  # 默认为1（启用）
        }
    
    def __repr__(self):
        return f'<Template {self.id}: {self.name or "Unnamed"}>'
