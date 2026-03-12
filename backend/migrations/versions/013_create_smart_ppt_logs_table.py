"""create smart_ppt_logs table

Revision ID: 013_create_smart_ppt_logs
Revises: 012_add_material_user_id
Create Date: 2025-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '013_create_smart_ppt_logs'
down_revision = '012_add_material_user_id'
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    """检查表是否存在"""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    """
    创建智能生成PPT日志记录表
    
    Idempotent: 如果表已存在则跳过
    """
    if _table_exists('smart_ppt_logs'):
        # 表已存在，跳过创建
        return
    
    op.create_table('smart_ppt_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('ppt_distinction', sa.String(length=50), nullable=True, comment='PPT类型2、智能PPT课件'),
        sa.Column('content', sa.Text(), nullable=True, comment='生成PPT说的内容'),
        sa.Column('start_time', sa.DateTime(), nullable=True, comment='开始生成时间'),
        sa.Column('end_time', sa.DateTime(), nullable=True, comment='结束生成时间'),
        sa.Column('result', sa.String(length=500), nullable=True, comment='生成的结果,文件地址'),
        sa.Column('user_id', sa.String(length=100), nullable=True, comment='用户id'),
        sa.Column('outline', sa.Text(), nullable=True, comment='大纲'),
        sa.Column('ppttype', sa.String(length=50), nullable=True, comment='PPT类型'),
        sa.Column('project_id', sa.String(length=36), nullable=True, comment='关联的项目ID'),
        sa.Column('created_at', sa.DateTime(), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(), nullable=False, comment='更新时间'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name='fk_smart_ppt_logs_project_id')
    )
    
    # 创建索引
    op.create_index('ix_smart_ppt_logs_user_id', 'smart_ppt_logs', ['user_id'], unique=False)
    op.create_index('ix_smart_ppt_logs_project_id', 'smart_ppt_logs', ['project_id'], unique=False)
    op.create_index('ix_smart_ppt_logs_created_at', 'smart_ppt_logs', ['created_at'], unique=False)


def downgrade() -> None:
    """
    删除智能生成PPT日志记录表
    """
    if _table_exists('smart_ppt_logs'):
        op.drop_index('ix_smart_ppt_logs_created_at', table_name='smart_ppt_logs')
        op.drop_index('ix_smart_ppt_logs_project_id', table_name='smart_ppt_logs')
        op.drop_index('ix_smart_ppt_logs_user_id', table_name='smart_ppt_logs')
        op.drop_table('smart_ppt_logs')
