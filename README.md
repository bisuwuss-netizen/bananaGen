# bananaGen

基于 FastAPI + React 的 AI PPT 生成系统。  
当前主分支已完成后端重构迁移，默认主链路为 `FastAPI + MySQL`，并保留完整产品功能入口。

## 当前功能范围

- 多入口创建：意图识别 / 大纲生成 / 描述生成
- 页面生成链路：大纲 -> 页面描述（含 HTML 模型）-> 渲染
- 导出能力：`PPTX`、`PDF`、可编辑 `PPTX`
- 资源能力：素材库、模板库、参考文件解析与关联
- 前端完整页面：首页、历史页、设置页、实验入口、预览与编辑流程

## 技术栈

- Backend: FastAPI, SQLAlchemy, Alembic, MySQL
- Frontend: React + TypeScript + Vite
- Task/Async: 后台任务管理 + WebSocket 任务状态推送

## 目录结构（核心）

```text
backend/
  api/routes/              # FastAPI 路由
  services/ai/             # AI 能力模块
  services/prompts/        # Prompt 模块
  services/tasks/          # 后台任务模块
  services/presentation/   # 版式/连续性/导出质量相关
  migrations/              # Alembic 迁移
frontend/
  src/pages/               # 页面入口
  src/components/          # UI 组件
  src/store/               # Zustand store
```

## 本地开发（推荐）

### 1. 环境要求

- Python 3.11-3.13（推荐 3.11）
- [uv](https://github.com/astral-sh/uv)
- Node.js 18+
- MySQL 8+

### 2. 配置环境变量

复制并编辑环境变量文件：

```bash
cp .env.example .env
```

至少配置这些项：

- `DATABASE_URL`（或 `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE`）
- `OPENAI_API_KEY`
- `TEXT_MODEL`
- `IMAGE_MODEL`

### 3. 安装依赖

```bash
uv sync --python 3.11 --extra test
cd frontend && npm install
```

### 4. 数据库迁移

```bash
uv run --python 3.11 alembic -c backend/alembic.ini upgrade head
```

### 5. 启动服务

后端（FastAPI）：

```bash
npm run dev:backend
```

前端：

```bash
npm run dev:frontend
```

默认访问：

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:5000](http://localhost:5000)
- Swagger: [http://localhost:5000/docs](http://localhost:5000/docs)

## 测试与检查

```bash
npm run test:backend
npm run test:frontend
npm run lint
```

## Docker（可选）

```bash
docker compose up -d
```

## 上传到 GitHub 前的安全检查

项目已经加入以下忽略规则，避免提交本地私有文件：

- `AGENT.md` / `AGENTS.md`
- `.cursor/`
- `node_modules/`
- `.env*`（保留 `.env.example`）

建议在 push 前执行：

```bash
git status --short
git ls-files | rg "(^|/)\\.cursor/|(^|/)node_modules/|(^|/)AGENTS?\\.md$|(^|/)\\.env($|\\.)"
```
