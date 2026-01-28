# Banana Slides

基于 AI 的 PPT 演示文稿生成应用，支持从想法/大纲/页面描述生成完整 PPT。

## 项目结构

```
banana-slides/
├── backend/                          # Flask 后端服务
│   ├── app.py                        # 应用入口，注册蓝图和初始化
│   ├── config.py                     # 配置管理（环境变量、API密钥）
│   │
│   ├── controllers/                  # API 控制器层
│   │   ├── project_controller.py     # 项目 CRUD、大纲/描述生成
│   │   ├── page_controller.py        # 页面管理、图片生成
│   │   ├── material_controller.py    # 素材管理
│   │   ├── template_controller.py    # 模板管理
│   │   ├── reference_file_controller.py  # 参考文件管理
│   │   ├── export_controller.py      # PPT/PDF 导出
│   │   ├── render_controller.py      # HTML 渲染预览
│   │   ├── settings_controller.py    # 系统设置
│   │   └── file_controller.py        # 文件上传
│   │
│   ├── models/                       # 数据库模型 (SQLAlchemy)
│   │   ├── project.py                # 项目模型
│   │   ├── page.py                   # 页面模型
│   │   ├── task.py                   # 异步任务模型
│   │   ├── material.py               # 素材模型
│   │   ├── user_template.py          # 用户模板模型
│   │   ├── reference_file.py         # 参考文件模型
│   │   ├── page_image_version.py     # 页面版本模型
│   │   └── settings.py               # 系统设置模型
│   │
│   ├── services/                     # 业务逻辑层
│   │   ├── ai_service.py             # AI 服务调度
│   │   ├── ai_service_manager.py     # AI 提供商管理
│   │   ├── ai_providers/             # AI 提供商实现
│   │   │   ├── text/                 # 文本生成 (Gemini/OpenAI)
│   │   │   ├── image/                # 图片生成 (Gemini/OpenAI)
│   │   │   └── ocr/                  # OCR 识别 (百度)
│   │   ├── prompts.py                # AI 提示词模板
│   │   ├── task_manager.py           # 异步任务管理
│   │   ├── file_service.py           # 文件管理
│   │   ├── file_parser_service.py    # 文件解析 (PDF/Docx/MD)
│   │   ├── export_service.py         # 导出服务
│   │   ├── pptx_export_service.py    # 可编辑 PPTX 导出
│   │   ├── html_renderer.py          # HTML 渲染
│   │   ├── layout_engine.py          # 布局引擎
│   │   ├── image_editability/        # 图片可编辑性处理
│   │   └── render_templates/         # HTML 模板
│   │
│   ├── utils/                        # 工具函数
│   │   ├── response.py               # 统一响应格式
│   │   ├── validators.py             # 数据验证
│   │   ├── pptx_builder.py           # PPTX 构建工具
│   │   └── path_utils.py             # 路径处理
│   │
│   ├── migrations/                   # 数据库迁移 (Alembic)
│   └── tests/                        # 后端测试
│
├── frontend/                         # React 前端应用
│   ├── src/
│   │   ├── App.tsx                   # 应用根组件和路由
│   │   ├── main.tsx                  # 入口文件
│   │   │
│   │   ├── pages/                    # 页面组件
│   │   │   ├── Home.tsx              # 首页（创建项目）
│   │   │   ├── OutlineEditor.tsx     # 大纲编辑页
│   │   │   ├── DetailEditor.tsx      # 详细描述编辑页
│   │   │   ├── SlidePreview.tsx      # 幻灯片预览页
│   │   │   ├── Settings.tsx          # 设置页
│   │   │   └── History.tsx           # 历史项目页
│   │   │
│   │   ├── components/               # UI 组件
│   │   │   ├── shared/               # 通用组件
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── TemplateSelector.tsx
│   │   │   │   ├── MaterialSelector.tsx
│   │   │   │   └── ...
│   │   │   ├── outline/              # 大纲组件
│   │   │   ├── preview/              # 预览组件
│   │   │   └── history/              # 历史组件
│   │   │
│   │   ├── store/                    # 状态管理 (Zustand)
│   │   │   ├── useProjectStore.ts    # 项目状态
│   │   │   └── useExportTasksStore.ts # 导出任务状态
│   │   │
│   │   ├── api/                      # API 接口
│   │   │   ├── client.ts             # Axios 配置
│   │   │   └── endpoints.ts          # API 端点
│   │   │
│   │   ├── types/                    # TypeScript 类型
│   │   ├── hooks/                    # 自定义 Hooks
│   │   └── utils/                    # 工具函数
│   │
│   └── public/                       # 静态资源
│       └── templates/                # 预设模板图片
│
├── docker-compose.yml                # Docker 开发配置
├── docker-compose.prod.yml           # Docker 生产配置
├── pyproject.toml                    # Python 依赖配置
├── .env.example                      # 环境变量示例
└── scripts/                          # 脚本工具
```

## 功能流程

### 1. PPT 生成流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   输入想法   │ -> │  生成大纲   │ -> │ 生成页面描述 │ -> │  生成图片   │
│  (主题/文件) │    │  (AI 文本)  │    │  (AI 文本)  │    │  (AI 图片)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                v
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   下载使用   │ <- │ 导出PPT/PDF │ <- │  预览编辑   │ <- │  渲染页面   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 2. 核心 API 流程

```
前端请求                    后端处理                         AI 服务
   │                           │                               │
   │  POST /projects           │                               │
   │ ─────────────────────────>│ 创建项目记录                   │
   │                           │                               │
   │  POST /projects/:id/      │                               │
   │       generate-outline    │                               │
   │ ─────────────────────────>│ ─────────────────────────────>│
   │                           │       调用文本 AI 生成大纲     │
   │                           │ <─────────────────────────────│
   │ <─────────────────────────│ 返回大纲内容                   │
   │                           │                               │
   │  POST /projects/:id/      │                               │
   │       generate-descriptions│                              │
   │ ─────────────────────────>│ ─────────────────────────────>│
   │                           │       调用文本 AI 生成描述     │
   │                           │ <─────────────────────────────│
   │ <─────────────────────────│ 返回页面描述                   │
   │                           │                               │
   │  POST /pages/:id/         │                               │
   │       generate-image      │                               │
   │ ─────────────────────────>│ ─────────────────────────────>│
   │                           │       调用图片 AI 生成         │
   │                           │ <─────────────────────────────│
   │ <─────────────────────────│ 返回图片 URL                   │
   │                           │                               │
   │  POST /export/pptx        │                               │
   │ ─────────────────────────>│ 生成 PPTX 文件                 │
   │ <─────────────────────────│ 返回下载链接                   │
```

### 3. 数据模型关系

```
Project (项目)
    │
    ├── Page[] (页面)
    │       │
    │       └── PageImageVersion[] (版本历史)
    │
    ├── Material[] (素材)
    │
    ├── ReferenceFile[] (参考文件)
    │
    └── UserTemplate (用户模板)

Settings (全局设置)
    └── API 配置、模型参数等

Task (异步任务)
    └── 追踪生成任务状态
```

## 技术栈

**后端**
- Python 3.10+ / Flask 3.0
- SQLite + SQLAlchemy + Alembic
- AI: Google Gemini / OpenAI API

**前端**
- React 18 + TypeScript
- Vite 5 + Tailwind CSS
- Zustand (状态管理)

## 快速开始

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API 密钥

# 2. Docker 启动
docker compose up -d

# 3. 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:5000
```

## License

CC BY-NC-SA 4.0
