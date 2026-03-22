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
  renderVocationalSopBannerLayoutHTML,
  renderVocationalWarningSplitLayoutHTML,
  renderVocationalBlueprintZoomLayoutHTML,
  renderVocationalPivHudLayoutHTML,
  renderVocationalIntroCoverLayoutHTML,
  renderVocationalMissionTocLayoutHTML,
  renderVocationalTargetLockLayoutHTML,
  renderVocationalSafetyCheckLayoutHTML,
  renderVocationalEquipmentGridLayoutHTML,
  renderVocationalMissionCompleteLayoutHTML,
  renderVocationalFaultDiagnosticLayoutHTML,
  renderVocationalPracticeSandboxLayoutHTML,
} from './vocational';
import {
  renderBlueprintCoverLayoutHTML,
  renderBlueprintTocLayoutHTML,
  renderBlueprintSpecCardLayoutHTML,
  renderBlueprintQuoteLayoutHTML,
  renderBlueprintAnnotationLayoutHTML,
  renderBlueprintSectionTitleLayoutHTML,
  renderBlueprintDualPanelLayoutHTML,
  renderBlueprintTimelineLayoutHTML,
  renderBlueprintBentoGridLayoutHTML,
  renderBlueprintTriCompareLayoutHTML,
  renderBlueprintGalleryLayoutHTML,
  renderBlueprintBigRevealLayoutHTML,
  renderBlueprintClosingLayoutHTML,
} from './blueprint';
import {
  renderVaultCoverLayoutHTML,
  renderVaultIndexLayoutHTML,
  renderVaultKpiGridLayoutHTML,
  renderVaultHeatmapLayoutHTML,
  renderVaultTimelineLayoutHTML,
  renderVaultSplitBriefLayoutHTML,
  renderVaultFlowCircuitLayoutHTML,
  renderVaultDashboardLayoutHTML,
  renderVaultDeepAnalysisLayoutHTML,
  renderVaultTerminalLayoutHTML,
  renderVaultCompareLayoutHTML,
  renderVaultDebriefLayoutHTML,
} from './vault';
import { normalizeLayoutId } from './aliases';
import { getLayoutDisplayName } from './names';


