<div align="center">

# BananaGen

**AI-Powered Presentation Generator**

*Describe your idea, get a polished PPT — powered by LLM + intelligent layout engine.*

[![Python](https://img.shields.io/badge/Python-3.11--3.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-CC--BY--NC--SA--4.0-EF9421?logo=creativecommons&logoColor=white)](LICENSE)

</div>

---

## Overview

BananaGen turns a short text idea or structured outline into a complete, export-ready presentation. The system handles the full pipeline — from AI-driven content generation and image creation to intelligent page layout and multi-format export.

### Key Features

| Feature | Description |
|---------|-------------|
| **Idea-to-Slides** | Input a topic or idea; the AI generates an outline, page descriptions, and rendered slides automatically |
| **Outline Editing** | Fine-tune the generated outline before rendering, with drag-and-drop reordering |
| **AI Image Generation** | Automatically generates contextual images for each slide via configurable image models |
| **Smart Layout Engine** | HTML-based rendering with intelligent layout composition and preset style themes |
| **Reference Files** | Upload PDF / DOCX / PPTX / Markdown files as context; parsed content guides generation |
| **Material Library** | Upload and manage reusable images and assets across projects |
| **Template System** | Apply custom PPTX templates or built-in preset styles to control visual design |
| **Multi-Format Export** | Export as PPTX, editable PPTX, or PDF |
| **Real-Time Progress** | WebSocket-powered live status updates during generation |
| **Multi-User Auth** | Optional cookie-based authentication with per-user project isolation |
| **Knowledge Base** | Manage reusable knowledge entries to guide AI generation across projects |
| **AI Refinement** | Iteratively refine individual slides with natural language instructions |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                 │
│  Home  │  OutlineEditor  │  SlidePreview  │  DetailEditor   │
│  History  │  Settings  │  KnowledgeBase  │  Login           │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                   Backend (FastAPI + Uvicorn)                │
│                                                             │
│  api/routes/         services/ai/        services/tasks/    │
│  ├── projects        ├── outline         ├── task_manager   │
│  ├── pages           ├── description     └── background     │
│  ├── generation      ├── image                              │
│  ├── export          ├── layout          services/          │
│  ├── reference_files ├── refine          ├── export_service │
│  ├── materials       └── structured      ├── file_parser    │
│  ├── templates                           └── presentation/  │
│  ├── knowledge_base                                         │
│  └── settings        models/ + migrations/ (Alembic)        │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │ SQLAlchemy Async (aiomysql)
                    ┌────▼────┐
                    │ MySQL 8+│
                    └─────────┘
```

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript 5, Vite 5, Tailwind CSS, Zustand, React Router |
| **Backend** | FastAPI, SQLAlchemy 2 (async), Alembic, Uvicorn |
| **AI** | OpenAI-compatible API (GPT-4, etc.), configurable text & image models |
| **Database** | MySQL 8+ via aiomysql (async driver) |
| **Export** | python-pptx, ReportLab (PDF), Pillow, img2pdf |
| **File Parsing** | MarkItDown (PDF, DOCX, PPTX, Markdown, Excel, CSV) |
| **Testing** | pytest (backend), Vitest + Playwright (frontend) |

---

## Quick Start

### Prerequisites

- **Python** 3.11 - 3.13 (3.11 recommended)
- **[uv](https://github.com/astral-sh/uv)** (Python package manager)
- **Node.js** 18+
- **MySQL** 8+

### 1. Clone & Configure

```bash
git clone https://github.com/bisuwuss-netizen/bananaGen.git
cd bananaGen
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Required
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/banana_slides?charset=utf8mb4
OPENAI_API_KEY=sk-your-key-here
TEXT_MODEL=gpt-4.1-mini
IMAGE_MODEL=wanx-v1

# Optional: Multi-user authentication
# AUTH_USERS=alice:password1:1,bob:password2:2
# SECRET_KEY=your-secret-key
```

### 2. Install Dependencies

```bash
# Backend
uv sync --python 3.11 --extra test

# Frontend
cd frontend && npm install && cd ..
```

### 3. Initialize Database

```bash
uv run --python 3.11 alembic -c backend/alembic.ini upgrade head
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend (FastAPI)
npm run dev:backend

# Terminal 2 — Frontend (Vite)
npm run dev:frontend
```

Open your browser:

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:5000](http://localhost:5000) |
| Swagger Docs | [http://localhost:5000/docs](http://localhost:5000/docs) |

---

## Docker Deployment

```bash
# Configure environment
cp .env.example .env
# Edit .env with your settings...

# Build & start
docker compose up -d
```

The frontend is served at `http://localhost:3000`, backend at `http://localhost:5000`.

### Production Checklist

For multi-user deployment, ensure these are set in `.env`:

```env
AUTH_USERS=user1:pass1:1,user2:pass2:2
SECRET_KEY=a-strong-random-secret
AUTH_COOKIE_SECURE=true
CORS_ORIGINS=https://your-frontend-domain.com
```

Verify auth is active:

```bash
curl -s http://127.0.0.1:5000/api/auth/me
# Should return: {"enabled": true, ...}
```

---

## Project Structure

```
bananaGen/
├── backend/
│   ├── api/routes/            # FastAPI route handlers
│   ├── models/                # SQLAlchemy models
│   ├── schemas/               # Pydantic request/response schemas
│   ├── services/
│   │   ├── ai/                # AI generation modules (outline, description, image, layout)
│   │   ├── prompts/           # Prompt templates for LLM
│   │   ├── tasks/             # Background task management
│   │   └── presentation/      # Layout composition & export quality
│   ├── migrations/            # Alembic database migrations
│   ├── config_fastapi.py      # App configuration
│   ├── deps.py                # Dependency injection (DB sessions, auth)
│   └── app_fastapi.py         # Application entry point
├── frontend/
│   ├── src/
│   │   ├── pages/             # Route pages (Home, OutlineEditor, SlidePreview, etc.)
│   │   ├── components/shared/ # Reusable UI components
│   │   ├── store/             # Zustand state management
│   │   ├── api/               # API client & endpoint definitions
│   │   └── features/          # Feature-specific modules
│   └── e2e/                   # Playwright E2E tests
├── docker-compose.yml
├── .env.example
└── pyproject.toml
```

---

## Testing

```bash
# Backend unit tests
npm run test:backend

# Frontend unit tests
npm run test:frontend

# Lint (all)
npm run lint

# Frontend E2E (mocked)
npm run test:e2e

# Frontend E2E (live, requires running backend)
npm run test:e2e:live
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI-compatible API key |
| `TEXT_MODEL` | Yes | Model for text generation (e.g. `gpt-4.1-mini`) |
| `IMAGE_MODEL` | Yes | Model for image generation |
| `OPENAI_API_BASE` | No | Custom API endpoint (default: OpenAI) |
| `OUTPUT_LANGUAGE` | No | Output language: `zh`, `en`, `ja`, `auto` (default: `zh`) |
| `AUTH_USERS` | No | Multi-user auth accounts (format: `user:pass:id,...`) |
| `SECRET_KEY` | No | Session secret (required if `AUTH_USERS` is set) |
| `IMAGE_PROMPT_REWRITE_ENABLED` | No | Enable prompt optimization for images (default: `true`) |
| `MAX_IMAGE_WORKERS` | No | Concurrent image generation limit (default: `8`) |

---

## License

This project is licensed under [CC BY-NC-SA 4.0](LICENSE).

- **Personal & non-commercial use**: Free with attribution
- **Commercial use**: Contact the author for licensing

Copyright (c) 2025 Anionex
