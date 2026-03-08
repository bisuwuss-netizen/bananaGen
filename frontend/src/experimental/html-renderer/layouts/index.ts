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
// Academic scheme - 学术严谨方案
export { LearningObjectivesLayout, renderLearningObjectivesLayoutHTML } from './LearningObjectivesLayout';
export { TheoryExplanationLayout, renderTheoryExplanationLayoutHTML } from './TheoryExplanationLayout';
export { AcademicNarrativeLayout, renderAcademicNarrativeLayoutHTML } from './AcademicNarrativeLayout';
export { AcademicCaseStudyLayout, renderAcademicCaseStudyLayoutHTML } from './AcademicCaseStudyLayout';
export { AcademicComparisonLayout, renderAcademicComparisonLayoutHTML } from './AcademicComparisonLayout';
export { AcademicDiagramLayout, renderAcademicDiagramLayoutHTML } from './AcademicDiagramLayout';
export { AcademicPracticeLayout, renderAcademicPracticeLayoutHTML } from './AcademicPracticeLayout';
export { AcademicEndingLayout, renderAcademicEndingLayoutHTML } from './AcademicEndingLayout';
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
export { PollInteractiveLayout, renderPollInteractiveLayoutHTML } from './PollInteractiveLayout';
export { WarmupQuestionLayout, renderWarmupQuestionLayoutHTML } from './WarmupQuestionLayout';
export { TimelineLayout, renderTimelineLayoutHTML } from './TimelineLayout';
export { PortfolioLayout, renderPortfolioLayoutHTML } from './PortfolioLayout';
export { SafetyNoticeLayout, renderSafetyNoticeLayoutHTML } from './SafetyNoticeLayout';
export { DetailZoomLayout, renderDetailZoomLayoutHTML } from './DetailZoomLayout';
// Edu dark scheme
export { EduCoverLayout, renderEduCoverLayoutHTML } from './EduCoverLayout';
export { EduTocLayout, renderEduTocLayoutHTML } from './EduTocLayout';
export { EduTriCompareLayout, renderEduTriCompareLayoutHTML } from './EduTriCompareLayout';
export { EduCoreHubLayout, renderEduCoreHubLayoutHTML } from './EduCoreHubLayout';
export { EduTimelineStepsLayout, renderEduTimelineStepsLayoutHTML } from './EduTimelineStepsLayout';
export { EduLogicFlowLayout, renderEduLogicFlowLayoutHTML } from './EduLogicFlowLayout';
export { EduDataBoardLayout, renderEduDataBoardLayoutHTML } from './EduDataBoardLayout';
export { EduSummaryLayout, renderEduSummaryLayoutHTML } from './EduSummaryLayout';
export { EduQACaseLayout, renderEduQACaseLayoutHTML } from './EduQACaseLayout';
// Vocational specialized layouts
export { VocationalBulletsLayout, renderVocationalBulletsLayoutHTML } from './VocationalBulletsLayout';
export { VocationalContentLayout, renderVocationalContentLayoutHTML } from './VocationalContentLayout';
export { VocationalComparisonLayout, renderVocationalComparisonLayoutHTML } from './VocationalComparisonLayout';

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
// Academic scheme - 学术严谨方案
import { renderLearningObjectivesLayoutHTML } from './LearningObjectivesLayout';
import { renderTheoryExplanationLayoutHTML } from './TheoryExplanationLayout';
import { renderAcademicNarrativeLayoutHTML } from './AcademicNarrativeLayout';
import { renderAcademicCaseStudyLayoutHTML } from './AcademicCaseStudyLayout';
import { renderAcademicComparisonLayoutHTML } from './AcademicComparisonLayout';
import { renderAcademicDiagramLayoutHTML } from './AcademicDiagramLayout';
import { renderAcademicPracticeLayoutHTML } from './AcademicPracticeLayout';
import { renderAcademicEndingLayoutHTML } from './AcademicEndingLayout';
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
import { renderPollInteractiveLayoutHTML } from './PollInteractiveLayout';
import { renderWarmupQuestionLayoutHTML } from './WarmupQuestionLayout';
import { renderTimelineLayoutHTML } from './TimelineLayout';
import { renderPortfolioLayoutHTML } from './PortfolioLayout';
import { renderSafetyNoticeLayoutHTML } from './SafetyNoticeLayout';
import { renderDetailZoomLayoutHTML } from './DetailZoomLayout';
// Edu dark scheme
import { renderEduCoverLayoutHTML } from './EduCoverLayout';
import { renderEduTocLayoutHTML } from './EduTocLayout';
import { renderEduTriCompareLayoutHTML } from './EduTriCompareLayout';
import { renderEduCoreHubLayoutHTML } from './EduCoreHubLayout';
import { renderEduTimelineStepsLayoutHTML } from './EduTimelineStepsLayout';
import { renderEduLogicFlowLayoutHTML } from './EduLogicFlowLayout';
import { renderEduDataBoardLayoutHTML } from './EduDataBoardLayout';
import { renderEduSummaryLayoutHTML } from './EduSummaryLayout';
import { renderEduQACaseLayoutHTML } from './EduQACaseLayout';
// Vocational specialized layouts
import { renderVocationalBulletsLayoutHTML } from './VocationalBulletsLayout';
import { renderVocationalContentLayoutHTML } from './VocationalContentLayout';
import { renderVocationalComparisonLayoutHTML } from './VocationalComparisonLayout';

