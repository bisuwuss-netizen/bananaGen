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
];
