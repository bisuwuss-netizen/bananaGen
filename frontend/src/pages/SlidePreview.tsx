import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Home,
  ArrowLeft,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button, Loading, Textarea, useToast, useConfirm, Markdown } from '@/components/shared';
import { getTemplateFile } from '@/components/shared/TemplateSelector';
import { listUserTemplates, listMaterials, type UserTemplate } from '@/api/endpoints';
import { materialUrlToFile } from '@/components/shared/MaterialSelector';
import type { Material } from '@/api/endpoints';
import { SlideCard } from '@/components/preview/SlideCard';
import {
  BackgroundPickerModal,
  HtmlFileInputs,
  HtmlUrlModal,
  ProjectAuxiliaryModals,
  SlidePreviewFooter,
  SlidePreviewHeader,
  SlidePreviewStage,
  SlideThumbnailRail,
  TemplatePickerModal,
} from '@/components/slide-preview';
import { useProjectStore } from '@/store/useProjectStore';
import { useExportTasksStore, type ExportTaskType } from '@/store/useExportTasksStore';
import { getImageUrl } from '@/api/client';
import { getPageImageVersions, setCurrentImageVersion, updateProject, updatePage, uploadTemplate, exportPPTX as apiExportPPTX, exportPDF as apiExportPDF, exportEditablePPTX as apiExportEditablePPTX, generateHtmlImagesStreaming, generateLayoutPlan, type HtmlImageSlot, type HtmlImageSSEEvent } from '@/api/endpoints';
import { fileToBase64 } from '@/experimental/html-renderer/utils/htmlExporter';
import type { Page, ImageVersion, DescriptionContent, ExportExtractorMethod, ExportInpaintMethod, LayoutId } from '@/types';
import { normalizeErrorMessage } from '@/utils';
import {
  collectHtmlImageSlotDescriptors,
  sanitizeHtmlModelImageSources,
} from '@/utils/htmlImageSlots';
import { getScaleToFit, getWidthFitScale } from '@/utils/slideScale';
// HTML渲染模式组件
import { SlideRenderer } from '@/experimental/html-renderer/components/SlideRenderer';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';
import type { PagePayload, ThemeConfig } from '@/experimental/html-renderer/types/schema';
import {
  generateHTMLDocument,
  downloadHTML,
} from '@/experimental/html-renderer/utils/htmlExporter';
import {
  renderLayoutHTML,
  normalizeLayoutId,
  getLayoutDisplayName,
} from '@/experimental/html-renderer/layouts';

const VARIANT_POOLS: Record<string, { id: string; label: string }[]> = {
  title_bullets: [{ id: 'a', label: '要点列表' }, { id: 'b', label: '编号列表' }],
  process_steps: [{ id: 'a', label: '横向流程' }, { id: 'b', label: '纵向流程' }],
  ending: [{ id: 'a', label: '标准结束' }, { id: 'b', label: '深色总结' }],
  edu_cover: [{ id: 'a', label: '经典封面' }, { id: 'b', label: '极简封面' }],
  edu_toc: [{ id: 'a', label: '垂直列表' }, { id: 'b', label: '矩阵卡片' }],
  edu_tri_compare: [{ id: 'a', label: '三栏对比' }, { id: 'b', label: '卡片对比' }],
  edu_core_hub: [{ id: 'a', label: '同心辐射' }, { id: 'b', label: '金字塔' }],
  edu_timeline_steps: [{ id: 'a', label: '时间轴' }, { id: 'b', label: '卡片步骤' }],
  edu_logic_flow: [{ id: 'a', label: '逻辑流程' }, { id: 'b', label: '分支流程' }],
  edu_data_board: [{ id: 'a', label: '数据面板' }, { id: 'b', label: '数据卡片' }],
  edu_summary: [{ id: 'a', label: '总结回顾' }, { id: 'b', label: '关键收获' }],
};