export function renderLayoutHTML(
  layoutId: LayoutId,
  model: LayoutModel,
  theme: ThemeConfig
): string {
  let normalizedId = normalizeLayoutId(layoutId);

  // 针对高职顶级美学模板的运行时特殊路由拦截 (Theme-aware runtime substitution)
  if (theme?.id === 'warm_edu') {
    if (normalizedId === 'process_steps' || normalizedId === 'vertical_timeline') {
      normalizedId = 'vocational_sop_banner';
    } else if (normalizedId === 'two_column' || normalizedId === 'vocational_comparison') {
      normalizedId = 'vocational_warning_split';
    }
    if (normalizedId === 'detail_zoom') {
      normalizedId = 'vocational_blueprint_zoom';
    }
  }

  // 工业蓝图 (minimal_clean) 专属映射
  if (theme?.id === 'minimal_clean') {
    const blueprintMap: Record<string, LayoutId> = {
      cover: 'blueprint_cover',
      toc: 'blueprint_toc',
      quote: 'blueprint_quote',
      section_title: 'blueprint_section_title',
      ending: 'blueprint_closing',
      two_column: 'blueprint_dual_panel',
      timeline: 'blueprint_timeline',
      portfolio: 'blueprint_gallery',
      learning_objectives: 'blueprint_spec_card',
      title_bullets: 'blueprint_bento_grid',
      edu_tri_compare: 'blueprint_tri_compare',
      detail_zoom: 'blueprint_annotation',
    };
    if (blueprintMap[normalizedId]) {
      normalizedId = blueprintMap[normalizedId];
    }
  }

  // 工业精密 (business_pro) → 数据终端风格映射
  if (theme?.id === 'business_pro') {
    const vaultMap: Record<string, LayoutId> = {
      cover: 'vault_cover',
      toc: 'vault_index',
      ending: 'vault_debrief',
      two_column: 'vault_split_brief',
      process_steps: 'vault_flow_circuit',
      timeline: 'vault_timeline',
      title_bullets: 'vault_kpi_grid',
      edu_data_board: 'vault_dashboard',
      edu_tri_compare: 'vault_compare',
    };
    if (vaultMap[normalizedId]) {
      normalizedId = vaultMap[normalizedId];
    }
  }
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
    case 'vocational_sop_banner':
      return renderVocationalSopBannerLayoutHTML(enrichedModel as any, theme);
    case 'vocational_warning_split':
      return renderVocationalWarningSplitLayoutHTML(enrichedModel as any, theme);
    case 'vocational_blueprint_zoom':
      return renderVocationalBlueprintZoomLayoutHTML(enrichedModel as any, theme);
    case 'vocational_piv_hud':
      return renderVocationalPivHudLayoutHTML(enrichedModel as any, theme);
    case 'vocational_intro_cover':
      return renderVocationalIntroCoverLayoutHTML(model as any, theme);
    case 'vocational_mission_toc':
      return renderVocationalMissionTocLayoutHTML(model as any, theme);
    case 'vocational_target_lock':
      return renderVocationalTargetLockLayoutHTML(model as any, theme);
    case 'vocational_safety_check':
      return renderVocationalSafetyCheckLayoutHTML(model as any, theme);
    case 'vocational_equipment_grid':
      return renderVocationalEquipmentGridLayoutHTML(model as any, theme);
    case 'vocational_fault_diagnostic':
      return renderVocationalFaultDiagnosticLayoutHTML(model as any, theme);
    case 'vocational_practice_sandbox':
      return renderVocationalPracticeSandboxLayoutHTML(model as any, theme);
    case 'vocational_mission_complete':
      return renderVocationalMissionCompleteLayoutHTML(model as any, theme);
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

    // Blueprint scheme — 工业蓝图型专属布局
    case 'blueprint_cover':
      return renderBlueprintCoverLayoutHTML(model as any);
    case 'blueprint_toc':
      return renderBlueprintTocLayoutHTML(model as any);
    case 'blueprint_spec_card':
      return renderBlueprintSpecCardLayoutHTML(model as any);
    case 'blueprint_quote':
      return renderBlueprintQuoteLayoutHTML(model as any);
    case 'blueprint_annotation':
      return renderBlueprintAnnotationLayoutHTML(model as any);
    case 'blueprint_section_title':
      return renderBlueprintSectionTitleLayoutHTML(model as any);
    case 'blueprint_dual_panel':
      return renderBlueprintDualPanelLayoutHTML(model as any);
    case 'blueprint_timeline':
      return renderBlueprintTimelineLayoutHTML(model as any);
    case 'blueprint_bento_grid':
      return renderBlueprintBentoGridLayoutHTML(model as any);
    case 'blueprint_tri_compare':
      return renderBlueprintTriCompareLayoutHTML(model as any);
    case 'blueprint_gallery':
      return renderBlueprintGalleryLayoutHTML(model as any);
    case 'blueprint_big_reveal':
      return renderBlueprintBigRevealLayoutHTML(model as any);
    case 'blueprint_closing':
      return renderBlueprintClosingLayoutHTML(enrichedModel as any, theme);
    
    // DATA VAULT
    case 'vault_cover':
      return renderVaultCoverLayoutHTML(enrichedModel as any, theme);
    case 'vault_index':
      return renderVaultIndexLayoutHTML(enrichedModel as any, theme);
    case 'vault_kpi_grid':
      return renderVaultKpiGridLayoutHTML(enrichedModel as any, theme);
    case 'vault_heatmap':
      return renderVaultHeatmapLayoutHTML(enrichedModel as any, theme);
    case 'vault_timeline':
      return renderVaultTimelineLayoutHTML(enrichedModel as any, theme);
    case 'vault_split_brief':
      return renderVaultSplitBriefLayoutHTML(enrichedModel as any, theme);
    case 'vault_flow_circuit':
      return renderVaultFlowCircuitLayoutHTML(enrichedModel as any, theme);
    case 'vault_dashboard':
      return renderVaultDashboardLayoutHTML(enrichedModel as any, theme);
    case 'vault_deep_analysis':
      return renderVaultDeepAnalysisLayoutHTML(enrichedModel as any, theme);
    case 'vault_terminal':
      return renderVaultTerminalLayoutHTML(enrichedModel as any, theme);
    case 'vault_compare':
      return renderVaultCompareLayoutHTML(enrichedModel as any, theme);
    case 'vault_debrief':
      return renderVaultDebriefLayoutHTML(enrichedModel as any, theme);

    default:
      console.warn(`Unknown layout: ${layoutId}`);
      return `<section style="width:1280px;height:720px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;">
        <p style="color:#666;">未知布局类型：${getLayoutDisplayName(layoutId)}</p>
      </section>`;
  }
}
