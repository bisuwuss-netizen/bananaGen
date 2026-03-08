import type { LayoutId, LayoutModel, ThemeConfig } from '../types/schema';
import {
  renderCoverLayoutHTML,
  renderEndingLayoutHTML,
  renderImageFullLayoutHTML,
  renderProcessStepsLayoutHTML,
  renderQuoteLayoutHTML,
  renderSectionTitleLayoutHTML,
  renderTitleBulletsLayoutHTML,
  renderTitleContentLayoutHTML,
  renderTocLayoutHTML,
  renderTwoColumnLayoutHTML,
} from './common';
import {
  renderAcademicCaseStudyLayoutHTML,
  renderAcademicComparisonLayoutHTML,
  renderAcademicDiagramLayoutHTML,
  renderAcademicEndingLayoutHTML,
  renderAcademicNarrativeLayoutHTML,
  renderAcademicPracticeLayoutHTML,
  renderLearningObjectivesLayoutHTML,
  renderTheoryExplanationLayoutHTML,
} from './academic';
import {
  renderCinematicOverlayLayoutHTML,
  renderConcentricFocusLayoutHTML,
  renderDarkMathLayoutHTML,
  renderDiagonalSplitLayoutHTML,
  renderFlowProcessLayoutHTML,
  renderGridMatrixLayoutHTML,
  renderOverlapLayoutHTML,
  renderSidebarCardLayoutHTML,
  renderTriColumnLayoutHTML,
  renderVerticalTimelineLayoutHTML,
} from './modern';
import {
  renderPollInteractiveLayoutHTML,
  renderWarmupQuestionLayoutHTML,
} from './interactive';
import { renderTimelineLayoutHTML, renderPortfolioLayoutHTML } from './visual';
import { renderSafetyNoticeLayoutHTML, renderDetailZoomLayoutHTML } from './practical';
import {
  renderEduCoreHubLayoutHTML,
  renderEduCoverLayoutHTML,
  renderEduDataBoardLayoutHTML,
  renderEduLogicFlowLayoutHTML,
  renderEduQACaseLayoutHTML,
  renderEduSummaryLayoutHTML,
  renderEduTimelineStepsLayoutHTML,
  renderEduTocLayoutHTML,
  renderEduTriCompareLayoutHTML,
} from './edu-dark';
import {
  renderVocationalBulletsLayoutHTML,
  renderVocationalComparisonLayoutHTML,
  renderVocationalContentLayoutHTML,
} from './vocational';
import { normalizeLayoutId } from './aliases';
import { getLayoutDisplayName } from './names';

export function renderLayoutHTML(
  layoutId: LayoutId,
  model: LayoutModel,
  theme: ThemeConfig
): string {
  const normalizedId = normalizeLayoutId(layoutId);
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
    case 'vocational_bullets':
      return renderVocationalBulletsLayoutHTML(enrichedModel as any, theme);
    case 'vocational_content':
      return renderVocationalContentLayoutHTML(enrichedModel as any, theme);
    case 'vocational_comparison':
      return renderVocationalComparisonLayoutHTML(enrichedModel as any, theme);
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
