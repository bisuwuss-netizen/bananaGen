import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class OutlineMixin:

    def generate_outline_blueprint(self, project_context, language: str = None, render_mode: str = 'image') -> List[Dict]:
        from services.prompts.outline import get_outline_blueprint_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard

        outline_prompt = get_outline_blueprint_prompt(
            project_context,
            language,
            render_mode,
            scheme_id=project_context.scheme_id,
        )
        outline = self.generate_json(outline_prompt, thinking_budget=700)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    async def generate_outline_blueprint_async(self, project_context, language: str = None, render_mode: str = 'image') -> List[Dict]:
        from services.prompts.outline import get_outline_blueprint_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard

        outline_prompt = get_outline_blueprint_prompt(
            project_context,
            language,
            render_mode,
            scheme_id=project_context.scheme_id,
        )
        outline = await self.generate_json_async(outline_prompt, thinking_budget=700)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    def expand_outline_page(
        self,
        project_context,
        page_outline: Dict[str, Any],
        full_outline: List[Dict[str, Any]],
        page_index: int,
        language: str = None,
        render_mode: str = 'image',
    ) -> Dict[str, Any]:
        from services.prompts.outline import get_outline_page_expansion_prompt

        prompt = get_outline_page_expansion_prompt(
            project_context=project_context,
            page_outline=page_outline,
            full_outline=full_outline,
            page_index=page_index,
            language=language,
            render_mode=render_mode,
            scheme_id=project_context.scheme_id,
        )
        result = self.generate_json(prompt, thinking_budget=420)
        if not isinstance(result, dict):
            return dict(page_outline or {})

        merged = dict(page_outline or {})
        merged.update(result)
        if merged.get("part") is None and page_outline.get("part"):
            merged["part"] = page_outline.get("part")
        return merged

    async def expand_outline_page_async(
        self,
        project_context,
        page_outline: Dict[str, Any],
        full_outline: List[Dict[str, Any]],
        page_index: int,
        language: str = None,
        render_mode: str = 'image',
    ) -> Dict[str, Any]:
        from services.prompts.outline import get_outline_page_expansion_prompt

        prompt = get_outline_page_expansion_prompt(
            project_context=project_context,
            page_outline=page_outline,
            full_outline=full_outline,
            page_index=page_index,
            language=language,
            render_mode=render_mode,
            scheme_id=project_context.scheme_id,
        )
        result = await self.generate_json_async(prompt, thinking_budget=420)
        if not isinstance(result, dict):
            return dict(page_outline or {})

        merged = dict(page_outline or {})
        merged.update(result)
        if merged.get("part") is None and page_outline.get("part"):
            merged["part"] = page_outline.get("part")
        return merged

    def generate_outline(self, project_context, language: str = None, render_mode: str = 'image') -> List[Dict]:
        from services.prompts.outline import get_outline_generation_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        outline_prompt = get_outline_generation_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = self.generate_json(outline_prompt, thinking_budget=1000)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    async def generate_outline_async(self, project_context, language: str = None, render_mode: str = 'image') -> List[Dict]:
        from services.prompts.outline import get_outline_generation_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        outline_prompt = get_outline_generation_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = await self.generate_json_async(outline_prompt, thinking_budget=1000)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    def parse_outline_text(self, project_context, language: str = None, render_mode: str = 'image') -> List[Dict]:
        from services.prompts.outline import get_outline_parsing_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        parse_prompt = get_outline_parsing_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = self.generate_json(parse_prompt, thinking_budget=1000)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    async def parse_outline_text_async(self, project_context, language: str = None, render_mode: str = 'image') -> List[Dict]:
        from services.prompts.outline import get_outline_parsing_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        parse_prompt = get_outline_parsing_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = await self.generate_json_async(parse_prompt, thinking_budget=1000)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    def enhance_outline(self, parsed_outline: List[Dict], project_context, language: str = None, render_mode: str = 'image') -> List[Dict]:
        """
        基于解析结果对大纲进行丰富和优化
        
        Args:
            parsed_outline: 解析后的初步大纲
            project_context: 项目上下文对象
            language: 输出语言代码
            render_mode: 渲染模式
        
        Returns:
            丰富和优化后的大纲
        """
        from services.prompts.outline import get_outline_enhancement_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        enhancement_prompt = get_outline_enhancement_prompt(
            parsed_outline, project_context, language, render_mode, scheme_id=project_context.scheme_id
        )
        outline = self.generate_json(enhancement_prompt, thinking_budget=1200)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    async def enhance_outline_async(self, parsed_outline: List[Dict], project_context, language: str = None, render_mode: str = 'image') -> List[Dict]:
        """
        基于解析结果对大纲进行丰富和优化（异步版本）
        
        Args:
            parsed_outline: 解析后的初步大纲
            project_context: 项目上下文对象
            language: 输出语言代码
            render_mode: 渲染模式
        
        Returns:
            丰富和优化后的大纲
        """
        from services.prompts.outline import get_outline_enhancement_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        enhancement_prompt = get_outline_enhancement_prompt(
            parsed_outline, project_context, language, render_mode, scheme_id=project_context.scheme_id
        )
        outline = await self.generate_json_async(enhancement_prompt, thinking_budget=1200)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    def flatten_outline(self, outline: List[Dict]) -> List[Dict]:
        pages: List[Dict] = []

        def append_page_candidate(candidate, part: str = None):
            if isinstance(candidate, dict):
                page = candidate.copy()
                if part:
                    page["part"] = part
                pages.append(page)
                return
            if isinstance(candidate, list):
                for sub in candidate:
                    append_page_candidate(sub, part=part)
                return
            logger.warning(f"Skip invalid outline page candidate type: {type(candidate).__name__}")

        for item in outline or []:
            if isinstance(item, dict) and "part" in item and isinstance(item.get("pages"), list):
                for page in item["pages"]:
                    append_page_candidate(page, part=item.get("part"))
            else:
                append_page_candidate(item)

        pages = self._ensure_page_ordering(pages)
        pages = self._populate_toc_points(pages)
        return pages

    def _populate_toc_points(self, pages: List[Dict]) -> List[Dict]:
        if not pages:
            return pages

        toc_idx = -1
        for i, page in enumerate(pages):
            if not isinstance(page, dict):
                continue
            layout_id = page.get('layout_id', '').lower()
            if 'toc' in layout_id:
                toc_idx = i
                break

        if toc_idx < 0:
            return pages

        section_titles = []
        for i, page in enumerate(pages):
            if i == toc_idx:
                continue
            if not isinstance(page, dict):
                continue
            layout_id = page.get('layout_id', '').lower()
            if 'section' in layout_id:
                title = page.get('title', '')
                if title:
                    section_titles.append(title)

        if not section_titles:
            for i, page in enumerate(pages):
                if i == toc_idx:
                    continue
                if not isinstance(page, dict):
                    continue
                layout_id = page.get('layout_id', '').lower()
                if 'cover' in layout_id or 'ending' in layout_id:
                    continue
                title = page.get('title', '')
                if title:
                    section_titles.append(title)

        pages[toc_idx]['points'] = section_titles
        return pages

    def _generate_toc_model(self, page_outline: Dict, full_outline: Dict, language: str = 'zh') -> Dict:
        pages_list = full_outline.get('pages', [])

        section_items = []
        index = 1
        for page in pages_list:
            layout_id = (page.get('layout_id', '') or '').lower()
            if 'section' in layout_id:
                title = page.get('title', '')
                if title:
                    section_items.append({'index': index, 'text': title})
                    index += 1

        if not section_items:
            index = 1
            for page in pages_list:
                layout_id = (page.get('layout_id', '') or '').lower()
                if 'cover' in layout_id or 'toc' in layout_id or 'ending' in layout_id:
                    continue
                title = page.get('title', '')
                if title:
                    section_items.append({'index': index, 'text': title})
                    index += 1

        toc_title = '目录' if language == 'zh' else ('目次' if language == 'ja' else 'Table of Contents')
        return {
            'title': page_outline.get('title', toc_title),
            'items': section_items
        }

    def _ensure_page_ordering(self, pages: List[Dict]) -> List[Dict]:
        if not pages:
            return pages

        cover_page = None
        cover_idx = -1
        toc_page = None
        toc_idx = -1
        ending_pages = []
        ending_indices = []

        for i, page in enumerate(pages):
            if not isinstance(page, dict):
                continue
            layout_id = page.get('layout_id', '').lower()
            if 'ending' in layout_id:
                ending_pages.append(page)
                ending_indices.append(i)
            elif 'cover' in layout_id and cover_page is None:
                cover_page = page
                cover_idx = i
            elif 'toc' in layout_id and toc_page is None:
                toc_page = page
                toc_idx = i

        if cover_page is None and toc_page is None and not ending_pages:
            return pages

        exclude_indices = set(ending_indices)
        if cover_idx >= 0:
            exclude_indices.add(cover_idx)
        if toc_idx >= 0:
            exclude_indices.add(toc_idx)

        middle_pages = [
            page for i, page in enumerate(pages)
            if i not in exclude_indices and isinstance(page, dict)
        ]

        def extract_part_number(page: Dict) -> int:
            part = page.get('part', '')
            if not part:
                return 999
            chinese_nums = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
                           '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
                           '十一': 11, '十二': 12}
            match = re.search(r'第([一二三四五六七八九十]+)部分', part)
            if match:
                chinese_num = match.group(1)
                return chinese_nums.get(chinese_num, 999)
            match = re.search(r'(?:Part\s*|第\s*)(\d+)', part, re.IGNORECASE)
            if match:
                return int(match.group(1))
            return 999

        middle_pages_with_idx = [(i, page) for i, page in enumerate(middle_pages)]
        middle_pages_with_idx.sort(key=lambda x: (extract_part_number(x[1]), x[0]))
        middle_pages = [page for _, page in middle_pages_with_idx]

        result = []
        if cover_page:
            result.append(cover_page)
        if toc_page:
            result.append(toc_page)
        result.extend(middle_pages)
        result.extend(ending_pages)
        return result

    def parse_description_to_outline(self, project_context, language='zh', render_mode: str = 'image') -> List[Dict]:
        from services.prompts.outline import get_description_to_outline_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        parse_prompt = get_description_to_outline_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = self.generate_json(parse_prompt, thinking_budget=1000)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)

    async def parse_description_to_outline_async(self, project_context, language='zh', render_mode: str = 'image') -> List[Dict]:
        from services.prompts.outline import get_description_to_outline_prompt
        from services.presentation.ppt_quality_guard import apply_outline_quality_guard
        parse_prompt = get_description_to_outline_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = await self.generate_json_async(parse_prompt, thinking_budget=1000)
        normalized = self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
        return apply_outline_quality_guard(normalized, render_mode=render_mode, scheme_id=project_context.scheme_id)
