"""
PresetStyle model - stores preset styles for PPT generation
"""
from . import db


class PresetStyle(db.Model):
    """
    PresetStyle model - represents a preset style configuration
    Fields: id, name, description, preview_image, status
    """
    __tablename__ = 'preset_styles'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)  # AI prompt description
    preview_image = db.Column(db.String(500), nullable=True)
    status = db.Column(db.Integer, nullable=True, default=1)  # 1: enabled, 0: disabled
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description or '',
            'previewImage': self.preview_image,
            'status': self.status if self.status is not None else 1,
        }
    
    def __repr__(self):
        return f'<PresetStyle {self.id}: {self.name or "Unnamed"}>'
