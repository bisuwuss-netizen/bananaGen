/**
 * 布局组件导出
 */

export { CoverLayout, renderCoverLayoutHTML } from './CoverLayout';
export { TocLayout, renderTocLayoutHTML } from './TocLayout';
export { TitleContentLayout, renderTitleContentLayoutHTML } from './TitleContentLayout';
export { TitleBulletsLayout, renderTitleBulletsLayoutHTML } from './TitleBulletsLayout';
export { TwoColumnLayout, renderTwoColumnLayoutHTML } from './TwoColumnLayout';
export { ProcessStepsLayout, renderProcessStepsLayoutHTML } from './ProcessStepsLayout';
export { EndingLayout, renderEndingLayoutHTML } from './EndingLayout';
export { SectionTitleLayout, renderSectionTitleLayoutHTML } from './SectionTitleLayout';
export { ImageFullLayout, renderImageFullLayoutHTML } from './ImageFullLayout';
export { QuoteLayout, renderQuoteLayoutHTML } from './QuoteLayout';
// Modern scheme - 现代创新方案
export { SidebarCardLayout, renderSidebarCardLayoutHTML } from './SidebarCardLayout';
export { DarkMathLayout, renderDarkMathLayoutHTML } from './DarkMathLayout';
export { FlowProcessLayout, renderFlowProcessLayoutHTML } from './FlowProcessLayout';
export { OverlapLayout, renderOverlapLayoutHTML } from './OverlapLayout';
export { GridMatrixLayout, renderGridMatrixLayoutHTML } from './GridMatrixLayout';
export { DiagonalSplitLayout, renderDiagonalSplitLayoutHTML } from './DiagonalSplitLayout';
export { ConcentricFocusLayout, renderConcentricFocusLayoutHTML } from './ConcentricFocusLayout';
export { VerticalTimelineLayout, renderVerticalTimelineLayoutHTML } from './VerticalTimelineLayout';
export { TriColumnLayout, renderTriColumnLayoutHTML } from './TriColumnLayout';
export { CinematicOverlayLayout, renderCinematicOverlayLayoutHTML } from './CinematicOverlayLayout';

import { LayoutId, LayoutModel, ThemeConfig } from '../types/schema';
import { renderCoverLayoutHTML } from './CoverLayout';
import { renderTocLayoutHTML } from './TocLayout';
import { renderTitleContentLayoutHTML } from './TitleContentLayout';
import { renderTitleBulletsLayoutHTML } from './TitleBulletsLayout';
import { renderTwoColumnLayoutHTML } from './TwoColumnLayout';
import { renderProcessStepsLayoutHTML } from './ProcessStepsLayout';
import { renderEndingLayoutHTML } from './EndingLayout';
import { renderSectionTitleLayoutHTML } from './SectionTitleLayout';
import { renderImageFullLayoutHTML } from './ImageFullLayout';
import { renderQuoteLayoutHTML } from './QuoteLayout';
// Modern scheme - 现代创新方案
import { renderSidebarCardLayoutHTML } from './SidebarCardLayout';
import { renderDarkMathLayoutHTML } from './DarkMathLayout';
import { renderFlowProcessLayoutHTML } from './FlowProcessLayout';
import { renderOverlapLayoutHTML } from './OverlapLayout';
import { renderGridMatrixLayoutHTML } from './GridMatrixLayout';
import { renderDiagonalSplitLayoutHTML } from './DiagonalSplitLayout';
import { renderConcentricFocusLayoutHTML } from './ConcentricFocusLayout';
import { renderVerticalTimelineLayoutHTML } from './VerticalTimelineLayout';
import { renderTriColumnLayoutHTML } from './TriColumnLayout';
import { renderCinematicOverlayLayoutHTML } from './CinematicOverlayLayout';

