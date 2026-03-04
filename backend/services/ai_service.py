"""
AI Service - handles all AI model interactions
Based on demo.py and gemini_genai.py
TODO: use structured output API
"""
import os
import json
import re
import logging
import requests
from typing import List, Dict, Optional, Union
from textwrap import dedent
from PIL import Image
from tenacity import retry, stop_after_attempt, retry_if_exception_type
from .prompts import (
    get_outline_generation_prompt,
    get_outline_parsing_prompt,
    get_page_description_prompt,
    get_image_generation_prompt,
    get_image_edit_prompt,
    get_description_to_outline_prompt,
    get_description_split_prompt,
    get_outline_refinement_prompt,
    get_descriptions_refinement_prompt,
    get_html_model_refinement_prompt,
    # HTML渲染器专用
    get_structured_outline_prompt,
    get_structured_page_content_prompt,
    LAYOUT_SCHEMAS,
    LAYOUT_SCHEMES,
    SCHEME_ROLE_LAYOUTS,
    LAYOUT_ID_ALIASES
)
from .ai_providers import get_text_provider, get_image_provider, TextProvider, ImageProvider
from config import get_config

logger = logging.getLogger(__name__)


class ProjectContext:
    """项目上下文数据类，统一管理 AI 需要的所有项目信息"""
    
    def __init__(self, project_or_dict, reference_files_content: Optional[List[Dict[str, str]]] = None):
        """
        Args:
            project_or_dict: 项目对象（Project model）或项目字典（project.to_dict()）
            reference_files_content: 参考文件内容列表
        """
        # 支持直接传入 Project 对象，避免 to_dict() 调用，提升性能
        if hasattr(project_or_dict, 'idea_prompt'):
            # 是 Project 对象
            self.idea_prompt = project_or_dict.idea_prompt
            self.outline_text = project_or_dict.outline_text
            self.description_text = project_or_dict.description_text
            self.creation_type = project_or_dict.creation_type or 'idea'
            self.scheme_id = getattr(project_or_dict, 'scheme_id', None) or 'tech_blue'
        else:
            # 是字典
            self.idea_prompt = project_or_dict.get('idea_prompt')
            self.outline_text = project_or_dict.get('outline_text')
            self.description_text = project_or_dict.get('description_text')
            self.creation_type = project_or_dict.get('creation_type', 'idea')
            self.scheme_id = project_or_dict.get('scheme_id') or 'tech_blue'
        
        self.reference_files_content = reference_files_content or []
    
    def to_dict(self) -> Dict:
        """转换为字典，方便传递"""
        return {
            'idea_prompt': self.idea_prompt,
            'outline_text': self.outline_text,
            'description_text': self.description_text,
            'creation_type': self.creation_type,
            'scheme_id': self.scheme_id,
            'reference_files_content': self.reference_files_content
        }


