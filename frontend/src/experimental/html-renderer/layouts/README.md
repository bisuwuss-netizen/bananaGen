# Layouts Directory

布局组件按两层职责拆分：

- `common/`: 通用基础布局，跨方案复用。
- `academic/`, `interactive/`, `visual/`, `practical/`, `modern/`, `edu-dark/`, `vocational/`: 按方案归档的专属布局。
- `shared/`: 仅布局层使用的小型辅助工具。
- `aliases.ts`, `names.ts`, `registry.ts`: 布局 ID 归一化、展示名和渲染注册表。
- `index.ts`: 对外稳定导出层。

这样做的目标是让“找布局实现”和“找布局注册关系”分开，同时不改变外部使用 `@/experimental/html-renderer/layouts` 的方式。