export const LAYOUT_ID_ALIASES: Record<string, string> = {
  // academic - 专属布局（learning_objectives, theory_explanation）不映射
  cover_academic: 'cover',
  toc_academic: 'toc',
  // learning_objectives: 独立组件
  key_concepts: 'title_bullets',
  // theory_explanation: 独立组件
  case_study: 'title_content',
  comparison_table: 'two_column',
  diagram_illustration: 'image_full',
  key_takeaways: 'title_bullets',
  ending_academic: 'ending',
  // interactive - 专属布局（warmup_question, poll_interactive）不映射
  cover_interactive: 'cover',
  agenda_interactive: 'toc',
  // warmup_question: 独立组件
  // poll_interactive: 独立组件
  story_narrative: 'title_content',
  group_activity: 'title_bullets',
  mind_map: 'image_full',
  quiz_check: 'title_bullets',
  discussion_prompt: 'title_content',
  ending_interactive: 'ending',
  // visual - 专属布局（timeline, portfolio）不映射
  cover_visual: 'cover',
  timeline_navigation: 'toc',
  hero_image: 'image_full',
  gallery_grid: 'image_full',
  before_after: 'two_column',
  infographic: 'title_bullets',
  split_screen: 'two_column',
  video_placeholder: 'image_full',
  // portfolio_showcase: portfolio的别名
  // timeline: 独立组件
  // portfolio: 独立组件
  ending_visual: 'ending',
  // practical - 专属布局（safety_notice, detail_zoom）不映射
  cover_practical: 'cover',
  checklist_practical: 'title_bullets',
  // safety_notice: 独立组件
  equipment_intro: 'two_column',
  step_by_step: 'process_steps',
  // detail_zoom: 独立组件
  common_mistakes: 'two_column',
  tip_trick: 'title_bullets',
  practice_exercise: 'title_content',
  ending_practical: 'ending',
};

export const normalizeLayoutId = (layoutId: LayoutId): LayoutId => {
  return (LAYOUT_ID_ALIASES[layoutId] || layoutId) as LayoutId;
};

/**
 * 根据布局ID渲染HTML字符串
 */
export function renderLayoutHTML(
  layoutId: LayoutId,
  model: LayoutModel,
  theme: ThemeConfig
): string {
  const normalizedId = normalizeLayoutId(layoutId);
  switch (normalizedId) {
    case 'cover':
      return renderCoverLayoutHTML(model as any, theme);
    case 'toc':
      return renderTocLayoutHTML(model as any, theme);
    case 'title_content':
      return renderTitleContentLayoutHTML(model as any, theme);
    case 'title_bullets':
      return renderTitleBulletsLayoutHTML(model as any, theme);
    case 'two_column':
      return renderTwoColumnLayoutHTML(model as any, theme);
    case 'process_steps':
      return renderProcessStepsLayoutHTML(model as any, theme);
    case 'ending':
      return renderEndingLayoutHTML(model as any, theme);
    case 'section_title':
      return renderSectionTitleLayoutHTML(model as any, theme);
    case 'image_full':
      return renderImageFullLayoutHTML(model as any, theme);
    case 'quote':
      return renderQuoteLayoutHTML(model as any, theme);
    // Modern scheme - 现代创新方案
    case 'sidebar_card':
      return renderSidebarCardLayoutHTML(model as any, theme);
    case 'dark_math':
      return renderDarkMathLayoutHTML(model as any, theme);
    case 'flow_process':
      return renderFlowProcessLayoutHTML(model as any, theme);
    case 'overlap':
      return renderOverlapLayoutHTML(model as any, theme);
    case 'grid_matrix':
      return renderGridMatrixLayoutHTML(model as any, theme);
    case 'diagonal_split':
      return renderDiagonalSplitLayoutHTML(model as any, theme);
    case 'concentric_focus':
      return renderConcentricFocusLayoutHTML(model as any, theme);
    case 'vertical_timeline':
      return renderVerticalTimelineLayoutHTML(model as any, theme);
    case 'tri_column':
      return renderTriColumnLayoutHTML(model as any, theme);
    case 'cinematic_overlay':
      return renderCinematicOverlayLayoutHTML(model as any, theme);
    default:
      console.warn(`Unknown layout: ${layoutId}`);
      return `<section style="width:1280px;height:720px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;">
        <p style="color:#666;">未知布局类型: ${layoutId}</p>
      </section>`;
  }
}

/**
 * 布局ID到名称的映射
 */
export const layoutNames: Record<string, string> = {
  cover: '封面页',
  toc: '目录页',
  title_content: '标题+正文',
  title_bullets: '标题+要点',
  two_column: '左右双栏',
  process_steps: '流程步骤',
  ending: '结束页',
  section_title: '章节标题',
  image_full: '全图页',
  quote: '引用页',
  // Modern scheme - 现代创新方案
  sidebar_card: '左侧导航卡片',
  dark_math: '科技深色分割',
  flow_process: '横向流程图解',
  overlap: '破格叠加',
  grid_matrix: '矩阵宫格',
  diagonal_split: '动感斜切',
  concentric_focus: '同心聚焦',
  vertical_timeline: '垂直脉络',
  tri_column: '三柱支撑',
  cinematic_overlay: '沉浸全图',
};
