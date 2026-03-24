"""智能生成PPT日志记录API路由

对应API文档: https://s.apifox.cn/d63bd320-d69f-493c-8363-ae3902d367ed/api-426070546
接口: POST /aiapi/Aippt/Add_znppt
格式: multipart/form-data
"""
import logging
from fastapi import APIRouter, Depends, Form, HTTPException
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from deps import get_db
from schemas.common import SuccessResponse
from schemas.smart_ppt_log import SmartPPTLogResponse
from services.smart_ppt_log_service import SmartPPTLogService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/aiapi/Aippt", tags=["smart-ppt-log"])


@router.post("/Add_znppt", response_model=SuccessResponse, status_code=201)
async def create_smart_ppt_log(
    db: AsyncSession = Depends(get_db),
    ppt_distinction: Optional[str] = Form(None, description="PPT类型2、智能PPT课件"),
    content: Optional[str] = Form(None, description="生成PPT说的内容"),
    start_time: Optional[str] = Form(None, description="开始生成时间"),
    end_time: Optional[str] = Form(None, description="结束生成时间"),
    result: Optional[str] = Form(None, description="生成的结果,文件地址"),
    user_id: Optional[str] = Form(None, description="用户id"),
    outline: Optional[str] = Form(None, description="大纲"),
    ppttype: Optional[str] = Form(None, description="PPT类型"),
    project_id: Optional[str] = Form(None, description="关联的项目ID（可选）"),
):
    """
    创建智能生成PPT日志记录

    对应API文档: https://s.apifox.cn/d63bd320-d69f-493c-8363-ae3902d367ed/api-426070546

    请求格式: multipart/form-data
    所有参数都是可选的

    Args:
        ppt_distinction: PPT类型，2表示智能PPT课件
        content: 生成PPT说的内容
        start_time: 开始生成时间（字符串格式，如: 2024-07-20 11:36:40）
        end_time: 结束生成时间（字符串格式，如: 2024-07-20 11:36:40）
        result: 生成的结果，文件地址
        user_id: 用户ID
        outline: 大纲
        ppttype: PPT类型
        project_id: 关联的项目ID（可选）

    Returns:
        创建的日志记录信息
    """
    try:
        log = await SmartPPTLogService.create_log(
            db,
            ppt_distinction=ppt_distinction,
            content=content,
            start_time=start_time,
            end_time=end_time,
            result=result,
            user_id=user_id,
            outline=outline,
            ppttype=ppttype,
            project_id=project_id,
        )

        logger.info(f"成功创建智能生成PPT日志记录: {log.id}, user_id: {user_id}")

        return SuccessResponse(
            data=log.to_dict(),
            message="智能生成PPT日志记录创建成功",
        )

    except Exception as e:
        logger.error(f"创建智能生成PPT日志记录失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"创建日志记录失败: {str(e)}")


@router.get("/logs", response_model=SuccessResponse)
async def get_smart_ppt_logs(
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    获取智能生成PPT日志记录列表

    Args:
        user_id: 用户ID（可选）
        project_id: 项目ID（可选）
        limit: 返回数量限制（默认50）
        offset: 偏移量（默认0）

    Returns:
        日志记录列表
    """
    try:
        if user_id:
            logs = await SmartPPTLogService.get_logs_by_user(
                db, user_id=user_id, limit=limit, offset=offset
            )
        elif project_id:
            logs = await SmartPPTLogService.get_logs_by_project(
                db, project_id=project_id, limit=limit, offset=offset
            )
        else:
            raise HTTPException(status_code=400, detail="必须提供user_id或project_id参数")

        return SuccessResponse(data={
            "logs": [log.to_dict() for log in logs],
            "count": len(logs),
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取智能生成PPT日志记录失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取日志记录失败: {str(e)}")


@router.get("/logs/{log_id}", response_model=SuccessResponse)
async def get_smart_ppt_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    根据ID获取智能生成PPT日志记录

    Args:
        log_id: 日志记录ID

    Returns:
        日志记录信息
    """
    try:
        log = await SmartPPTLogService.get_log(db, log_id)

        if not log:
            raise HTTPException(status_code=404, detail="日志记录不存在")

        return SuccessResponse(data=log.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取智能生成PPT日志记录失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取日志记录失败: {str(e)}")


@router.put("/logs/{log_id}", response_model=SuccessResponse)
async def update_smart_ppt_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
    ppt_distinction: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    start_time: Optional[str] = Form(None),
    end_time: Optional[str] = Form(None),
    result: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    outline: Optional[str] = Form(None),
    ppttype: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
):
    """
    更新智能生成PPT日志记录

    Args:
        log_id: 日志记录ID
        其他参数同创建接口，只更新提供的非None值

    Returns:
        更新后的日志记录信息
    """
    try:
        updated_log = await SmartPPTLogService.update_log(
            db,
            log_id=log_id,
            ppt_distinction=ppt_distinction,
            content=content,
            start_time=start_time,
            end_time=end_time,
            result=result,
            user_id=user_id,
            outline=outline,
            ppttype=ppttype,
            project_id=project_id,
        )

        if not updated_log:
            raise HTTPException(status_code=404, detail="日志记录不存在")

        return SuccessResponse(
            data=updated_log.to_dict(),
            message="智能生成PPT日志记录更新成功",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新智能生成PPT日志记录失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"更新日志记录失败: {str(e)}")


@router.delete("/logs/{log_id}", response_model=SuccessResponse)
async def delete_smart_ppt_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    删除智能生成PPT日志记录

    Args:
        log_id: 日志记录ID

    Returns:
        删除结果
    """
    try:
        success = await SmartPPTLogService.delete_log(db, log_id)

        if not success:
            raise HTTPException(status_code=404, detail="日志记录不存在")

        return SuccessResponse(message="智能生成PPT日志记录删除成功")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除智能生成PPT日志记录失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除日志记录失败: {str(e)}")
