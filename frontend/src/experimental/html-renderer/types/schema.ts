/**
 * HTML渲染器 Schema 类型定义
 * 基于反向约束架构设计
 */

// ==================== 全局配置 ====================

export interface PPTMeta {
  title: string;
  theme_id: string;
  aspect_ratio: '16:9' | '4:3';
  author?: string;
}

export interface PPTDocument {
  project_id: string;
  ppt_meta: PPTMeta;
  pages: PagePayload[];
}

// ==================== 页面配置 ====================

export interface PagePayload {
  page_id: string;
  order_index: number;
  layout_id: LayoutId;
  model: LayoutModel;
}

// 布局ID枚举
export type LayoutId =
  | 'cover'           // 封面页
  | 'toc'             // 目录页
  | 'title_content'   // 标题+正文
  | 'title_bullets'   // 标题+要点
  | 'two_column'      // 左右双栏
  | 'process_steps'   // 流程步骤
  | 'ending'          // 结束页
  | 'section_title'   // 章节标题页
  | 'image_full'      // 全图页
  | 'quote'           // 引用页
  // Academic scheme
  | 'cover_academic'
  | 'toc_academic'
  | 'learning_objectives'
  | 'key_concepts'
  | 'theory_explanation'
  | 'case_study'
  | 'comparison_table'
  | 'diagram_illustration'
  | 'key_takeaways'
  | 'ending_academic'
  // Interactive scheme
  | 'cover_interactive'
  | 'agenda_interactive'
  | 'warmup_question'
  | 'poll_interactive'
  | 'story_narrative'
  | 'group_activity'
  | 'mind_map'
  | 'quiz_check'
  | 'discussion_prompt'
  | 'ending_interactive'
  // Visual scheme
  | 'cover_visual'
  | 'timeline_navigation'
  | 'timeline'              // 专属布局（简化名称）
  | 'hero_image'
  | 'gallery_grid'
  | 'before_after'
  | 'infographic'
  | 'split_screen'
  | 'video_placeholder'
  | 'portfolio_showcase'
  | 'portfolio'             // 专属布局（简化名称）
  | 'ending_visual'
  // Practical scheme
  | 'cover_practical'
  | 'checklist_practical'
  | 'safety_notice'
  | 'equipment_intro'
  | 'step_by_step'
  | 'detail_zoom'
  | 'common_mistakes'
  | 'tip_trick'
  | 'practice_exercise'
  | 'ending_practical'
  // Modern scheme - 现代创新方案
  | 'sidebar_card'           // 左侧导航卡片 - 适合目录
  | 'dark_math'              // 科技深色分割 - 适合公式/硬核概念
  | 'flow_process'           // 横向流程图解 - 适合步骤
  | 'overlap'                // 破格叠加 - 适合核心概念引入
  | 'grid_matrix'            // 矩阵宫格 - 适合多点并列/特性
  | 'diagonal_split'         // 动感斜切 - 适合对比
  | 'concentric_focus'       // 同心聚焦 - 适合关键问题/转场
  | 'vertical_timeline'      // 垂直脉络 - 适合时间轴/大纲
  | 'tri_column'             // 三柱支撑 - 适合三大要素
  | 'cinematic_overlay'      // 沉浸全图 - 适合案例/封面
  // Edu dark scheme - 教育深色风方案
  | 'edu_cover'
  | 'edu_toc'
  | 'edu_tri_compare'
  | 'edu_core_hub'
  | 'edu_timeline_steps'
  | 'edu_logic_flow'
  | 'edu_data_board'
  | 'edu_summary';

// 布局Model联合类型
export type LayoutModel =
  | CoverModel
  | TocModel
  | TitleContentModel
  | TitleBulletsModel
  | TwoColumnModel
  | ProcessStepsModel
  | EndingModel
  | SectionTitleModel
  | ImageFullModel
  | QuoteModel
  // 学术方案专属布局
  | LearningObjectivesModel
  | TheoryExplanationModel
  // 互动方案专属布局
  | WarmupQuestionModel
  | PollInteractiveModel
  // 视觉方案专属布局
  | TimelineModel
  | PortfolioModel
  // 实践方案专属布局
  | SafetyNoticeModel
  | DetailZoomModel
  // 现代方案专属布局
  | SidebarCardModel
  | DarkMathModel
  | FlowProcessModel
  | OverlapModel
  | GridMatrixModel
  | DiagonalSplitModel
  | ConcentricFocusModel
  | VerticalTimelineModel
  | TriColumnModel
  | CinematicOverlayModel
  // 教育深色风方案专属布局
  | EduCoverModel
  | EduTocModel
  | EduTriCompareModel
  | EduCoreHubModel
  | EduTimelineStepsModel
  | EduLogicFlowModel
  | EduDataBoardModel
  | EduSummaryModel;

