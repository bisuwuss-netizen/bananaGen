import {
  layoutSchemePreviews,
  type LayoutSchemePreview,
} from '@/data/layoutSchemePreviews';

export interface LayoutScheme {
  id: string;
  name: string;
  description: string;
  tags: string[];
  accent: string;
  preview: LayoutSchemePreview;
}

export const layoutSchemes: LayoutScheme[] = [
  {
    id: 'edu_dark',
    name: '深色教育型',
    description: '适合教学汇报与研究路演，深色沉浸视觉搭配结构化演进叙事。',
    tags: ['教育', '深色', '叙事'],
    accent: '#06b6d4',
    preview: layoutSchemePreviews.edu_dark,
  },
  {
    id: 'tech_blue',
    name: '科技发布型',
    description: '适合产品发布、技术路演与企业培训，强调清晰结构与高可读性。',
    tags: ['技术', '发布', '清晰'],
    accent: '#0f4c81',
    preview: layoutSchemePreviews.tech_blue,
  },
  {
    id: 'academic',
    name: '学术研究型',
    description: '适合课程讲义和研究汇报，信息密度高，逻辑链条完整。',
    tags: ['学术', '研究', '严谨'],
    accent: '#334155',
    preview: layoutSchemePreviews.academic,
  },
  {
    id: 'interactive',
    name: '课堂互动型',
    description: '适合教学互动和公开课，强调提问、反馈与节奏切换。',
    tags: ['互动', '课堂', '引导'],
    accent: '#1d9bf0',
    preview: layoutSchemePreviews.interactive,
  },
  {
    id: 'visual',
    name: '视觉叙事型',
    description: '适合品牌故事、设计案例和历史主题，强调大图与故事线。',
    tags: ['视觉', '叙事', '案例'],
    accent: '#e11d48',
    preview: layoutSchemePreviews.visual,
  },
  {
    id: 'practical',
    name: '实操流程型',
    description: '适合操作说明和技能培训，强调步骤、风险提示与检查点。',
    tags: ['实操', '流程', '技能'],
    accent: '#0f766e',
    preview: layoutSchemePreviews.practical,
  },
  {
    id: 'modern',
    name: '现代先锋型',
    description: '适合高冲击视觉提案，突出非对称构图和品牌气质。',
    tags: ['现代', '创意', '冲击'],
    accent: '#f97316',
    preview: layoutSchemePreviews.modern,
  },
  {
    id: 'minimal_clean',
    name: '工业蓝图型',
    description: '采用极简冷峻的重工业美学，以CAD透视线稿和微距瞄准框放大精密结构，适合硬核机械与制造类教学。',
    tags: ['蓝图', '微距', '精密', '冷峻'],
    accent: '#00FFCC',
    preview: layoutSchemePreviews.minimal_clean,
  },
  {
    id: 'warm_edu',
    name: '高危实训型',
    description: '采用绝对安全导向的重工现场风格，以刺眼的红黄对比色和硬朗醒目的SOP排版，适合对防呆标准极高的电气实操。',
    tags: ['高危', 'SOP', '警戒', '防呆'],
    accent: '#FF3333',
    preview: layoutSchemePreviews.warm_edu,
  },
  {
    id: 'business_pro',
    name: '重工终端型',
    description: '借鉴机组主控室监控台与战斗级HUD界面，使用深色高反差雷达表盘和战术终端设计，适合高压环境与设备运维。',
    tags: ['终端', 'HUD', '矩阵', '暗域'],
    accent: '#39FF14',
    preview: layoutSchemePreviews.business_pro,
  },
];
