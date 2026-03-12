"""
智能生成PPT日志记录模型
用于记录智能生成PPT的相关信息，对应API: /aiapi/Aippt/Add_znppt
"""
import uuid
from datetime import datetime
from . import db, format_datetime_to_iso


class SmartPPTLog(db.Model):
    """
    智能生成PPT日志记录模型
    对应API文档: https://s.apifox.cn/d63bd320-d69f-493c-8363-ae3902d367ed/api-426070546
    """
    __tablename__ = 'smart_ppt_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # PPT类型，2表示智能PPT课件
    ppt_distinction = db.Column(db.String(50), nullable=True, comment='PPT类型2、智能PPT课件')
    
    # 生成PPT说的内容
    content = db.Column(db.Text, nullable=True, comment='生成PPT说的内容')
    
    # 开始生成时间
    start_time = db.Column(db.DateTime, nullable=True, comment='开始生成时间')
    
    # 结束生成时间
    end_time = db.Column(db.DateTime, nullable=True, comment='结束生成时间')
    
    # 生成的结果，文件地址
    result = db.Column(db.String(500), nullable=True, comment='生成的结果,文件地址')
    
    # 用户ID
    user_id = db.Column(db.String(100), nullable=True, index=True, comment='用户id')
    
    # 大纲
    outline = db.Column(db.Text, nullable=True, comment='大纲')
    
    # PPT类型
    ppttype = db.Column(db.String(50), nullable=True, comment='PPT类型')
    
    # 关联的项目ID（可选，用于关联到具体的项目）
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=True, comment='关联的项目ID')
    
    # 创建时间
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now, comment='创建时间')
    
    # 更新时间
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now, comment='更新时间')
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'id': self.id,
            'ppt_distinction': self.ppt_distinction,
            'content': self.content,
            'start_time': format_datetime_to_iso(self.start_time, add_utc_z=False) if self.start_time else None,
            'end_time': format_datetime_to_iso(self.end_time, add_utc_z=False) if self.end_time else None,
            'result': self.result,
            'user_id': self.user_id,
            'outline': self.outline,
            'ppttype': self.ppttype,
            'project_id': self.project_id,
            'created_at': format_datetime_to_iso(self.created_at, add_utc_z=False) if self.created_at else None,
            'updated_at': format_datetime_to_iso(self.updated_at, add_utc_z=False) if self.updated_at else None,
        }
    
    def __repr__(self):
        return f'<SmartPPTLog {self.id}: user_id={self.user_id}, content={self.content[:50] if self.content else None}...>'
