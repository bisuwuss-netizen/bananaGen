/**
 * 幻灯片渲染器组件
 * 根据布局ID动态渲染对应的布局组件
 */

import React from 'react';
import {
  PagePayload,
  ThemeConfig,
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
} from '../types/schema';
import { CoverLayout } from '../layouts/CoverLayout';
import { TocLayout } from '../layouts/TocLayout';
import { TitleContentLayout } from '../layouts/TitleContentLayout';
import { TitleBulletsLayout } from '../layouts/TitleBulletsLayout';
import { TwoColumnLayout } from '../layouts/TwoColumnLayout';
import { ProcessStepsLayout } from '../layouts/ProcessStepsLayout';
import { EndingLayout } from '../layouts/EndingLayout';
import { SectionTitleLayout } from '../layouts/SectionTitleLayout';
import { ImageFullLayout } from '../layouts/ImageFullLayout';
import { QuoteLayout } from '../layouts/QuoteLayout';
// 专属布局组件
import { LearningObjectivesLayout } from '../layouts/LearningObjectivesLayout';
import { TheoryExplanationLayout } from '../layouts/TheoryExplanationLayout';
import { WarmupQuestionLayout } from '../layouts/WarmupQuestionLayout';
import { PollInteractiveLayout } from '../layouts/PollInteractiveLayout';
import { TimelineLayout } from '../layouts/TimelineLayout';
import { PortfolioLayout } from '../layouts/PortfolioLayout';
import { SafetyNoticeLayout } from '../layouts/SafetyNoticeLayout';
import { DetailZoomLayout } from '../layouts/DetailZoomLayout';
// Modern scheme - 现代创新方案
import { SidebarCardLayout } from '../layouts/SidebarCardLayout';
import { DarkMathLayout } from '../layouts/DarkMathLayout';
import { FlowProcessLayout } from '../layouts/FlowProcessLayout';
import { OverlapLayout } from '../layouts/OverlapLayout';
import { GridMatrixLayout } from '../layouts/GridMatrixLayout';
import { DiagonalSplitLayout } from '../layouts/DiagonalSplitLayout';
import { ConcentricFocusLayout } from '../layouts/ConcentricFocusLayout';
import { VerticalTimelineLayout } from '../layouts/VerticalTimelineLayout';
import { TriColumnLayout } from '../layouts/TriColumnLayout';
import { CinematicOverlayLayout } from '../layouts/CinematicOverlayLayout';
// Edu dark scheme
import { EduCoverLayout } from '../layouts/EduCoverLayout';
import { EduTocLayout } from '../layouts/EduTocLayout';
import { EduTriCompareLayout } from '../layouts/EduTriCompareLayout';
import { EduCoreHubLayout } from '../layouts/EduCoreHubLayout';
import { EduTimelineStepsLayout } from '../layouts/EduTimelineStepsLayout';
import { EduLogicFlowLayout } from '../layouts/EduLogicFlowLayout';
import { EduDataBoardLayout } from '../layouts/EduDataBoardLayout';
import { EduSummaryLayout } from '../layouts/EduSummaryLayout';
import { normalizeLayoutId } from '../layouts';

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

  const normalizedLayoutId = normalizeLayoutId(layout_id);

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
        错误: model 为空 (layout: {layout_id})
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
            未知布局类型: {layout_id}
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
            布局: {layout_id} (normalized: {normalizedLayoutId})
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
