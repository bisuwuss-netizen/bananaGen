// TODO: split components
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Home,
  ArrowLeft,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  Image as ImageIcon,
  ImagePlus,
  Settings,
  CheckSquare,
  Square,
  Check,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button, Loading, Modal, Textarea, useToast, useConfirm, MaterialSelector, Markdown, ProjectSettingsModal, ExportTasksPanel } from '@/components/shared';
import { MaterialGeneratorModal } from '@/components/shared/MaterialGeneratorModal';
import { TemplateSelector, getTemplateFile } from '@/components/shared/TemplateSelector';
import { listUserTemplates, listMaterials, type UserTemplate } from '@/api/endpoints';
import { materialUrlToFile } from '@/components/shared/MaterialSelector';
import type { Material } from '@/api/endpoints';
import { SlideCard } from '@/components/preview/SlideCard';
import { useProjectStore } from '@/store/useProjectStore';
import { useExportTasksStore, type ExportTaskType } from '@/store/useExportTasksStore';
import { getImageUrl } from '@/api/client';
import { getPageImageVersions, setCurrentImageVersion, updateProject, uploadTemplate, exportPPTX as apiExportPPTX, exportPDF as apiExportPDF, exportEditablePPTX as apiExportEditablePPTX, generateHtmlImagesStreaming, type HtmlImageSlot, type HtmlImageSSEEvent } from '@/api/endpoints';
import { fileToBase64 } from '@/experimental/html-renderer/utils/htmlExporter';
import type { ImageVersion, DescriptionContent, ExportExtractorMethod, ExportInpaintMethod, LayoutId } from '@/types';
import { normalizeErrorMessage } from '@/utils';
// HTML渲染模式组件
import { SlideRenderer } from '@/experimental/html-renderer/components/SlideRenderer';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';
import type { PagePayload, ThemeConfig } from '@/experimental/html-renderer/types/schema';
import {
  generateHTMLDocument,
  downloadHTML,
} from '@/experimental/html-renderer/utils/htmlExporter';
import { renderLayoutHTML, normalizeLayoutId } from '@/experimental/html-renderer/layouts';

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
  const [previewScale, setPreviewScale] = useState(0.6); // 64rem/1280 的近似值，供不支持 calc(长度/长度) 的浏览器使用
  const thumbnailContainerRef = useRef<HTMLDivElement | null>(null);
  const [thumbnailScale, setThumbnailScale] = useState(0.15); // 缩略图缩放，由 JS 测量容器宽度后更新
  // 多选导出相关状态（已移除多选功能）
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const { show, ToastContainer } = useToast();

  // HTML 上传相关状态
  const [isUploadingHtml, setIsUploadingHtml] = useState(false);
  const [uploadedHtmlUrl, setUploadedHtmlUrl] = useState<string | null>(null);
  const [showHtmlUrlModal, setShowHtmlUrlModal] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  // Memoize pages with generated images to avoid re-computing in multiple places
  const pagesWithImages = useMemo(() => {
    return currentProject?.pages.filter(p => p.id && p.generated_image_path) || [];
  }, [currentProject?.pages]);

  // HTML渲染模式：检查项目是否为HTML模式
  const isHtmlMode = currentProject?.render_mode === 'html';
  const htmlTheme = useMemo<ThemeConfig>(() => {
    return getThemeByScheme(currentProject?.scheme_id);
  }, [currentProject?.scheme_id]);

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

  /**
   * 根据布局类型判断页面的图片插槽数量
   * 这个逻辑与 html-renderer/layouts 中的渲染逻辑保持一致
   * 
   * 支持图片插槽的布局：
   * - image_full: 必须有1个图片 (image_src)
   * - title_content: 可选1个配图 (image)
   * - title_bullets: 可选1个配图 (image)
   * - process_steps: 可选1个配图 (image)
   * - two_column: 左右栏如果是image类型，各有1个图片 (left.image_src, right.image_src)
   * - cover: 可选背景图 (background_image)
   * 
   * 不支持图片插槽的布局：
   * - toc, section_title, quote, ending
   */
  const getPageImageSlotCount = useCallback((page: typeof currentProject.pages[0]): number => {
    if (!page) return 0;

    // 非HTML模式：所有页面都需要生成图片（每页1张）
    if (!isHtmlMode) return 1;

    const layoutId = page.layout_id ? normalizeLayoutId(page.layout_id as LayoutId) : undefined;
    const htmlModel = page.html_model as Record<string, unknown> | undefined;

    // 这些布局类型没有图片插槽
    const noImageLayouts = ['toc', 'section_title', 'quote', 'ending'];
    if (layoutId && noImageLayouts.includes(layoutId)) {
      return 0;
    }

    // image_full 布局：必定有1个图片插槽
    if (layoutId === 'image_full') {
      return 1;
    }

    // two_column 布局：检查左右栏是否有图片类型
    if (layoutId === 'two_column' && htmlModel) {
      let count = 0;
      const left = htmlModel.left as Record<string, unknown> | undefined;
      const right = htmlModel.right as Record<string, unknown> | undefined;
      if (left?.type === 'image') count++;
      if (right?.type === 'image') count++;
      return count;
    }

    // title_content, title_bullets, process_steps 布局：
    // 这些布局总是支持1个可选配图插槽
    // 我们会在 convertPageToPayload 中自动添加默认的 image 字段
    if (['title_content', 'title_bullets', 'process_steps'].includes(layoutId || '')) {
      return 1;
    }

    // cover 布局：如果有 background_image 字段则有1个插槽
    if (layoutId === 'cover' && htmlModel && 'background_image' in htmlModel) {
      return 1;
    }

    return 0;
  }, [isHtmlMode]);

  // 辅助函数：判断页面是否有图片插槽
  const pageHasImageSlot = useCallback((page: typeof currentProject.pages[0]): boolean => {
    return getPageImageSlotCount(page) > 0;
  }, [getPageImageSlotCount]);

  // 计算有图片插槽的页面
  const pagesNeedingImages = useMemo(() => {
    if (!currentProject?.pages) return [];
    return currentProject.pages.filter(p => pageHasImageSlot(p));
  }, [currentProject?.pages, pageHasImageSlot]);

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
  const convertPageToPayload = useCallback((page: typeof currentProject.pages[0], index: number): PagePayload | null => {
    if (!page) return null;
    const pageId = page.id || page.page_id || `page-${index}`;

    // 如果有html_model，检查是否需要添加默认的image字段
    if (page.html_model && page.layout_id) {
      console.log('[convertPageToPayload] Original layout_id:', page.layout_id);
      const layoutId = normalizeLayoutId(page.layout_id as LayoutId);
      console.log('[convertPageToPayload] Normalized layout_id:', layoutId);
      let model = { ...page.html_model } as Record<string, unknown>;

      // 如果是章节页，使用计算好的章节编号映射（使编号按实际顺序递增）
      if (layoutId === 'section_title') {
        const correctSectionNumber = sectionNumberMap.get(index);
        if (correctSectionNumber !== undefined) {
          model.section_number = correctSectionNumber;
        }
      }

      // 为支持图片的布局添加默认的image字段（如果不存在）
      // 这样即使AI没有生成image字段，前端也会显示占位符
      const layoutsWithOptionalImage = ['title_content', 'title_bullets', 'process_steps'];
      if (layoutsWithOptionalImage.includes(layoutId) && !('image' in model)) {
        const defaultWidth = layoutId === 'process_steps' ? '80%' : '45%';
        // 添加默认的image字段，src为空字符串会显示占位符
        model.image = {
          src: '',
          alt: page.outline_content?.title || '配图',
          position: 'right',
          width: defaultWidth,
        };
      }

      // image_full 布局必须有 image_src
      if (layoutId === 'image_full' && !('image_src' in model)) {
        model.image_src = '';
        model.image_alt = page.outline_content?.title || '图片';
      }

      // 应用上传的图片到模型
      model = applyUploadedImagesToModel(pageId, model);

      return {
        page_id: pageId,
        order_index: index,
        layout_id: layoutId,
        model: model,
      };
    }

    // 如果没有html_model，根据outline_content生成默认模型
    const outline = page.outline_content;
    if (!outline) return null;

    // 根据页面位置和内容推断布局
    let layoutId: LayoutId = 'title_content';
    let model: Record<string, unknown> = {};

    if (index === 0) {
      // 第一页：封面
      layoutId = 'cover';
      model = {
        title: outline.title,
        subtitle: outline.points?.[0] || '',
      };
    } else if (outline.points && outline.points.length > 3) {
      // 多个要点：使用要点布局
      layoutId = 'title_bullets';
      model = {
        title: outline.title,
        bullets: outline.points.map(point => ({
          text: point,
        })),
        // 添加默认的image字段
        image: {
          src: '',
          alt: outline.title || '配图',
          position: 'right',
          width: '45%',
        },
      };
    } else {
      // 默认：标题+正文布局
      layoutId = 'title_content';
      model = {
        title: outline.title,
        content: outline.points?.join('\n\n') || '',
        // 添加默认的image字段
        image: {
          src: '',
          alt: outline.title || '配图',
          position: 'right',
          width: '45%',
        },
      };
    }

    // 应用上传的图片到模型
    model = applyUploadedImagesToModel(pageId, model);

    return {
      page_id: pageId,
      order_index: index,
      layout_id: layoutId,
      model: model,
    };
  }, [applyUploadedImagesToModel, sectionNumberMap]);

  // 根据页面与布局生成 HTML 模式图片插槽
  const buildHtmlImageSlots = useCallback((pages: typeof currentProject.pages, onlyIndex?: number): HtmlImageSlot[] => {
    const slots: HtmlImageSlot[] = [];
    if (!pages) return slots;

    const cleanText = (value: unknown): string => {
      if (typeof value !== 'string') return '';
      return value
        .replace(/\s+/g, ' ')
        .replace(/[<>`]/g, '')
        .trim();
    };

    const collectPageFacts = (page: typeof currentProject.pages[0], model: Record<string, any>): string[] => {
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
      if (layoutId === 'process_steps') {
        return '生成“流程步骤图”，必须体现先后顺序与动作结果，含1个主体和3-4个流程节点。';
      }
      if (layoutId === 'title_bullets') {
        return '生成“要点解释图”，画面需对应页面要点，至少体现3个相关元素之间关系。';
      }
      if (layoutId === 'two_column') {
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
      schemeId: string,
      facts: string[]
    ): string => {
      const topicLine = facts.length > 0
        ? `页面主题与信息：${facts.slice(0, 6).join('；')}`
        : '页面主题与信息：专业知识讲解场景';

      const schemeStyleMap: Record<string, string> = {
        tech_blue: '视觉风格：科技教学插画，冷蓝与青灰配色，专业克制，细节清晰。',
        academic: '视觉风格：学术讲解插画，冷灰与深蓝配色，理性严谨，构图干净。',
        interactive: '视觉风格：课堂互动插画，明亮但低饱和，亲和活泼，元素清楚。',
        visual: '视觉风格：叙事感插画，灰度基调+单一强调色，层次分明。',
        practical: '视觉风格：实操训练插画，工业橙与深灰，强调工具与步骤。',
        modern: '视觉风格：现代商务视觉，干净留白，几何结构与柔和层次。',
      };

      return [
        '任务：为PPT生成“内容解释型配图”，目标是帮助观众理解页面知识点。',
        topicLine,
        getLayoutIntent(layoutId, slotPath),
        schemeStyleMap[schemeId] || schemeStyleMap.tech_blue,
        '构图要求：主体明确，包含2-4个与主题强相关的具体元素，避免大面积空白。',
        '禁止：文字、数字、Logo、水印、纯抽象渐变、纯装饰边框、无意义背景纹理。',
      ].join(' ');
    };

    pages.forEach((page, index) => {
      if (onlyIndex !== undefined && index !== onlyIndex) return;
      const payload = convertPageToPayload(page, index);
      if (!payload) return;

      const model = payload.model as any;
      const layoutId = normalizeLayoutId(payload.layout_id as LayoutId);
      const pageId = payload.page_id;
      const schemeId = currentProject?.scheme_id || 'tech_blue';
      const push = (slotPath: string) => {
        const facts = collectPageFacts(page, model);
        const pageTitle = cleanText(model?.title) || cleanText(page?.outline_content?.title) || '';
        const visualGoal = getLayoutIntent(layoutId, slotPath);
        const prompt = getPrompt(layoutId, slotPath, schemeId, facts);
        slots.push({
          page_id: pageId,
          slot_path: slotPath,
          prompt,
          context: {
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

      switch (layoutId) {
        case 'cover':
          // 默认不自动生成封面背景，避免覆盖原模板
          break;
        case 'image_full':
          if (!model.image_src) push('image_src');
          break;
        case 'two_column':
          if (model.left?.type === 'image' && !model.left?.image_src) push('left.image_src');
          if (model.right?.type === 'image' && !model.right?.image_src) push('right.image_src');
          break;
        case 'title_bullets':
        case 'title_content':
        case 'process_steps':
          if (model.image?.src === '' || (model.image && !model.image.src)) {
            push('image.src');
          }
          break;
        default:
          break;
      }
    });

    return slots;
  }, [
    convertPageToPayload,
    currentProject?.scheme_id,
    currentProject?.idea_prompt,
    currentProject?.extra_requirements,
    currentProject?.template_style,
  ]);

  // 生成背景图的插槽（全页底图）
  const buildHtmlBackgroundSlots = useCallback((pages: typeof currentProject.pages): HtmlImageSlot[] => {
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
    const schemeId = currentProject?.scheme_id || 'tech_blue';
    const schemePromptMap: Record<string, string[]> = {
      tech_blue: [
        '科技风统一背景图，冷蓝/青灰/微光渐变，结构清晰。',
        '边缘点缀科技网格、粒子、曲线光带，中心保持干净留白。',
        '低饱和、柔和不抢正文，纹理细腻，避免过曝。'
      ],
      academic: [
        '学术严谨风统一背景图，冷灰/深蓝/米白，纸张质感。',
        '边缘点缀学术网格、书页边角、细线框，中心留白。',
        '避免夸张装饰与强视觉冲击。'
      ],
      interactive: [
        '互动活泼风统一背景图，明亮多彩但低饱和。',
        '边缘点缀贴纸/涂鸦/对话气泡，中心留白。',
        '氛围轻松、有课堂互动感。'
      ],
      visual: [
        '视觉叙事风统一背景图，高级灰度+单一强调色。',
        '边缘带摄影/海报质感光影，中心留白。',
        '图像感强，但避免文字干扰。'
      ],
      practical: [
        '实践操作风统一背景图，工业橙+深灰+白。',
        '边缘点缀工具轮廓、警示条、工程标记，中心留白。',
        '强调操作与安全提示的氛围。'
      ],
    };

    const prompt = [
      '高质量知识点教学PPT统一背景图。',
      titleSeed ? `主题：${titleSeed}。` : '',
      ...(schemePromptMap[schemeId] || schemePromptMap.tech_blue),
      '禁止出现任何文字、数字、符号、水印、Logo 或可识别标记。',
    ].filter(Boolean).join('');

    return [{
      page_id: pageId,
      slot_path: 'background_image',
      prompt,
      context: {
        layout_id: 'cover',
        scheme_id: schemeId,
        slot_role: 'background',
        page_title: cleanText(titleSeed),
        page_facts: titleSeed ? [cleanText(titleSeed)] : [],
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
      switch (normalizeLayoutId(payload.layout_id as LayoutId)) {
        case 'title_content':
        case 'title_bullets':
        case 'process_steps':
          return sum + 1;
        case 'image_full':
          return sum + 1;
        case 'two_column': {
          let count = 0;
          if (model.left?.type === 'image') count += 1;
          if (model.right?.type === 'image') count += 1;
          return sum + count;
        }
        default:
          return sum;
      }
    }, 0);
  }, [isHtmlMode, currentProject?.pages, convertPageToPayload]);

  // 当前选中页面的PagePayload（用于HTML渲染）
  const selectedPagePayload = useMemo(() => {
    if (!isHtmlMode || !currentProject?.pages[selectedIndex]) return null;
    return convertPageToPayload(currentProject.pages[selectedIndex], selectedIndex);
  }, [isHtmlMode, currentProject?.pages, selectedIndex, convertPageToPayload]);

  // 主预览区缩放：用 JS 测量容器宽度并计算 scale，兼容不支持 calc(长度/长度) 的浏览器（如 Chrome 122）
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const update = () => setPreviewScale(el.getBoundingClientRect().width / 1280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isHtmlMode, selectedPagePayload]);

  // 缩略图缩放：用 JS 测量第一个缩略图容器宽度（同列等宽），兼容不支持 calc(长度/长度) 的浏览器
  useEffect(() => {
    const el = thumbnailContainerRef.current;
    if (!el) return;
    const update = () => setThumbnailScale(el.getBoundingClientRect().width / 1280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isHtmlMode]);

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
      show('暂无内容可上传', 'warning');
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
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
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
          show('上传成功', 'success');
        }
        return fullUrl;
      } else {
        throw new Error(result.msg || result.message || '上传失败');
      }
    } catch (error) {
      console.error('上传 HTML 失败:', error);
      show(error instanceof Error ? error.message : '上传失败', 'error');
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
      show('链接已复制', 'success');
    } catch {
      // 降级方案
      const input = document.createElement('input');
      input.value = uploadedHtmlUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      show('链接已复制', 'success');
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
      } catch (error) {
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
      } catch (error) {
        console.error('Failed to load image versions:', error);
        setImageVersions([]);
      }
    };

    loadVersions();
  }, [currentProject, selectedIndex, projectId]);

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
  const extractImageUrlsFromDescription = (descriptionContent: DescriptionContent | undefined): string[] => {
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

  const handleSubmitEdit = useCallback(async () => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedContextImages((prev) => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...files],
    }));
  };

  const removeUploadedFile = (index: number) => {
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
  const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRegionSelectionMode || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    setIsSelectingRegion(true);
    setSelectionStart({ x, y });
    setSelectionRect(null);
  };

  const handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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

  const handleSelectionMouseUp = async () => {
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
          show('正在生成在线链接...', 'info');
          htmlUrl = await handleUploadHTML({ silent: true });
        }
        
        if (!htmlUrl) {
          show('获取在线链接失败，请重试', 'error');
          return;
        }
        
        // 检查外部脚本加载状态
        const generator = (window as any).generateHighFidelityPPT;
        
        if (typeof generator !== 'function') {
          show('未检测到 PPTX 导出脚本，请检查 HTMLtoPPT.js 是否加载', 'error');
          return;
        }
        
        try {
          generator(htmlUrl);
          show('正在导出 PPTX...', 'success');
        } catch (genError: any) {
          console.error('[PPTX导出] generator 执行出错:', genError);
          show(`导出失败: ${genError?.message || genError}`, 'error');
        }
        return;
      }
      if (type === 'pdf') {
        // Synchronous export - direct download, create completed task directly
        const response = type === 'pptx'
          ? await apiExportPPTX(projectId, pageIds)
          : await apiExportPDF(projectId, pageIds);
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

  const handleRefresh = useCallback(async () => {
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
    window.redirect_homepage({
      request: '',
      persistent: false,
      onSuccess: function(response) {
        console.log('返回成功:', response);
      },
      onFailure: function(error_code, error_message) {
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

  const hasAllImages = currentProject.pages.every(
    (p) => p.generated_image_path
  );

  return (
    <div className="app-shell h-screen flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <header className="app-navbar relative z-40 h-14 md:h-16 flex items-center justify-between px-3 md:px-6 flex-shrink-0 overflow-visible">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<Home size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={redirectHomepage}
            className="hidden sm:inline-flex flex-shrink-0"
          >
            <span className="hidden md:inline">主页</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={() => {
              if (fromHistory) {
                navigate('/history');
              } else {
                navigate(`/project/${projectId}/detail`);
              }
            }}
            className="flex-shrink-0"
          >
            <span className="hidden sm:inline">返回</span>
          </Button>
          {/*<div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <span className="text-xl md:text-2xl">🍌</span>
            <span className="text-base md:text-xl font-bold truncate">蕉幻</span>
          </div>
          <span className="text-gray-400 hidden md:inline">|</span>*/}
          <span className="text-sm md:text-lg font-semibold truncate hidden sm:inline">预览</span>
        </div>
        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
          {/*<Button
            variant="ghost"
            size="sm"
            icon={<Settings size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={() => setIsProjectSettingsOpen(true)}
            className="hidden lg:inline-flex"
          >
            <span className="hidden xl:inline">项目设置</span>
          </Button>*/}
          {isHtmlMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearBackground}
              className="hidden sm:inline-flex"
              disabled={!htmlGlobalBackground}
            >
              清除背景图
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={() => navigate(`/project/${projectId}/detail`)}
            className="hidden sm:inline-flex"
          >
            <span className="hidden md:inline">上一步</span>
          </Button>

          {/* 导出任务按钮 */}
          {exportTasks.filter(t => t.projectId === projectId).length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowExportTasksPanel(!showExportTasksPanel);
                  setShowExportMenu(false);
                }}
                className="relative"
              >
                {exportTasks.filter(t => t.projectId === projectId && (t.status === 'PROCESSING' || t.status === 'RUNNING' || t.status === 'PENDING')).length > 0 ? (
                  <Loader2 size={16} className="animate-spin text-banana-500" />
                ) : (
                  <FileText size={16} />
                )}
                <span className="ml-1 text-xs">
                  {exportTasks.filter(t => t.projectId === projectId).length}
                </span>
              </Button>
              {showExportTasksPanel && (
                <div className="absolute right-0 mt-2 z-50">
                  <ExportTasksPanel
                    projectId={projectId}
                    pages={currentProject?.pages || []}
                    className="w-96 max-h-[28rem] shadow-lg"
                  />
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="primary"
              size="sm"
              icon={<Download size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowExportTasksPanel(false);
              }}
              disabled={false}
              className="text-xs md:text-sm"
            >
              <span className="hidden sm:inline">导出</span>
              <span className="sm:hidden">导出</span>
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <button
                  onClick={() => handleExport('pptx')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
                >
                  导出为 PPTX
                </button>
                {isHtmlMode && (
                  <>
                    <button
                      onClick={handleDownloadHTMLSlides}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm text-banana-600 font-medium"
                    >
                      下载 HTML 幻灯片
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0 min-h-0">
        {/* 左侧：缩略图列表 */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-3 md:p-4 border-b border-gray-200 flex-shrink-0 space-y-2 md:space-y-3">
            <Button
              variant="primary"
              icon={isGeneratingHtmlImages ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={isHtmlMode ? handleGenerateHtmlImages : handleGenerateAll}
              className="w-full text-sm md:text-base"
              disabled={isGeneratingHtmlImages}
            >
              {isGeneratingHtmlImages
                ? `生成中 (${htmlImageGenerationProgress.current}/${htmlImageGenerationProgress.total})`
                : isHtmlMode
                  ? `批量生成图片 (${totalImageSlots})`
                  : `批量生成图片 (${currentProject.pages.length})`}
            </Button>
            {isHtmlMode && (
              <Button
                variant="ghost"
                icon={<Sparkles size={14} />}
                onClick={handleGenerateCurrentHtmlImages}
                className="w-full text-xs md:text-sm"
                disabled={isGeneratingHtmlImages}
              >
                生成当前页
              </Button>
            )}
            {isHtmlMode && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  icon={isGeneratingHtmlBackgrounds ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                  onClick={handleGenerateHtmlBackgrounds}
                  className="flex-1 text-xs md:text-sm"
                  disabled={isGeneratingHtmlBackgrounds}
                >
                  {isGeneratingHtmlBackgrounds
                    ? `生成中 (${htmlBackgroundGenerationProgress.current}/${htmlBackgroundGenerationProgress.total})`
                    : '生成背景'}
                </Button>
                <Button
                  variant="ghost"
                  icon={<Upload size={14} />}
                  onClick={handleUploadBackground}
                  className="flex-1 text-xs md:text-sm"
                  disabled={isGeneratingHtmlBackgrounds}
                >
                  上传背景
                </Button>
              </div>
            )}
          </div>

          {/* 缩略图列表：桌面端垂直，移动端横向滚动 */}
          <div className="flex-1 overflow-y-auto md:overflow-y-auto overflow-x-auto md:overflow-x-visible p-3 md:p-4 min-h-0">
            <div className="flex md:flex-col gap-2 md:gap-4 min-w-max md:min-w-0">
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
                                  {index + 1}. {page.outline_content?.title || payload.layout_id}
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
            </div>
          </div>
        </aside>

        {/* 右侧：大图预览 */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-b from-banana-50/40 to-slate-100/80">
          {currentProject.pages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              <div className="text-center">
                <div className="text-4xl md:text-6xl mb-4">📊</div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
                  还没有页面
                </h3>
                <p className="text-sm md:text-base text-gray-500 mb-6">
                  请先返回编辑页面添加内容
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/project/${projectId}/outline`)}
                  className="text-sm md:text-base"
                >
                  返回编辑
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 预览区 */}
              <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center p-4 md:p-8">
                <div className="max-w-5xl w-full">
                  <div className="relative aspect-video bg-white rounded-lg shadow-xl overflow-hidden touch-manipulation">
                    {/* HTML渲染模式 */}
                    {isHtmlMode && selectedPagePayload ? (
                      <div
                        ref={previewContainerRef}
                        style={{
                          width: '64rem',
                          height: `calc(64rem * ${htmlTheme.sizes.slideHeight} / 1280)`,
                          margin: '0 auto',
                          overflow: 'hidden',
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

              {/* 控制栏 */}
              <div className="bg-white border-t border-gray-200 px-3 md:px-6 py-3 md:py-4 flex-shrink-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
                  {/* 导航 */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" />}
                      onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                      disabled={selectedIndex === 0}
                      className="text-xs md:text-sm"
                    >
                      <span className="hidden sm:inline">上一页</span>
                      <span className="sm:hidden">上一页</span>
                    </Button>
                    <span className="px-2 md:px-4 text-xs md:text-sm text-gray-600 whitespace-nowrap">
                      {selectedIndex + 1} / {currentProject.pages.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />}
                      onClick={() =>
                        setSelectedIndex(
                          Math.min(currentProject.pages.length - 1, selectedIndex + 1)
                        )
                      }
                      disabled={selectedIndex === currentProject.pages.length - 1}
                      className="text-xs md:text-sm"
                    >
                      <span className="hidden sm:inline">下一页</span>
                      <span className="sm:hidden">下一页</span>
                    </Button>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto justify-center">
                    {imageVersions.length > 1 && (
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
                                className={`w-full px-3 md:px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between text-xs md:text-sm ${version.is_current ? 'bg-banana-50' : ''
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>
                                    版本 {version.version_number}
                                  </span>
                                  {version.is_current && (
                                    <span className="text-xs text-banana-600 font-medium">
                                      (当前)
                                    </span>
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
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* HTML模式图片上传入口（隐藏） */}
      {isHtmlMode && (
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleFileChange}
        />
      )}
      {isHtmlMode && (
        <input
          type="file"
          ref={backgroundFileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleBackgroundFileChange}
        />
      )}

      {/* 上传背景：选择来源 */}
      <Modal
        isOpen={isBackgroundPickerOpen}
        onClose={() => setIsBackgroundPickerOpen(false)}
        title="上传背景图"
        size="lg"
      >
        {backgroundPickerMode === 'menu' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  if (backgroundFileInputRef.current) {
                    backgroundFileInputRef.current.value = '';
                    backgroundFileInputRef.current.click();
                  }
                }}
              >
                从本地上传
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  setBackgroundPickerMode('material');
                  await loadBackgroundMaterials();
                }}
              >
                从素材库选择
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              选择素材库图片时会自动转换为 base64，确保导出 HTML/PPTX 无需额外上传。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">选择背景图</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBackgroundPickerMode('menu');
                }}
              >
                返回
              </Button>
            </div>
            {isLoadingBackgroundMaterials ? (
              <div className="text-center text-sm text-gray-400 py-8">加载中...</div>
            ) : backgroundMaterials.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">暂无素材</div>
            ) : (
              <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                {backgroundMaterials.map((material) => (
                  <button
                    key={material.id}
                    type="button"
                    onClick={() => handleSelectBackgroundMaterial(material)}
                    className="relative group aspect-video rounded border border-gray-200 overflow-hidden"
                  >
                    <img
                      src={getImageUrl(material.url)}
                      alt={material.filename}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ToastContainer />
      {ConfirmDialog}

      {/* 模板选择 Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="更换模板"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            选择一个新的模板将应用到后续PPT页面生成（不影响已经生成的页面）。你可以选择已有模板或上传新模板。
          </p>
          <TemplateSelector
            onSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplateId}
            showUpload={false} // 在预览页面上传的模板直接应用到项目，不上传到用户模板库
            projectId={projectId || null}
          />
          {isUploadingTemplate && (
            <div className="text-center py-2 text-sm text-gray-500">
              正在上传模板...
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setIsTemplateModalOpen(false)}
              disabled={isUploadingTemplate}
            >
              关闭
            </Button>
          </div>
        </div>
      </Modal>
      {/* 素材生成模态组件（可复用模块，这里只是示例挂载） */}
      {projectId && (
        <>
          <MaterialGeneratorModal
            projectId={projectId}
            isOpen={isMaterialModalOpen}
            onClose={() => setIsMaterialModalOpen(false)}
          />
          {/* 素材选择器 */}
          <MaterialSelector
            projectId={projectId}
            isOpen={isMaterialSelectorOpen}
            onClose={() => setIsMaterialSelectorOpen(false)}
            onSelect={handleSelectMaterials}
            multiple={true}
          />
          {/* 项目设置模态框 */}
          <ProjectSettingsModal
            isOpen={isProjectSettingsOpen}
            onClose={() => setIsProjectSettingsOpen(false)}
            extraRequirements={extraRequirements}
            templateStyle={templateStyle}
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
            isSavingRequirements={isSavingRequirements}
            isSavingTemplateStyle={isSavingTemplateStyle}
            // 导出设置
            exportExtractorMethod={exportExtractorMethod}
            exportInpaintMethod={exportInpaintMethod}
            onExportExtractorMethodChange={setExportExtractorMethod}
            onExportInpaintMethodChange={setExportInpaintMethod}
            onSaveExportSettings={handleSaveExportSettings}
            isSavingExportSettings={isSavingExportSettings}
          />
        </>
      )}

      {/* HTML 在线链接显示弹窗 */}
      <Modal
        isOpen={showHtmlUrlModal}
        onClose={() => setShowHtmlUrlModal(false)}
        title="获取在线链接"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            HTML 文件已上传至服务器，您可以通过以下链接访问：
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={uploadedHtmlUrl || ''}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700"
            />
            <Button
              variant="primary"
              onClick={handleCopyUrl}
              className="flex-shrink-0"
            >
              复制链接
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowHtmlUrlModal(false)}
            >
              关闭
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (uploadedHtmlUrl) {
                  window.open(uploadedHtmlUrl, '_blank');
                }
              }}
            >
              打开链接
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