export const LAYOUT_ID_ALIASES: Record<string, string> = {
  // academic
  cover_academic: 'cover',
  toc_academic: 'toc',
  key_concepts: 'title_bullets',
  key_takeaways: 'title_bullets',
  // interactive
  cover_interactive: 'cover',
  agenda_path: 'toc',
  story_narrative: 'vocational_content',
  group_collab: 'vocational_bullets',
  mind_map_structure: 'image_full',
  quiz_interaction: 'vocational_bullets',
  case_discussion: 'vocational_content',
  feedback_poll: 'vocational_content',
  discussion_card: 'vocational_content',
  reflection_quiz: 'title_bullets',
  role_play_scenario: 'vocational_content',
  warmup_inquiry: 'warmup_question',
  ending_interactive: 'ending',
  // visual
  cover_field: 'cover',
  timeline_evolution: 'timeline',
  field_observation: 'image_full',
  gallery_professional: 'portfolio',
  case_before_after: 'vocational_comparison',
  infographic_flow: 'vocational_bullets',
  site_survey: 'image_full',
  specimen_detail: 'detail_zoom',
  portfolio_industry: 'portfolio',
  ending_field: 'ending',
  // practical
  cover_practical: 'cover',
  checklist_verification: 'vocational_bullets',
  equipment_orientation: 'vocational_comparison',
  sop_vertical_steps: 'vertical_timeline',
  common_faults: 'vocational_comparison',
  technical_tip: 'quote',
  task_instruction: 'vocational_content',
  safety_protocol: 'safety_notice',
  detail_specs: 'vocational_content',
  ending_practical: 'ending',
  // tech_blue
  cover_tech: 'cover',
  arch_blocks: 'vocational_content',
  flow_logic_sequence: 'process_steps',
  param_dashboard: 'edu_data_board',
  protocol_analysis: 'vocational_bullets',
  requirement_specs: 'vocational_bullets',
  system_comparison: 'vocational_comparison',
  tech_principle: 'vocational_content',
  toc_tech: 'toc',
  ending_tech: 'ending',
  // modern (management)
  cover_modern: 'cover',
  business_canvas: 'grid_matrix',
  comparison_matrix: 'vocational_comparison',
  legal_regulation: 'vocational_content',
  org_structure_flow: 'vocational_bullets',
  process_sop_standard: 'process_steps',
  stat_report: 'edu_data_board',
  strategic_pillars: 'tri_column',
  toc_modern: 'toc',
  ending_modern: 'ending',
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
  // Inject layoutId into model for vocational specialists
  const enrichedModel = { ...model, layoutId };

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
    // Vocational specialized
    case 'vocational_bullets':
      return renderVocationalBulletsLayoutHTML(enrichedModel as any, theme);
    case 'vocational_content':
      return renderVocationalContentLayoutHTML(enrichedModel as any, theme);
    case 'vocational_comparison':
      return renderVocationalComparisonLayoutHTML(enrichedModel as any, theme);
    // Academic scheme - 学术严谨方案
    case 'learning_objectives':
      return renderLearningObjectivesLayoutHTML(model as any, theme);
    case 'theory_explanation':
      return renderTheoryExplanationLayoutHTML(model as any, theme);
    case 'academic_narrative':
      return renderAcademicNarrativeLayoutHTML(model as any, theme);
    case 'case_study':
      return renderAcademicCaseStudyLayoutHTML(model as any, theme);
    case 'comparison_table':
      return renderAcademicComparisonLayoutHTML(model as any, theme);
    case 'diagram_illustration':
      return renderAcademicDiagramLayoutHTML(model as any, theme);
    case 'academic_practice':
      return renderAcademicPracticeLayoutHTML(model as any, theme);
    case 'ending_academic':
      return renderAcademicEndingLayoutHTML(model as any, theme);
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
    case 'poll_interactive':
      return renderPollInteractiveLayoutHTML(model as any, theme);
    case 'warmup_question':
      return renderWarmupQuestionLayoutHTML(model as any, theme);
    case 'timeline':
      return renderTimelineLayoutHTML(model as any, theme);
    case 'portfolio':
      return renderPortfolioLayoutHTML(model as any, theme);
    case 'safety_notice':
      return renderSafetyNoticeLayoutHTML(model as any, theme);
    case 'detail_zoom':
      return renderDetailZoomLayoutHTML(model as any, theme);
    // Edu dark scheme
    case 'edu_cover':
      return renderEduCoverLayoutHTML(model as any, theme);
    case 'edu_toc':
      return renderEduTocLayoutHTML(model as any, theme);
    case 'edu_tri_compare':
      return renderEduTriCompareLayoutHTML(model as any, theme);
    case 'edu_core_hub':
      return renderEduCoreHubLayoutHTML(model as any, theme);
    case 'edu_timeline_steps':
      return renderEduTimelineStepsLayoutHTML(model as any, theme);
    case 'edu_logic_flow':
      return renderEduLogicFlowLayoutHTML(model as any, theme);
    case 'edu_data_board':
      return renderEduDataBoardLayoutHTML(model as any, theme);
    case 'edu_summary':
      return renderEduSummaryLayoutHTML(model as any, theme);
    case 'edu_qa_case':
      return renderEduQACaseLayoutHTML(model as any, theme);
    default:
      console.warn(`Unknown layout: ${layoutId}`);
      return `<section style="width:1280px;height:720px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;">
        <p style="color:#666;">未知布局类型：${getLayoutDisplayName(layoutId)}</p>
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
  vocational_bullets: '要点讲解',
  vocational_content: '内容讲解',
  vocational_comparison: '对比讲解',
  learning_objectives: '学习目标',
  theory_explanation: '理论推导',
  academic_narrative: '长文叙述',
  case_study: '案例分析',
  comparison_table: '对比分析',
  diagram_illustration: '原理图解',
  academic_practice: '随堂实训',
  ending_academic: '课程结束',
  cover_academic: '学术封面',
  toc_academic: '学术目录',
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
  cinematic_overlay: '未来沉浸全图',
  // Interactive scheme - 互动探究型
  agenda_path: '学程地图',
  case_discussion: '案例研讨',
  cover_interactive: '导入封面',
  ending_interactive: '评价结语',
  feedback_poll: '即时反馈',
  group_collab: '协作任务',
  group_activity: '小组活动',
  mind_map_structure: '知识脑图',
  mind_map: '思维导图',
  quiz_interaction: '交互测验',
  quiz_check: '课堂测验',
  role_play_scenario: '情境模拟',
  discussion_prompt: '讨论引导',
  agenda_interactive: '互动议程',
  warmup_inquiry: '课前探究',
  warmup_question: '热身提问',
  poll_interactive: '投票互动',
  story_narrative: '故事叙述',
  // Modern Management - 现代管理型
  business_canvas: '业务看板',
  comparison_matrix: '标准对比',
  cover_modern: '管理封面',
  ending_modern: '总结展望',
  legal_regulation: '规则解析',
  org_structure_flow: '组织架构',
  process_sop_standard: '标杆流程',
  stat_report: '运行分析',
  strategic_pillars: '核心支柱',
  toc_modern: '专业导览',
  // Vocational Practice - 精益实操型
  checklist_verification: '核查清单',
  common_faults: '故障排除',
  cover_practical: '实训封面',
  detail_specs: '零件精度',
  ending_practical: '实训总结',
  equipment_orientation: '设备认知',
  safety_protocol: '安全禁令',
  sop_vertical_steps: 'SOP手册',
  task_instruction: '工单指令',
  technical_tip: '讲师小结',
  // Engineering Logic - 技术逻辑型
  arch_blocks: '技术架构',
  cover_tech: '技术封面',
  ending_tech: '技术演进',
  flow_logic_sequence: '逻辑时序',
  param_dashboard: '性能看板',
  protocol_analysis: '协议拆解',
  requirement_specs: '需求规格',
  system_comparison: '选型对比',
  tech_principle: '技术原理',
  toc_tech: '技术大纲',
  // Industry Showcase - 行业展示型
  cover_visual: '视觉封面',
  timeline_navigation: '时间导航',
  timeline: '时间轴',
  hero_image: '主视觉大图',
  gallery_grid: '图库网格',
  before_after: '前后对比',
  infographic: '信息图解',
  split_screen: '分屏对照',
  video_placeholder: '视频占位',
  portfolio_showcase: '作品展示',
  portfolio: '作品集展示',
  ending_visual: '视觉收尾',
  case_before_after: '修缮对比',
  cover_field: '现场封面',
  ending_field: '现场收束',
  field_observation: '现场观测',
  gallery_professional: '专业图库',
  infographic_flow: '图解流',
  portfolio_industry: '成果品鉴',
  site_survey: '踏勘报告',
  specimen_detail: '标本特写',
  timeline_evolution: '演进轴线',
  checklist_practical: '操作清单',
  safety_notice: '安全提示',
  equipment_intro: '设备介绍',
  step_by_step: '步骤拆解',
  detail_zoom: '细节放大',
  common_mistakes: '常见错误',
  tip_trick: '技巧提示',
  practice_exercise: '练习实操',
  // Edu dark scheme
  edu_cover: '职教通用封面',
  edu_toc: '模块导览',
  edu_tri_compare: '三维对比',
  edu_core_hub: '核心框架',
  edu_timeline_steps: '实施路径',
  edu_logic_flow: '教学链路',
  edu_data_board: '数据看板',
  edu_summary: '反思评价',
  edu_qa_case: '典型案例',
};

export const getLayoutDisplayName = (layoutId?: string | null): string => {
  if (!layoutId) {
    return '未知布局';
  }

  const directName = layoutNames[layoutId];
  if (directName) {
    return directName;
  }

  const normalizedId = normalizeLayoutId(layoutId as LayoutId);
  return layoutNames[normalizedId] || layoutId;
};
