"""Reference file parser service (local/OpenAI-only implementation)."""

from __future__ import annotations

import base64
import concurrent.futures as _futures
import logging
import re
from pathlib import Path
from typing import Optional

from markitdown import MarkItDown

logger = logging.getLogger(__name__)

_BASE64_IMG_RE = re.compile(r'!\[([^\]]*)\]\(data:image/(\w+);base64,([^)]+)\)')


def _localize_images(markdown: str, file_path: str) -> str:
    """Replace base64-inlined images with local /files/ paths."""
    file_stem = Path(file_path).stem
    img_dir = Path(file_path).parent / file_stem

    def replace(m: re.Match) -> str:
        alt, ext, b64_data = m.group(1), m.group(2), m.group(3)
        try:
            img_bytes = base64.b64decode(b64_data)
            img_dir.mkdir(parents=True, exist_ok=True)
            idx = len(list(img_dir.glob("img_*")))
            img_file = img_dir / f"img_{idx}.{ext}"
            img_file.write_bytes(img_bytes)
            return f"![{alt}](/files/reference_files/{file_stem}/img_{idx}.{ext})"
        except Exception:
            return m.group(0)

    return _BASE64_IMG_RE.sub(replace, markdown)


class FileParserService:
    """
    Parse reference files into markdown content.

    Notes:
    - This implementation no longer depends on MinerU/Gemini.
    - Return signature is preserved for compatibility with existing call sites.
    """

    def __init__(
        self,
        mineru_token: str = "",
        mineru_api_base: str = "",
        google_api_key: str = "",
        google_api_base: str = "",
        openai_api_key: str = "",
        openai_api_base: str = "",
        image_caption_model: str = "",
        provider_format: str = "openai",
        mineru_model_version: str = "vlm",
    ):
        self.openai_api_key = openai_api_key
        self.openai_api_base = openai_api_base
        self.image_caption_model = image_caption_model
        self.provider_format = (provider_format or "openai").lower()
        self._converter = MarkItDown()

        # Keep deprecated args for backward compatibility only.
        self._deprecated = {
            "mineru_token": mineru_token,
            "mineru_api_base": mineru_api_base,
            "google_api_key": google_api_key,
            "google_api_base": google_api_base,
            "mineru_model_version": mineru_model_version,
        }

    def parse_file(self, file_path: str, filename: str) -> tuple[Optional[str], Optional[str], Optional[str], Optional[str], int]:
        """
        Parse file and return markdown.

        Returns:
            (batch_id, markdown_content, extract_id, error_message, failed_image_count)
        """
        path = Path(file_path)
        if not path.exists():
            return None, None, None, f"File not found: {file_path}", 0

        ext = path.suffix.lower().lstrip(".")

        # Plain text markdown-like files.
        if ext in {"txt", "md", "markdown"}:
            content, err = self._read_text_file(path)
            if err:
                return None, None, None, err, 0
            return None, content, None, None, 0

        # Other formats: rely on MarkItDown local conversion.
        try:
            with _futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(self._converter.convert, str(path))
                try:
                    result = future.result(timeout=120)
                except _futures.TimeoutError:
                    return None, None, None, "解析超时，文件可能过大或格式复杂", 0
            markdown = (result.text_content or "").strip()
            if not markdown:
                return None, None, None, "Parsed content is empty", 0
            markdown = _localize_images(markdown, file_path)
            return None, markdown, None, None, 0
        except Exception as exc:
            logger.error("Failed to parse file via MarkItDown: %s", exc, exc_info=True)
            return None, None, None, f"Failed to parse file: {exc}", 0

    @staticmethod
    def _read_text_file(path: Path) -> tuple[Optional[str], Optional[str]]:
        for enc in ("utf-8", "utf-8-sig", "gbk"):
            try:
                return path.read_text(encoding=enc), None
            except UnicodeDecodeError:
                continue
            except Exception as exc:
                return None, str(exc)
        return None, "Unable to decode text file with utf-8/gbk"
