import logging
from typing import List, Dict
from textwrap import dedent

logger = logging.getLogger(__name__)


class DescriptionMixin:

    def generate_page_description(self, project_context, outline: List[Dict],
                                 page_outline: Dict, page_index: int, language='zh') -> str:
        from services.prompts.description import get_page_description_prompt
        part_info = f"\nThis page belongs to: {page_outline['part']}" if 'part' in page_outline else ""

        desc_prompt = get_page_description_prompt(
            project_context=project_context,
            outline=outline,
            page_outline=page_outline,
            page_index=page_index,
            part_info=part_info,
            language=language
        )

        response_text = self.text_provider.generate_text(desc_prompt, thinking_budget=1000)
        return dedent(response_text)

    async def generate_page_description_async(self, project_context, outline: List[Dict],
                                              page_outline: Dict, page_index: int, language='zh') -> str:
        from services.prompts.description import get_page_description_prompt
        part_info = f"\nThis page belongs to: {page_outline['part']}" if 'part' in page_outline else ""

        desc_prompt = get_page_description_prompt(
            project_context=project_context,
            outline=outline,
            page_outline=page_outline,
            page_index=page_index,
            part_info=part_info,
            language=language
        )

        response_text = await self.text_provider.generate_text_async(desc_prompt, thinking_budget=1000)
        return dedent(response_text)

    def generate_page_descriptions_batch(self,
                                         project_context,
                                         outline: List[Dict],
                                         batch_pages: List[Dict[str, Dict]],
                                         language='zh') -> Dict[int, str]:
        from services.prompts.description import get_page_descriptions_batch_prompt
        if not batch_pages:
            return {}

        prompt = get_page_descriptions_batch_prompt(
            project_context=project_context,
            outline=outline,
            batch_pages=batch_pages,
            language=language
        )
        result = self.generate_json(prompt, thinking_budget=1000)

        output: Dict[int, str] = {}
        if isinstance(result, list):
            for item in result:
                if not isinstance(item, dict):
                    continue
                page_index = item.get('page_index')
                description = item.get('description')
                try:
                    page_index_int = int(page_index)
                except Exception:
                    continue
                if isinstance(description, str) and description.strip():
                    output[page_index_int] = dedent(description)
        elif isinstance(result, dict):
            for k, v in result.items():
                try:
                    idx = int(k)
                except Exception:
                    continue
                if isinstance(v, str) and v.strip():
                    output[idx] = dedent(v)

        return output

    async def generate_page_descriptions_batch_async(self,
                                                     project_context,
                                                     outline: List[Dict],
                                                     batch_pages: List[Dict[str, Dict]],
                                                     language='zh') -> Dict[int, str]:
        from services.prompts.description import get_page_descriptions_batch_prompt
        if not batch_pages:
            return {}

        prompt = get_page_descriptions_batch_prompt(
            project_context=project_context,
            outline=outline,
            batch_pages=batch_pages,
            language=language
        )
        result = await self.generate_json_async(prompt, thinking_budget=1000)

        output: Dict[int, str] = {}
        if isinstance(result, list):
            for item in result:
                if not isinstance(item, dict):
                    continue
                page_index = item.get('page_index')
                description = item.get('description')
                try:
                    page_index_int = int(page_index)
                except Exception:
                    continue
                if isinstance(description, str) and description.strip():
                    output[page_index_int] = dedent(description)
        elif isinstance(result, dict):
            for k, v in result.items():
                try:
                    idx = int(k)
                except Exception:
                    continue
                if isinstance(v, str) and v.strip():
                    output[idx] = dedent(v)

        return output

    def generate_outline_text(self, outline: List[Dict]) -> str:
        text_parts = []
        for i, item in enumerate(outline, 1):
            if "part" in item and "pages" in item:
                text_parts.append(f"{i}. {item['part']}")
            else:
                text_parts.append(f"{i}. {item.get('title', 'Untitled')}")
        result = "\n".join(text_parts)
        return dedent(result)

    def parse_description_to_page_descriptions(self, project_context,
                                               outline: List[Dict],
                                               language='zh') -> List[str]:
        from services.prompts.description import get_description_split_prompt
        split_prompt = get_description_split_prompt(project_context, outline, language)
        descriptions = self.generate_json(split_prompt, thinking_budget=1000)

        if isinstance(descriptions, list):
            return [str(desc) for desc in descriptions]
        else:
            raise ValueError("Expected a list of page descriptions, but got: " + str(type(descriptions)))

    async def parse_description_to_page_descriptions_async(self, project_context,
                                                           outline: List[Dict],
                                                           language='zh') -> List[str]:
        from services.prompts.description import get_description_split_prompt
        split_prompt = get_description_split_prompt(project_context, outline, language)
        descriptions = await self.generate_json_async(split_prompt, thinking_budget=1000)

        if isinstance(descriptions, list):
            return [str(desc) for desc in descriptions]
        raise ValueError("Expected a list of page descriptions, but got: " + str(type(descriptions)))
