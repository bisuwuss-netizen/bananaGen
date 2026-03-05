"""
Banana Slides – FastAPI Application Entry Point

Replaces the original Flask app.py with a FastAPI application.
This is the new entry point: run with `uvicorn app_fastapi:app --reload`

Key differences from the Flask version:
1. Native async/await support for all routes
2. Automatic request validation via Pydantic
3. Auto-generated Swagger docs at /docs
4. WebSocket support for real-time task progress
5. Dependency injection for DB sessions
"""
import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from config_fastapi import settings, PROJECT_ROOT
from deps import init_db, close_db
from api.middleware import setup_middleware


# ── Logging ──────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan (replaces Flask's before_first_request) ───────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle management.
    
    Startup: initialize database, load settings
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

    yield  # Application runs here

    # Shutdown
    await close_db()
    logger.info("🍌 Banana Slides (FastAPI) shut down.")


# ── Create FastAPI App ───────────────────────────────────────────

app = FastAPI(
    title="Banana Slides",
    description="AI-native PPT Generator",
    version="0.4.0",
    lifespan=lifespan,
)

# Setup middleware (CORS, error handlers)
setup_middleware(app)


# ── Register Routers ─────────────────────────────────────────────

from api.routes.projects import router as projects_router
from api.routes.tasks import router as tasks_router

app.include_router(projects_router)
app.include_router(tasks_router)

# TODO: Add remaining routers as they are migrated:
# from api.routes.pages import router as pages_router
# from api.routes.generation import router as generation_router
# from api.routes.export import router as export_router
# from api.routes.files import router as files_router
# from api.routes.materials import router as materials_router
# from api.routes.templates import router as templates_router
# from api.routes.settings import router as settings_router


# ── Static Files (uploads) ──────────────────────────────────────

uploads_path = Path(settings.upload_folder)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=str(uploads_path)), name="files")


# ── Health Check ─────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint for Docker/load balancer"""
    return {"status": "healthy", "version": "0.4.0", "engine": "fastapi"}


@app.get("/", tags=["system"])
async def index():
    """Root endpoint"""
    return {
        "name": "Banana Slides API",
        "version": "0.4.0",
        "engine": "fastapi",
        "docs": "/docs",
    }


# ── Run ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "5000"))
    if settings.in_docker == "1":
        port = 5000

    logger.info(f"Starting Banana Slides (FastAPI) on port {port}")
    uvicorn.run(
        "app_fastapi:app",
        host="0.0.0.0",
        port=port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
