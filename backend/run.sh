#!/bin/bash

# Banana Slides FastAPI Startup Script

echo "╔══════════════════════════════════════╗"
echo "║   🍌 Banana Slides API Server 🍌   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your API keys."
    echo ""
fi

echo "📥 Installing dependencies with uv..."
uv sync

# Create instance folder if not exists
mkdir -p instance
mkdir -p uploads

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting server..."
echo ""

# Run the application
uv run python app_fastapi.py
