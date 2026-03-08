"""
Page model
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import cast, Integer
from . import db, format_datetime_to_iso


class Page(db.Model):
    """
    Page model - represents a single PPT page/slide
    """
    __tablename__ = 'pages'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=False)
    order_index = db.Column(db.Integer, nullable=False)
    
    @classmethod
    def numeric_order(cls):
        """Return an ORDER BY expression that ensures numeric sorting.
        
        Workaround for databases where order_index column is VARCHAR instead of INTEGER,
        which causes lexicographic sorting ('0','1','10','2',...) instead of numeric (0,1,2,...,10).
        """
        return cast(cls.order_index, Integer)
    part = db.Column(db.String(200), nullable=True)  # Optional section name
    outline_content = db.Column(db.Text, nullable=True)  # JSON string
    description_content = db.Column(db.Text, nullable=True)  # JSON string
    layout_id = db.Column(db.String(50), nullable=True)  # HTML模式下的布局ID: cover, toc, title_content, title_bullets, two_column, process_steps, ending, section_title, image_full, quote
    html_model = db.Column(db.Text, nullable=True)  # HTML模式下的结构化数据 (JSON string)
    generated_image_path = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='DRAFT')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = db.relationship('Project', back_populates='pages')
    image_versions = db.relationship('PageImageVersion', back_populates='page', 
                                     lazy='dynamic', cascade='all, delete-orphan',
                                     order_by='PageImageVersion.version_number.desc()')
    
    def get_outline_content(self):
        """Parse outline_content from JSON string"""
        if self.outline_content:
            try:
                return json.loads(self.outline_content)
            except json.JSONDecodeError:
                return None
        return None
    
    def set_outline_content(self, data):
        """Set outline_content as JSON string"""
        if data:
            self.outline_content = json.dumps(data, ensure_ascii=False)
        else:
            self.outline_content = None
    
    def get_description_content(self):
        """Parse description_content from JSON string"""
        if self.description_content:
            try:
                return json.loads(self.description_content)
            except json.JSONDecodeError:
                return None
        return None
    
    def set_description_content(self, data):
        """Set description_content as JSON string"""
        if data:
            self.description_content = json.dumps(data, ensure_ascii=False)
        else:
            self.description_content = None

    def get_html_model(self):
        """Parse html_model from JSON string"""
        if self.html_model:
            try:
                return json.loads(self.html_model)
            except json.JSONDecodeError:
                return None
        return None

    def set_html_model(self, data):
        """Set html_model as JSON string"""
        if data:
            self.html_model = json.dumps(data, ensure_ascii=False)
        else:
            self.html_model = None

    def to_dict(self, include_versions=False, summary_only=False):
        """Convert to dictionary"""
        description = self.get_description_content()
        html_model = self.get_html_model()
        continuity = {}
        if isinstance(description, dict):
            continuity = description.get('continuity') if isinstance(description.get('continuity'), dict) else {}

        data = {
            'page_id': self.id,
            'order_index': int(self.order_index) if self.order_index is not None else 0,
            'part': self.part,
            'outline_content': self.get_outline_content(),
            'layout_id': self.layout_id,
            'closed_promise_ids': continuity.get('closed_promise_ids', []),
            'missing_required_close_promise_ids': continuity.get('missing_required_close_promise_ids', []),
            'generated_image_url': f'/files/{self.project_id}/pages/{self.generated_image_path.split("/")[-1]}' if self.generated_image_path else None,
            'has_description_content': description is not None,
            'has_html_model': isinstance(html_model, dict) and bool(html_model),
            'status': self.status,
            'created_at': format_datetime_to_iso(self.created_at, add_utc_z=True),
            'updated_at': format_datetime_to_iso(self.updated_at, add_utc_z=True),
        }

        if not summary_only:
            data['description_content'] = description
            data['html_model'] = html_model

        if include_versions:
            data['image_versions'] = [v.to_dict() for v in self.image_versions.all()]

        return data
    
    def __repr__(self):
        return f'<Page {self.id}: {self.order_index} - {self.status}>'