class AIService:
    """Service for AI model interactions using pluggable providers"""
    
    def __init__(self, text_provider: TextProvider = None, image_provider: ImageProvider = None):
        """
        Initialize AI service with providers
        
        Args:
            text_provider: Optional pre-configured TextProvider. If None, created from factory.
            image_provider: Optional pre-configured ImageProvider. If None, created from factory.
        """
        config = get_config()

        # 优先使用 Flask app.config（可由 Settings 覆盖），否则回退到 Config 默认值
        try:
            from flask import current_app, has_app_context
        except ImportError:
            current_app = None  # type: ignore
            has_app_context = lambda: False  # type: ignore

        if has_app_context() and current_app and hasattr(current_app, "config"):
            self.text_model = current_app.config.get("TEXT_MODEL", config.TEXT_MODEL)
            self.image_model = current_app.config.get("IMAGE_MODEL", config.IMAGE_MODEL)
        else:
            self.text_model = config.TEXT_MODEL
            self.image_model = config.IMAGE_MODEL
        
        # Use provided providers or create from factory based on AI_PROVIDER_FORMAT (from Flask config or env var)
        self.text_provider = text_provider or get_text_provider(model=self.text_model)
        self.image_provider = image_provider or get_image_provider(model=self.image_model)
    
    @staticmethod
    def extract_image_urls_from_markdown(text: str) -> List[str]:
        """
        从 markdown 文本中提取图片 URL
        
        Args:
            text: Markdown 文本，可能包含 ![](url) 格式的图片
            
        Returns:
            图片 URL 列表（包括 http/https URL 和 /files/ 开头的本地路径）
        """
        if not text:
            return []
        
        # 匹配 markdown 图片语法: ![](url) 或 ![alt](url)
        pattern = r'!\[.*?\]\((.*?)\)'
        matches = re.findall(pattern, text)
        
        # 过滤掉空字符串，支持 http/https URL 和 /files/ 开头的本地路径（包括 mineru、materials 等）
        urls = []
        for url in matches:
            url = url.strip()
            if url and (url.startswith('http://') or url.startswith('https://') or url.startswith('/files/')):
                urls.append(url)
        
        return urls
    
    @staticmethod
    def remove_markdown_images(text: str) -> str:
        """
        从文本中移除 Markdown 图片链接，只保留 alt text（描述文字）
        
        Args:
            text: 包含 Markdown 图片语法的文本
            
        Returns:
            移除图片链接后的文本，保留描述文字
        """
        if not text:
            return text
        
        # 将 ![描述文字](url) 替换为 描述文字
        # 如果没有描述文字（空的 alt text），则完全删除该图片链接
        def replace_image(match):
            alt_text = match.group(1).strip()
            # 如果有描述文字，保留它；否则删除整个链接
            return alt_text if alt_text else ''
        
        pattern = r'!\[(.*?)\]\([^\)]+\)'
        cleaned_text = re.sub(pattern, replace_image, text)
        
        # 清理可能产生的多余空行
        cleaned_text = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned_text)
        
        return cleaned_text
    
    @retry(
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((json.JSONDecodeError, ValueError, Exception)),
        reraise=True
    )
    def generate_json(self, prompt: str, thinking_budget: int = 1000) -> Union[Dict, List]:
        """
        生成并解析JSON，如果解析失败则重新生成
        
        Args:
            prompt: 生成提示词
            thinking_budget: 思考预算
            
        Returns:
            解析后的JSON对象（字典或列表）
            
        Raises:
            json.JSONDecodeError: JSON解析失败（重试3次后仍失败）
        """
        # 调用AI生成文本
        response_text = self.text_provider.generate_text(prompt, thinking_budget=thinking_budget)
        
        # 清理响应文本：移除markdown代码块标记和多余空白
        cleaned_text = response_text.strip().strip("```json").strip("```").strip()
        
        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON解析失败，将重新生成。原始文本: {cleaned_text[:200]}... 错误: {str(e)}")
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((json.JSONDecodeError, ValueError, Exception)),
        reraise=True
    )
    def generate_json_with_image(self, prompt: str, image_path: str, thinking_budget: int = 1000) -> Union[Dict, List]:
        """
        带图片输入的JSON生成，如果解析失败则重新生成（最多重试3次）
        
        Args:
            prompt: 生成提示词
            image_path: 图片文件路径
            thinking_budget: 思考预算
            
        Returns:
            解析后的JSON对象（字典或列表）
            
        Raises:
            json.JSONDecodeError: JSON解析失败（重试3次后仍失败）
            ValueError: text_provider 不支持图片输入
        """
        # 调用AI生成文本（带图片）
        if hasattr(self.text_provider, 'generate_with_image'):
            response_text = self.text_provider.generate_with_image(
                prompt=prompt,
                image_path=image_path,
                thinking_budget=thinking_budget
            )
        elif hasattr(self.text_provider, 'generate_text_with_images'):
            response_text = self.text_provider.generate_text_with_images(
                prompt=prompt,
                images=[image_path],
                thinking_budget=thinking_budget
            )
        else:
            raise ValueError("text_provider 不支持图片输入")
        
        # 清理响应文本：移除markdown代码块标记和多余空白
        cleaned_text = response_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        
        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON解析失败（带图片），将重新生成。原始文本: {cleaned_text[:200]}... 错误: {str(e)}")
            raise
    
    @staticmethod
    def _convert_mineru_path_to_local(mineru_path: str) -> Optional[str]:
        """
        将 /files/mineru/{extract_id}/{rel_path} 格式的路径转换为本地文件系统路径（支持前缀匹配）
        
        Args:
            mineru_path: MinerU URL 路径，格式为 /files/mineru/{extract_id}/{rel_path}
            
        Returns:
            本地文件系统路径，如果转换失败则返回 None
        """
        from utils.path_utils import find_mineru_file_with_prefix
        
        matched_path = find_mineru_file_with_prefix(mineru_path)
        return str(matched_path) if matched_path else None
    
    @staticmethod
    def download_image_from_url(url: str) -> Optional[Image.Image]:
        """
        从 URL 下载图片并返回 PIL Image 对象
        
        Args:
            url: 图片 URL
            
        Returns:
            PIL Image 对象，如果下载失败则返回 None
        """
        try:
            logger.debug(f"Downloading image from URL: {url}")
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # 从响应内容创建 PIL Image
            image = Image.open(response.raw)
            # 确保图片被加载
            image.load()
            logger.debug(f"Successfully downloaded image: {image.size}, {image.mode}")
            return image
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {str(e)}")
            return None
    
    def generate_outline(self, project_context: ProjectContext, language: str = None, render_mode: str = 'image') -> List[Dict]:
        """
        Generate PPT outline from idea prompt
        Based on demo.py gen_outline()

        Args:
            project_context: 项目上下文对象，包含所有原始信息
            language: 输出语言代码
            render_mode: 渲染模式 ('image' | 'html')，HTML模式会为每页生成layout_id

        Returns:
            List of outline items (may contain parts with pages or direct pages)
        """
        outline_prompt = get_outline_generation_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = self.generate_json(outline_prompt, thinking_budget=1000)
        return self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)

    def parse_outline_text(self, project_context: ProjectContext, language: str = None, render_mode: str = 'image') -> List[Dict]:
        """
        Parse user-provided outline text into structured outline format
        This method analyzes the text and splits it into pages without modifying the original text

        Args:
            project_context: 项目上下文对象，包含所有原始信息
            language: 输出语言代码
            render_mode: 渲染模式 ('image' | 'html')，HTML模式会为每页生成layout_id

        Returns:
            List of outline items (may contain parts with pages or direct pages)
        """
        parse_prompt = get_outline_parsing_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = self.generate_json(parse_prompt, thinking_budget=1000)
        return self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)
    
    def flatten_outline(self, outline: List[Dict]) -> List[Dict]:
        """
        Flatten outline structure to page list
        Based on demo.py flatten_outline()
        
        Also ensures proper page ordering:
        - cover page at the beginning
        - ending page at the very end
        - quote pages near the end (before ending)
        """
        pages = []
        for item in outline:
            if "part" in item and "pages" in item:
                # This is a part, expand its pages
                for page in item["pages"]:
                    page_with_part = page.copy()
                    page_with_part["part"] = item["part"]
                    pages.append(page_with_part)
            else:
                # This is a direct page
                pages.append(item)
        
        # Post-process: ensure proper page ordering
        pages = self._ensure_page_ordering(pages)
        
        # Post-process: populate TOC page points with actual page titles
        pages = self._populate_toc_points(pages)
        
        return pages
    
    def _populate_toc_points(self, pages: List[Dict]) -> List[Dict]:
        """
        Automatically populate TOC page's points with section titles only.
        Only lists section_title (chapter divider) pages to keep the TOC concise.
        Falls back to all content page titles if no section_title pages exist.
        """
        if not pages:
            return pages
        
        # Find TOC page
        toc_idx = -1
        for i, page in enumerate(pages):
            layout_id = page.get('layout_id', '').lower()
            if 'toc' in layout_id:
                toc_idx = i
                break
        
        if toc_idx < 0:
            return pages
        
        # First pass: collect only section_title pages (chapter dividers)
        section_titles = []
        for i, page in enumerate(pages):
            if i == toc_idx:
                continue
            layout_id = page.get('layout_id', '').lower()
            if 'section' in layout_id:
                title = page.get('title', '')
                if title:
                    section_titles.append(title)
        
        # Fallback: if no section_title pages, collect all content page titles
        if not section_titles:
            for i, page in enumerate(pages):
                if i == toc_idx:
                    continue
                layout_id = page.get('layout_id', '').lower()
                if 'cover' in layout_id or 'ending' in layout_id:
                    continue
                title = page.get('title', '')
                if title:
                    section_titles.append(title)
        
        # Update TOC page's points with section titles
        pages[toc_idx]['points'] = section_titles
        
        return pages
    
    def _generate_toc_model(self, page_outline: Dict, full_outline: Dict, language: str = 'zh') -> Dict:
        """
        Generate TOC page model directly from section titles.
        Only lists section_title (chapter divider) pages to keep the TOC concise.
        Falls back to all content page titles if no section_title pages exist.
        
        Args:
            page_outline: TOC page outline info
            full_outline: Complete PPT outline with all pages
            language: Output language
            
        Returns:
            TOC page model with items extracted from section titles
        """
        pages_list = full_outline.get('pages', [])
        
        # First pass: collect only section_title pages (chapter dividers)
        section_items = []
        index = 1
        for page in pages_list:
            layout_id = (page.get('layout_id', '') or '').lower()
            if 'section' in layout_id:
                title = page.get('title', '')
                if title:
                    section_items.append({
                        'index': index,
                        'text': title
                    })
                    index += 1
        
        # Fallback: if no section_title pages, collect all content page titles
        if not section_items:
            index = 1
            for page in pages_list:
                layout_id = (page.get('layout_id', '') or '').lower()
                if 'cover' in layout_id or 'toc' in layout_id or 'ending' in layout_id:
                    continue
                title = page.get('title', '')
                if title:
                    section_items.append({
                        'index': index,
                        'text': title
                    })
                    index += 1
        
        # Build TOC model
        toc_title = '目录' if language == 'zh' else ('目次' if language == 'ja' else 'Table of Contents')
        result = {
            'title': page_outline.get('title', toc_title),
            'items': section_items
        }
        
        return result
    
    def _ensure_page_ordering(self, pages: List[Dict]) -> List[Dict]:
        """
        Ensure proper page ordering while preserving the original part/section order:
        1. Cover page must be first
        2. TOC page should be second  
        3. Ending page must be last
        4. Content pages are sorted by part number if parts have numeric indicators
        
        This function moves cover/toc to front and ending to back,
        and optionally sorts content pages by part number.
        """
        import re
        
        if not pages:
            return pages
        
        # Find special pages and their original indices
        cover_page = None
        cover_idx = -1
        toc_page = None
        toc_idx = -1
        ending_pages = []
        ending_indices = []
        
        for i, page in enumerate(pages):
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
        
        # If no special pages found, return original
        if cover_page is None and toc_page is None and not ending_pages:
            return pages
        
        # Build indices to exclude (cover, toc, ending pages)
        exclude_indices = set(ending_indices)
        if cover_idx >= 0:
            exclude_indices.add(cover_idx)
        if toc_idx >= 0:
            exclude_indices.add(toc_idx)
        
        # Get middle pages (everything except cover, toc, ending)
        middle_pages = [page for i, page in enumerate(pages) if i not in exclude_indices]
        
        # Try to sort middle pages by part number
        # Extract part number from part name (e.g., "第一部分", "Part 1", "第二部分: xxx")
        def extract_part_number(page: Dict) -> int:
            part = page.get('part', '')
            if not part:
                return 999  # Pages without part go to the end of content
            
            # Match Chinese numbers: 一二三四五六七八九十
            chinese_nums = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, 
                           '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
                           '十一': 11, '十二': 12}
            
            # Try Chinese number pattern: 第X部分
            match = re.search(r'第([一二三四五六七八九十]+)部分', part)
            if match:
                chinese_num = match.group(1)
                return chinese_nums.get(chinese_num, 999)
            
            # Try Arabic number pattern: Part N, 第N部分
            match = re.search(r'(?:Part\s*|第\s*)(\d+)', part, re.IGNORECASE)
            if match:
                return int(match.group(1))
            
            return 999
        
        # Sort middle pages by part number, maintaining relative order within same part
        # Use stable sort to preserve original order for pages with same part number
        middle_pages_with_idx = [(i, page) for i, page in enumerate(middle_pages)]
        middle_pages_with_idx.sort(key=lambda x: (extract_part_number(x[1]), x[0]))
        middle_pages = [page for _, page in middle_pages_with_idx]
        
        # Rebuild the page list
        result = []
        
        # 1. Cover page first
        if cover_page:
            result.append(cover_page)
        
        # 2. TOC page second
        if toc_page:
            result.append(toc_page)
        
        # 3. Middle pages sorted by part number
        result.extend(middle_pages)
        
        # 4. Ending page(s) at the very end
        result.extend(ending_pages)
        
        return result
    
    def generate_page_description(self, project_context: ProjectContext, outline: List[Dict], 
                                 page_outline: Dict, page_index: int, language='zh') -> str:
        """
        Generate description for a single page
        Based on demo.py gen_desc() logic
        
        Args:
            project_context: 项目上下文对象，包含所有原始信息
            outline: Complete outline
            page_outline: Outline for this specific page
            page_index: Page number (1-indexed)
        
        Returns:
            Text description for the page
        """
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
    
    def generate_outline_text(self, outline: List[Dict]) -> str:
        """
        Convert outline to text format for prompts
        Based on demo.py gen_outline_text()
        """
        text_parts = []
        for i, item in enumerate(outline, 1):
            if "part" in item and "pages" in item:
                text_parts.append(f"{i}. {item['part']}")
            else:
                text_parts.append(f"{i}. {item.get('title', 'Untitled')}")
        result = "\n".join(text_parts)
        return dedent(result)
    
    def generate_image_prompt(self, outline: List[Dict], page: Dict, 
                            page_desc: str, page_index: int, 
                            has_material_images: bool = False,
                            extra_requirements: Optional[str] = None,
                            language='zh',
                            has_template: bool = True) -> str:
        """
        Generate image generation prompt for a page
        Based on demo.py gen_prompts()
        
        Args:
            outline: Complete outline
            page: Page outline data
            page_desc: Page description text
            page_index: Page number (1-indexed)
            has_material_images: 是否有素材图片（从项目描述中提取的图片）
            extra_requirements: Optional extra requirements to apply to all pages
            language: Output language
            has_template: 是否有模板图片（False表示无模板图模式）
        
        Returns:
            Image generation prompt
        """
        outline_text = self.generate_outline_text(outline)
        
        # Determine current section
        if 'part' in page:
            current_section = page['part']
        else:
            current_section = f"{page.get('title', 'Untitled')}"
        
        # 在传给文生图模型之前，移除 Markdown 图片链接
        # 图片本身已经通过 additional_ref_images 传递，只保留文字描述
        cleaned_page_desc = self.remove_markdown_images(page_desc)
        
        prompt = get_image_generation_prompt(
            page_desc=cleaned_page_desc,
            outline_text=outline_text,
            current_section=current_section,
            has_material_images=has_material_images,
            extra_requirements=extra_requirements,
            language=language,
            has_template=has_template,
            page_index=page_index
        )
        
        return prompt
    
    def generate_image(self, prompt: str, ref_image_path: Optional[str] = None, 
                      aspect_ratio: str = "16:9", resolution: str = "2K",
                      additional_ref_images: Optional[List[Union[str, Image.Image]]] = None) -> Optional[Image.Image]:
        """
        Generate image using configured image provider
        
        Args:
            prompt: Image generation prompt
            ref_image_path: Path to reference image (optional). If None, will generate based on prompt only.
            aspect_ratio: Image aspect ratio
            resolution: Image resolution (note: OpenAI format only supports 1K)
            additional_ref_images: 额外的参考图片列表，可以是本地路径、URL 或 PIL Image 对象
        
        Returns:
            PIL Image object or None if failed
        
        Raises:
            Exception with detailed error message if generation fails
        """
        try:
            logger.debug(f"Reference image: {ref_image_path}")
            if additional_ref_images:
                logger.debug(f"Additional reference images: {len(additional_ref_images)}")
            logger.debug(f"Config - aspect_ratio: {aspect_ratio}, resolution: {resolution}")

            # 构建参考图片列表
            ref_images = []
            
            # 添加主参考图片（如果提供了路径）
            if ref_image_path:
                if not os.path.exists(ref_image_path):
                    raise FileNotFoundError(f"Reference image not found: {ref_image_path}")
                main_ref_image = Image.open(ref_image_path)
                ref_images.append(main_ref_image)
            
            # 添加额外的参考图片
            if additional_ref_images:
                for ref_img in additional_ref_images:
                    if isinstance(ref_img, Image.Image):
                        # 已经是 PIL Image 对象
                        ref_images.append(ref_img)
                    elif isinstance(ref_img, str):
                        # 可能是本地路径或 URL
                        if os.path.exists(ref_img):
                            # 本地路径
                            ref_images.append(Image.open(ref_img))
                        elif ref_img.startswith('http://') or ref_img.startswith('https://'):
                            # URL，需要下载
                            downloaded_img = self.download_image_from_url(ref_img)
                            if downloaded_img:
                                ref_images.append(downloaded_img)
                            else:
                                logger.warning(f"Failed to download image from URL: {ref_img}, skipping...")
                        elif ref_img.startswith('/files/mineru/'):
                            # MinerU 本地文件路径，需要转换为文件系统路径（支持前缀匹配）
                            local_path = self._convert_mineru_path_to_local(ref_img)
                            if local_path and os.path.exists(local_path):
                                ref_images.append(Image.open(local_path))
                                logger.debug(f"Loaded MinerU image from local path: {local_path}")
                            else:
                                logger.warning(f"MinerU image file not found (with prefix matching): {ref_img}, skipping...")
                        else:
                            logger.warning(f"Invalid image reference: {ref_img}, skipping...")
            
            logger.debug(f"Calling image provider for generation with {len(ref_images)} reference images...")
            
            # 使用 image_provider 生成图片
            return self.image_provider.generate_image(
                prompt=prompt,
                ref_images=ref_images if ref_images else None,
                aspect_ratio=aspect_ratio,
                resolution=resolution
            )
            
        except Exception as e:
            error_detail = f"Error generating image: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e
    
    def edit_image(self, prompt: str, current_image_path: str,
                  aspect_ratio: str = "16:9", resolution: str = "2K",
                  original_description: str = None,
                  additional_ref_images: Optional[List[Union[str, Image.Image]]] = None) -> Optional[Image.Image]:
        """
        Edit existing image with natural language instruction
        Uses current image as reference
        
        Args:
            prompt: Edit instruction
            current_image_path: Path to current page image
            aspect_ratio: Image aspect ratio
            resolution: Image resolution
            original_description: Original page description to include in prompt
            additional_ref_images: 额外的参考图片列表，可以是本地路径、URL 或 PIL Image 对象
        
        Returns:
            PIL Image object or None if failed
        """
        # Build edit instruction with original description if available
        edit_instruction = get_image_edit_prompt(
            edit_instruction=prompt,
            original_description=original_description
        )
        return self.generate_image(edit_instruction, current_image_path, aspect_ratio, resolution, additional_ref_images)
    
    def parse_description_to_outline(self, project_context: ProjectContext, language='zh', render_mode: str = 'image') -> List[Dict]:
        """
        从描述文本解析出大纲结构

        Args:
            project_context: 项目上下文对象，包含所有原始信息
            language: 输出语言代码
            render_mode: 渲染模式 ('image' | 'html')，HTML模式会为每页生成layout_id

        Returns:
            List of outline items (may contain parts with pages or direct pages)
        """
        parse_prompt = get_description_to_outline_prompt(project_context, language, render_mode, scheme_id=project_context.scheme_id)
        outline = self.generate_json(parse_prompt, thinking_budget=1000)
        return self.normalize_outline_layouts(outline, render_mode, project_context.scheme_id)

    @staticmethod
    def normalize_outline_layouts(outline: List[Dict], render_mode: str = 'image', scheme_id: str = 'tech_blue') -> List[Dict]:
        """
        Normalize layout_id for HTML render mode:
        - Ensure layout_id exists and is valid
        - Enforce cover/toc/ending positions
        - Heuristic assignment for missing/invalid layout_id
        - Hard constraints: ensure all layouts appear at least once (when possible)
          and enforce ratio for key layouts: section_title:title_content:title_bullets:two_column = 5:2:4:2
        """
        if render_mode != 'html' or not outline:
            return outline

        scheme = LAYOUT_SCHEMES.get(scheme_id or 'tech_blue', LAYOUT_SCHEMES['tech_blue'])
        scheme_layouts = list(scheme.get('layouts', {}).keys())
        if not scheme_layouts:
            scheme_layouts = [
                'cover', 'toc', 'section_title', 'title_content', 'title_bullets',
                'two_column', 'process_steps', 'image_full', 'quote', 'ending'
            ]
        valid_layouts = set(scheme_layouts)
        scheme_roles = SCHEME_ROLE_LAYOUTS.get(scheme_id or 'tech_blue', SCHEME_ROLE_LAYOUTS['tech_blue'])
        cover_id = scheme_roles.get('cover', 'cover')
        toc_id = scheme_roles.get('toc', 'toc')
        ending_id = scheme_roles.get('ending', 'ending')
        is_tech_blue = (scheme_id or 'tech_blue') == 'tech_blue'

        ratio_layouts = ['section_title', 'title_content', 'title_bullets', 'two_column']
        special_layouts = ['process_steps', 'image_full', 'quote']

        def flatten_pages(outline_items: List[Dict]) -> List[Dict]:
            pages = []
            for item in outline_items:
                if isinstance(item, dict) and "part" in item and "pages" in item:
                    for page in item.get("pages", []):
                        pages.append(page)
                else:
                    pages.append(item)
            return pages

        def keyword_in(text: str, keywords: List[str]) -> bool:
            return any(k in text for k in keywords)

        def is_resource_page(text: str) -> bool:
            return keyword_in(text, ["学习资源", "资源推荐", "参考资料", "工具推荐", "学习路径", "课程推荐", "拓展阅读", "延伸阅读"])

        def build_meta(page: Dict) -> Dict:
            title = (page.get('title') or '').strip()
            points = page.get('points') or []
            points_text = " ".join([str(p) for p in points]).lower()
            full_text = f"{title.lower()} {points_text}"
            return {
                'title': title,
                'points_len': len(points) if isinstance(points, list) else 0,
                'full_text': full_text
            }

        def layout_affinity(layout: str, meta: Dict) -> int:
            text = meta['full_text']
            points_len = meta['points_len']
            if layout == 'process_steps':
                return 3 if keyword_in(text, ["流程", "步骤", "阶段", "过程", "方法", "路径", "实施", "执行", "操作"]) else (2 if points_len >= 4 else 1)
            if layout == 'two_column':
                return 3 if keyword_in(text, ["对比", "比较", "差异", "优缺点", "优势", "劣势", "正反", "左右", "双栏"]) else (2 if 2 <= points_len <= 4 else 1)
            if layout == 'quote':
                return 3 if keyword_in(text, ["引用", "名言", "金句", "观点", "语录", "摘录"]) else 1
            if layout == 'image_full':
                return 3 if keyword_in(text, ["案例", "示例", "图", "图片", "示意", "效果", "演示", "截图", "全景", "作品", "海报"]) else (2 if points_len <= 2 else 1)
            if layout == 'section_title':
                return 3 if points_len == 0 else (2 if points_len == 1 else 1)
            if layout == 'title_content':
                return 3 if points_len <= 2 else (2 if points_len == 3 else 1)
            if layout == 'title_bullets':
                return 3 if points_len >= 4 else (2 if points_len >= 3 else 1)
            return 1

        pages = flatten_pages(outline)
        if not pages:
            return outline

        total = len(pages)
        for idx, page in enumerate(pages):
            if not isinstance(page, dict):
                continue

            # Reserved positions
            if idx == 0:
                page['layout_id'] = cover_id
                continue
            if idx == 1 and total >= 2:
                page['layout_id'] = toc_id
                continue
            if idx == total - 1 and total >= 2:
                page['layout_id'] = ending_id
                continue

            title = (page.get('title') or '').strip()
            points = page.get('points') or []
            points_text = " ".join([str(p) for p in points]).lower()
            full_text = f"{title.lower()} {points_text}"

            # Resource pages: force bullets + no image
            if is_resource_page(full_text):
                if is_tech_blue:
                    page['layout_id'] = 'title_bullets'
                else:
                    candidates = [lid for lid in scheme_layouts
                                  if lid not in {cover_id, toc_id, ending_id}
                                  and LAYOUT_ID_ALIASES.get(lid, lid) == 'title_bullets']
                    if candidates:
                        page['layout_id'] = candidates[0]
                page['has_image'] = False
                page['keywords'] = []

            current_layout = page.get('layout_id')
            if current_layout in valid_layouts and current_layout not in {cover_id, toc_id, ending_id}:
                continue

            title_lower = title.lower()

            # Heuristics for layout selection (base categories)
            if is_resource_page(full_text):
                base_layout = 'title_bullets'
            if keyword_in(full_text, ["流程", "步骤", "阶段", "过程", "方法", "路径", "实施", "执行", "操作"]):
                base_layout = 'process_steps'
            elif keyword_in(full_text, ["对比", "比较", "差异", "优缺点", "优势", "劣势", "正反", "左右", "双栏"]):
                base_layout = 'two_column'
            elif keyword_in(full_text, ["引用", "名言", "金句", "观点", "语录", "摘录"]):
                base_layout = 'quote'
            elif keyword_in(full_text, ["案例", "示例", "图", "图片", "示意", "效果", "演示", "截图", "全景", "作品", "海报"]):
                base_layout = 'image_full'
            else:
                if isinstance(points, list) and len(points) == 0:
                    base_layout = 'section_title'
                elif isinstance(points, list) and len(points) <= 2:
                    base_layout = 'title_content'
                else:
                    base_layout = 'title_bullets'

            if is_tech_blue:
                layout = base_layout
            else:
                # choose a scheme-specific layout that matches base category
                candidates = [lid for lid in scheme_layouts
                              if lid not in {cover_id, toc_id, ending_id}
                              and LAYOUT_ID_ALIASES.get(lid, lid) == base_layout]
                if not candidates:
                    candidates = [lid for lid in scheme_layouts if lid not in {cover_id, toc_id, ending_id}]
                layout = candidates[idx % len(candidates)] if candidates else cover_id

            page['layout_id'] = layout if layout in valid_layouts else (scheme_layouts[0] if scheme_layouts else 'title_bullets')
            if is_resource_page(full_text):
                page['has_image'] = False
                page['keywords'] = []

        # After initial assignment, ensure section_title gaps and semantic insert pages
        content_bases = ['title_content', 'title_bullets', 'two_column', 'process_steps']
        content_layout_map = {base: [] for base in content_bases}
        for lid in scheme_layouts:
            base = LAYOUT_ID_ALIASES.get(lid, lid)
            if base in content_layout_map:
                content_layout_map[base].append(lid)

        def pick_layout(base: str, seed: int) -> str:
            candidates = content_layout_map.get(base) or []
            if not candidates:
                return base
            return candidates[seed % len(candidates)]

        def normalize_section_title(title: str) -> str:
            if not title:
                return "本章内容"
            # remove leading "第 X 部分" patterns
            import re
            cleaned = re.sub(r"^第\\s*[0-9一二三四五六七八九十]+\\s*部分[:：\\-\\s]*", "", title)
            cleaned = cleaned.strip()
            return cleaned or title

        def build_points(topic: str) -> List[str]:
            return [
                f"{topic}的定义与范围",
                f"{topic}的核心特征与价值",
                f"{topic}的应用场景与注意事项"
            ]

        def make_insert_pages(section_title: str, count: int, seed: int) -> List[Dict]:
            topic = normalize_section_title(section_title)
            suffixes = ["概念解析", "关键要点", "应用示例", "常见误区"]
            inserts: List[Dict] = []
            for i in range(count):
                base = content_bases[(seed + i) % len(content_bases)]
                title = f"{topic}：{suffixes[(seed + i) % len(suffixes)]}"
                inserts.append({
                    'title': title,
                    'points': build_points(topic),
                    'layout_id': pick_layout(base, seed + i),
                    'has_image': False,
                    'keywords': []
                })
            return inserts

        def enforce_section_gaps(pages_list: List[Dict]) -> List[Dict]:
            new_pages: List[Dict] = []
            total_pages = len(pages_list)
            for idx, page in enumerate(pages_list):
                new_pages.append(page)
                if not isinstance(page, dict):
                    continue
                base = LAYOUT_ID_ALIASES.get(page.get('layout_id'), page.get('layout_id'))
                if base != 'section_title':
                    continue

                # Count non-section pages until next section_title or end
                j = idx + 1
                run_len = 0
                while j < total_pages:
                    next_page = pages_list[j]
                    if not isinstance(next_page, dict):
                        j += 1
                        continue
                    next_base = LAYOUT_ID_ALIASES.get(next_page.get('layout_id'), next_page.get('layout_id'))
                    if next_base == 'section_title':
                        break
                    run_len += 1
                    j += 1

                missing = 2 - run_len
                if missing > 0:
                    new_pages.extend(make_insert_pages(page.get('title', '本章内容'), missing, idx))

            return new_pages

        def assign_section_numbers(pages_list: List[Dict]) -> None:
            section_index = 0
            for page in pages_list:
                if not isinstance(page, dict):
                    continue
                base = LAYOUT_ID_ALIASES.get(page.get('layout_id'), page.get('layout_id'))
                if base == 'section_title':
                    section_index += 1
                    page['section_number'] = f"{section_index:02d}"

        def enforce_reserved_positions(pages_list: List[Dict]) -> None:
            if not pages_list:
                return
            if len(pages_list) >= 1:
                pages_list[0]['layout_id'] = cover_id
            if len(pages_list) >= 2:
                pages_list[1]['layout_id'] = toc_id
            if len(pages_list) >= 2:
                pages_list[-1]['layout_id'] = ending_id

        # Apply section gap enforcement to outline structure
        if any(isinstance(item, dict) and "pages" in item for item in outline):
            for item in outline:
                if isinstance(item, dict) and "pages" in item:
                    item["pages"] = enforce_section_gaps(item.get("pages", []))
            pages = flatten_pages(outline)
        else:
            outline[:] = enforce_section_gaps(outline)
            pages = outline

        enforce_reserved_positions(pages)
        assign_section_numbers(pages)

        total = len(pages)

        def build_section_follow_indices(pages_list: List[Dict]) -> set:
            protected = set()
            for i, p in enumerate(pages_list):
                if not isinstance(p, dict):
                    continue
                base = LAYOUT_ID_ALIASES.get(p.get('layout_id'), p.get('layout_id'))
                if base == 'section_title':
                    if i + 1 < len(pages_list):
                        protected.add(i + 1)
                    if i + 2 < len(pages_list):
                        protected.add(i + 2)
            return protected

        section_follow_indices = build_section_follow_indices(pages)

        # ===== Hard constraints =====
        if total < 4:
            return outline

        # Ensure all layouts appear at least once when possible
        current_counts = {}
        for page in pages:
            if not isinstance(page, dict):
                continue
            lid = page.get('layout_id')
            if lid in valid_layouts:
                current_counts[lid] = current_counts.get(lid, 0) + 1

        reserved_indices = {0, 1, total - 1} if total >= 3 else {0}
        candidate_indices = [i for i in range(total) if i not in reserved_indices]

        kept_special_indices = set()
        if is_tech_blue:
            # Keep at most 1 for special layouts; extras go back to pool
            for layout in special_layouts:
                indices = [i for i in candidate_indices if pages[i].get('layout_id') == layout]
                if not indices:
                    continue
                # Keep the best affinity page for this layout
                best_index = max(indices, key=lambda idx: layout_affinity(layout, build_meta(pages[idx])))
                kept_special_indices.add(best_index)

            # Assign missing layouts (when total allows)
            if total >= 10:
                missing = [l for l in valid_layouts if current_counts.get(l, 0) == 0]
            else:
                missing = [l for l in valid_layouts if current_counts.get(l, 0) == 0 and l in ratio_layouts]

            locked_indices = set(reserved_indices) | kept_special_indices

            def pick_candidate(target_layout: str) -> Optional[int]:
                available = [i for i in candidate_indices if i not in locked_indices]
                if target_layout == 'section_title':
                    available = [i for i in available if i not in section_follow_indices]
                if not available:
                    return None
                return max(available, key=lambda idx: layout_affinity(target_layout, build_meta(pages[idx])))

            for layout in missing:
                if layout in {'cover', 'toc', 'ending'}:
                    continue
                idx = pick_candidate(layout)
                if idx is None:
                    continue
                pages[idx]['layout_id'] = layout
                locked_indices.add(idx)

            # Recompute counts after missing assignments
            current_counts = {}
            for page in pages:
                if not isinstance(page, dict):
                    continue
                lid = page.get('layout_id')
                if lid in valid_layouts:
                    current_counts[lid] = current_counts.get(lid, 0) + 1

            # Enforce ratio on key layouts within pool
            # Pool excludes reserved and kept special layouts
            pool_indices = [i for i in candidate_indices if i not in kept_special_indices]
            if pool_indices:
                pool_size = len(pool_indices)
                weights = {'section_title': 5, 'title_content': 2, 'title_bullets': 4, 'two_column': 2}

                # Initial targets based on ratio
                raw_targets = {k: pool_size * v / 13 for k, v in weights.items()}
                targets = {k: int(raw_targets[k]) for k in weights}
                total_base = sum(targets.values())

                # Ensure at least 1 of each when possible
                if pool_size >= 4:
                    for k in targets:
                        if targets[k] == 0:
                            targets[k] = 1
                            total_base += 1

                # Distribute remaining
                remainder = pool_size - total_base
                if remainder > 0:
                    fractions = sorted(
                        [(raw_targets[k] - int(raw_targets[k]), k) for k in weights],
                        reverse=True
                    )
                    idx = 0
                    while remainder > 0:
                        k = fractions[idx % len(fractions)][1]
                        targets[k] += 1
                        remainder -= 1
                        idx += 1
                elif remainder < 0:
                    # Remove from largest targets while respecting min 1 when pool_size >= 4
                    while remainder < 0:
                        k = max(targets, key=lambda key: targets[key])
                        if pool_size >= 4 and targets[k] <= 1:
                            # find another
                            candidates = [x for x in targets if targets[x] > 1]
                            if not candidates:
                                break
                            k = max(candidates, key=lambda key: targets[key])
                        targets[k] -= 1
                        remainder += 1

                # Assign layouts to pool based on affinity
                unassigned = set(pool_indices)
                assigned = {}
                for layout in ratio_layouts:
                    if targets[layout] <= 0:
                        continue
                    candidates = list(unassigned)
                    if layout == 'section_title':
                        candidates = [i for i in candidates if i not in section_follow_indices]
                    candidates.sort(
                        key=lambda idx: layout_affinity(layout, build_meta(pages[idx])),
                        reverse=True
                    )
                    chosen = candidates[:targets[layout]]
                    for idx in chosen:
                        assigned[idx] = layout
                        if idx in unassigned:
                            unassigned.remove(idx)

                # Any remaining unassigned: fill by highest need
                if unassigned:
                    # Compute remaining needs
                    remaining_needs = {k: targets[k] - list(assigned.values()).count(k) for k in ratio_layouts}
                    for idx in list(unassigned):
                        # pick layout with highest remaining need
                        layout = max(remaining_needs, key=lambda k: remaining_needs[k])
                        assigned[idx] = layout
                        remaining_needs[layout] -= 1
                        if remaining_needs[layout] < 0:
                            remaining_needs[layout] = 0

                for idx, layout in assigned.items():
                    pages[idx]['layout_id'] = layout

            # Reduce consecutive duplicates for key content layouts
            for i in range(2, total - 1):
                current = pages[i].get('layout_id')
                prev = pages[i - 1].get('layout_id')
                if current == prev and current in {'title_bullets', 'two_column'}:
                    alternatives = [l for l in ratio_layouts + special_layouts
                                    if l != current and l in valid_layouts]
                    if alternatives:
                        # pick the least used alternative
                        alt = min(alternatives, key=lambda l: current_counts.get(l, 0))
                        pages[i]['layout_id'] = alt
                        current_counts[current] = max(0, current_counts.get(current, 0) - 1)
                        current_counts[alt] = current_counts.get(alt, 0) + 1
        else:
            # Non-tech schemes: ensure every layout appears at least once when possible
            if total >= len(scheme_layouts):
                missing = [l for l in scheme_layouts if current_counts.get(l, 0) == 0]
                if missing:
                    duplicates = [i for i in candidate_indices if current_counts.get(pages[i].get('layout_id'), 0) > 1]
                    for layout in missing:
                        if not duplicates:
                            break
                        idx = duplicates.pop(0)
                        current_layout = pages[idx].get('layout_id')
                        if current_layout in current_counts:
                            current_counts[current_layout] = max(0, current_counts[current_layout] - 1)
                        pages[idx]['layout_id'] = layout
                        current_counts[layout] = current_counts.get(layout, 0) + 1

        # Final pass: eliminate consecutive section_title
        for i in range(1, total):
            prev_base = LAYOUT_ID_ALIASES.get(pages[i - 1].get('layout_id'), pages[i - 1].get('layout_id'))
            curr_base = LAYOUT_ID_ALIASES.get(pages[i].get('layout_id'), pages[i].get('layout_id'))
            if prev_base == 'section_title' and curr_base == 'section_title':
                # Replace current with a content layout
                base = content_bases[i % len(content_bases)]
                pages[i]['layout_id'] = pick_layout(base, i)

        # Re-assign section numbers to keep sequence consistent
        assign_section_numbers(pages)

        # Log layout distribution for observability
        final_counts = {}
        for page in pages:
            if not isinstance(page, dict):
                continue
            lid = page.get('layout_id')
            if lid in valid_layouts:
                final_counts[lid] = final_counts.get(lid, 0) + 1
        try:
            if is_tech_blue:
                ordered = {k: final_counts.get(k, 0) for k in [
                    'cover', 'toc', 'section_title', 'title_content', 'title_bullets',
                    'two_column', 'process_steps', 'image_full', 'quote', 'ending'
                ]}
                logger.info(f"[layout_distribution] scheme={scheme_id} total={total} {ordered}")
            else:
                logger.info(f"[layout_distribution] scheme={scheme_id} total={total} {final_counts}")
        except Exception:
            logger.info(f"[layout_distribution] scheme={scheme_id} total={total} {final_counts}")

        return outline
    
    def parse_description_to_page_descriptions(self, project_context: ProjectContext, 
                                               outline: List[Dict],
                                               language='zh') -> List[str]:
        """
        从描述文本切分出每页描述
        
        Args:
            project_context: 项目上下文对象，包含所有原始信息
            outline: 已解析出的大纲结构
        
        Returns:
            List of page descriptions (strings), one for each page in the outline
        """
        split_prompt = get_description_split_prompt(project_context, outline, language)
        descriptions = self.generate_json(split_prompt, thinking_budget=1000)
        
        # 确保返回的是字符串列表
        if isinstance(descriptions, list):
            return [str(desc) for desc in descriptions]
        else:
            raise ValueError("Expected a list of page descriptions, but got: " + str(type(descriptions)))
    
    def refine_outline(self, current_outline: List[Dict], user_requirement: str,
                      project_context: ProjectContext,
                      previous_requirements: Optional[List[str]] = None,
                      language='zh') -> List[Dict]:
        """
        根据用户要求修改已有大纲
        
        Args:
            current_outline: 当前的大纲结构
            user_requirement: 用户的新要求
            project_context: 项目上下文对象，包含所有原始信息
            previous_requirements: 之前的修改要求列表（可选）
        
        Returns:
            修改后的大纲结构
        """
        refinement_prompt = get_outline_refinement_prompt(
            current_outline=current_outline,
            user_requirement=user_requirement,
            project_context=project_context,
            previous_requirements=previous_requirements,
            language=language
        )
        outline = self.generate_json(refinement_prompt, thinking_budget=1000)
        return outline
    
    def refine_descriptions(self, current_descriptions: List[Dict], user_requirement: str,
                           project_context: ProjectContext,
                           outline: List[Dict] = None,
                           previous_requirements: Optional[List[str]] = None,
                           language='zh') -> List[str]:
        """
        根据用户要求修改已有页面描述
        
        Args:
            current_descriptions: 当前的页面描述列表，每个元素包含 {index, title, description_content}
            user_requirement: 用户的新要求
            project_context: 项目上下文对象，包含所有原始信息
            outline: 完整的大纲结构（可选）
            previous_requirements: 之前的修改要求列表（可选）
        
        Returns:
            修改后的页面描述列表（字符串列表）
        """
        refinement_prompt = get_descriptions_refinement_prompt(
            current_descriptions=current_descriptions,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        descriptions = self.generate_json(refinement_prompt, thinking_budget=1000)

        # 确保返回的是字符串列表
        if isinstance(descriptions, list):
            return [str(desc) for desc in descriptions]
        else:
            raise ValueError("Expected a list of page descriptions, but got: " + str(type(descriptions)))

    def refine_html_models(self, current_html_models: List[Dict], user_requirement: str,
                          project_context: ProjectContext,
                          outline: List[Dict] = None,
                          previous_requirements: Optional[List[str]] = None,
                          language='zh') -> List[Dict]:
        """
        根据用户要求修改已有页面的结构化内容 (html_model)
        
        Args:
            current_html_models: 当前的页面结构化内容列表，每个元素包含 {index, title, layout_id, html_model}
            user_requirement: 用户的新要求
            project_context: 项目上下文对象，包含所有原始信息
            outline: 完整的大纲结构（可选）
            previous_requirements: 之前的修改要求列表（可选）
        
        Returns:
            修改后的 html_model 列表（Dict 列表）
        """
        refinement_prompt = get_html_model_refinement_prompt(
            current_html_models=current_html_models,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        html_models = self.generate_json(refinement_prompt, thinking_budget=1000)

        # 确保返回的是 dict 列表
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

    # ==================== HTML渲染器专用方法 ====================

    def _fix_empty_sections(self, outline: Dict, scheme_id: str = 'tech_blue') -> Dict:
        """
        修复空章节问题：检测连续的 section_title 并插入内容页

        Args:
            outline: 大纲数据
            scheme_id: 方案ID

        Returns:
            修复后的大纲数据
        """
        if 'pages' not in outline or len(outline['pages']) < 2:
            return outline

        pages = outline['pages']
        role = SCHEME_ROLE_LAYOUTS.get(scheme_id, SCHEME_ROLE_LAYOUTS['tech_blue'])
        ending_id = role.get('ending', 'ending')

        # 内容布局优先级（用于填充空章节）
        content_layouts = ['title_content', 'title_bullets', 'two_column', 'process_steps']

        fixed_pages = []
        i = 0

        while i < len(pages):
            current_page = pages[i]
            current_layout = current_page.get('layout_id', '')

            fixed_pages.append(current_page)

            # 检测需要修复的情况
            needs_fix = False

            # 情况1：当前是 section_title，下一页也是 section_title
            if current_layout == 'section_title' and i + 1 < len(pages):
                next_layout = pages[i + 1].get('layout_id', '')
                if next_layout == 'section_title':
                    needs_fix = True
                    logger.warning(f"检测到连续 section_title（第{i+1}页和第{i+2}页），插入内容页")

            # 情况2：当前是 section_title，下一页是 ending
            if current_layout == 'section_title' and i + 1 < len(pages):
                next_layout = pages[i + 1].get('layout_id', '')
                if next_layout == ending_id:
                    needs_fix = True
                    logger.warning(f"检测到 section_title 直接跟 ending（第{i+1}页），插入内容页")

            # 如果需要修复，插入2-3页内容页
            if needs_fix:
                section_title = current_page.get('title', '章节')
                num_pages_to_insert = 2  # 插入2页内容

                for j in range(num_pages_to_insert):
                    # 选择布局（轮换使用）
                    layout_id = content_layouts[j % len(content_layouts)]

                    # 生成新页面
                    new_page = {
                        'page_id': f"p{len(fixed_pages)+1:02d}_inserted",
                        'title': f"{section_title} - 内容{j+1}",
                        'layout_id': layout_id,
                        'has_image': j == 0,  # 第一页带图
                        'keywords': [section_title, '内容展示'] if j == 0 else []
                    }

                    fixed_pages.append(new_page)
                    logger.info(f"插入内容页：{new_page['title']} ({layout_id})")

            i += 1

        # 重新分配 page_id
        for idx, page in enumerate(fixed_pages, 1):
            page['page_id'] = f"p{idx:02d}"

        outline['pages'] = fixed_pages
        return outline

    def generate_structured_outline(self, topic: str, requirements: str = "", language: str = 'zh', scheme_id: str = 'tech_blue') -> Dict:
        """
        生成带布局信息的结构化大纲（用于HTML渲染器）

        Args:
            topic: PPT主题
            requirements: 额外要求
            language: 输出语言

        Returns:
            结构化大纲数据，包含 title 和 pages 列表
            每个 page 包含: page_id, title, layout_id, has_image, keywords
        """
        prompt = get_structured_outline_prompt(topic, requirements, language, scheme_id=scheme_id)
        outline = self.generate_json(prompt, thinking_budget=1000)

        # 验证和修正 layout_id
        scheme = LAYOUT_SCHEMES.get(scheme_id, LAYOUT_SCHEMES['tech_blue'])
        valid_layouts = list(scheme.get('layouts', {}).keys())

        if 'pages' in outline:
            for page in outline['pages']:
                if page.get('layout_id') not in valid_layouts:
                    # fallback to scheme cover for first, otherwise first content layout
                    role = SCHEME_ROLE_LAYOUTS.get(scheme_id, SCHEME_ROLE_LAYOUTS['tech_blue'])
                    fallback = role.get('cover') if page.get('page_id') == 'p01' else (valid_layouts[0] if valid_layouts else 'title_content')
                    page['layout_id'] = fallback
                # 确保 has_image 字段存在
                if 'has_image' not in page:
                    page['has_image'] = False
                # 确保 keywords 字段存在
                if 'keywords' not in page:
                    page['keywords'] = []

            # 修复空章节问题：检测连续的 section_title 并插入内容页
            outline = self._fix_empty_sections(outline, scheme_id)

        return outline

    def generate_structured_page_content(self, page_outline: Dict,
                                         full_outline: Dict = None,
                                         language: str = 'zh',
                                         scheme_id: str = 'tech_blue',
                                         content_depth: str = 'balanced') -> Dict:
        """
        根据大纲生成单个页面的结构化内容（用于HTML渲染器）

        Args:
            page_outline: 当前页面的大纲信息 (page_id, title, layout_id, has_image, keywords)
            full_outline: 完整的PPT大纲（可选，用于上下文参考）
            language: 输出语言

        Returns:
            页面的 model 数据（符合对应布局的 Schema）
        """
        layout_id = page_outline.get('layout_id', 'title_content').lower()
        
        # Special handling for TOC page: generate from actual page titles, not AI
        if 'toc' in layout_id and full_outline:
            return self._generate_toc_model(page_outline, full_outline, language)
        
        prompt = get_structured_page_content_prompt(page_outline, full_outline, language, scheme_id)
        model = self.generate_json(prompt, thinking_budget=1000)

        def extract_text_fields(layout_id: str, model_data: Dict) -> List[str]:
            parts: List[str] = []
            if layout_id == 'title_content':
                parts.extend([str(x) for x in model_data.get('content', []) if x])
                if model_data.get('highlight'):
                    parts.append(str(model_data.get('highlight')))
            elif layout_id == 'title_bullets':
                for b in model_data.get('bullets', []):
                    if isinstance(b, dict):
                        if b.get('text'):
                            parts.append(str(b.get('text')))
                        if b.get('description'):
                            parts.append(str(b.get('description')))
                    else:
                        parts.append(str(b))
            elif layout_id == 'two_column':
                for side in ['left', 'right']:
                    col = model_data.get(side) or {}
                    if col.get('header'):
                        parts.append(str(col.get('header')))
                    for c in col.get('content', []) or []:
                        parts.append(str(c))
                    for b in col.get('bullets', []) or []:
                        if isinstance(b, dict):
                            if b.get('text'):
                                parts.append(str(b.get('text')))
                            if b.get('description'):
                                parts.append(str(b.get('description')))
                        else:
                            parts.append(str(b))
            elif layout_id == 'process_steps':
                for s in model_data.get('steps', []) or []:
                    if s.get('label'):
                        parts.append(str(s.get('label')))
                    if s.get('description'):
                        parts.append(str(s.get('description')))
            return parts

        def ensure_length(layout_id: str, model_data: Dict, title: str, content_depth: str = 'balanced') -> Dict:
            # 根据内容深度设置目标字数
            depth_configs = {
                'concise': (80, 120),      # 简明版 - 适合演讲配图
                'balanced': (120, 180),    # 平衡版 - 适合大多数教学场景（默认）
                'detailed': (180, 280)     # 详细版 - 适合深度教学文档
            }
            target_min, target_max = depth_configs.get(content_depth, (120, 180))
            if layout_id not in {'title_content', 'title_bullets', 'two_column', 'process_steps'}:
                return model_data

            parts = extract_text_fields(layout_id, model_data)
            total_len = len("".join(parts))

            def add_sentence(text: str) -> str:
                sentence = f"{text}。理解其适用条件与常见误区，可提升实际应用效果。"
                return sentence

            if total_len < target_min:
                if layout_id == 'title_content':
                    content = model_data.get('content', [])
                    if not isinstance(content, list):
                        content = [str(content)]
                    if not content:
                        content = [add_sentence(title)]
                    else:
                        content[-1] = str(content[-1]) + add_sentence(title)
                    model_data['content'] = content
                elif layout_id == 'title_bullets':
                    bullets = model_data.get('bullets', [])
                    if bullets:
                        b0 = bullets[0]
                        if isinstance(b0, dict):
                            b0['description'] = (b0.get('description') or '') + add_sentence(title)
                        else:
                            bullets[0] = str(b0) + add_sentence(title)
                    else:
                        bullets = [{'icon': 'fa-lightbulb', 'text': title, 'description': add_sentence(title)}]
                    model_data['bullets'] = bullets
                elif layout_id == 'two_column':
                    right = model_data.get('right') or {}
                    content = right.get('content', [])
                    if not isinstance(content, list):
                        content = [str(content)]
                    content.append(f"结论：{title}需要结合目标与场景权衡选择。")
                    right['content'] = content
                    model_data['right'] = right
                elif layout_id == 'process_steps':
                    steps = model_data.get('steps', [])
                    if steps:
                        steps[-1]['description'] = (steps[-1].get('description') or '') + add_sentence(title)
                    else:
                        steps = [{'number': 1, 'label': title or '步骤', 'description': add_sentence(title), 'icon': 'fa-check'}]
                    model_data['steps'] = steps

            # Ensure bullets/columns have explanatory text
            if layout_id == 'title_bullets':
                bullets = model_data.get('bullets', [])
                for b in bullets:
                    if isinstance(b, dict) and not b.get('description'):
                        b['description'] = f"说明：{b.get('text', '')}的关键点与适用场景。"
                model_data['bullets'] = bullets
            elif layout_id == 'two_column':
                for side in ['left', 'right']:
                    col = model_data.get(side) or {}
                    content = col.get('content', [])
                    if not content and col.get('bullets'):
                        content = [f"解释：{title}在该维度的差异与影响。"]
                    col['content'] = content
                    model_data[side] = col

            # Trim if too long
            parts = extract_text_fields(layout_id, model_data)
            total_len = len("".join(parts))
            if total_len > target_max:
                overflow = total_len - target_max
                def trim_text(text: str, cut: int) -> str:
                    return text[:-cut] if cut < len(text) else text[: max(0, len(text) - 1)]

                if layout_id == 'title_content':
                    content = model_data.get('content', [])
                    if content:
                        content[-1] = trim_text(str(content[-1]), overflow)
                        model_data['content'] = content
                elif layout_id == 'title_bullets':
                    bullets = model_data.get('bullets', [])
                    if bullets:
                        b0 = bullets[0]
                        if isinstance(b0, dict) and b0.get('description'):
                            b0['description'] = trim_text(str(b0['description']), overflow)
                        elif isinstance(b0, str):
                            bullets[0] = trim_text(b0, overflow)
                        model_data['bullets'] = bullets
                elif layout_id == 'two_column':
                    right = model_data.get('right') or {}
                    content = right.get('content', [])
                    if content:
                        content[-1] = trim_text(str(content[-1]), overflow)
                        right['content'] = content
                        model_data['right'] = right
                elif layout_id == 'process_steps':
                    steps = model_data.get('steps', [])
                    if steps:
                        steps[-1]['description'] = trim_text(str(steps[-1].get('description', '')), overflow)
                        model_data['steps'] = steps

            return model_data

        # 如果有图片字段但src为空字符串，确保其结构完整
        layout_id = page_outline.get('layout_id', 'title_content')
        resolved_layout_id = LAYOUT_ID_ALIASES.get(layout_id, layout_id)
        if page_outline.get('has_image') and resolved_layout_id in ['title_content', 'title_bullets', 'process_steps']:
            if 'image' not in model:
                model['image'] = {
                    'src': '',
                    'alt': ' '.join(page_outline.get('keywords', [])),
                    'position': 'right',
                    'width': '40%'
                }
            elif not model['image'].get('src'):
                model['image']['src'] = ''

        # Post-process: enforce minimum depth/length for teaching pages
        model = ensure_length(resolved_layout_id, model, page_outline.get('title', ''), content_depth)

        return model

    def generate_full_ppt_document(self, topic: str, requirements: str = "",
                                   language: str = 'zh', scheme_id: str = 'tech_blue',
                                   content_depth: str = 'balanced') -> Dict:
        """
        生成完整的PPT文档数据（用于HTML渲染器）

        这是一个便捷方法，先生成大纲，然后逐页生成内容

        Args:
            topic: PPT主题
            requirements: 额外要求
            language: 输出语言
            scheme_id: 方案ID（tech_blue/academic/interactive/visual/practical）
            content_depth: 内容深度（concise/balanced/detailed，默认balanced）

        Returns:
            完整的 PPTDocument 数据结构
        """
        import uuid

        # 1. 生成大纲
        outline = self.generate_structured_outline(topic, requirements, language, scheme_id=scheme_id)

        # 2. 构建 PPTDocument 结构
        ppt_document = {
            'project_id': f'ai-gen-{uuid.uuid4().hex[:8]}',
            'ppt_meta': {
                'title': outline.get('title', topic),
                'theme_id': scheme_id or 'tech_blue',
                'aspect_ratio': '16:9',
                'author': ''
            },
            'pages': []
        }

        # 3. 逐页生成内容
        for idx, page_outline in enumerate(outline.get('pages', [])):
            try:
                model = self.generate_structured_page_content(
                    page_outline=page_outline,
                    full_outline=outline,
                    language=language,
                    scheme_id=scheme_id,
                    content_depth=content_depth
                )

                ppt_document['pages'].append({
                    'page_id': page_outline.get('page_id', f'p{idx+1:02d}'),
                    'order_index': idx,
                    'layout_id': page_outline.get('layout_id', 'title_content'),
                    'model': model
                })
            except Exception as e:
                logger.error(f"生成第 {idx+1} 页内容失败: {str(e)}")
                # 使用 fallback 内容
                ppt_document['pages'].append({
                    'page_id': page_outline.get('page_id', f'p{idx+1:02d}'),
                    'order_index': idx,
                    'layout_id': 'title_content',
                    'model': {
                        'title': page_outline.get('title', f'第{idx+1}页'),
                        'content': ['内容生成失败，请手动编辑']
                    }
                })

        return ppt_document