// ==================== 各布局Model定义 ====================

/** 封面页 */
export interface CoverModel {
  title: string;
  subtitle?: string;
  author?: string;
  department?: string;
  date?: string;
  background_image?: string;
}

/** 目录页 */
export interface TocModel {
  title: string;
  items: {
    index: number;
    text: string;
  }[];
  background_image?: string;
}

/** 标题+正文 */
export interface TitleContentModel {
  title: string;
  content: string | string[];
  highlight?: string;
  image?: OptionalImage;    // 可选配图
  background_image?: string;
}

/** 标题+要点 */
export interface TitleBulletsModel {
  title: string;
  subtitle?: string;
  archetype?: string;
  variant?: string;
  bullets: {
    icon?: string;
    text: string;              // 核心概念
    description?: string;      // 关键解释
    example?: string;          // 具体案例（新增）
    note?: string;             // 注意事项（新增）
    dataPoint?: {              // 数据支撑（新增）
      value: string;           // 如"70%"
      unit: string;            // 如"降低成本"
      source?: string;         // 数据来源
    };
  }[];
  keyTakeaway?: string;        // 页面核心要点总结（新增）
  image?: OptionalImage;       // 可选配图
  background_image?: string;
}

/** 左右双栏 */
export interface TwoColumnModel {
  title: string;
  left: ColumnContent;
  right: ColumnContent;
  background_image?: string;
}

export interface ColumnContent {
  type?: 'text' | 'image' | 'bullets';
  header?: string;
  content?: string | string[];
  image_src?: string;
  image_alt?: string;
  bullets?: {
    icon?: string;
    text: string;
    description?: string;
  }[];
}

/** 流程步骤 */
export interface ProcessStepsModel {
  title: string;
  subtitle?: string;
  archetype?: string;
  variant?: string;
  steps: {
    number: number;
    label: string;
    description?: string;
    icon?: string;
  }[];
  image?: OptionalImage;    // 可选配图（显示在步骤下方或侧边）
  background_image?: string;
}

/** 结束页 */
export interface EndingModel {
  title: string;
  subtitle?: string;
  contact?: string;
  archetype?: string;
  variant?: string;
  reflection_blocks?: {
    title: string;
    items: string[];
  }[];
  closing?: string;
  qrcode?: string;
  background_image?: string;
}

/** 章节标题页 */
export interface SectionTitleModel {
  section_number: string | number;
  title: string;
  subtitle?: string;
  background_image?: string;
}

/** 全图页 */
export interface ImageFullModel {
  title?: string;
  image_src: string;
  image_alt?: string;
  caption?: string;
  background_image?: string;
}

/** 引用页 */
export interface QuoteModel {
  quote: string;
  author?: string;
  source?: string;
  background_image?: string;
}

// ==================== 主题类型 ====================

export interface ThemeConfig {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textLight: string;
    background: string;
    backgroundAlt: string;
  };
  fonts: {
    title: string;
    body: string;
  };
  sizes: {
    slideWidth: number;
    slideHeight: number;
    titleSize: string;
    subtitleSize: string;
    bodySize: string;
    smallSize: string;
  };
  spacing: {
    padding: string;
    gap: string;
  };

  // 装饰元素配置（用于视觉差异化）
  decorations?: {
    borderRadius?: string;       // 卡片圆角半径（学术4px vs 互动20px）
    cardShadow?: string;         // 卡片阴影强度
    accentBorder?: boolean;      // 强调边框（学术方案启用）
    footerStyle?: {              // 页脚样式（学术方案显示页码）
      show: boolean;
      height?: string;
      backgroundColor?: string;
    };
  };

  // 布局差异化参数
  layoutVariants?: {
    titleBullets?: {
      cardShape?: 'rectangle' | 'rounded' | 'circle-icon';
      iconStyle?: 'filled' | 'outlined' | 'hand-drawn';
    };
    twoColumn?: {
      dividerStyle?: 'none' | 'solid' | 'dashed';
      columnRatio?: '50-50' | '40-60' | '30-70';
    };
  };

  // 背景图案
  backgroundPatterns?: {
    cover?: string;     // 封面背景URL
    content?: string;   // 内容页背景URL
    opacity?: number;   // 图案透明度
  };
}

