import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class RefineResult:
    """AI 修改结果，包含摘要和实际数据"""
    def __init__(self, summary: str, data: any):
        self.summary = summary
        self.data = data

    def to_dict(self):
        return {
            "summary": self.summary,
            "data": self.data
        }


class RefineMixin:

    def refine_outline(self, current_outline: List[Dict], user_requirement: str,
                      project_context=None,
                      previous_requirements: Optional[List[str]] = None,
                      language='zh',
                      render_mode: str = 'image') -> RefineResult:
        from services.prompts.refine import get_outline_refinement_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        refinement_prompt = get_outline_refinement_prompt(
            current_outline=current_outline,
            user_requirement=user_requirement,
            project_context=project_context,
            previous_requirements=previous_requirements,
            language=language
        )
        result = self.generate_json(refinement_prompt, thinking_budget=1000)
        
        # 解析新的返回格式
        summary = "大纲已更新"
        outline_data = result
        
        if isinstance(result, dict):
            summary = result.get("summary", "大纲已更新")
            outline_data = result.get("outline", result)
        
        normalized = self.normalize_outline_layouts(outline_data, render_mode, project_context.scheme_id if project_context else 'edu_dark')
        final_outline = apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id if project_context else 'edu_dark')
        
        return RefineResult(summary, final_outline)

    async def refine_outline_async(self, current_outline: List[Dict], user_requirement: str,
                                   project_context=None,
                                   previous_requirements: Optional[List[str]] = None,
                                   language='zh',
                                   render_mode: str = 'image') -> RefineResult:
        from services.prompts.refine import get_outline_refinement_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        refinement_prompt = get_outline_refinement_prompt(
            current_outline=current_outline,
            user_requirement=user_requirement,
            project_context=project_context,
            previous_requirements=previous_requirements,
            language=language
        )
        result = await self.generate_json_async(refinement_prompt, thinking_budget=1000)
        
        # 解析新的返回格式
        summary = "大纲已更新"
        outline_data = result
        
        if isinstance(result, dict):
            summary = result.get("summary", "大纲已更新")
            outline_data = result.get("outline", result)
        
        normalized = self.normalize_outline_layouts(outline_data, render_mode, project_context.scheme_id if project_context else 'edu_dark')
        final_outline = apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id if project_context else 'edu_dark')
        
        return RefineResult(summary, final_outline)

    def refine_descriptions(self, current_descriptions: List[Dict], user_requirement: str,
                           project_context=None,
                           outline: List[Dict] = None,
                           previous_requirements: Optional[List[str]] = None,
                           language='zh') -> RefineResult:
        from services.prompts.refine import get_descriptions_refinement_prompt
        refinement_prompt = get_descriptions_refinement_prompt(
            current_descriptions=current_descriptions,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        result = self.generate_json(refinement_prompt, thinking_budget=1000)

        # 解析新的返回格式
        summary = "描述已更新"
        descriptions = []
        
        if isinstance(result, dict):
            summary = result.get("summary", "描述已更新")
            descriptions = result.get("descriptions", [])
        elif isinstance(result, list):
            # 兼容旧格式
            descriptions = [str(desc) for desc in result]
        else:
            raise ValueError("Expected a dict with summary and descriptions, but got: " + str(type(result)))

        if isinstance(descriptions, list):
            return RefineResult(summary, [str(desc) for desc in descriptions])
        else:
            raise ValueError("Expected descriptions to be a list, but got: " + str(type(descriptions)))

    async def refine_descriptions_async(self, current_descriptions: List[Dict], user_requirement: str,
                                        project_context=None,
                                        outline: List[Dict] = None,
                                        previous_requirements: Optional[List[str]] = None,
                                        language='zh') -> RefineResult:
        from services.prompts.refine import get_descriptions_refinement_prompt
        refinement_prompt = get_descriptions_refinement_prompt(
            current_descriptions=current_descriptions,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        result = await self.generate_json_async(refinement_prompt, thinking_budget=1000)

        # 解析新的返回格式
        summary = "描述已更新"
        descriptions = []
        
        if isinstance(result, dict):
            summary = result.get("summary", "描述已更新")
            descriptions = result.get("descriptions", [])
        elif isinstance(result, list):
            # 兼容旧格式
            descriptions = [str(desc) for desc in result]
        else:
            raise ValueError("Expected a dict with summary and descriptions, but got: " + str(type(result)))

        if isinstance(descriptions, list):
            return RefineResult(summary, [str(desc) for desc in descriptions])
        raise ValueError("Expected descriptions to be a list, but got: " + str(type(descriptions)))

    def refine_html_models(self, current_html_models: List[Dict], user_requirement: str,
                          project_context=None,
                          outline: List[Dict] = None,
                          previous_requirements: Optional[List[str]] = None,
                          language='zh') -> RefineResult:
        from services.prompts.refine import get_html_model_refinement_prompt
        refinement_prompt = get_html_model_refinement_prompt(
            current_html_models=current_html_models,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        result = self.generate_json(refinement_prompt, thinking_budget=1000)

        # 解析新的返回格式
        summary = "内容已更新"
        html_models = []
        
        if isinstance(result, dict):
            summary = result.get("summary", "内容已更新")
            html_models = result.get("html_models", [])
        elif isinstance(result, list):
            # 兼容旧格式
            html_models = result
        else:
            raise ValueError("Expected a dict with summary and html_models, but got: " + str(type(result)))

        if isinstance(html_models, list):
            validated_models = []
            for model in html_models:
                if isinstance(model, dict):
                    validated_models.append(model)
                else:
                    raise ValueError(f"Expected dict in html_models list, but got: {type(model)}")
            return RefineResult(summary, validated_models)
        else:
            raise ValueError("Expected html_models to be a list, but got: " + str(type(html_models)))

    async def refine_html_models_async(self, current_html_models: List[Dict], user_requirement: str,
                                       project_context=None,
                                       outline: List[Dict] = None,
                                       previous_requirements: Optional[List[str]] = None,
                                       language='zh') -> RefineResult:
        from services.prompts.refine import get_html_model_refinement_prompt
        refinement_prompt = get_html_model_refinement_prompt(
            current_html_models=current_html_models,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        result = await self.generate_json_async(refinement_prompt, thinking_budget=1000)

        # 解析新的返回格式
        summary = "内容已更新"
        html_models = []
        
        if isinstance(result, dict):
            summary = result.get("summary", "内容已更新")
            html_models = result.get("html_models", [])
        elif isinstance(result, list):
            # 兼容旧格式
            html_models = result
        else:
            raise ValueError("Expected a dict with summary and html_models, but got: " + str(type(result)))

        if isinstance(html_models, list):
            validated_models = []
            for model in html_models:
                if isinstance(model, dict):
                    validated_models.append(model)
                else:
                    raise ValueError(f"Expected dict in html_models list, but got: {type(model)}")
            return RefineResult(summary, validated_models)
        raise ValueError("Expected html_models to be a list, but got: " + str(type(html_models)))