export const SlidePreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const fromHistory = (location.state as any)?.from === 'history';
  const {
    currentProject,
    syncProject,
    generateImages,
    editPageImage,
    deletePageById,
    isGlobalLoading,
    taskProgress,
    pageGeneratingTasks,
  } = useProjectStore();

  const { addTask, pollTask: pollExportTask, tasks: exportTasks, restoreActiveTasks } = useExportTasksStore();
  const { show, ToastContainer } = useToast();
  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => show({ message, type }),
    [show]
  );

  // 页面挂载时恢复正在进行的导出任务（页面刷新后）
  useEffect(() => {
    restoreActiveTasks();
  }, [restoreActiveTasks]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportTasksPanel, setShowExportTasksPanel] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1); // 主预览按可用舞台尺寸自适应缩放
  const thumbnailContainerRef = useRef<HTMLDivElement | null>(null);
  const [thumbnailScale, setThumbnailScale] = useState(0.15); // 缩略图缩放，由 JS 测量容器宽度后更新
  // 多选导出相关状态（已移除多选功能）
  const [_isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [_isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [_isRefreshing, setIsRefreshing] = useState(false);
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const [backgroundPickerMode, setBackgroundPickerMode] = useState<'menu' | 'material'>('menu');
  const [backgroundMaterials, setBackgroundMaterials] = useState<Material[]>([]);
  const [isLoadingBackgroundMaterials, setIsLoadingBackgroundMaterials] = useState(false);
  const [imageVersions, setImageVersions] = useState<ImageVersion[]>([]);
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [selectedContextImages, setSelectedContextImages] = useState<{
    useTemplate: boolean;
    descImageUrls: string[];
    uploadedFiles: File[];
  }>({
    useTemplate: false,
    descImageUrls: [],
    uploadedFiles: [],
  });
  const [extraRequirements, setExtraRequirements] = useState<string>('');
  const [isSavingRequirements, setIsSavingRequirements] = useState(false);
  const isEditingRequirements = useRef(false); // 跟踪用户是否正在编辑额外要求
  const [templateStyle, setTemplateStyle] = useState<string>('');
  const [isSavingTemplateStyle, setIsSavingTemplateStyle] = useState(false);
  const [isVariantUpdating, setIsVariantUpdating] = useState(false);
  const isEditingTemplateStyle = useRef(false); // 跟踪用户是否正在编辑风格描述
  const lastProjectId = useRef<string | null>(null); // 跟踪上一次的项目ID
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  // 素材生成模态开关（模块本身可复用，这里只是示例入口）
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  // 素材选择器模态开关
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);
  // 导出设置
  const [exportExtractorMethod, setExportExtractorMethod] = useState<ExportExtractorMethod>(
    (currentProject?.export_extractor_method as ExportExtractorMethod) || 'hybrid'
  );
  const [exportInpaintMethod, setExportInpaintMethod] = useState<ExportInpaintMethod>(
    (currentProject?.export_inpaint_method as ExportInpaintMethod) || 'hybrid'
  );
  const [isSavingExportSettings, setIsSavingExportSettings] = useState(false);
  // 每页编辑参数缓存（前端会话内缓存，便于重复执行）
  const [editContextByPage, setEditContextByPage] = useState<Record<string, {
    prompt: string;
    contextImages: {
      useTemplate: boolean;
      descImageUrls: string[];
      uploadedFiles: File[];
    };
  }>>({});

  // HTML 模式图片状态（存储在浏览器中，不持久化）
  // 结构: { [page_id]: { [slot_path]: base64_image_data } }
  const [htmlPageImages, setHtmlPageImages] = useState<Record<string, Record<string, string>>>({});
  const [isGeneratingHtmlImages, setIsGeneratingHtmlImages] = useState(false);
  const [htmlImageGenerationProgress, setHtmlImageGenerationProgress] = useState({ current: 0, total: 0 });

  // Layout Planner 状态
  const [layoutPlanStep, setLayoutPlanStep] = useState<number>(0); // 0=idle, 1-4=steps
  const [isLayoutPlanning, setIsLayoutPlanning] = useState(false);
  const layoutPlanAppliedRef = useRef(false);
  const [isGeneratingHtmlBackgrounds, setIsGeneratingHtmlBackgrounds] = useState(false);
  const [htmlBackgroundGenerationProgress, setHtmlBackgroundGenerationProgress] = useState({ current: 0, total: 0 });
  const [htmlGlobalBackground, setHtmlGlobalBackground] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ pageId: string; slotPath: string } | null>(null);

  // 预览图矩形选择状态（编辑弹窗内）
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isRegionSelectionMode, setIsRegionSelectionMode] = useState(false);
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // HTML 上传相关状态
  const [_isUploadingHtml, setIsUploadingHtml] = useState(false);
  const [uploadedHtmlUrl, setUploadedHtmlUrl] = useState<string | null>(null);
  const [showHtmlUrlModal, setShowHtmlUrlModal] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  // Memoize pages with generated images to avoid re-computing in multiple places
  const _pagesWithImages = useMemo(() => {
    return currentProject?.pages.filter(p => p.id && p.generated_image_path) || [];
  }, [currentProject?.pages]);

  // HTML渲染模式：检查项目是否为HTML模式
  const isHtmlMode = currentProject?.render_mode === 'html';
  const htmlTheme = useMemo<ThemeConfig>(() => {
    return getThemeByScheme(currentProject?.scheme_id);
  }, [currentProject?.scheme_id]);

  // Layout Planner：进入预览页后自动运行版式规划
  const LAYOUT_PLAN_STEPS = ['分析内容', '版式调度', '容量校验', '渲染准备'];

  const runLayoutPlan = useCallback(async (seed?: string) => {
    if (!currentProject?.id || !isHtmlMode || layoutPlanAppliedRef.current) return;
    setIsLayoutPlanning(true);
    try {
      setLayoutPlanStep(1);
      await new Promise(r => setTimeout(r, 400));
      setLayoutPlanStep(2);
      const result = await generateLayoutPlan(currentProject.id, seed);
      setLayoutPlanStep(3);
      await new Promise(r => setTimeout(r, 300));
      if (result.success) {
        setLayoutPlanStep(4);
        await syncProject(currentProject.id);
        layoutPlanAppliedRef.current = true;
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (err) {
      console.error('[LayoutPlan] failed:', err);
    } finally {
      setIsLayoutPlanning(false);
      setLayoutPlanStep(0);
    }
  }, [currentProject?.id, isHtmlMode, syncProject]);

  useEffect(() => {
    if (isHtmlMode && currentProject?.id && !layoutPlanAppliedRef.current && currentProject.pages?.length > 0) {
      const hasHtmlModels = currentProject.pages.some(p => p.html_model);
      if (hasHtmlModels) {
        runLayoutPlan();
      }
    }
  }, [isHtmlMode, currentProject?.id, currentProject?.pages?.length, runLayoutPlan]);

  // 计算章节编号映射：使章节编号按实际出现顺序递增
  const sectionNumberMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!currentProject?.pages) return map;

    let sectionCounter = 0;
    currentProject.pages.forEach((page, index) => {
      const layoutId = page.layout_id ? normalizeLayoutId(page.layout_id as LayoutId) : null;
      if (layoutId === 'section_title') {
        sectionCounter += 1;
        map.set(index, sectionCounter);
      }
    });
    return map;
  }, [currentProject?.pages]);

  const inferTwoColumnPartType = useCallback((part: Record<string, unknown> | undefined): 'text' | 'image' | 'bullets' => {
    if (!part) return 'text';
    const rawType = part.type;
    if (rawType === 'text' || rawType === 'image' || rawType === 'bullets') {
      return rawType;
    }

    const bullets = Array.isArray(part.bullets) ? part.bullets : [];
    if (bullets.length > 0) return 'bullets';
    if (typeof part.image_src === 'string' && part.image_src.trim()) return 'image';
    return 'text';
  }, []);

  const normalizeTwoColumnPart = useCallback((part: Record<string, unknown> | undefined): Record<string, unknown> => {
    const normalized: Record<string, unknown> = {
      ...(part || {}),
    };

    normalized.type = inferTwoColumnPartType(part);

    if (Array.isArray(normalized.bullets)) {
      normalized.bullets = normalized.bullets
        .filter((item) => !!item)
        .map((item) => {
          if (typeof item === 'string') {
            return { text: item };
          }
          if (typeof item === 'object' && item !== null) {
            const row = item as Record<string, unknown>;
            return {
              icon: typeof row.icon === 'string' ? row.icon : undefined,
              text: typeof row.text === 'string' ? row.text : '',
              description: typeof row.description === 'string' ? row.description : undefined,
            };
          }
          return { text: '' };
        })
        .filter((item) => item.text.trim());
    }

    return normalized;
  }, [inferTwoColumnPartType]);

  const shouldUseOptionalImageSlot = useCallback((
    page: Page,
    normalizedModel?: Record<string, unknown>
  ): boolean => {
    const outline = page?.outline_content
      ? ({ ...page.outline_content } as Record<string, unknown>)
      : undefined;
    if (typeof outline?.has_image === 'boolean') {
      return outline.has_image;
    }

    const modelCandidate = normalizedModel ?? (page?.html_model as unknown as Record<string, unknown> | undefined);
    const image = modelCandidate?.image as unknown as Record<string, unknown> | undefined;
    return !!(image && typeof image === 'object');
  }, []);

  const resolveLayoutVariant = useCallback(
    (
      model: Record<string, unknown> | undefined,
      fallback?: string,
    ): string => {
      const raw = (model?.layout_variant ?? model?.variant ?? fallback ?? 'a') as string;
      return String(raw || 'a').trim().toLowerCase() || 'a';
    },
    [],
  );

  // 将上传的图片写回到模型对应的插槽路径
  const applyUploadedImagesToModel = useCallback((pageId: string, model: Record<string, unknown>) => {
    const slots = htmlPageImages[pageId];
    const updatedModel: Record<string, any> = { ...model };
    const setByPath = (path: string, value: string) => {
      const parts = path.split('.');
      let target: any = updatedModel;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }
      target[parts[parts.length - 1]] = value;
    };

    if (slots) {
      Object.entries(slots).forEach(([slotPath, base64]) => {
        if (!base64) return;
        setByPath(slotPath, base64);
      });
    }

    if (htmlGlobalBackground) {
      updatedModel.background_image = htmlGlobalBackground;
    }

    return updatedModel;
  }, [htmlPageImages, htmlGlobalBackground]);

  // 将Page转换为PagePayload（用于HTML渲染）
  // 会自动为支持图片的布局添加默认的image字段，以显示占位符
  const convertPageToPayload = useCallback((page: Page, index: number): PagePayload | null => {
    if (!page) return null;
    const pageId = page.id || page.page_id || `page-${index}`;

    // 如果有html_model，检查是否需要添加默认的image字段
    if (page.html_model && page.layout_id) {
      console.log('[convertPageToPayload] Original layout_id:', page.layout_id);
      const layoutId = normalizeLayoutId(page.layout_id as LayoutId);
      console.log('[convertPageToPayload] Normalized layout_id:', layoutId);
      let model = sanitizeHtmlModelImageSources(page.html_model) as unknown as Record<string, unknown>;
      const outlineContent = page.outline_content
        ? ({ ...page.outline_content } as Record<string, unknown>)
        : undefined;
      const outlineVariant = typeof outlineContent?.layout_variant === 'string'
        ? outlineContent.layout_variant
        : undefined;
      const variantId = resolveLayoutVariant(model, outlineVariant);
      model.variant = variantId;
      model.layout_variant = variantId;

      // 如果是章节页，使用计算好的章节编号映射（使编号按实际顺序递增）
      if (layoutId === 'section_title') {
        const correctSectionNumber = sectionNumberMap.get(index);
        if (correctSectionNumber !== undefined) {
          model.section_number = correctSectionNumber;
        }
      }
      const outlineHasImage = typeof outlineContent?.has_image === 'boolean'
        ? outlineContent.has_image
        : undefined;

      // 为支持图片的布局按需添加默认 image 字段（如果不存在）
      // 只有 outline 明确要求配图时才补占位，避免页面同质化为左文右图
      const layoutsWithOptionalImage = ['title_content', 'vocational_content', 'title_bullets', 'process_steps'];
      if (layoutsWithOptionalImage.includes(layoutId) && outlineHasImage === true && !('image' in model)) {
        const defaultWidth = layoutId === 'process_steps' ? '80%' : '45%';
        // 添加默认的image字段，src为空字符串会显示占位符
        model.image = {
          src: '',
          alt: page.outline_content?.title || '配图',
          position: 'right',
          width: defaultWidth,
        };
      }
      if (layoutsWithOptionalImage.includes(layoutId) && outlineHasImage === false && 'image' in model) {
        const imageField = model.image as unknown as Record<string, unknown> | undefined;
        const imageSrc = typeof imageField?.src === 'string' ? imageField.src.trim() : '';
        // has_image=false 时移除空占位 image，保留已存在真实图片
        if (!imageSrc) {
          delete model.image;
        }
      }

      // image_full 布局必须有 image_src
      if (layoutId === 'image_full' && !('image_src' in model)) {
        model.image_src = '';
        model.image_alt = page.outline_content?.title || '图片';
      }

      // two_column / vocational_comparison 布局：补齐左右栏 type 并标准化 bullets 字段
      if (layoutId === 'two_column' || layoutId === 'vocational_comparison') {
        const left = model.left as unknown as Record<string, unknown> | undefined;
        const right = model.right as unknown as Record<string, unknown> | undefined;
        model.left = normalizeTwoColumnPart(left);
        model.right = normalizeTwoColumnPart(right);
      }

      // 应用上传的图片到模型
      model = applyUploadedImagesToModel(pageId, model);

      return {
        page_id: pageId,
        order_index: index,
        layout_id: layoutId,
        model: model as unknown as PagePayload['model'],
      };
    }

    // 如果没有html_model，根据outline_content生成默认模型
    const outline = page.outline_content;
    if (!outline) return null;

    const outlineRecord = { ...outline } as Record<string, unknown>;
    const outlineTitle = typeof outlineRecord.title === 'string' ? outlineRecord.title : '未命名';
    const outlinePoints = Array.isArray(outlineRecord.points)
      ? outlineRecord.points.map((point) => String(point || '').trim()).filter(Boolean)
      : [];
    const outlineHasImage = typeof outlineRecord.has_image === 'boolean' ? outlineRecord.has_image : false;
    const outlineLayoutRaw = typeof outlineRecord.layout_id === 'string' ? outlineRecord.layout_id : undefined;
    const outlineLayout = outlineLayoutRaw ? normalizeLayoutId(outlineLayoutRaw as LayoutId) : undefined;

    // 根据 outline 优先恢复布局；仅在缺失时再做推断
    let layoutId: LayoutId = 'title_content';
    if (index === 0) {
      layoutId = 'cover';
    } else if (outlineLayout) {
      layoutId = outlineLayout as LayoutId;
    } else if (outlinePoints.length > 4) {
      layoutId = 'title_bullets';
    }

    let model: Record<string, unknown> = {};
    switch (layoutId) {
      case 'cover':
        model = {
          title: outlineTitle,
          subtitle: outlinePoints[0] || '',
        };
        break;
      case 'toc':
        model = {
          title: outlineTitle || '目录',
          items: outlinePoints.map((text, idx) => ({ index: idx + 1, text })),
        };
        break;
      case 'section_title':
        model = {
          title: outlineTitle,
          subtitle: outlinePoints[0] || '',
          section_number: typeof outlineRecord.section_number === 'string'
            ? outlineRecord.section_number
            : undefined,
        };
        break;
      case 'ending':
        model = {
          title: outlineTitle || '感谢观看',
          subtitle: outlinePoints[0] || '',
        };
        break;
      case 'quote':
        model = {
          quote: outlinePoints[0] || outlineTitle,
          author: outlinePoints[1] || '',
          source: outlinePoints[2] || '',
        };
        break;
      case 'image_full':
        model = {
          title: outlineTitle,
          image_src: '',
          image_alt: outlineTitle,
          caption: outlinePoints[0] || '',
        };
        break;
      case 'two_column': {
        const pivot = Math.max(1, Math.ceil(outlinePoints.length / 2));
        const leftContent = outlinePoints.slice(0, pivot);
        const rightContent = outlinePoints.slice(pivot);
        model = {
          title: outlineTitle,
          left: {
            type: 'text',
            header: '左侧要点',
            content: leftContent.length ? leftContent : [''],
          },
          right: {
            type: 'text',
            header: '右侧要点',
            content: rightContent.length ? rightContent : [''],
          },
        };
        break;
      }
      case 'process_steps':
        model = {
          title: outlineTitle,
          steps: outlinePoints.map((text, idx) => ({
            number: idx + 1,
            label: text,
            description: '',
            icon: 'fa-check',
          })),
        };
        break;
      case 'title_bullets':
        model = {
          title: outlineTitle,
          bullets: outlinePoints.map((text) => ({
            text,
          })),
        };
        break;
      case 'title_content':
      default:
        model = {
          title: outlineTitle,
          content: outlinePoints.length ? outlinePoints : [''],
        };
        break;
    }

    if (
      outlineHasImage
      && ['title_content', 'title_bullets', 'process_steps'].includes(layoutId)
      && !('image' in model)
    ) {
      model.image = {
        src: '',
        alt: outlineTitle || '配图',
        position: 'right',
        width: layoutId === 'process_steps' ? '80%' : '45%',
      };
    }

    const outlineVariant = typeof outlineRecord.layout_variant === 'string'
      ? outlineRecord.layout_variant
      : undefined;
    const variantId = resolveLayoutVariant(model, outlineVariant);
    model.variant = variantId;
    model.layout_variant = variantId;

    // 应用上传的图片到模型
      model = applyUploadedImagesToModel(pageId, sanitizeHtmlModelImageSources(model));

    return {
      page_id: pageId,
      order_index: index,
      layout_id: layoutId,
      model: model as unknown as PagePayload['model'],
    };
  }, [applyUploadedImagesToModel, normalizeTwoColumnPart, resolveLayoutVariant, sectionNumberMap]);

  // 根据页面与布局生成 HTML 模式图片插槽
  const buildHtmlImageSlots = useCallback((pages: Page[], onlyIndex?: number): HtmlImageSlot[] => {
    const slots: HtmlImageSlot[] = [];
    if (!pages) return slots;

    const cleanText = (value: unknown): string => {
      if (typeof value !== 'string') return '';
      return value
        .replace(/\s+/g, ' ')
        .replace(/[<>`]/g, '')
        .trim();
    };

    const collectPageFacts = (page: Page, model: Record<string, any>): string[] => {
      const facts: string[] = [];

      const outline = page?.outline_content as any;
      if (outline?.title) facts.push(cleanText(outline.title));
      if (Array.isArray(outline?.points)) {
        outline.points.slice(0, 4).forEach((p: unknown) => {
          const t = cleanText(p);
          if (t) facts.push(t);
        });
      }

      if (model?.title) facts.push(cleanText(model.title));
      if (model?.subtitle) facts.push(cleanText(model.subtitle));

      if (Array.isArray(model?.content)) {
        model.content.slice(0, 3).forEach((c: unknown) => {
          const t = cleanText(c);
          if (t) facts.push(t);
        });
      } else if (typeof model?.content === 'string') {
        const t = cleanText(model.content);
        if (t) facts.push(t);
      }

      if (Array.isArray(model?.bullets)) {
        model.bullets.slice(0, 4).forEach((b: any) => {
          const t1 = cleanText(b?.text);
          const t2 = cleanText(b?.description);
          if (t1) facts.push(t1);
          if (t2) facts.push(t2);
        });
      }

      if (Array.isArray(model?.steps)) {
        model.steps.slice(0, 4).forEach((s: any) => {
          const t1 = cleanText(s?.label);
          const t2 = cleanText(s?.description);
          if (t1) facts.push(t1);
          if (t2) facts.push(t2);
        });
      }

      if (Array.isArray(model?.items)) {
        model.items.slice(0, 4).forEach((item: any) => {
          const t1 = cleanText(item?.title);
          const t2 = cleanText(item?.description);
          if (t1) facts.push(t1);
          if (t2) facts.push(t2);
        });
      }

      if (Array.isArray(model?.annotations)) {
        model.annotations.slice(0, 4).forEach((annotation: any) => {
          const t1 = cleanText(annotation?.label);
          const t2 = cleanText(annotation?.description);
          if (t1) facts.push(t1);
          if (t2) facts.push(t2);
        });
      }

      const descContent = page.description_content;
      if (typeof descContent === 'object' && descContent !== null) {
        const dc = descContent as any;
        if (dc.general_image_description) facts.push(cleanText(dc.general_image_description));
        if (dc.image_description) facts.push(cleanText(dc.image_description));
        if (dc.text) facts.push(cleanText(dc.text));
      } else if (typeof descContent === 'string') {
        facts.push(cleanText(descContent));
      }

      // 去重并过滤太短的噪声词
      const uniq = Array.from(new Set(facts.map((x) => x.trim()).filter(Boolean)));
      return uniq.filter((x) => x.length > 1);
    };

    const getLayoutIntent = (layoutId: LayoutId, slotPath: string): string => {
      if (layoutId === 'edu_cover') {
        return '生成"封面主视觉图"，高端质感，适用于PPT封面右侧展示区域，主题鲜明、构图饱满。';
      }
      if (slotPath === 'background_image') {
        return '生成"页面氛围背景图"，低调不干扰文字，边缘渐暗，中心留白。';
      }
      if (layoutId === 'process_steps') {
        return '生成“流程步骤图”，必须体现先后顺序与动作结果，含1个主体和3-4个流程节点。';
      }
      if (layoutId === 'vocational_content') {
        return '生成“案例/讲解配图”，用于支撑职业情境说明，突出具体对象、操作场景或案例证据。';
      }
      if (layoutId === 'detail_zoom') {
        return '生成“细节放大主体图”，主体应便于叠加标注点，局部结构清楚，可支撑步骤拆解或局部讲解。';
      }
      if (layoutId === 'portfolio') {
        return '生成“案例展示卡片图”，每张图都要对应一个独立案例场景，主体明确，便于网格化陈列。';
      }
      if (layoutId === 'title_bullets') {
        return '生成“要点解释图”，画面需对应页面要点，至少体现3个相关元素之间关系。';
      }
      if (layoutId === 'two_column' || layoutId === 'vocational_comparison') {
        if (slotPath.startsWith('left')) {
          return '该图用于左栏，对应“左侧观点/方案”，与右栏形成对比。';
        }
        if (slotPath.startsWith('right')) {
          return '该图用于右栏，对应“右侧观点/方案”，与左栏形成对比。';
        }
        return '生成“对比信息图”，用于左右栏内容比较，差异要清晰。';
      }
      if (layoutId === 'image_full') {
        return '生成“整页核心场景图”，突出主题对象与关键情境。';
      }
      if (layoutId === 'cover' || slotPath === 'hero_image' || slotPath === 'background_image') {
        return '生成“封面辅助图”，强化主题识别，主体靠边，中心留白给标题，禁止文字/数字/Logo/水印。';
      }
      return '生成“概念解释图”，用于辅助理解，不是背景纹理图。';
    };

    const inferSlotRole = (slotPath: string): 'main' | 'left' | 'right' | 'background' => {
      if (slotPath.startsWith('left')) return 'left';
      if (slotPath.startsWith('right')) return 'right';
      if (slotPath.includes('background')) return 'background';
      return 'main';
    };

    const getPrompt = (
      layoutId: LayoutId,
      slotPath: string,
      facts: string[]
    ): string => {
      const topicLine = facts.length > 0
        ? `页面主题与信息：${facts.slice(0, 6).join('；')}`
        : '页面主题与信息：专业知识讲解场景';

      if (layoutId === 'edu_cover' || layoutId === 'cover' || slotPath === 'hero_image' || slotPath === 'background_image') {
        return [
          '任务：为PPT封面生成辅助图，强化主题识别，不抢标题。',
          topicLine,
          '构图要求：主体靠右或靠边，中心及上方留白给标题与副标题，氛围感强。',
          '禁止：文字、数字、Logo、水印、纯抽象渐变、无意义背景纹理。',
        ].join(' ');
      }

      return [
        '任务：为PPT生成“内容解释型配图”，目标是帮助观众理解页面知识点。',
        topicLine,
        getLayoutIntent(layoutId, slotPath),
        '目标：图像用于讲解辅助，不是装饰背景，需可读可讲。',
        '构图要求：主体明确，包含2-4个与主题强相关的具体元素，避免大面积空白。',
        '禁止：文字、数字、Logo、水印、纯抽象渐变、纯装饰边框、无意义背景纹理。',
      ].join(' ');
    };

    pages.forEach((page, index) => {
      if (onlyIndex !== undefined && index !== onlyIndex) return;
      const payload = convertPageToPayload(page, index);
      if (!payload) return;

      const model = payload.model as any;
      const layoutId = normalizeLayoutId(payload.layout_id as LayoutId) as any;
      const pageId = payload.page_id;
      const schemeId = currentProject?.scheme_id || 'edu_dark';
      const push = (slotPath: string) => {
        const facts = collectPageFacts(page, model);
        const pageTitle = cleanText(model?.title) || cleanText(page?.outline_content?.title) || '';
        const visualGoal = getLayoutIntent(layoutId, slotPath);
        const prompt = getPrompt(layoutId, slotPath, facts);
        slots.push({
          page_id: pageId,
          slot_path: slotPath,
          prompt,
          context: {
            asset_type: 'content',
            layout_id: layoutId,
            scheme_id: schemeId,
            slot_role: inferSlotRole(slotPath),
            page_title: pageTitle,
            page_facts: facts.slice(0, 8),
            project_topic: cleanText(currentProject?.idea_prompt || ''),
            extra_requirements: cleanText(currentProject?.extra_requirements || ''),
            template_style: cleanText(currentProject?.template_style || ''),
            visual_goal: visualGoal,
          },
        });
      };

      const descriptors = collectHtmlImageSlotDescriptors(layoutId, model, {
        optionalImageEnabled: shouldUseOptionalImageSlot(page, model),
        inferTwoColumnPartType,
        variantId: resolveLayoutVariant(
          model,
          typeof page.outline_content?.layout_variant === 'string'
            ? page.outline_content.layout_variant
            : undefined,
        ),
      });

      descriptors
        .filter((descriptor) => !descriptor.src)
        .forEach((descriptor) => push(descriptor.slotPath));
    });

    return slots;
  }, [
    convertPageToPayload,
    inferTwoColumnPartType,
    shouldUseOptionalImageSlot,
    currentProject?.scheme_id,
    currentProject?.idea_prompt,
    currentProject?.extra_requirements,
    currentProject?.template_style,
  ]);

  // 生成背景图的插槽（全页底图）
  const buildHtmlBackgroundSlots = useCallback((pages: Page[]): HtmlImageSlot[] => {
    if (!pages || pages.length === 0) return [];
    const cleanText = (value: unknown): string => {
      if (typeof value !== 'string') return '';
      return value
        .replace(/\s+/g, ' ')
        .replace(/[<>`]/g, '')
        .trim();
    };
    const firstPayload = convertPageToPayload(pages[0], 0);
    const pageId = firstPayload?.page_id || pages[0].id || 'global';
    const titleSeed = currentProject?.idea_prompt
      || (firstPayload?.model as any)?.title
      || pages[0].outline_content?.title
      || '';
    const schemeId = currentProject?.scheme_id || 'edu_dark';
    const sampledTitles = pages
      .map((p) => cleanText(p.outline_content?.title || ''))
      .filter(Boolean)
      .slice(0, 5);

    const prompt = [
      '高质量教学PPT统一背景图。',
      titleSeed ? `主题：${titleSeed}。` : '',
      sampledTitles.length > 0 ? `页面线索：${sampledTitles.join('；')}。` : '',
      '目标：中心留白、边缘氛围化、低干扰可读。',
      '禁止出现任何文字、数字、符号、水印、Logo 或可识别标记。',
    ].filter(Boolean).join(' ');

    return [{
      page_id: pageId,
      slot_path: 'background_image',
      prompt,
      context: {
        asset_type: 'background',
        layout_id: 'cover',
        scheme_id: schemeId,
        slot_role: 'background',
        page_title: cleanText(titleSeed),
        page_facts: titleSeed ? [cleanText(titleSeed), ...sampledTitles] : sampledTitles,
        project_topic: cleanText(currentProject?.idea_prompt || ''),
        extra_requirements: cleanText(currentProject?.extra_requirements || ''),
        template_style: cleanText(currentProject?.template_style || ''),
        visual_goal: '生成统一背景图，中心留白，不干扰正文阅读。',
      },
    }];
  }, [
    convertPageToPayload,
    currentProject?.idea_prompt,
    currentProject?.scheme_id,
    currentProject?.extra_requirements,
    currentProject?.template_style,
  ]);

  const totalImageSlots = useMemo(() => {
    if (!isHtmlMode || !currentProject?.pages) return 0;
    return currentProject.pages.reduce((sum, page, index) => {
      const payload = convertPageToPayload(page, index);
      if (!payload) return sum;
      const model = payload.model as any;
      const layoutId = normalizeLayoutId(payload.layout_id as LayoutId);
      const descriptors = collectHtmlImageSlotDescriptors(layoutId, model, {
        optionalImageEnabled: shouldUseOptionalImageSlot(page, model),
        inferTwoColumnPartType,
        variantId: resolveLayoutVariant(
          model,
          typeof page.outline_content?.layout_variant === 'string'
            ? page.outline_content.layout_variant
            : undefined,
        ),
      });
      return sum + descriptors.filter((descriptor) => !descriptor.src).length;
    }, 0);
  }, [
    isHtmlMode,
    currentProject?.pages,
    convertPageToPayload,
    inferTwoColumnPartType,
    resolveLayoutVariant,
    shouldUseOptionalImageSlot,
  ]);

  // 当前选中页面的PagePayload（用于HTML渲染）
  const selectedPagePayload = useMemo(() => {
    if (!isHtmlMode || !currentProject?.pages[selectedIndex]) return null;
    return convertPageToPayload(currentProject.pages[selectedIndex], selectedIndex);
  }, [isHtmlMode, currentProject?.pages, selectedIndex, convertPageToPayload]);

  // 主预览区缩放：按可用舞台的宽高同时计算，确保窗口变化时始终保持比例适配
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const nextScale = getScaleToFit(
        width,
        height,
        htmlTheme.sizes.slideWidth,
        htmlTheme.sizes.slideHeight
      );
      if (nextScale > 0) {
        setPreviewScale(nextScale);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isHtmlMode, selectedPagePayload, htmlTheme.sizes.slideWidth, htmlTheme.sizes.slideHeight]);

  // 缩略图缩放：用 JS 测量第一个缩略图容器宽度（同列等宽），保持 16:9 等比例缩放
  useEffect(() => {
    const el = thumbnailContainerRef.current;
    if (!el) return;
    const update = () => {
      const nextScale = getWidthFitScale(
        el.getBoundingClientRect().width,
        htmlTheme.sizes.slideWidth
      );
      if (nextScale > 0) {
        setThumbnailScale(nextScale);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isHtmlMode, htmlTheme.sizes.slideWidth]);

  // 所有页面的PagePayload（用于HTML导出）
  const allPagesPayload = useMemo(() => {
    if (!isHtmlMode || !currentProject?.pages) return [];
    return currentProject.pages
      .map((page, index) => convertPageToPayload(page, index))
      .filter((p): p is PagePayload => p !== null);
  }, [isHtmlMode, currentProject?.pages, convertPageToPayload]);

  // HTML模式下载功能
  const handleDownloadHTMLSlides = useCallback(() => {
    if (!currentProject || !isHtmlMode || allPagesPayload.length === 0) return;
    const slidesHTML = allPagesPayload.map((page) =>
      renderLayoutHTML(normalizeLayoutId(page.layout_id as LayoutId), page.model, htmlTheme)
    );
    const html = generateHTMLDocument(slidesHTML, htmlTheme, {
      project_id: currentProject.id || '',
      ppt_meta: {
        title: currentProject.idea_prompt || 'Presentation',
        theme_id: htmlTheme.id,
        aspect_ratio: '16:9',
      },
      pages: allPagesPayload,
    });
    const filename = `${currentProject.idea_prompt || 'presentation'}.html`;
    downloadHTML(html, filename);
  }, [currentProject, isHtmlMode, allPagesPayload, htmlTheme]);

  // 上传 HTML 到同域服务器获取在线链接（避免跨域问题）
  const handleUploadHTML = useCallback(async (options?: { silent?: boolean }): Promise<string | null> => {
    if (!currentProject || !isHtmlMode || allPagesPayload.length === 0) {
      notify('暂无内容可上传', 'info');
      return null;
    }

    setIsUploadingHtml(true);
    try {
      // 生成 HTML 内容
      const slidesHTML = allPagesPayload.map((page) =>
        renderLayoutHTML(normalizeLayoutId(page.layout_id as LayoutId), page.model, htmlTheme)
      );
      const html = generateHTMLDocument(slidesHTML, htmlTheme, {
        project_id: currentProject.id || '',
        ppt_meta: {
          title: currentProject.idea_prompt || 'Presentation',
          theme_id: htmlTheme.id,
          aspect_ratio: '16:9',
        },
        pages: allPagesPayload,
      });

      // 生成文件名（带时间戳）
      const timestamp = new Date()
        .toISOString()
        .replaceAll('-', '')
        .replaceAll(':', '')
        .replace('T', '')
        .slice(0, 14);
      const randomNum = Math.floor(Math.random() * 100000);
      const filename = `${timestamp}_${randomNum}.html`;

      // 上传到同域后端服务器（避免跨域问题）
      // 使用空的 base URL，通过 Vite/nginx 代理转发
      const response = await fetch('/files/html/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: html,
          filename: filename,
        }),
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.code === 200 && result.data?.url) {
        const fullUrl = result.data.url;
        setUploadedHtmlUrl(fullUrl);
        if (!options?.silent) {
          setShowHtmlUrlModal(true);
          notify('上传成功', 'success');
        }
        return fullUrl;
      } else {
        throw new Error(result.msg || result.message || '上传失败');
      }
    } catch (error) {
      console.error('上传 HTML 失败:', error);
      notify(error instanceof Error ? error.message : '上传失败', 'error');
      return null;
    } finally {
      setIsUploadingHtml(false);
    }
  }, [currentProject, isHtmlMode, allPagesPayload, htmlTheme, show]);

  // 复制链接到剪贴板
  const handleCopyUrl = useCallback(async () => {
    if (!uploadedHtmlUrl) return;
    try {
      await navigator.clipboard.writeText(uploadedHtmlUrl);
      notify('链接已复制', 'success');
    } catch {
      // 降级方案
      const input = document.createElement('input');
      input.value = uploadedHtmlUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      notify('链接已复制', 'success');
    }
  }, [uploadedHtmlUrl, show]);

  // 加载项目数据 & 用户模板
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      // 直接使用 projectId 同步项目数据
      syncProject(projectId);
    }

    // 加载用户模板列表（用于按需获取File）
    const loadTemplates = async () => {
      try {
        const response = await listUserTemplates();
        if (response.data?.templates) {
          setUserTemplates(response.data.templates);
        }
      } catch (error: any) {
        console.error('加载用户模板失败:', error);
      }
    };
    loadTemplates();
  }, [projectId, currentProject, syncProject]);

  // 点击空白处自动收起导出菜单
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // 当项目加载后，初始化额外要求和风格描述
  // 只在项目首次加载或项目ID变化时初始化，避免覆盖用户正在输入的内容
  useEffect(() => {
    if (currentProject) {
      // 检查是否是新项目
      const isNewProject = lastProjectId.current !== currentProject.id;

      if (isNewProject) {
        // 新项目，初始化额外要求和风格描述
        setExtraRequirements(currentProject.extra_requirements || '');
        setTemplateStyle(currentProject.template_style || '');
        // 初始化导出设置
        setExportExtractorMethod((currentProject.export_extractor_method as ExportExtractorMethod) || 'hybrid');
        setExportInpaintMethod((currentProject.export_inpaint_method as ExportInpaintMethod) || 'hybrid');
        lastProjectId.current = currentProject.id || null;
        isEditingRequirements.current = false;
        isEditingTemplateStyle.current = false;
      } else {
        // 同一项目且用户未在编辑，可以更新（比如从服务器保存后同步回来）
        if (!isEditingRequirements.current) {
          setExtraRequirements(currentProject.extra_requirements || '');
        }
        if (!isEditingTemplateStyle.current) {
          setTemplateStyle(currentProject.template_style || '');
        }
      }
      // 如果用户正在编辑，则不更新本地状态
    }
  }, [currentProject?.id, currentProject?.extra_requirements, currentProject?.template_style]);

  // 加载当前页面的历史版本
  useEffect(() => {
    const loadVersions = async () => {
      if (!currentProject || !projectId || selectedIndex < 0 || selectedIndex >= currentProject.pages.length) {
        setImageVersions([]);
        setShowVersionMenu(false);
        return;
      }

      const page = currentProject.pages[selectedIndex];
      if (!page?.id) {
        setImageVersions([]);
        setShowVersionMenu(false);
        return;
      }

      try {
        const response = await getPageImageVersions(projectId, page.id);
        if (response.data?.versions) {
          setImageVersions(response.data.versions);
        }
      } catch (error: any) {
        console.error('Failed to load image versions:', error);
        setImageVersions([]);
      }
    };

    loadVersions();
  }, [currentProject, selectedIndex, projectId]);

  // 当前页面可用的布局变体
  const currentPageVariants = useMemo(() => {
    if (!currentProject?.pages || !isHtmlMode) return null;
    const page = currentProject.pages[selectedIndex];
    if (!page?.layout_id) return null;
    const layoutId = normalizeLayoutId(page.layout_id as LayoutId);
    const pool = VARIANT_POOLS[layoutId] || null;
    return pool;
  }, [currentProject?.pages, selectedIndex, isHtmlMode]);

  const currentPageVariantId = useMemo(() => {
    if (!currentProject?.pages) return 'a';
    const page = currentProject.pages[selectedIndex];
    const model = page?.html_model as Record<string, unknown> | undefined;
    const outlineVariant = typeof page?.outline_content?.layout_variant === 'string'
      ? page.outline_content.layout_variant
      : undefined;
    const variantId = resolveLayoutVariant(model, outlineVariant);
    return variantId;
  }, [currentProject?.pages, resolveLayoutVariant, selectedIndex]);

  const handleVariantChange = useCallback(async (variantId: string) => {
    if (!currentProject?.pages || !projectId) return;
    const page = currentProject.pages[selectedIndex];
    if (!page?.id) return;
    if (isVariantUpdating) return;

    const existingModel = (page.html_model || {}) as Record<string, unknown>;
    const currentVariant = resolveLayoutVariant(existingModel);
    if (currentVariant === variantId) return;
    const updatedModel = { ...existingModel, variant: variantId, layout_variant: variantId };
    const targetPageId = page.id;

    setIsVariantUpdating(true);

    // Optimistic local update: immediately reflect variant in UI (only current page)
    useProjectStore.setState((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          pages: state.currentProject.pages.map((p) =>
            p.id === targetPageId
              ? { ...p, html_model: updatedModel as any }
              : p
          ),
        },
      };
    });

    try {
      const response = await updatePage(projectId, targetPageId, { html_model: updatedModel } as any);
      if (response.data) {
        const serverPage = response.data as any;
        useProjectStore.setState((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              pages: state.currentProject.pages.map((p) =>
                p.id === targetPageId
                  ? {
                      ...p,
                      ...serverPage,
                      id: serverPage.page_id || serverPage.id || p.id,
                      generated_image_path: serverPage.generated_image_url || serverPage.generated_image_path || p.generated_image_path,
                    }
                  : p
              ),
            },
          };
        });
      }
    } catch (error) {
      console.error('Failed to switch variant:', error);
      // Revert optimistic update on failure (only target page)
      useProjectStore.setState((state) => {
        if (!state.currentProject) return state;
        return {
          currentProject: {
            ...state.currentProject,
            pages: state.currentProject.pages.map((p) =>
              p.id === targetPageId
                ? { ...p, html_model: existingModel as any }
                : p
            ),
          },
        };
      });
      notify('切换变体失败', 'error');
    } finally {
      setIsVariantUpdating(false);
    }
  }, [currentProject, selectedIndex, projectId, notify, isVariantUpdating, resolveLayoutVariant]);

  const handleGenerateAll = async () => {
    const pageIds = getSelectedPageIdsForExport();

    // 检查要生成的页面中是否有已有图片的
    const pagesToGenerate = currentProject?.pages;
    const hasImages = pagesToGenerate?.some((p) => p.generated_image_path);

    const executeGenerate = async () => {
      await generateImages(pageIds);
    };

    if (hasImages) {
      const message = '将重新生成所有页面（历史记录将会保存），确定继续吗？';
      confirm(
        message,
        executeGenerate,
        { title: '确认重新生成', variant: 'warning' }
      );
    } else {
      await executeGenerate();
    }
  };

  // HTML 模式图片生成函数
  const handleGenerateHtmlImages = useCallback(async () => {
    if (!currentProject || !isHtmlMode) return;
    const slots = buildHtmlImageSlots(currentProject.pages);

    if (slots.length === 0) {
      show({ message: '没有需要生成图片的插槽', type: 'info' });
      return;
    }

    setIsGeneratingHtmlImages(true);
    setHtmlImageGenerationProgress({ current: 0, total: slots.length });

    try {
      show({ message: `开始生成 ${slots.length} 张图片...`, type: 'info' });

      let successCount = 0;
      let errorCount = 0;

      // 使用流式 API，每收到一张图片就立即更新状态
      await generateHtmlImagesStreaming(
        currentProject.id || '',
        slots,
        (event: HtmlImageSSEEvent) => {
          switch (event.type) {
            case 'progress':
              // 更新进度
              if (event.current && event.total) {
                setHtmlImageGenerationProgress({ current: event.current, total: event.total });
              }
              break;

            case 'image':
              // 收到一张新图片，立即更新状态
              if (event.page_id && event.slot_path && event.image_base64) {
                setHtmlPageImages(prev => {
                  const newImages = { ...prev };
                  if (!newImages[event.page_id!]) {
                    newImages[event.page_id!] = {};
                  }
                  newImages[event.page_id!][event.slot_path!] = event.image_base64!;
                  return newImages;
                });
                successCount++;
              }
              break;

            case 'error':
              // 记录错误
              console.error(`图片生成失败: page_id=${event.page_id}, error=${event.error}`);
              if (event.error) {
                show({ message: `图片生成失败：${event.error}`, type: 'error' });
              }
              errorCount++;
              break;

            case 'complete':
              // 完成
              if (event.summary) {
                if (event.summary.error > 0) {
                  show({ message: `生成完成：成功 ${event.summary.success}，失败 ${event.summary.error}`, type: 'info' });
                } else {
                  show({ message: `成功生成 ${event.summary.success} 张图片`, type: 'success' });
                }
              }
              break;
          }
        }
      );
    } catch (error) {
      console.error('生成 HTML 图片失败:', error);
      show({ message: normalizeErrorMessage(error, '图片生成失败'), type: 'error' });
    } finally {
      setIsGeneratingHtmlImages(false);
    }
  }, [currentProject, isHtmlMode, show, buildHtmlImageSlots]);

  const handleGenerateCurrentHtmlImages = useCallback(async () => {
    if (!currentProject || !isHtmlMode) return;
    const slots = buildHtmlImageSlots(currentProject.pages, selectedIndex);

    if (slots.length === 0) {
      show({ message: '当前页没有需要生成图片的插槽', type: 'info' });
      return;
    }

    setIsGeneratingHtmlImages(true);
    setHtmlImageGenerationProgress({ current: 0, total: slots.length });

    try {
      show({ message: `开始生成当前页 ${slots.length} 张图片...`, type: 'info' });

      let successCount = 0;
      let errorCount = 0;

      await generateHtmlImagesStreaming(
        currentProject.id || '',
        slots,
        (event: HtmlImageSSEEvent) => {
          switch (event.type) {
            case 'progress':
              if (event.current && event.total) {
                setHtmlImageGenerationProgress({ current: event.current, total: event.total });
              }
              break;
            case 'image':
              if (event.page_id && event.slot_path && event.image_base64) {
                setHtmlPageImages(prev => {
                  const newImages = { ...prev };
                  if (!newImages[event.page_id!]) {
                    newImages[event.page_id!] = {};
                  }
                  newImages[event.page_id!][event.slot_path!] = event.image_base64!;
                  return newImages;
                });
                successCount++;
              }
              break;
            case 'error':
              console.error(`图片生成失败: page_id=${event.page_id}, error=${event.error}`);
              if (event.error) {
                show({ message: `图片生成失败：${event.error}`, type: 'error' });
              }
              errorCount++;
              break;
            case 'complete':
              if (event.summary) {
                if (event.summary.error > 0) {
                  show({ message: `生成完成：成功 ${event.summary.success}，失败 ${event.summary.error}`, type: 'info' });
                } else {
                  show({ message: `成功生成 ${event.summary.success} 张图片`, type: 'success' });
                }
              }
              break;
          }
        }
      );
    } catch (error) {
      console.error('生成 HTML 图片失败:', error);
      show({ message: normalizeErrorMessage(error, '图片生成失败'), type: 'error' });
    } finally {
      setIsGeneratingHtmlImages(false);
    }
  }, [currentProject, isHtmlMode, selectedIndex, show, buildHtmlImageSlots]);

  const handleGenerateHtmlBackgrounds = useCallback(async () => {
    if (!currentProject || !isHtmlMode) return;
    const slots = buildHtmlBackgroundSlots(currentProject.pages);

    if (slots.length === 0) {
      show({ message: '没有可生成的背景图', type: 'info' });
      return;
    }

    setIsGeneratingHtmlBackgrounds(true);
    setHtmlBackgroundGenerationProgress({ current: 0, total: slots.length });

    try {
      show({ message: '开始生成统一背景图...', type: 'info' });

      let successCount = 0;
      let errorCount = 0;

      await generateHtmlImagesStreaming(
        currentProject.id || '',
        slots,
        (event: HtmlImageSSEEvent) => {
          switch (event.type) {
            case 'progress':
              if (event.current && event.total) {
                setHtmlBackgroundGenerationProgress({ current: event.current, total: event.total });
              }
              break;
            case 'image':
              if (event.image_base64) {
                setHtmlGlobalBackground(event.image_base64);
                successCount++;
              }
              break;
            case 'error':
              console.error(`背景图生成失败: page_id=${event.page_id}, error=${event.error}`);
              if (event.error) {
                show({ message: `背景图生成失败：${event.error}`, type: 'error' });
              }
              errorCount++;
              break;
            case 'complete':
              if (event.summary) {
                if (event.summary.error > 0) {
                  show({ message: `背景图生成完成：成功 ${event.summary.success}，失败 ${event.summary.error}`, type: 'info' });
                } else {
                  show({ message: '背景图已更新', type: 'success' });
                }
              }
              break;
          }
        }
      );
    } catch (error) {
      console.error('生成背景图失败:', error);
      show({ message: normalizeErrorMessage(error, '背景图生成失败'), type: 'error' });
    } finally {
      setIsGeneratingHtmlBackgrounds(false);
    }
  }, [currentProject, isHtmlMode, show, buildHtmlBackgroundSlots]);

  

  const handleUploadBackground = useCallback(() => {
    setBackgroundPickerMode('menu');
    setIsBackgroundPickerOpen(true);
  }, []);

  const handleBackgroundFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setHtmlGlobalBackground(base64);
      setIsBackgroundPickerOpen(false);
      show({ message: '背景图上传成功', type: 'success' });
    } catch (error) {
      console.error('背景图上传失败:', error);
      show({ message: '背景图上传失败', type: 'error' });
    }
  }, [show]);

  const loadBackgroundMaterials = useCallback(async () => {
    setIsLoadingBackgroundMaterials(true);
    try {
      const response = await listMaterials('all');
      if (response.data?.materials) {
        setBackgroundMaterials(response.data.materials);
      }
    } catch (error) {
      console.error('加载素材库失败:', error);
      show({ message: '加载素材库失败', type: 'error' });
    } finally {
      setIsLoadingBackgroundMaterials(false);
    }
  }, [show]);

  const handleSelectBackgroundMaterial = useCallback(async (material: Material) => {
    try {
      const file = await materialUrlToFile(material);
      const base64 = await fileToBase64(file);
      setHtmlGlobalBackground(base64);
      setIsBackgroundPickerOpen(false);
      show({ message: '背景图已设置', type: 'success' });
    } catch (error) {
      console.error('设置背景图失败:', error);
      show({ message: '设置背景图失败', type: 'error' });
    }
  }, [show]);

  const handleClearBackground = useCallback(() => {
    setHtmlGlobalBackground('');
    show({ message: '背景图已清除', type: 'success' });
  }, [show]);

  // 处理图片上传触发（支持指定页面）
  const triggerImageUpload = useCallback((slotPath: string, pageIdOverride?: string) => {
    if (!currentProject) return;
    const pageId = pageIdOverride || currentProject.pages[selectedIndex]?.id;
    if (!pageId) return;

    setUploadTarget({ pageId, slotPath });
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // 清空以前的选择
      fileInputRef.current.click();
    }
  }, [currentProject, selectedIndex]);

  // 处理文件选择
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    try {
      const base64 = await fileToBase64(file);

      setHtmlPageImages(prev => {
        const newImages = { ...prev };
        if (!newImages[uploadTarget.pageId]) {
          newImages[uploadTarget.pageId] = {};
        }
        newImages[uploadTarget.pageId][uploadTarget.slotPath] = base64;
        return newImages;
      });

      show({ message: '图片上传成功', type: 'success' });
    } catch (error) {
      console.error('图片上传失败:', error);
      show({ message: '图片上传失败', type: 'error' });
    } finally {
      setUploadTarget(null);
    }
  }, [uploadTarget, show]);

  const handleRegeneratePage = useCallback(async () => {
    if (!currentProject) return;
    const page = currentProject.pages[selectedIndex];
    if (!page.id) return;

    // 如果该页面正在生成，不重复提交
    if (pageGeneratingTasks[page.id]) {
      show({ message: '该页面正在生成中，请稍候...', type: 'info' });
      return;
    }

    try {
      // 使用统一的 generateImages，传入单个页面 ID
      await generateImages([page.id]);
      show({ message: '已开始生成图片，请稍候...', type: 'success' });
    } catch (error: any) {
      // 提取后端返回的更具体错误信息
      let errorMessage = '生成失败';
      const respData = error?.response?.data;

      if (respData) {
        if (respData.error?.message) {
          errorMessage = respData.error.message;
        } else if (respData.message) {
          errorMessage = respData.message;
        } else if (respData.error) {
          errorMessage =
            typeof respData.error === 'string'
              ? respData.error
              : respData.error.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // 使用统一的错误消息规范化函数
      errorMessage = normalizeErrorMessage(errorMessage);

      show({
        message: errorMessage,
        type: 'error',
      });
    }
  }, [currentProject, selectedIndex, pageGeneratingTasks, generateImages, show]);

  const handleSwitchVersion = async (versionId: string) => {
    if (!currentProject || !selectedPage?.id || !projectId) return;

    try {
      await setCurrentImageVersion(projectId, selectedPage.id, versionId);
      await syncProject(projectId);
      setShowVersionMenu(false);
      show({ message: '已切换到该版本', type: 'success' });
    } catch (error: any) {
      show({
        message: `切换失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    }
  };

  // 从描述内容中提取图片URL
  const _extractImageUrlsFromDescription = (descriptionContent: DescriptionContent | undefined): string[] => {
    if (!descriptionContent) return [];

    // 处理两种格式
    let text: string = '';
    if ('text' in descriptionContent) {
      text = descriptionContent.text as string;
    } else if ('text_content' in descriptionContent && Array.isArray(descriptionContent.text_content)) {
      text = descriptionContent.text_content.join('\n');
    }

    if (!text) return [];

    // 匹配 markdown 图片语法: ![](url) 或 ![alt](url)
    const pattern = /!\[.*?\]\((.*?)\)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const url = match[1]?.trim();
      // 只保留有效的HTTP/HTTPS URL
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        matches.push(url);
      }
    }

    return matches;
  };

  const handleEditPage = () => {
    if (!currentProject) return;
    const page = currentProject.pages[selectedIndex];
    const pageId = page?.id;

    setIsOutlineExpanded(false);
    setIsDescriptionExpanded(false);

    if (pageId && editContextByPage[pageId]) {
      // 恢复该页上次编辑的内容和图片选择
      const cached = editContextByPage[pageId];
      setEditPrompt(cached.prompt);
      setSelectedContextImages({
        useTemplate: cached.contextImages.useTemplate,
        descImageUrls: [...cached.contextImages.descImageUrls],
        uploadedFiles: [...cached.contextImages.uploadedFiles],
      });
    } else {
      // 首次编辑该页，使用默认值
      setEditPrompt('');
      setSelectedContextImages({
        useTemplate: false,
        descImageUrls: [],
        uploadedFiles: [],
      });
    }

    // 打开编辑弹窗时，清空上一次的选区和模式
    setIsRegionSelectionMode(false);
    setSelectionStart(null);
    setSelectionRect(null);
    setIsSelectingRegion(false);

    setIsEditModalOpen(true);
  };

  const _handleSubmitEdit = useCallback(async () => {
    if (!currentProject || !editPrompt.trim()) return;

    const page = currentProject.pages[selectedIndex];
    if (!page.id) return;

    // 调用后端编辑接口
    await editPageImage(
      page.id,
      editPrompt,
      {
        useTemplate: selectedContextImages.useTemplate,
        descImageUrls: selectedContextImages.descImageUrls,
        uploadedFiles: selectedContextImages.uploadedFiles.length > 0
          ? selectedContextImages.uploadedFiles
          : undefined,
      }
    );

    // 缓存当前页的编辑上下文，便于后续快速重复执行
    setEditContextByPage((prev) => ({
      ...prev,
      [page.id!]: {
        prompt: editPrompt,
        contextImages: {
          useTemplate: selectedContextImages.useTemplate,
          descImageUrls: [...selectedContextImages.descImageUrls],
          uploadedFiles: [...selectedContextImages.uploadedFiles],
        },
      },
    }));

    setIsEditModalOpen(false);
  }, [currentProject, selectedIndex, editPrompt, selectedContextImages, editPageImage]);

  const _handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedContextImages((prev) => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...files],
    }));
  };

  const _removeUploadedFile = (index: number) => {
    setSelectedContextImages((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index),
    }));
  };

  const handleSelectMaterials = async (materials: Material[]) => {
    try {
      // 将选中的素材转换为File对象并添加到上传列表
      const files = await Promise.all(
        materials.map((material) => materialUrlToFile(material))
      );
      setSelectedContextImages((prev) => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, ...files],
      }));
      show({ message: `已添加 ${materials.length} 个素材`, type: 'success' });
    } catch (error: any) {
      console.error('加载素材失败:', error);
      show({
        message: '加载素材失败: ' + (error.message || '未知错误'),
        type: 'error',
      });
    }
  };

  // 编辑弹窗打开时，实时把输入与图片选择写入缓存（前端会话内）
  useEffect(() => {
    if (!isEditModalOpen || !currentProject) return;
    const page = currentProject.pages[selectedIndex];
    const pageId = page?.id;
    if (!pageId) return;

    setEditContextByPage((prev) => ({
      ...prev,
      [pageId]: {
        prompt: editPrompt,
        contextImages: {
          useTemplate: selectedContextImages.useTemplate,
          descImageUrls: [...selectedContextImages.descImageUrls],
          uploadedFiles: [...selectedContextImages.uploadedFiles],
        },
      },
    }));
  }, [isEditModalOpen, currentProject, selectedIndex, editPrompt, selectedContextImages]);

  // ========== 预览图矩形选择相关逻辑（编辑弹窗内） ==========
  const _handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRegionSelectionMode || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    setIsSelectingRegion(true);
    setSelectionStart({ x, y });
    setSelectionRect(null);
  };

  const _handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRegionSelectionMode || !isSelectingRegion || !selectionStart || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));

    const left = Math.min(selectionStart.x, clampedX);
    const top = Math.min(selectionStart.y, clampedY);
    const width = Math.abs(clampedX - selectionStart.x);
    const height = Math.abs(clampedY - selectionStart.y);

    setSelectionRect({ left, top, width, height });
  };

  const _handleSelectionMouseUp = async () => {
    if (!isRegionSelectionMode || !isSelectingRegion || !selectionRect || !imageRef.current) {
      setIsSelectingRegion(false);
      setSelectionStart(null);
      return;
    }

    // 结束拖拽，但保留选中的矩形，直到用户手动退出区域选图模式
    setIsSelectingRegion(false);
    setSelectionStart(null);

    try {
      const img = imageRef.current;
      const { left, top, width, height } = selectionRect;
      if (width < 10 || height < 10) {
        // 选区太小，忽略
        return;
      }

      // 将选区从展示尺寸映射到原始图片尺寸
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;

      if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) return;

      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;

      const sx = left * scaleX;
      const sy = top * scaleY;
      const sWidth = width * scaleX;
      const sHeight = height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sWidth));
      canvas.height = Math.max(1, Math.round(sHeight));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        ctx.drawImage(
          img,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob((blob) => {
          if (!blob) return;
          const file = new File([blob], `crop-${Date.now()}.png`, { type: 'image/png' });
          // 把选中区域作为额外参考图片加入上传列表
          setSelectedContextImages((prev) => ({
            ...prev,
            uploadedFiles: [...prev.uploadedFiles, file],
          }));
          // 给用户一个明显反馈：选区已作为图片加入下方“上传图片”
          show({
            message: '已将选中区域添加为参考图片，可在下方“上传图片”中查看与删除',
            type: 'success',
          });
        }, 'image/png');
      } catch (e: any) {
        console.error('裁剪选中区域失败（可能是跨域图片导致 canvas 被污染）:', e);
        show({
          message: '无法从当前图片裁剪区域（浏览器安全限制）。可以尝试手动上传参考图片。',
          type: 'error',
        });
      }
    } finally {
      // 不清理 selectionRect，让选区在界面上持续显示
    }
  };

  // 获取有图片的选中页面ID列表（导出全部）
  const getSelectedPageIdsForExport = (): string[] | undefined => {
    return undefined; // 导出全部
  };

  const handleExport = async (type: 'pptx' | 'pdf' | 'editable-pptx') => {
    setShowExportMenu(false);
    if (!projectId) return;

    const pageIds = getSelectedPageIdsForExport();
    const exportTaskId = `export-${Date.now()}`;

    try {
      if (type === 'pptx') {
        // 自动上传 HTML 获取在线链接，再调用导出
        let htmlUrl = uploadedHtmlUrl;
        
        if (!htmlUrl) {
          notify('正在生成在线链接...', 'info');
          htmlUrl = await handleUploadHTML({ silent: true });
        }
        
        if (!htmlUrl) {
          notify('获取在线链接失败，请重试', 'error');
          return;
        }
        
        // 检查外部脚本加载状态
        const generator = (window as any).generateHighFidelityPPT;
        
        if (typeof generator !== 'function') {
          notify('未检测到 PPTX 导出脚本，请检查 HTMLtoPPT.js 是否加载', 'error');
          return;
        }
        
        try {
          generator(htmlUrl);
          notify('正在导出 PPTX...', 'success');
        } catch (genError: any) {
          console.error('[PPTX导出] generator 执行出错:', genError);
          notify(`导出失败: ${genError?.message || genError}`, 'error');
        }
        return;
      }
      if (type === 'pdf') {
        // Synchronous export - direct download, create completed task directly
        const response = await apiExportPDF(projectId, pageIds);
        const downloadUrl = response.data?.download_url || response.data?.download_url_absolute;
        if (downloadUrl) {
          addTask({
            id: exportTaskId,
            taskId: '',
            projectId,
            type: type as ExportTaskType,
            status: 'COMPLETED',
            downloadUrl,
            pageIds: pageIds,
          });
          window.open(downloadUrl, '_blank');
        }
      } else if (type === 'editable-pptx') {
        // Async export - create processing task and start polling
        addTask({
          id: exportTaskId,
          taskId: '', // Will be updated below
          projectId,
          type: 'editable-pptx',
          status: 'PROCESSING',
          pageIds: pageIds,
        });

        show({ message: '导出任务已开始，可在导出任务面板查看进度', type: 'success' });

        const response = await apiExportEditablePPTX(projectId, undefined, pageIds);
        const taskId = response.data?.task_id;

        if (taskId) {
          // Update task with real taskId
          addTask({
            id: exportTaskId,
            taskId,
            projectId,
            type: 'editable-pptx',
            status: 'PROCESSING',
            pageIds: pageIds,
          });

          // Start polling in background (non-blocking)
          pollExportTask(exportTaskId, projectId, taskId);
        }
      }
    } catch (error: any) {
      console.error('[导出] 导出失败:', error);
      // Update task as failed
      addTask({
        id: exportTaskId,
        taskId: '',
        projectId,
        type: type as ExportTaskType,
        status: 'FAILED',
        errorMessage: normalizeErrorMessage(error.message || '导出失败'),
        pageIds: pageIds,
      });
      show({ message: normalizeErrorMessage(error.message || '导出失败'), type: 'error' });
    }
  };

  const _handleRefresh = useCallback(async () => {
    const targetProjectId = projectId || currentProject?.id;
    if (!targetProjectId) {
      show({ message: '无法刷新：缺少项目ID', type: 'error' });
      return;
    }

    setIsRefreshing(true);
    try {
      await syncProject(targetProjectId);
      show({ message: '刷新成功', type: 'success' });
    } catch (error: any) {
      show({
        message: error.message || '刷新失败，请稍后重试',
        type: 'error'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId, currentProject?.id, syncProject, show]);

  const handleSaveExtraRequirements = useCallback(async () => {
    if (!currentProject || !projectId) return;

    setIsSavingRequirements(true);
    try {
      await updateProject(projectId, { extra_requirements: extraRequirements || '' });
      // 保存成功后，标记为不在编辑状态，允许同步更新
      isEditingRequirements.current = false;
      // 更新本地项目状态
      await syncProject(projectId);
      show({ message: '额外要求已保存', type: 'success' });
    } catch (error: any) {
      show({
        message: `保存失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    } finally {
      setIsSavingRequirements(false);
    }
  }, [currentProject, projectId, extraRequirements, syncProject, show]);

  const handleSaveTemplateStyle = useCallback(async () => {
    if (!currentProject || !projectId) return;

    setIsSavingTemplateStyle(true);
    try {
      await updateProject(projectId, { template_style: templateStyle || '' });
      // 保存成功后，标记为不在编辑状态，允许同步更新
      isEditingTemplateStyle.current = false;
      // 更新本地项目状态
      await syncProject(projectId);
      show({ message: '风格描述已保存', type: 'success' });
    } catch (error: any) {
      show({
        message: `保存失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    } finally {
      setIsSavingTemplateStyle(false);
    }
  }, [currentProject, projectId, templateStyle, syncProject, show]);

  const handleSaveExportSettings = useCallback(async () => {
    if (!currentProject || !projectId) return;

    setIsSavingExportSettings(true);
    try {
      await updateProject(projectId, {
        export_extractor_method: exportExtractorMethod,
        export_inpaint_method: exportInpaintMethod
      });
      // 更新本地项目状态
      await syncProject(projectId);
      show({ message: '导出设置已保存', type: 'success' });
    } catch (error: any) {
      show({
        message: `保存失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    } finally {
      setIsSavingExportSettings(false);
    }
  }, [currentProject, projectId, exportExtractorMethod, exportInpaintMethod, syncProject, show]);

  const handleTemplateSelect = async (templateFile: File | null, templateId?: string) => {
    if (!projectId) return;

    // 如果有templateId，按需加载File
    let file = templateFile;
    if (templateId && !file) {
      file = await getTemplateFile(templateId, userTemplates);
      if (!file) {
        show({ message: '加载模板失败', type: 'error' });
        return;
      }
    }

    if (!file) {
      // 如果没有文件也没有 ID，可能是取消选择
      return;
    }

    setIsUploadingTemplate(true);
    try {
      await uploadTemplate(projectId, file);
      await syncProject(projectId);
      setIsTemplateModalOpen(false);
      show({ message: '模板更换成功', type: 'success' });

      // 更新选择状态
      if (templateId) {
        setSelectedTemplateId(templateId);
      }
    } catch (error: any) {
      show({
        message: `更换模板失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const redirectHomepage = () => {
    window.redirect_homepage?.({
      request: '',
      persistent: false,
      onSuccess: function(response: any) {
        console.log('返回成功:', response);
      },
      onFailure: function(_error_code: any, error_message: any) {
        console.error("window.redirect_homepage 请求失败:", error_message);
        alert('返回失败: ' + error_message);
      }
    });
  };

  if (!currentProject) {
    return <Loading fullscreen message="加载项目中..." />;
  }

  if (isGlobalLoading) {
    // 根据任务进度显示不同的消息
    let loadingMessage = "处理中...";
    if (taskProgress && typeof taskProgress === 'object') {
      const progressData = taskProgress as any;
      if (progressData.current_step) {
        // 使用后端提供的当前步骤信息
        const stepMap: Record<string, string> = {
          'Generating clean backgrounds': '正在生成干净背景...',
          'Creating PDF': '正在创建PDF...',
          'Parsing with MinerU': '正在解析内容...',
          'Creating editable PPTX': '正在创建可编辑PPTX...',
          'Complete': '完成！'
        };
        loadingMessage = stepMap[progressData.current_step] || progressData.current_step;
      }
      // 不再显示 "处理中 (X/Y)..." 格式，百分比已在进度条显示
    }

    return (
      <Loading
        fullscreen
        message={loadingMessage}
        progress={taskProgress || undefined}
      />
    );
  }

  const selectedPage = currentProject.pages[selectedIndex];
  const imageUrl = selectedPage?.generated_image_path
    ? getImageUrl(selectedPage.generated_image_path, selectedPage.updated_at)
    : '';

  const _hasAllImages = currentProject.pages.every(
    (p) => p.generated_image_path
  );

  return (
    <div className="app-shell h-screen flex flex-col overflow-hidden">
      <SlidePreviewHeader
        projectId={projectId}
        pages={currentProject.pages}
        exportTasks={exportTasks}
        htmlGlobalBackground={htmlGlobalBackground}
        isHtmlMode={isHtmlMode}
        showExportMenu={showExportMenu}
        showExportTasksPanel={showExportTasksPanel}
        exportMenuRef={exportMenuRef}
        onGoHome={redirectHomepage}
        onGoBack={() => {
          if (fromHistory) {
            navigate('/history');
          } else {
            navigate(`/project/${projectId}/detail`);
          }
        }}
        onGoPreviousStep={() => navigate(`/project/${projectId}/detail`)}
        onToggleExportMenu={() => {
          setShowExportMenu(!showExportMenu);
          setShowExportTasksPanel(false);
        }}
        onToggleExportTasksPanel={() => {
          setShowExportTasksPanel(!showExportTasksPanel);
          setShowExportMenu(false);
        }}
        onClearBackground={handleClearBackground}
        onExportPptx={() => handleExport('pptx')}
        onDownloadHtmlSlides={handleDownloadHTMLSlides}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0 min-h-0">
        <SlideThumbnailRail
          batchActionLabel={isGeneratingHtmlImages
            ? `生成中 (${htmlImageGenerationProgress.current}/${htmlImageGenerationProgress.total})`
            : isHtmlMode
              ? `批量生成图片 (${totalImageSlots})`
              : `批量生成图片 (${currentProject.pages.length})`}
          isGeneratingHtmlImages={isGeneratingHtmlImages}
          isGeneratingHtmlBackgrounds={isGeneratingHtmlBackgrounds}
          htmlBackgroundProgressLabel={isGeneratingHtmlBackgrounds
            ? `生成中 (${htmlBackgroundGenerationProgress.current}/${htmlBackgroundGenerationProgress.total})`
            : '生成背景'}
          onBatchGenerate={isHtmlMode ? handleGenerateHtmlImages : handleGenerateAll}
          onGenerateCurrentHtmlImages={handleGenerateCurrentHtmlImages}
          onGenerateHtmlBackgrounds={handleGenerateHtmlBackgrounds}
          onUploadBackground={handleUploadBackground}
          isHtmlMode={isHtmlMode}
        >
          {currentProject.pages.map((page, index) => (
            <div key={page.id} className="md:w-full flex-shrink-0 relative">
                  {/* 移动端：简化缩略图 */}
              <div className="md:hidden relative">
                <button
                  onClick={() => {
                    setSelectedIndex(index);
                  }}
                  className={`w-20 h-14 rounded border-2 transition-all overflow-hidden ${selectedIndex === index
                    ? 'border-banana-500 shadow-md'
                    : 'border-gray-200'
                    }`}
                >
                  {isHtmlMode ? (
                        // HTML模式：显示渲染的缩略图
                    (() => {
                      const payload = convertPageToPayload(page, index);
                      if (payload) {
                        return (
                          <div style={{
                            transform: 'scale(0.08)',
                            transformOrigin: 'top left',
                            width: htmlTheme.sizes.slideWidth,
                            height: htmlTheme.sizes.slideHeight,
                          }}>
                            <SlideRenderer
                              page={payload}
                              theme={htmlTheme}
                              scale={1}
                              onImageUpload={(slotPath) => triggerImageUpload(slotPath, page.id || payload.page_id)}
                            />
                          </div>
                        );
                      }
                      return (
                        <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                          {index + 1}
                        </div>
                      );
                    })()
                  ) : page.generated_image_path ? (
                        <img
                          src={getImageUrl(page.generated_image_path, page.updated_at)}
                          alt={`Slide ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                  ) : (
                        <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                          {index + 1}
                        </div>
                  )}
                </button>
              </div>
                  {/* 桌面端：完整卡片 */}
              <div className="hidden md:block relative">
                {isHtmlMode ? (
                      // HTML模式：使用SlideRenderer渲染缩略图
                  (() => {
                    const payload = convertPageToPayload(page, index);
                    if (payload) {
                      return (
                        <div
                          onClick={() => {
                            setSelectedIndex(index);
                          }}
                          className={`md:w-full cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedIndex === index
                            ? 'border-banana-500 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div
                            ref={index === 0 ? thumbnailContainerRef : undefined}
                            className="md:w-full"
                            style={{
                              width: '100%',
                              overflow: 'hidden',
                              aspectRatio: '1280 / 720',
                            }}
                          >
                            <SlideRenderer
                              page={payload}
                              theme={htmlTheme}
                              scale={thumbnailScale}
                              onImageUpload={(slotPath) => triggerImageUpload(slotPath, page.id || payload.page_id)}
                            />
                          </div>
                          <div className="p-2 bg-white">
                            <p className="text-xs text-gray-600 truncate">
                              {index + 1}. {page.outline_content?.title || getLayoutDisplayName(payload.layout_id)}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="p-4 bg-gray-100 rounded-lg text-center text-xs text-gray-400">
                        页面 {index + 1}
                      </div>
                    );
                  })()
                ) : (
                      // 传统模式：使用SlideCard
                  <SlideCard
                    page={page}
                    index={index}
                    isSelected={selectedIndex === index}
                    onClick={() => {
                      setSelectedIndex(index);
                    }}
                    onEdit={() => {
                      setSelectedIndex(index);
                      handleEditPage();
                    }}
                    onDelete={() => page.id && deletePageById(page.id)}
                    isGenerating={page.id ? !!pageGeneratingTasks[page.id] : false}
                  />
                )}
              </div>
            </div>
          ))}
        </SlideThumbnailRail>

        <SlidePreviewStage
          hasPages={currentProject.pages.length > 0}
          onBackToEdit={() => navigate(`/project/${projectId}/outline`)}
        >
          <>
              {/* 预览区 */}
              <div className="flex-1 overflow-hidden min-h-0 flex items-center justify-center p-4 md:p-8">
                <div className="max-w-5xl w-full">
                  <div
                    ref={isHtmlMode ? previewContainerRef : undefined}
                    className="relative aspect-video bg-white rounded-lg shadow-xl overflow-hidden touch-manipulation flex items-center justify-center"
                  >
                    {/* HTML渲染模式 */}
                    {isHtmlMode && selectedPagePayload ? (
                      <div
                        style={{
                          width: htmlTheme.sizes.slideWidth * previewScale,
                          height: htmlTheme.sizes.slideHeight * previewScale,
                          flexShrink: 0,
                        }}
                      >
                        <SlideRenderer
                          page={selectedPagePayload}
                          theme={htmlTheme}
                          scale={previewScale}
                          isSelected={true}
                          onImageUpload={(slotPath) => triggerImageUpload(slotPath, currentProject.pages[selectedIndex]?.id || selectedPagePayload.page_id)}
                        />
                      </div>
                    ) : isHtmlMode ? (
                      /* HTML模式但没有数据 */
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                          <p className="text-gray-500 mb-4">
                            请先在大纲/描述编辑页填写内容
                          </p>
                          <Button
                            variant="primary"
                            onClick={() => navigate(`/project/${projectId}/detail`)}
                          >
                            编辑内容
                          </Button>
                        </div>
                      </div>
                    ) : selectedPage?.generated_image_path ? (
                      /* 传统图片模式：显示生成的图片 */
                      <img
                        src={imageUrl}
                        alt={`Slide ${selectedIndex + 1}`}
                        className="w-full h-full object-contain select-none"
                        draggable={false}
                      />
                    ) : (
                      /* 传统模式但没有图片 */
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                          <p className="text-gray-500 mb-4">
                            {selectedPage?.id && pageGeneratingTasks[selectedPage.id]
                              ? '正在生成中...'
                              : selectedPage?.status === 'GENERATING'
                                ? '正在生成中...'
                                : '尚未生成图片'}
                          </p>
                          {(!selectedPage?.id || !pageGeneratingTasks[selectedPage.id]) &&
                            selectedPage?.status !== 'GENERATING' && (
                              <Button
                                variant="primary"
                                onClick={handleRegeneratePage}
                              >
                                生成此页
                              </Button>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <SlidePreviewFooter
                selectedIndex={selectedIndex}
                totalPages={currentProject.pages.length}
                onPrevious={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                onNext={() => setSelectedIndex(Math.min(currentProject.pages.length - 1, selectedIndex + 1))}
                variants={currentPageVariants ?? undefined}
                currentVariant={currentPageVariantId}
                onVariantChange={handleVariantChange}
                isVariantUpdating={isVariantUpdating}
                versionMenu={imageVersions.length > 1 ? (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVersionMenu(!showVersionMenu)}
                      className="text-xs md:text-sm"
                    >
                      <span className="hidden md:inline">历史版本 ({imageVersions.length})</span>
                      <span className="md:hidden">版本</span>
                    </Button>
                    {showVersionMenu && (
                      <div className="absolute right-0 bottom-full mb-2 w-56 md:w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-40 max-h-96 overflow-y-auto">
                        {imageVersions.map((version) => (
                          <button
                            key={version.version_id}
                            onClick={() => handleSwitchVersion(version.version_id)}
                            className={`w-full px-3 md:px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between text-xs md:text-sm ${version.is_current ? 'bg-banana-50' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>版本 {version.version_number}</span>
                              {version.is_current && (
                                <span className="text-xs text-banana-600 font-medium">(当前)</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 hidden md:inline">
                              {version.created_at
                                ? new Date(version.created_at).toLocaleString('zh-CN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                                : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              />
          </>
        </SlidePreviewStage>
      </div>

      <HtmlFileInputs
        isHtmlMode={isHtmlMode}
        fileInputRef={fileInputRef}
        backgroundFileInputRef={backgroundFileInputRef}
        onFileChange={handleFileChange}
        onBackgroundFileChange={handleBackgroundFileChange}
      />

      <BackgroundPickerModal
        isOpen={isBackgroundPickerOpen}
        mode={backgroundPickerMode}
        materials={backgroundMaterials}
        isLoading={isLoadingBackgroundMaterials}
        backgroundFileInputRef={backgroundFileInputRef}
        onClose={() => setIsBackgroundPickerOpen(false)}
        onBack={() => setBackgroundPickerMode('menu')}
        onPickLocal={() => {
          if (backgroundFileInputRef.current) {
            backgroundFileInputRef.current.value = '';
            backgroundFileInputRef.current.click();
          }
        }}
        onOpenMaterialLibrary={async () => {
          setBackgroundPickerMode('material');
          await loadBackgroundMaterials();
        }}
        onSelectMaterial={handleSelectBackgroundMaterial}
      />

      <ToastContainer />
      {ConfirmDialog}

      <TemplatePickerModal
        isOpen={isTemplateModalOpen}
        isUploadingTemplate={isUploadingTemplate}
        selectedTemplateId={selectedTemplateId}
        projectId={projectId || null}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelect={handleTemplateSelect}
      />

      {projectId && (
        <ProjectAuxiliaryModals
          projectId={projectId}
          isMaterialModalOpen={isMaterialModalOpen}
          isMaterialSelectorOpen={isMaterialSelectorOpen}
          isProjectSettingsOpen={isProjectSettingsOpen}
          extraRequirements={extraRequirements}
          templateStyle={templateStyle}
          exportExtractorMethod={exportExtractorMethod}
          exportInpaintMethod={exportInpaintMethod}
          isSavingRequirements={isSavingRequirements}
          isSavingTemplateStyle={isSavingTemplateStyle}
          isSavingExportSettings={isSavingExportSettings}
          onCloseMaterialModal={() => setIsMaterialModalOpen(false)}
          onCloseMaterialSelector={() => setIsMaterialSelectorOpen(false)}
          onCloseProjectSettings={() => setIsProjectSettingsOpen(false)}
          onSelectMaterials={handleSelectMaterials}
          onExtraRequirementsChange={(value) => {
            isEditingRequirements.current = true;
            setExtraRequirements(value);
          }}
          onTemplateStyleChange={(value) => {
            isEditingTemplateStyle.current = true;
            setTemplateStyle(value);
          }}
          onSaveExtraRequirements={handleSaveExtraRequirements}
          onSaveTemplateStyle={handleSaveTemplateStyle}
          onExportExtractorMethodChange={setExportExtractorMethod}
          onExportInpaintMethodChange={setExportInpaintMethod}
          onSaveExportSettings={handleSaveExportSettings}
        />
      )}

      <HtmlUrlModal
        isOpen={showHtmlUrlModal}
        uploadedHtmlUrl={uploadedHtmlUrl}
        onClose={() => setShowHtmlUrlModal(false)}
        onCopyUrl={handleCopyUrl}
      />

    </div>
  );
};