// ==================== 图片资源类型 ====================

export interface ImageResource {
  id: string;
  type: 'placeholder' | 'uploaded' | 'generated';
  src: string;  // base64 或 URL
  alt?: string;
}

/**
 * 可选图片字段
 * 用于各布局的可选配图
 */
export interface OptionalImage {
  src: string;              // 图片地址（base64或URL，为空时显示占位符）
  alt?: string;             // 替代文本
  position?: 'left' | 'right';  // 图片位置（相对于内容）
  width?: string;           // 宽度比例，如 "40%"
}

// ==================== 专属布局Model定义 ====================

/** 学习目标布局（学术方案专属） */
export interface LearningObjectivesModel {
  title: string;
  objectives: {
    text: string;           // 目标描述
    level: string;          // 认知层级：记忆/理解/应用/分析/综合/评价
    hours?: number;         // 预计学时
    checked?: boolean;      // 是否完成（复选框）
  }[];
  course_code?: string;     // 课程代码（显示在页脚）
  background_image?: string;
}

/** 理论讲解布局（学术方案专属） */
export interface TheoryExplanationModel {
  title: string;
  theory: string[];         // 理论段落（左栏）
  formulas?: {              // 公式（右栏，可选）
    latex: string;          // LaTeX公式
    explanation: string;    // 公式说明
  }[];
  references?: string[];    // 引用文献（底部脚注）
  background_image?: string;
}

/** 热身问题布局（互动方案专属） */
export interface WarmupQuestionModel {
  question: string;         // 主问题
  thinkTime?: number;       // 思考时间（秒）
  hints?: string[];         // 提示列表
  background_image?: string;
}

/** 投票互动布局（互动方案专属） */
export interface PollInteractiveModel {
  question: string;         // 投票问题
  options: {
    text: string;           // 选项文本
    emoji?: string;         // 选项表情符号
  }[];
  instruction?: string;     // 投票说明
  background_image?: string;
}

/** 时间轴布局（视觉方案专属） */
export interface TimelineModel {
  title: string;
  events: {
    year: string;           // 年份/时间点
    title: string;          // 事件标题
    description: string;    // 事件描述
    icon?: string;          // 事件图标
  }[];
  orientation?: 'horizontal' | 'vertical';  // 时间轴方向
  background_image?: string;
}

/** 作品展示布局（视觉方案专属） */
export interface PortfolioModel {
  title: string;
  subtitle?: string;
  items: {
    image_src: string;      // 作品图片
    title: string;          // 作品标题
    description?: string;   // 作品描述
    tags?: string[];        // 标签
  }[];
  layout?: 'grid' | 'masonry';  // 布局方式
  background_image?: string;
}

/** 安全提示布局（实践方案专属） */
export interface SafetyNoticeModel {
  title: string;
  warnings: {
    level: 'danger' | 'warning' | 'caution';  // 危险级别
    text: string;           // 警告内容
    icon?: string;          // 警告图标
  }[];
  summary?: string;         // 总结说明
  background_image?: string;
}

/** 细节标注布局（实践方案专属） */
export interface DetailZoomModel {
  title: string;
  image_src: string;        // 主图片
  annotations: {
    x: number;              // 标注位置X（百分比）
    y: number;              // 标注位置Y（百分比）
    label: string;          // 标注标签
    description: string;    // 标注说明
  }[];
  background_image?: string;
}

// ==================== 现代方案专属布局Model定义 ====================

/** 左侧导航卡片布局 - 适合目录 */
export interface SidebarCardModel {
  title: string;            // 主标题
  subtitle?: string;        // 副标题/英文标题
  items: {
    index: number;          // 序号
    title: string;          // 项目标题
    subtitle?: string;      // 项目副标题/英文
  }[];
  background_image?: string;
}

/** 科技深色分割布局 - 适合公式/硬核概念 */
export interface DarkMathModel {
  title: string;            // 主标题
  subtitle?: string;        // 副标题/英文
  description: string;      // 左侧描述文字
  note?: string;            // 底部注意提示
  formulas: {
    label: string;          // 公式标签
    latex: string;          // LaTeX公式或数学表达式
    explanation: string;    // 公式说明
  }[];
  background_image?: string;
}

/** 横向流程图解布局 - 适合步骤 */
export interface FlowProcessModel {
  title: string;            // 流程标题
  steps: {
    number: number;         // 步骤序号
    label: string;          // 步骤名称
    description: string;    // 步骤描述
  }[];
  background_image?: string;
}

