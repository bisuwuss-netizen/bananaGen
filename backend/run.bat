@echo off
REM Banana Slides FastAPI Startup Script for Windows

echo ╔══════════════════════════════════════╗
echo ║   🍌 Banana Slides API Server 🍌   ║
echo ╚══════════════════════════════════════╝
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from .env.example...
    copy .env.example .env
    echo ✅ .env file created. Please edit it with your API keys.
    echo.
)

echo 📥 Installing dependencies with uv...
uv sync

REM Create instance folder if not exists
if not exist instance mkdir instance
if not exist uploads mkdir uploads

echo.
echo ✅ Setup complete!
echo.
echo 🚀 Starting server...
echo.

REM Run the application
uv run python app_fastapi.py
