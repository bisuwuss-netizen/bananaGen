/**
 * 幻灯片渲染器组件
 * 根据布局ID动态渲染对应的布局组件
 */

import React from 'react';
import {
  PagePayload,
  ThemeConfig,
  LayoutId,
  CoverModel,
  TocModel,
  TitleContentModel,
  TitleBulletsModel,
  TwoColumnModel,
  ProcessStepsModel,
  EndingModel,
  SectionTitleModel,
  ImageFullModel,
  QuoteModel,
  // 专属布局Model
  LearningObjectivesModel,
  TheoryExplanationModel,
  AcademicNarrativeModel,
  AcademicCaseStudyModel,
  AcademicComparisonModel,
  AcademicDiagramModel,
  AcademicPracticeModel,
  AcademicEndingModel,
  WarmupQuestionModel,
  PollInteractiveModel,
  TimelineModel,
  PortfolioModel,
  SafetyNoticeModel,
  DetailZoomModel,
  // Modern scheme - 现代创新方案
  SidebarCardModel,
  DarkMathModel,
  FlowProcessModel,
  OverlapModel,
  GridMatrixModel,
  DiagonalSplitModel,
  ConcentricFocusModel,
  VerticalTimelineModel,
  TriColumnModel,
  CinematicOverlayModel,
  // Edu dark scheme
  EduCoverModel,
  EduTocModel,
  EduTriCompareModel,
  EduCoreHubModel,
  EduTimelineStepsModel,
  EduLogicFlowModel,
  EduDataBoardModel,
  EduSummaryModel,
  EduQACaseModel,
} from '../types/schema';
import {
  CoverLayout,
  TocLayout,
  TitleContentLayout,
  TitleBulletsLayout,
  TwoColumnLayout,
  ProcessStepsLayout,
  EndingLayout,
  SectionTitleLayout,
  ImageFullLayout,
  QuoteLayout,
} from '../layouts/common';
import {
  LearningObjectivesLayout,
  TheoryExplanationLayout,
  AcademicNarrativeLayout,
  AcademicCaseStudyLayout,
  AcademicComparisonLayout,
  AcademicDiagramLayout,
  AcademicPracticeLayout,
  AcademicEndingLayout,
} from '../layouts/academic';
import {
  WarmupQuestionLayout,
  PollInteractiveLayout,
} from '../layouts/interactive';
import {
  TimelineLayout,
  PortfolioLayout,
} from '../layouts/visual';
import {
  SafetyNoticeLayout,
  DetailZoomLayout,
} from '../layouts/practical';
import {
  SidebarCardLayout,
  DarkMathLayout,
  FlowProcessLayout,
  OverlapLayout,
  GridMatrixLayout,
  DiagonalSplitLayout,
  ConcentricFocusLayout,
  VerticalTimelineLayout,
  TriColumnLayout,
  CinematicOverlayLayout,
} from '../layouts/modern';
import {
  EduCoverLayout,
  EduTocLayout,
  EduTriCompareLayout,
  EduCoreHubLayout,
  EduTimelineStepsLayout,
  EduLogicFlowLayout,
  EduDataBoardLayout,
  EduSummaryLayout,
  EduQACaseLayout,
} from '../layouts/edu-dark';
import {
  VocationalBulletsLayout,
  VocationalContentLayout,
  VocationalComparisonLayout,
  VocationalSopBannerLayout,
  VocationalWarningSplitLayout,
  VocationalBlueprintZoomLayout,
  VocationalPivHudLayout,
  VocationalIntroCoverLayout,
  VocationalMissionTocLayout,
  VocationalTargetLockLayout,
  VocationalSafetyCheckLayout,
  VocationalEquipmentGridLayout,
  VocationalFaultDiagnosticLayout,
  VocationalPracticeSandboxLayout,
  VocationalMissionCompleteLayout,
} from '../layouts/vocational';
import {
  BlueprintCoverLayout,
  BlueprintTocLayout,
  BlueprintSpecCardLayout,
  BlueprintQuoteLayout,
  BlueprintAnnotationLayout,
  BlueprintSectionTitleLayout,
  BlueprintDualPanelLayout,
  BlueprintTimelineLayout,
  BlueprintBentoGridLayout,
  BlueprintTriCompareLayout,
  BlueprintGalleryLayout,
  BlueprintBigRevealLayout,
  BlueprintClosingLayout,
} from '../layouts/blueprint';
import {
  VaultCoverLayout,
  VaultIndexLayout,
  VaultKpiGridLayout,
  VaultHeatmapLayout,
  VaultTimelineLayout,
  VaultSplitBriefLayout,
  VaultFlowCircuitLayout,
  VaultDashboardLayout,
  VaultDeepAnalysisLayout,
  VaultTerminalLayout,
  VaultCompareLayout,
  VaultDebriefLayout,
} from '../layouts/vault';
import { getLayoutDisplayName, normalizeLayoutId } from '../layouts';