/** 破格叠加布局 - 适合核心概念引入 */
export interface OverlapModel {
  background_text: string;  // 背景大文字（如 CORE CONCEPT）
  label: string;            // 标签（如 核心概念解析）
  title: string;            // 主标题
  description: string;      // 描述文字
  key_point: string;        // 关键点提示
  accent_color?: string;    // 强调色
  background_image?: string;
}

/** 矩阵宫格布局 - 适合多点并列/特性 */
export interface GridMatrixModel {
  title: string;            // 主标题
  subtitle?: string;        // 副标题/英文
  items: {
    title: string;          // 卡片标题
    description: string;    // 卡片描述
    tag?: string;           // 适用标签
    accent_color?: string;  // 卡片强调色（边框色）
  }[];
  background_image?: string;
}

/** 动感斜切布局 - 适合对比 */
export interface DiagonalSplitModel {
  left: {
    title: string;          // 左侧标题
    subtitle?: string;      // 左侧副标题
    description: string;    // 左侧描述
    points: string[];       // 左侧要点
    accent_color: string;   // 左侧强调色
  };
  right: {
    title: string;          // 右侧标题
    subtitle?: string;      // 右侧副标题
    description: string;    // 右侧描述
    points: string[];       // 右侧要点
    accent_color: string;   // 右侧强调色
  };
  background_image?: string;
}

/** 同心聚焦布局 - 适合关键问题/转场 */
export interface ConcentricFocusModel {
  label: string;            // 标签（如 KEY QUESTION）
  title: string;            // 核心问题/标题
  subtitle?: string;        // 副标题/英文翻译
  accent_color?: string;    // 强调色（光圈颜色）
  background_image?: string;
}

/** 垂直脉络布局 - 适合时间轴/大纲 */
export interface VerticalTimelineModel {
  title: string;            // 主标题
  events: {
    title: string;          // 事件标题
    description: string;    // 事件描述
    is_highlighted?: boolean; // 是否高亮（最后一个）
  }[];
  accent_color?: string;    // 强调色
  background_image?: string;
}

/** 三柱支撑布局 - 适合三大要素 */
export interface TriColumnModel {
  title: string;            // 主标题
  columns: {
    number: number;         // 序号（1,2,3）
    title: string;          // 柱子标题
    description: string;    // 柱子描述
    accent_color: string;   // 柱子强调色
  }[];
  background_image?: string;
}

/** 沉浸全图遮罩布局 - 适合案例/封面 */
export interface CinematicOverlayModel {
  label: string;            // 标签（如 PROJECT SHOWCASE）
  title: string;            // 项目标题
  description: string;      // 项目描述
  metric?: {
    value: string;          // 数值（如 95%）
    label: string;          // 数值标签（如 生成可用率）
  };
  background_image?: string;
}

// ==================== 教育深色风方案专属布局Model定义 ====================

export interface EduCoverModel {
  title: string;
  subtitle?: string;
  variant?: string;
  author?: string;
  department?: string;
  date?: string;
  hero_image?: string;
  background_image?: string;
}

export interface EduTocModel {
  title: string;
  subtitle?: string;
  variant?: string;
  items: {
    index: number;
    text: string;
  }[];
  background_image?: string;
}

export interface EduTriCompareModel {
  title: string;
  badge?: string;
  variant?: string;
  columns: {
    title: string;
    points: string[];
  }[];
  background_image?: string;
}

export interface EduCoreHubModel {
  title: string;
  subtitle?: string;
  variant?: string;
  center_label: string;
  nodes: {
    title: string;
  }[];
  background_image?: string;
}

export interface EduTimelineStepsModel {
  title: string;
  subtitle?: string;
  variant?: string;
  steps: {
    title: string;
    description: string;
    highlights?: string[];
  }[];
  background_image?: string;
}

export interface EduLogicFlowModel {
  title: string;
  variant?: string;
  stages: {
    title: string;
    description: string;
  }[];
  background_image?: string;
}

export interface EduDataBoardModel {
  title: string;
  subtitle?: string;
  variant?: string;
  metrics: {
    value: string;
    label: string;
    note?: string;
  }[];
  bars: {
    label: string;
    baseline: number;
    current: number;
  }[];
  bullets?: {
    text: string;
    description?: string;
    icon?: string;
  }[];
  insight?: string;
  background_image?: string;
}

export interface EduSummaryModel {
  title: string;
  variant?: string;
  columns: {
    title: string;
    points: string[];
  }[];
  closing?: string;
  background_image?: string;
}
