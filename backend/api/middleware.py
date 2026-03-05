"""
FastAPI error handling and CORS middleware.
"""
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config_fastapi import settings

logger = logging.getLogger(__name__)


def setup_middleware(app: FastAPI) -> None:
    """Configure all middleware for the FastAPI app."""

    # ── CORS ─────────────────────────────────────────────────────
    origins = settings.cors_origin_list
    if "*" in origins:
        # Allow all origins
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # ── Global Exception Handler ────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Catch-all exception handler returning structured error JSON."""
        logger.error(f"Unhandled exception: {exc}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error": {
                    "message": str(exc),
                    "code": 500,
                },
            },
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=404,
            content={
                "status": "error",
                "error": {
                    "message": "Resource not found",
                    "code": 404,
                },
            },
        )
