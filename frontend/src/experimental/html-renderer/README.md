# HTML渲染器 POC

基于反向约束架构的HTML幻灯片渲染器实验性功能。

## 访问入口

启动前端开发服务器后，访问：
```
http://localhost:5173/experimental/renderer
```

## 功能特性

1. **预览功能**：实时预览幻灯片效果
2. **JSON导入**：支持加载自定义JSON数据
3. **图片上传**：为幻灯片添加本地图片
4. **HTML导出**：导出符合PPT转换规范的HTML文档

## 布局类型

| 布局ID | 名称 | 说明 |
|--------|------|------|
| `cover` | 封面页 | 渐变背景+居中标题 |
| `toc` | 目录页 | 带序号的目录列表 |
| `title_content` | 标题+正文 | 标题+多段落文字 |
| `title_bullets` | 标题+要点 | 标题+卡片式要点 |
| `two_column` | 左右双栏 | 支持图文混排 |
| `process_steps` | 流程步骤 | 横向流程展示 |
| `section_title` | 章节标题 | 章节分隔页 |
| `image_full` | 全图页 | 大图展示 |
| `quote` | 引用页 | 名言引用 |
| `ending` | 结束页 | 感谢页 |

## JSON数据结构

```json
{
  "project_id": "string",
  "ppt_meta": {
    "title": "PPT标题",
    "theme_id": "tech_blue",
    "aspect_ratio": "16:9",
    "author": "作者"
  },
  "pages": [
    {
      "page_id": "p01",
      "order_index": 0,
      "layout_id": "cover",
      "model": {
        // 根据layout_id不同，结构不同
      }
    }
  ]
}
```

## HTML输出规范

导出的HTML符合以下规范：
- `<meta name="ppt-size" content="width=1280,height=720">` 声明尺寸
- 所有样式使用内联方式
- 每个 `<section>` 代表一张幻灯片
- 目录序号使用 `directory-list-index` 类
- 目录内容使用 `slide-content-list-con` 类

## 文件结构

```
html-renderer/
├── index.tsx              # 预览页面入口
├── types/
│   └── schema.ts          # TypeScript类型定义
├── themes/
│   └── tech-blue.ts       # 主题配置
├── layouts/               # 布局组件
│   ├── CoverLayout.tsx
│   ├── TocLayout.tsx
│   └── ...
├── components/
│   └── SlideRenderer.tsx  # 幻灯片渲染器
├── utils/
│   ├── styleHelper.ts     # 样式工具
│   └── htmlExporter.ts    # HTML导出工具
└── mock-data/
    └── sample-ppt.json    # 示例数据
```

## 后续计划

1. 添加AI生图功能
2. 扩展更多布局类型
3. 支持多主题切换
4. 与主项目流程集成
