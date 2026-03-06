import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class RefineMixin:

    def refine_outline(self, current_outline: List[Dict], user_requirement: str,
                      project_context=None,
                      previous_requirements: Optional[List[str]] = None,
                      language='zh',
                      render_mode: str = 'image') -> List[Dict]:
        from services.prompts.refine import get_outline_refinement_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        refinement_prompt = get_outline_refinement_prompt(
            current_outline=current_outline,
            user_requirement=user_requirement,
            project_context=project_context,
            previous_requirements=previous_requirements,
            language=language
        )
        outline = self.generate_json(refinement_prompt, thinking_budget=1000)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id if project_context else 'edu_dark')
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id if project_context else 'edu_dark')

    async def refine_outline_async(self, current_outline: List[Dict], user_requirement: str,
                                   project_context=None,
                                   previous_requirements: Optional[List[str]] = None,
                                   language='zh',
                                   render_mode: str = 'image') -> List[Dict]:
        from services.prompts.refine import get_outline_refinement_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        refinement_prompt = get_outline_refinement_prompt(
            current_outline=current_outline,
            user_requirement=user_requirement,
            project_context=project_context,
            previous_requirements=previous_requirements,
            language=language
        )
        outline = await self.generate_json_async(refinement_prompt, thinking_budget=1000)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id if project_context else 'edu_dark')
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id if project_context else 'edu_dark')

    def refine_descriptions(self, current_descriptions: List[Dict], user_requirement: str,
                           project_context=None,
                           outline: List[Dict] = None,
                           previous_requirements: Optional[List[str]] = None,
                           language='zh') -> List[str]:
        from services.prompts.refine import get_descriptions_refinement_prompt
        refinement_prompt = get_descriptions_refinement_prompt(
            current_descriptions=current_descriptions,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        descriptions = self.generate_json(refinement_prompt, thinking_budget=1000)

        if isinstance(descriptions, list):
            return [str(desc) for desc in descriptions]
        else:
            raise ValueError("Expected a list of page descriptions, but got: " + str(type(descriptions)))

    async def refine_descriptions_async(self, current_descriptions: List[Dict], user_requirement: str,
                                        project_context=None,
                                        outline: List[Dict] = None,
                                        previous_requirements: Optional[List[str]] = None,
                                        language='zh') -> List[str]:
        from services.prompts.refine import get_descriptions_refinement_prompt
        refinement_prompt = get_descriptions_refinement_prompt(
            current_descriptions=current_descriptions,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        descriptions = await self.generate_json_async(refinement_prompt, thinking_budget=1000)

        if isinstance(descriptions, list):
            return [str(desc) for desc in descriptions]
        raise ValueError("Expected a list of page descriptions, but got: " + str(type(descriptions)))

    def refine_html_models(self, current_html_models: List[Dict], user_requirement: str,
                          project_context=None,
                          outline: List[Dict] = None,
                          previous_requirements: Optional[List[str]] = None,
                          language='zh') -> List[Dict]:
        from services.prompts.refine import get_html_model_refinement_prompt
        refinement_prompt = get_html_model_refinement_prompt(
            current_html_models=current_html_models,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        html_models = self.generate_json(refinement_prompt, thinking_budget=1000)

        if isinstance(html_models, list):
            result = []
            for model in html_models:
                if isinstance(model, dict):
                    result.append(model)
                else:
                    raise ValueError(f"Expected dict in html_models list, but got: {type(model)}")
            return result
        else:
            raise ValueError("Expected a list of html_model dicts, but got: " + str(type(html_models)))

    async def refine_html_models_async(self, current_html_models: List[Dict], user_requirement: str,
                                       project_context=None,
                                       outline: List[Dict] = None,
                                       previous_requirements: Optional[List[str]] = None,
                                       language='zh') -> List[Dict]:
        from services.prompts.refine import get_html_model_refinement_prompt
        refinement_prompt = get_html_model_refinement_prompt(
            current_html_models=current_html_models,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        html_models = await self.generate_json_async(refinement_prompt, thinking_budget=1000)

        if isinstance(html_models, list):
            result = []
            for model in html_models:
                if isinstance(model, dict):
                    result.append(model)
                else:
                    raise ValueError(f"Expected dict in html_models list, but got: {type(model)}")
            return result
        raise ValueError("Expected a list of html_model dicts, but got: " + str(type(html_models)))
