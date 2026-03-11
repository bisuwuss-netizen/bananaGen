"""
Project model
"""
import uuid
from datetime import datetime
from . import db


class Project(db.Model):
    """
    Project model - represents a PPT project
    """
    __tablename__ = 'projects'
    GENERATION_TASK_TYPES = {
        'GENERATE_DESCRIPTIONS',
        'GENERATE_IMAGES',
        'GENERATE_PAGE_IMAGE',
    }
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    idea_prompt = db.Column(db.Text, nullable=True)
    outline_text = db.Column(db.Text, nullable=True)  # 用户输入的大纲文本（用于outline类型）
    description_text = db.Column(db.Text, nullable=True)  # 用户输入的描述文本（用于description类型）
    extra_requirements = db.Column(db.Text, nullable=True)  # 额外要求，应用到每个页面的AI提示词
    creation_type = db.Column(db.String(20), nullable=False, default='idea')  # idea|outline|descriptions
    template_image_path = db.Column(db.String(500), nullable=True)
    template_style = db.Column(db.Text, nullable=True)  # 风格描述文本（无模板图模式）
    scheme_id = db.Column(db.String(20), nullable=False, default='edu_dark')  # 布局方案/模板体系
    # 导出设置
    export_extractor_method = db.Column(db.String(50), nullable=True, default='hybrid')  # 组件提取方法: mineru, hybrid
    export_inpaint_method = db.Column(db.String(50), nullable=True, default='hybrid')  # 背景图获取方法: generative, baidu, hybrid
    render_mode = db.Column(db.String(20), nullable=False, default='image')  # 渲染模式: image(传统图片生成), html(HTML渲染模式)
    status = db.Column(db.String(50), nullable=False, default='DRAFT')
    user_id = db.Column(db.String(100), nullable=True, index=True)  # 用户ID，用于多用户隔离
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now())
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(), onupdate=lambda: datetime.now())
    
    # Relationships
    # 使用 'select' 策略支持 eager loading，同时保持灵活性
    pages = db.relationship('Page', back_populates='project', lazy='select', 
                           cascade='all, delete-orphan', order_by='Page.order_index')
    tasks = db.relationship('Task', back_populates='project', lazy='select',
                           cascade='all, delete-orphan')
    materials = db.relationship('Material', back_populates='project', lazy='select',
                           cascade='all, delete-orphan')
    
    def _get_latest_generation_task(self):
        """Return the latest task that reflects project generation progress."""
        generation_tasks = [
            task
            for task in self.tasks
            if task.task_type in self.GENERATION_TASK_TYPES
        ]
        if not generation_tasks:
            return None

        def _task_sort_key(task):
            created_at = task.created_at or datetime.min
            completed_at = task.completed_at or datetime.min
            return created_at, completed_at

        return max(generation_tasks, key=_task_sort_key)

    def to_dict(self, include_pages=False, page_summary=False, include_latest_generation_task=False):
        """Convert to dictionary"""
        # Format created_at and updated_at
        # 注意：如果时间没有时区信息，不要添加 'Z' 后缀
        # 因为 datetime.now() 返回的是本地时间，不是 UTC 时间
        # 添加 'Z' 会让前端误以为是 UTC 时间，导致时区转换错误
        created_at_str = None
        if self.created_at:
            # 如果有时区信息，使用 isoformat()；如果没有，直接使用 isoformat() 不添加 'Z'
            created_at_str = self.created_at.isoformat()
        
        updated_at_str = None
        if self.updated_at:
            # 如果有时区信息，使用 isoformat()；如果没有，直接使用 isoformat() 不添加 'Z'
            updated_at_str = self.updated_at.isoformat()
        
        data = {
            'project_id': self.id,
            'idea_prompt': self.idea_prompt,
            'outline_text': self.outline_text,
            'description_text': self.description_text,
            'extra_requirements': self.extra_requirements,
            'creation_type': self.creation_type,
            'template_image_url': f'/files/{self.id}/template/{self.template_image_path.split("/")[-1]}' if self.template_image_path else None,
            'template_style': self.template_style,
            'scheme_id': self.scheme_id or 'edu_dark',
            'export_extractor_method': self.export_extractor_method or 'hybrid',
            'export_inpaint_method': self.export_inpaint_method or 'hybrid',
            'render_mode': self.render_mode or 'image',
            'status': self.status,
            'user_id': self.user_id,
            'created_at': created_at_str,
            'updated_at': updated_at_str,
        }
        
        sorted_pages = sorted(
            self.pages,
            key=lambda p: int(p.order_index) if p.order_index is not None else 999,
        )

        if sorted_pages:
            data['preview_page'] = sorted_pages[0].to_dict()

        if include_pages:
            # 显式按 order_index 数值排序，确保 joinedload 时也能正确排序
            # 注意：order_index 可能是字符串（DB列类型为VARCHAR时），需要转为 int
            data['pages'] = [page.to_dict(summary_only=page_summary) for page in sorted_pages]

        if include_latest_generation_task:
            latest_generation_task = self._get_latest_generation_task()
            if latest_generation_task:
                data['latest_generation_task'] = latest_generation_task.to_dict()

        return data
    
    def __repr__(self):
        return f'<Project {self.id}: {self.status}>'