interface SlideRendererProps {
  page: PagePayload;
  theme: ThemeConfig;
  /** 缩放：数字为比例，字符串为 CSS 表达式（如 calc(...)），用于 transform: scale(...) */
  scale?: number | string;
  onClick?: () => void;
  isSelected?: boolean;
  onImageUpload?: (slotPath: string) => void; // 图片上传回调，传入 slot 路径
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  page,
  theme,
  scale = 1,
  onClick,
  isSelected = false,
  onImageUpload,
}) => {
  // 防御性检查
  if (!page) {
    console.error('[SlideRenderer] page is null/undefined');
    return (
      <div style={{
        width: theme?.sizes?.slideWidth || 1280,
        height: theme?.sizes?.slideHeight || 720,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee',
        color: '#c00',
        fontSize: '18px',
      }}>
        错误: page 数据为空
      </div>
    );
  }

  const { layout_id, model } = page;

  // 检查 layout_id
  if (!layout_id) {
    console.error('[SlideRenderer] layout_id is null/undefined, page:', page);
    return (
      <div style={{
        width: theme?.sizes?.slideWidth || 1280,
        height: theme?.sizes?.slideHeight || 720,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee',
        color: '#c00',
        fontSize: '18px',
      }}>
        错误: layout_id 为空
      </div>
    );
  }

  let normalizedLayoutId = normalizeLayoutId(layout_id);

  // 针对高职顶级美学模板的运行时特殊路由拦截 (Theme-aware runtime layout substitution)
  if (theme?.id === 'warm_edu') {
    if (normalizedLayoutId === 'process_steps' || normalizedLayoutId === 'vertical_timeline') {
      normalizedLayoutId = 'vocational_sop_banner';
    } else if (normalizedLayoutId === 'two_column' || normalizedLayoutId === 'vocational_comparison') {
      normalizedLayoutId = 'vocational_warning_split';
    }
  } else if (theme?.id === 'minimal_clean') {
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
    if (blueprintMap[normalizedLayoutId]) {
      normalizedLayoutId = blueprintMap[normalizedLayoutId];
    }
  } else if (theme?.id === 'business_pro') {
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
    if (vaultMap[normalizedLayoutId]) {
      normalizedLayoutId = vaultMap[normalizedLayoutId];
    }
  }
  
  // 检查 model
  if (!model) {
    console.error('[SlideRenderer] model is null/undefined, layout_id:', layout_id);
    return (
      <div style={{
        width: theme?.sizes?.slideWidth || 1280,
        height: theme?.sizes?.slideHeight || 720,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee',
        color: '#c00',
        fontSize: '18px',
      }}>
        错误: model 为空（布局：{getLayoutDisplayName(layout_id)}）
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: theme.sizes.slideWidth,
    height: theme.sizes.slideHeight,
    boxShadow: isSelected
      ? `0 0 0 4px ${theme.colors.accent}, 0 4px 20px rgba(0,0,0,0.15)`
      : '0 4px 20px rgba(0,0,0,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s ease',
  };

  const renderLayout = () => {
    try {
      console.log('[SlideRenderer] Rendering layout:', normalizedLayoutId, 'model:', model);
      switch (normalizedLayoutId) {
      case 'cover':
        return <CoverLayout model={model as CoverModel} theme={theme} onImageUpload={onImageUpload ? () => onImageUpload('background_image') : undefined} />;
      case 'toc':
        return <TocLayout model={model as TocModel} theme={theme} />;
      case 'title_content':
        return <TitleContentLayout model={model as TitleContentModel} theme={theme} onImageUpload={onImageUpload ? () => onImageUpload('image.src') : undefined} />;
      case 'title_bullets':
        return <TitleBulletsLayout model={model as TitleBulletsModel} theme={theme} onImageUpload={onImageUpload ? () => onImageUpload('image.src') : undefined} />;
      case 'two_column':
        return <TwoColumnLayout model={model as TwoColumnModel} theme={theme} onImageUpload={onImageUpload} />;
      case 'process_steps':
        return <ProcessStepsLayout model={model as ProcessStepsModel} theme={theme} onImageUpload={onImageUpload ? () => onImageUpload('image.src') : undefined} />;
      case 'ending':
        return <EndingLayout model={model as EndingModel} theme={theme} />;
      case 'section_title':
        return <SectionTitleLayout model={model as SectionTitleModel} theme={theme} />;
      case 'image_full':
        return <ImageFullLayout model={model as ImageFullModel} theme={theme} onImageUpload={onImageUpload ? () => onImageUpload('image_src') : undefined} />;
      case 'quote':
        return <QuoteLayout model={model as QuoteModel} theme={theme} />;

      // 学术方案专属布局
      case 'learning_objectives':
        return <LearningObjectivesLayout model={model as LearningObjectivesModel} theme={theme} />;
      case 'theory_explanation':
        return <TheoryExplanationLayout model={model as TheoryExplanationModel} theme={theme} />;
      case 'academic_narrative':
        return <AcademicNarrativeLayout model={model as AcademicNarrativeModel} theme={theme} />;
      case 'case_study':
        return <AcademicCaseStudyLayout model={model as AcademicCaseStudyModel} theme={theme} />;
      case 'comparison_table':
        return <AcademicComparisonLayout model={model as AcademicComparisonModel} theme={theme} />;
      case 'diagram_illustration':
        return <AcademicDiagramLayout model={model as AcademicDiagramModel} theme={theme} />;
      case 'academic_practice':
        return <AcademicPracticeLayout model={model as AcademicPracticeModel} theme={theme} />;
      case 'ending_academic':
        return <AcademicEndingLayout model={model as AcademicEndingModel} theme={theme} />;

      // 互动方案专属布局
      case 'warmup_question':
        return <WarmupQuestionLayout model={model as WarmupQuestionModel} theme={theme} />;
      case 'poll_interactive':
        return <PollInteractiveLayout model={model as PollInteractiveModel} theme={theme} />;

      // 视觉方案专属布局
      case 'timeline':
        return <TimelineLayout model={model as TimelineModel} theme={theme} />;
      case 'portfolio':
        return <PortfolioLayout model={model as PortfolioModel} theme={theme} />;

      // 实践方案专属布局
      case 'safety_notice':
        return <SafetyNoticeLayout model={model as SafetyNoticeModel} theme={theme} />;
      case 'detail_zoom':
        return <DetailZoomLayout model={model as DetailZoomModel} theme={theme} />;
      case 'vocational_bullets':
        return (
          <VocationalBulletsLayout
            model={{ ...(model as TitleBulletsModel), layoutId: layout_id } as TitleBulletsModel}
            theme={theme}
          />
        );
      case 'vocational_content':
        return (
          <VocationalContentLayout
            model={{ ...(model as TitleContentModel), layoutId: layout_id } as TitleContentModel}
            theme={theme}
            onImageUpload={onImageUpload ? () => onImageUpload('image.src') : undefined}
          />
        );
      case 'vocational_comparison':
        return (
          <VocationalComparisonLayout
            model={{ ...(model as TwoColumnModel), layoutId: layout_id } as TwoColumnModel}
            theme={theme}
            onImageUpload={onImageUpload}
          />
        );
      case 'vocational_sop_banner':
        return (
          <VocationalSopBannerLayout
            model={{ ...(model as ProcessStepsModel), layoutId: layout_id } as ProcessStepsModel}
            theme={theme}
          />
        );
      case 'vocational_warning_split':
        return (
          <VocationalWarningSplitLayout
            model={{ ...(model as TwoColumnModel), layoutId: layout_id } as TwoColumnModel}
            theme={theme}
          />
        );
      case 'vocational_blueprint_zoom':
        return (
          <VocationalBlueprintZoomLayout
            model={{ ...(model as DetailZoomModel), layoutId: layout_id } as DetailZoomModel}
            theme={theme}
          />
        );
      case 'vocational_piv_hud':
        return (
          <VocationalPivHudLayout
            model={{ ...(model as EduDataBoardModel), layoutId: layout_id } as EduDataBoardModel}
            theme={theme}
          />
        );
      case 'vocational_intro_cover':
        return <VocationalIntroCoverLayout model={model as CoverModel} theme={theme} />;
      case 'vocational_mission_toc':
        return <VocationalMissionTocLayout model={model as TocModel} theme={theme} />;
      case 'vocational_target_lock':
        return <VocationalTargetLockLayout model={{ ...(model as TitleBulletsModel), layoutId: layout_id } as TitleBulletsModel} theme={theme} />;
      case 'vocational_safety_check':
        return <VocationalSafetyCheckLayout model={{ ...(model as TitleBulletsModel), layoutId: layout_id } as TitleBulletsModel} theme={theme} />;
      case 'vocational_equipment_grid':
        return <VocationalEquipmentGridLayout model={{ ...(model as TitleBulletsModel), layoutId: layout_id } as TitleBulletsModel} theme={theme} />;
      case 'vocational_fault_diagnostic':
        return <VocationalFaultDiagnosticLayout model={{ ...(model as TitleContentModel), layoutId: layout_id } as TitleContentModel} theme={theme} />;
      case 'vocational_practice_sandbox':
        return <VocationalPracticeSandboxLayout model={model} theme={theme} />;
      case 'vocational_mission_complete':
        return <VocationalMissionCompleteLayout model={model as EndingModel} theme={theme} />;

      // Modern scheme - 现代创新方案
      case 'sidebar_card':
        return <SidebarCardLayout model={model as SidebarCardModel} theme={theme} />;
      case 'dark_math':
        return <DarkMathLayout model={model as DarkMathModel} theme={theme} />;
      case 'flow_process':
        return <FlowProcessLayout model={model as FlowProcessModel} theme={theme} />;
      case 'overlap':
        return <OverlapLayout model={model as OverlapModel} theme={theme} />;
      case 'grid_matrix':
        return <GridMatrixLayout model={model as GridMatrixModel} theme={theme} />;
      case 'diagonal_split':
        return <DiagonalSplitLayout model={model as DiagonalSplitModel} theme={theme} />;
      case 'concentric_focus':
        return <ConcentricFocusLayout model={model as ConcentricFocusModel} theme={theme} />;
      case 'vertical_timeline':
        return <VerticalTimelineLayout model={model as VerticalTimelineModel} theme={theme} />;
      case 'tri_column':
        return <TriColumnLayout model={model as TriColumnModel} theme={theme} />;
      case 'cinematic_overlay':
        return <CinematicOverlayLayout model={model as CinematicOverlayModel} theme={theme} />;
      // Edu dark scheme
      case 'edu_cover':
        return <EduCoverLayout model={model as EduCoverModel} theme={theme} onImageUpload={onImageUpload ? () => onImageUpload('hero_image') : undefined} />;
      case 'edu_toc':
        return <EduTocLayout model={model as EduTocModel} theme={theme} />;
      case 'edu_tri_compare':
        return <EduTriCompareLayout model={model as EduTriCompareModel} theme={theme} />;
      case 'edu_core_hub':
        return <EduCoreHubLayout model={model as EduCoreHubModel} theme={theme} />;
      case 'edu_timeline_steps':
        return <EduTimelineStepsLayout model={model as EduTimelineStepsModel} theme={theme} />;
      case 'edu_logic_flow':
        return <EduLogicFlowLayout model={model as EduLogicFlowModel} theme={theme} />;
      case 'edu_data_board':
        return <EduDataBoardLayout model={model as EduDataBoardModel} theme={theme} />;
      case 'edu_summary':
        return <EduSummaryLayout model={model as EduSummaryModel} theme={theme} />;
      case 'edu_qa_case':
        return <EduQACaseLayout model={model as EduQACaseModel} theme={theme} />;

      // Blueprint scheme — 工业蓝图型专属布局
      case 'blueprint_cover':
        return <BlueprintCoverLayout model={model as CoverModel} theme={theme} />;
      case 'blueprint_toc':
        return <BlueprintTocLayout model={model as TocModel} theme={theme} />;
      case 'blueprint_spec_card':
        return <BlueprintSpecCardLayout model={model} theme={theme} />;
      case 'blueprint_quote':
        return <BlueprintQuoteLayout model={model as QuoteModel} theme={theme} />;
      case 'blueprint_annotation':
        return <BlueprintAnnotationLayout model={model} theme={theme} />;
      case 'blueprint_section_title':
        return <BlueprintSectionTitleLayout model={model as SectionTitleModel} theme={theme} />;
      case 'blueprint_dual_panel':
        return <BlueprintDualPanelLayout model={model as TwoColumnModel} theme={theme} />;
      case 'blueprint_timeline':
        return <BlueprintTimelineLayout model={model} theme={theme} />;
      case 'blueprint_bento_grid':
        return <BlueprintBentoGridLayout model={model} theme={theme} />;
      case 'blueprint_tri_compare':
        return <BlueprintTriCompareLayout model={model} theme={theme} />;
      case 'blueprint_gallery':
        return <BlueprintGalleryLayout model={model} theme={theme} />;
      case 'blueprint_big_reveal':
        return <BlueprintBigRevealLayout model={model} theme={theme} />;
      case 'blueprint_closing':
      return <BlueprintClosingLayout model={model as EndingModel} theme={theme} />;

    // DATA VAULT specialized layouts
    case 'vault_cover':
      return <VaultCoverLayout model={model} theme={theme} />;
    case 'vault_index':
      return <VaultIndexLayout model={model} theme={theme} />;
    case 'vault_kpi_grid':
      return <VaultKpiGridLayout model={model} theme={theme} />;
    case 'vault_heatmap':
      return <VaultHeatmapLayout model={model} theme={theme} />;
    case 'vault_timeline':
      return <VaultTimelineLayout model={model} theme={theme} />;
    case 'vault_split_brief':
      return <VaultSplitBriefLayout model={model} theme={theme} />;
    case 'vault_flow_circuit':
      return <VaultFlowCircuitLayout model={model} theme={theme} />;
    case 'vault_dashboard':
      return <VaultDashboardLayout model={model} theme={theme} />;
    case 'vault_deep_analysis':
      return <VaultDeepAnalysisLayout model={model} theme={theme} />;
    case 'vault_terminal':
      return <VaultTerminalLayout model={model} theme={theme} />;
    case 'vault_compare':
      return <VaultCompareLayout model={model} theme={theme} />;
    case 'vault_debrief':
      return <VaultDebriefLayout model={model} theme={theme} />;

    default:
        return (
          <div
            style={{
              width: theme.sizes.slideWidth,
              height: theme.sizes.slideHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0f0f0',
              color: '#666',
            }}
          >
            未知布局类型：{getLayoutDisplayName(layout_id)}
          </div>
        );
      }
    } catch (error) {
      console.error('[SlideRenderer] Error rendering layout:', normalizedLayoutId, error);
      return (
        <div
          style={{
            width: theme.sizes.slideWidth,
            height: theme.sizes.slideHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fee',
            color: '#c00',
            padding: '40px',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            渲染错误
          </div>
          <div style={{ fontSize: '16px' }}>
            布局：{getLayoutDisplayName(layout_id)}（内部标识：{normalizedLayoutId}）
          </div>
          <div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
            {error instanceof Error ? error.message : String(error)}
          </div>
        </div>
      );
    }
  };

  return (
    <div style={containerStyle} onClick={onClick}>
      {renderLayout()}
    </div>
  );
};

export default SlideRenderer;
