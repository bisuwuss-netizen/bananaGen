import { getImageUrl } from '@/api/client';
import { layoutSchemes } from '@/data/layoutSchemes';
import type { Page, Project, Task } from '@/types';
import { normalizeErrorMessage } from './index';

const hasDescriptionContent = (page: Page): boolean =>
  Boolean(page.has_description_content ?? page.description_content);

const hasHtmlContent = (page: Page): boolean =>
  Boolean(
    page.has_html_model ??
    (page.html_model && Object.keys(page.html_model).length > 0)
  );

const hasGeneratedImage = (page: Page): boolean => Boolean(page.generated_image_path);

const isPageGenerating = (page: Page): boolean => page.status === 'GENERATING';

const isPageFailed = (page: Page): boolean => page.status === 'FAILED';

const getSortedPages = (project: Project): Page[] =>
  [...(project.pages || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

const schemeMetaMap = new Map(
  layoutSchemes.map((scheme) => [
    scheme.id,
    {
      name: scheme.name,
      description: scheme.description,
    },
  ])
);

const getLatestGenerationTask = (project: Project): Task | undefined =>
  project.latest_generation_task;

const hasCompletedOutput = (project: Project, pages: Page[]): boolean => {
  if (pages.length === 0) {
    return false;
  }

  if (project.render_mode === 'html') {
    return pages.every(hasHtmlContent);
  }

  return pages.every(hasGeneratedImage);
};

const hasFailedGeneration = (project: Project, pages: Page[]): boolean => {
  if (pages.some(isPageFailed)) {
    return true;
  }

  if (hasCompletedOutput(project, pages)) {
    return false;
  }

  const latestTask = getLatestGenerationTask(project);
  return project.status === 'FAILED' || latestTask?.status === 'FAILED';
};

/**
 * 获取项目标题
 */
export const getProjectTitle = (project: Project): string => {
  if (project.idea_prompt) {
    return project.idea_prompt;
  }

  const firstPage = getSortedPages(project)[0];
  if (firstPage?.outline_content?.title) {
    return firstPage.outline_content.title;
  }

  return '未命名项目';
};

/**
 * 获取第一页图片URL
 */
export const getFirstPageImage = (project: Project): string | null => {
  if (project.preview_page?.generated_image_path) {
    return getImageUrl(project.preview_page.generated_image_path, project.preview_page.updated_at);
  }

  const firstPageWithImage = getSortedPages(project).find(hasGeneratedImage);
  if (firstPageWithImage?.generated_image_path) {
    return getImageUrl(firstPageWithImage.generated_image_path, firstPageWithImage.updated_at);
  }

  return null;
};

export const getPreviewPage = (project: Project): Page | null => {
  if (project.preview_page) {
    return project.preview_page;
  }

  const pages = getSortedPages(project);
  return pages[0] || null;
};

/**
 * 格式化日期
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getProjectStage = (project: Project): string => {
  const pages = getSortedPages(project);

  if (hasCompletedOutput(project, pages)) {
    return 'COMPLETED';
  }

  if (pages.some(isPageGenerating)) {
    return 'GENERATING';
  }

  if (hasFailedGeneration(project, pages)) {
    return 'FAILED';
  }

  if (pages.length === 0) {
    if (project.status === 'OUTLINE_GENERATED' || project.status === 'DESCRIPTIONS_GENERATED') {
      return project.render_mode === 'html' ? 'READY_FOR_HTML' : 'READY_FOR_IMAGES';
    }
    return 'NOT_STARTED';
  }

  if (project.render_mode === 'html') {
    const htmlReadyCount = pages.filter(hasHtmlContent).length;
    if (htmlReadyCount > 0) {
      return 'PARTIAL_HTML';
    }
    return 'READY_FOR_HTML';
  }

  const imageCount = pages.filter(hasGeneratedImage).length;
  if (imageCount > 0) {
    return 'PARTIAL_IMAGES';
  }

  const descriptionCount = pages.filter(hasDescriptionContent).length;
  if (descriptionCount > 0) {
    return 'READY_FOR_IMAGES';
  }

  return 'READY_FOR_DESCRIPTIONS';
};

/**
 * 获取项目状态文本
 */
export const getStatusText = (project: Project): string => {
  const stage = getProjectStage(project);

  if (stage === 'NOT_STARTED') return '未开始';
  if (stage === 'GENERATING') return '生成中';
  if (stage === 'FAILED') return '生成失败';
  if (stage === 'COMPLETED') return '已完成';
  if (stage === 'PARTIAL_HTML') return '待继续生成';
  if (stage === 'READY_FOR_HTML') return '待生成内容';
  if (stage === 'PARTIAL_IMAGES') return '待继续生成图片';
  if (stage === 'READY_FOR_IMAGES') return '待生成图片';
  return '待生成描述';
};

/**
 * 获取项目状态颜色样式
 */
export const getStatusColor = (project: Project): string => {
  const status = getStatusText(project);
  if (status === '已完成') return 'text-green-600 bg-green-50';
  if (status === '生成中') return 'text-orange-600 bg-orange-50';
  if (status === '生成失败') return 'text-red-600 bg-red-50';
  if (status === '待继续生成' || status === '待继续生成图片') return 'text-amber-600 bg-amber-50';
  if (status === '待生成图片') return 'text-yellow-600 bg-yellow-50';
  if (status === '待生成内容' || status === '待生成描述') return 'text-blue-600 bg-blue-50';
  return 'text-gray-600 bg-gray-50';
};

export const getProjectSchemeName = (project: Project): string =>
  schemeMetaMap.get(project.scheme_id || 'edu_dark')?.name || '默认模板系列';

export const getProjectSchemeDescription = (project: Project): string =>
  schemeMetaMap.get(project.scheme_id || 'edu_dark')?.description || '已应用默认模板布局。';

export const getProjectFailureReason = (project: Project): string | null => {
  const pages = getSortedPages(project);
  if (!hasFailedGeneration(project, pages)) {
    return null;
  }

  const latestTask = getLatestGenerationTask(project);
  const fallback =
    latestTask?.task_type === 'GENERATE_IMAGES' || latestTask?.task_type === 'GENERATE_PAGE_IMAGE'
      ? '页面图片生成失败，请重新尝试。'
      : project.render_mode === 'html'
        ? '页面内容生成失败，请重新尝试。'
        : '页面描述生成失败，请重新尝试。';

  return normalizeErrorMessage(latestTask?.error_message || fallback, fallback);
};

/**
 * 获取项目路由路径
 */
export const getProjectRoute = (project: Project): string => {
  const projectId = project.id || project.project_id;
  if (!projectId) return '/';

  const pages = getSortedPages(project);
  if (pages.length === 0) {
    return `/project/${projectId}/outline`;
  }

  if (project.render_mode === 'html') {
    return pages.some(hasHtmlContent)
      ? `/project/${projectId}/preview`
      : `/project/${projectId}/detail`;
  }

  if (pages.some(hasGeneratedImage)) {
    return `/project/${projectId}/preview`;
  }
  if (pages.some(hasDescriptionContent)) {
    return `/project/${projectId}/detail`;
  }
  return `/project/${projectId}/outline`;
};
