"""Banana Slides – FastAPI Application Entry Point

Run: uvicorn app_fastapi:app --reload
Docs: http://localhost:5000/docs
"""
import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

_project_root = Path(__file__).parent.parent

# Try to load .env with UTF-8 encoding first, then fallback to other encodings
# This handles .env files with invalid UTF-8 bytes (e.g., corrupted or mixed encoding)
_env_path = _project_root / ".env"
if _env_path.exists():
    # Try UTF-8 first (explicit encoding parameter)
    try:
        load_dotenv(dotenv_path=_env_path, override=False, encoding="utf-8")
    except UnicodeDecodeError as e:
        # Try GBK encoding (common for Chinese Windows systems)
        try:
            load_dotenv(dotenv_path=_env_path, override=False, encoding="gbk")
        except UnicodeDecodeError:
            # Last resort: read file with error handling and manually parse
            with open(_env_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            # Manually set environment variables from content
            for line in content.splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from config_fastapi import settings
from deps import close_db
from api.middleware import setup_middleware

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
for _noisy in ("sqlalchemy.engine", "httpcore", "httpx", "urllib3"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle management.
    
    Shutdown: cleanup database connections
    """
    logger.info("🍌 Banana Slides (FastAPI) starting up...")
    logger.info(f"  Database: {settings.sqlalchemy_database_url.split('@')[-1]}")
    logger.info(f"  AI Provider: {settings.ai_provider_format}")
    logger.info(f"  Text Model: {settings.text_model}")
    logger.info(f"  Image Model: {settings.image_model}")
    logger.info(f"  Upload Folder: {settings.upload_folder}")

    # Ensure upload directory exists
    os.makedirs(settings.upload_folder, exist_ok=True)
    logger.info(
        f"Banana Slides (FastAPI) starting | port={settings.port} "
        f"lang={settings.output_language} provider={settings.ai_provider_format}"
    )
    yield
    await close_db()


app = FastAPI(title="Banana Slides", version="2.0.0", lifespan=lifespan)
setup_middleware(app)


# ── Register Routers ─────────────────────────────────────────────

from api.routes.projects import router as projects_router
from api.routes.tasks import router as tasks_router
from api.routes.pages import router as pages_router
from api.routes.generation import router as generation_router
from api.routes.refinement import router as refinement_router
from api.routes.export import router as export_router
from api.routes.files import router as files_router
from api.routes.materials import router as materials_router
from api.routes.templates import router as templates_router
from api.routes.settings import router as settings_router
from api.routes.reference_files import router as reference_files_router
from api.routes.html_renderer import router as html_renderer_router
from api.routes.preset_styles import router as preset_styles_router
from api.routes.user_templates import router as user_templates_router
from api.routes.html_images import router as html_images_router
from api.routes.smart_ppt_log import router as smart_ppt_log_router
from features.home_characters.router import router as home_characters_router

app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(pages_router)
app.include_router(generation_router)
app.include_router(refinement_router)
app.include_router(export_router)
app.include_router(files_router)
app.include_router(materials_router)
app.include_router(templates_router)
app.include_router(settings_router)
app.include_router(reference_files_router)
app.include_router(html_renderer_router)
app.include_router(preset_styles_router)
app.include_router(user_templates_router)
app.include_router(html_images_router)
app.include_router(smart_ppt_log_router)
app.include_router(home_characters_router)


# ── Static Files (uploads) ──────────────────────────────────────

uploads_path = Path(settings.upload_folder)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=str(uploads_path)), name="files")


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "version": "2.0.0", "engine": "fastapi"}


@app.get("/", tags=["system"])
async def index():
    return {"name": "Banana Slides API", "version": "2.0.0", "docs": "/docs"}


@app.get("/api/output-language", tags=["system"])
async def get_output_language():
    return {"data": {"language": settings.output_language}}


if __name__ == "__main__":
    import uvicorn

    port = 5000 if settings.in_docker == "1" else settings.port
    uvicorn.run("app_fastapi:app", host="0.0.0.0", port=port, reload=settings.debug)
