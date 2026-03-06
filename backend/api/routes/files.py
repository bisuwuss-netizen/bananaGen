"""File serving routes. Migrated from file_controller.py."""
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config_fastapi import settings
from utils.path_utils import find_file_with_prefix

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/files", tags=["files"])


class HtmlUploadRequest(BaseModel):
    content: str
    filename: str | None = None


@router.post("/html/upload")
async def upload_html(req: HtmlUploadRequest, request: Request):
    filename = req.filename
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_id = uuid.uuid4().hex[:8]
        filename = f"{timestamp}_{random_id}.html"
    else:
        if not filename.endswith(".html"):
            filename += ".html"
        # Basic sanitization
        filename = filename.replace("/", "_").replace("\\", "_")

    html_dir = os.path.join(settings.upload_folder, "html_exports")
    os.makedirs(html_dir, exist_ok=True)

    file_path = os.path.join(html_dir, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(req.content)

    relative_path = f"/files/html_exports/{filename}"

    origin = request.headers.get("origin", "")
    referer = request.headers.get("referer", "")
    if origin:
        base_url = origin.rstrip("/")
    elif referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
    else:
        host = request.headers.get("x-forwarded-host", str(request.base_url).rstrip("/"))
        base_url = host

    full_url = f"{base_url}{relative_path}"

    return {
        "code": 200,
        "data": {"filepath": relative_path, "url": full_url, "filename": filename},
    }


@router.get("/html_exports/{filename}")
async def serve_html_export(filename: str):
    safe_filename = filename.replace("/", "_").replace("\\", "_")
    file_dir = os.path.join(settings.upload_folder, "html_exports")
    file_path = os.path.join(file_dir, safe_filename)

    if not os.path.isfile(file_path):
        raise HTTPException(404, "File not found")

    return FileResponse(file_path, media_type="text/html")


@router.get("/mineru/{extract_id}/{filepath:path}")
async def serve_mineru_file(extract_id: str, filepath: str):
    root_dir = Path(settings.upload_folder) / "mineru_files" / extract_id
    full_path = root_dir / filepath

    resolved_root = root_dir.resolve()
    try:
        resolved_full = full_path.resolve()
        if not str(resolved_full).startswith(str(resolved_root)):
            raise HTTPException(403, "Invalid file path")
    except Exception:
        raise HTTPException(403, "Invalid file path")

    matched_path = find_file_with_prefix(full_path)
    if matched_path is None:
        raise HTTPException(404, "File not found")

    try:
        resolved_matched = matched_path.resolve(strict=True)
        if not str(resolved_matched).startswith(str(resolved_root)):
            raise HTTPException(403, "Invalid file path")
    except FileNotFoundError:
        raise HTTPException(404, "File not found")

    return FileResponse(str(matched_path))
