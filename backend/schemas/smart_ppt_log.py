"""智能生成PPT日志记录相关的Pydantic schemas"""
from typing import Optional
from pydantic import BaseModel, Field


class CreateSmartPPTLogRequest(BaseModel):
    """创建智能生成PPT日志记录请求
    
    对应API文档: https://s.apifox.cn/d63bd320-d69f-493c-8363-ae3902d367ed/api-426070546
    接口: POST /aiapi/Aippt/Add_znppt
    格式: multipart/form-data
    """
    ppt_distinction: Optional[str] = Field(None, description="PPT类型2、智能PPT课件")
    content: Optional[str] = Field(None, description="生成PPT说的内容")
    start_time: Optional[str] = Field(None, description="开始生成时间，格式: 2024-07-20 11:36:40")
    end_time: Optional[str] = Field(None, description="结束生成时间，格式: 2024-07-20 11:36:40")
    result: Optional[str] = Field(None, description="生成的结果,文件地址")
    user_id: Optional[str] = Field(None, description="用户id")
    outline: Optional[str] = Field(None, description="大纲")
    ppttype: Optional[str] = Field(None, description="PPT类型")
    project_id: Optional[str] = Field(None, description="关联的项目ID（可选）")


class SmartPPTLogResponse(BaseModel):
    """智能生成PPT日志记录响应"""
    id: str
    ppt_distinction: Optional[str] = None
    content: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    result: Optional[str] = None
    user_id: Optional[str] = None
    outline: Optional[str] = None
    ppttype: Optional[str] = None
    project_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
