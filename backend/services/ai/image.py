import os
import logging
from typing import List, Dict, Optional, Union
from pathlib import Path

from PIL import Image
from config_fastapi import settings as fastapi_settings

logger = logging.getLogger(__name__)


class ImageMixin:

    def generate_image_prompt(self, outline: List[Dict], page: Dict,
                            page_desc: str, page_index: int,
                            has_material_images: bool = False,
                            extra_requirements: Optional[str] = None,
                            language='zh',
                            has_template: bool = True) -> str:
        from services.prompts.image import get_image_generation_prompt
        outline_text = self.generate_outline_text(outline)

        if 'part' in page:
            current_section = page['part']
        else:
            current_section = f"{page.get('title', 'Untitled')}"

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
        try:
            logger.debug(f"Reference image: {ref_image_path}")
            if additional_ref_images:
                logger.debug(f"Additional reference images: {len(additional_ref_images)}")
            logger.debug(f"Config - aspect_ratio: {aspect_ratio}, resolution: {resolution}")

            ref_images = []

            if ref_image_path:
                if not os.path.exists(ref_image_path):
                    raise FileNotFoundError(f"Reference image not found: {ref_image_path}")
                main_ref_image = Image.open(ref_image_path)
                ref_images.append(main_ref_image)

            if additional_ref_images:
                for ref_img in additional_ref_images:
                    if isinstance(ref_img, Image.Image):
                        ref_images.append(ref_img)
                    elif isinstance(ref_img, str):
                        if os.path.exists(ref_img):
                            ref_images.append(Image.open(ref_img))
                        elif ref_img.startswith('http://') or ref_img.startswith('https://'):
                            downloaded_img = self.download_image_from_url(ref_img)
                            if downloaded_img:
                                ref_images.append(downloaded_img)
                            else:
                                logger.warning(f"Failed to download image from URL: {ref_img}, skipping...")
                        elif ref_img.startswith('/files/'):
                            relative = ref_img[len('/files/'):].lstrip('/')
                            local_path = Path(fastapi_settings.upload_folder) / relative
                            if local_path.exists():
                                ref_images.append(Image.open(local_path))
                                logger.debug(f"Loaded local file image: {local_path}")
                            else:
                                logger.warning(f"Local file image not found: {ref_img}, skipping...")
                        else:
                            logger.warning(f"Invalid image reference: {ref_img}, skipping...")

            logger.debug(f"Calling image provider for generation with {len(ref_images)} reference images...")

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
        from services.prompts.image import get_image_edit_prompt
        edit_instruction = get_image_edit_prompt(
            edit_instruction=prompt,
            original_description=original_description
        )
        return self.generate_image(edit_instruction, current_image_path, aspect_ratio, resolution, additional_ref_images)
