"""
智能生成PPT日志记录服务
用于记录智能生成PPT的相关信息，对应API: /aiapi/Aippt/Add_znppt
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from dateutil import parser
from models import db, SmartPPTLog

logger = logging.getLogger(__name__)


class SmartPPTLogService:
    """智能生成PPT日志记录服务"""
    
    @staticmethod
    def parse_datetime(dt_value: Any) -> Optional[datetime]:
        """
        解析时间字符串为datetime对象
        
        Args:
            dt_value: 时间字符串或datetime对象
            
        Returns:
            datetime对象，如果解析失败则返回None
        """
        if dt_value is None:
            return None
        
        if isinstance(dt_value, datetime):
            return dt_value
        
        if isinstance(dt_value, str):
            try:
                # 尝试解析常见的时间格式
                return parser.parse(dt_value)
            except (ValueError, TypeError) as e:
                logger.warning(f"无法解析时间字符串: {dt_value}, 错误: {e}")
                return None
        
        return None
    
    @staticmethod
    def create_log(
        ppt_distinction: Optional[str] = None,
        content: Optional[str] = None,
        start_time: Optional[Any] = None,
        end_time: Optional[Any] = None,
        result: Optional[str] = None,
        user_id: Optional[str] = None,
        outline: Optional[str] = None,
        ppttype: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> SmartPPTLog:
        """
        创建智能生成PPT日志记录
        
        Args:
            ppt_distinction: PPT类型，2表示智能PPT课件
            content: 生成PPT说的内容
            start_time: 开始生成时间（字符串或datetime对象）
            end_time: 结束生成时间（字符串或datetime对象）
            result: 生成的结果，文件地址
            user_id: 用户ID
            outline: 大纲
            ppttype: PPT类型
            project_id: 关联的项目ID（可选）
            
        Returns:
            SmartPPTLog对象
        """
        try:
            # 解析时间字段
            start_time_dt = SmartPPTLogService.parse_datetime(start_time)
            end_time_dt = SmartPPTLogService.parse_datetime(end_time)
            
            log = SmartPPTLog(
                ppt_distinction=ppt_distinction,
                content=content,
                start_time=start_time_dt,
                end_time=end_time_dt,
                result=result,
                user_id=user_id,
                outline=outline,
                ppttype=ppttype,
                project_id=project_id
            )
            
            db.session.add(log)
            db.session.commit()
            
            logger.info(f"成功创建智能生成PPT日志记录: {log.id}, user_id: {user_id}")
            return log
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"创建智能生成PPT日志记录失败: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    def update_log(
        log_id: str,
        ppt_distinction: Optional[str] = None,
        content: Optional[str] = None,
        start_time: Optional[Any] = None,
        end_time: Optional[Any] = None,
        result: Optional[str] = None,
        user_id: Optional[str] = None,
        outline: Optional[str] = None,
        ppttype: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> Optional[SmartPPTLog]:
        """
        更新智能生成PPT日志记录
        
        Args:
            log_id: 日志记录ID
            其他参数同create_log
            
        Returns:
            更新后的SmartPPTLog对象，如果不存在则返回None
        """
        try:
            log = SmartPPTLog.query.get(log_id)
            if not log:
                logger.warning(f"未找到日志记录: {log_id}")
                return None
            
            # 更新字段（只更新提供的非None值）
            if ppt_distinction is not None:
                log.ppt_distinction = ppt_distinction
            if content is not None:
                log.content = content
            if start_time is not None:
                log.start_time = SmartPPTLogService.parse_datetime(start_time)
            if end_time is not None:
                log.end_time = SmartPPTLogService.parse_datetime(end_time)
            if result is not None:
                log.result = result
            if user_id is not None:
                log.user_id = user_id
            if outline is not None:
                log.outline = outline
            if ppttype is not None:
                log.ppttype = ppttype
            if project_id is not None:
                log.project_id = project_id
            
            db.session.commit()
            
            logger.info(f"成功更新智能生成PPT日志记录: {log_id}")
            return log
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"更新智能生成PPT日志记录失败: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    def get_log(log_id: str) -> Optional[SmartPPTLog]:
        """
        根据ID获取日志记录
        
        Args:
            log_id: 日志记录ID
            
        Returns:
            SmartPPTLog对象，如果不存在则返回None
        """
        return SmartPPTLog.query.get(log_id)
    
    @staticmethod
    def get_logs_by_user(
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> list[SmartPPTLog]:
        """
        根据用户ID获取日志记录列表
        
        Args:
            user_id: 用户ID
            limit: 返回数量限制
            offset: 偏移量
            
        Returns:
            日志记录列表
        """
        return SmartPPTLog.query.filter_by(user_id=user_id)\
            .order_by(SmartPPTLog.created_at.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()
    
    @staticmethod
    def get_logs_by_project(
        project_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> list[SmartPPTLog]:
        """
        根据项目ID获取日志记录列表
        
        Args:
            project_id: 项目ID
            limit: 返回数量限制
            offset: 偏移量
            
        Returns:
            日志记录列表
        """
        return SmartPPTLog.query.filter_by(project_id=project_id)\
            .order_by(SmartPPTLog.created_at.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()
    
    @staticmethod
    def delete_log(log_id: str) -> bool:
        """
        删除日志记录
        
        Args:
            log_id: 日志记录ID
            
        Returns:
            是否删除成功
        """
        try:
            log = SmartPPTLog.query.get(log_id)
            if not log:
                logger.warning(f"未找到日志记录: {log_id}")
                return False
            
            db.session.delete(log)
            db.session.commit()
            
            logger.info(f"成功删除智能生成PPT日志记录: {log_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"删除智能生成PPT日志记录失败: {str(e)}", exc_info=True)
            raise
