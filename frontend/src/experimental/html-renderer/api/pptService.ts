/**
 * PPT生成服务 API
 * 与后端 html-renderer API 交互
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * 页面大纲数据结构
 */
export interface PageOutline {
  page_id: string;
  title: string;
  layout_id: string;
  has_image: boolean;
  keywords: string[];
}

/**
 * 完整大纲数据结构
 */
export interface StructuredOutline {
  title: string;
  pages: PageOutline[];
}

/**
 * 页面内容生成结果
 */
export interface PageContentResult {
  page_id: string;
  layout_id: string;
  model: Record<string, unknown>;
}

/**
 * API响应基础结构
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 生成带布局信息的结构化大纲
 */
export async function generateOutline(
  topic: string,
  requirements?: string,
  language: string = 'zh',
  schemeId: string = 'tech_blue'
): Promise<StructuredOutline> {
  const response = await fetch(`${API_BASE}/api/html-renderer/outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, requirements, language, scheme_id: schemeId }),
  });

  const result: ApiResponse<StructuredOutline> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || result.error?.message || '生成大纲失败');
  }

  return result.data;
}

/**
 * 根据大纲生成单个页面的内容
 */
export async function generatePageContent(
  pageOutline: PageOutline,
  fullOutline?: StructuredOutline,
  language: string = 'zh'
): Promise<PageContentResult> {
  const response = await fetch(`${API_BASE}/api/html-renderer/page-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page_outline: pageOutline,
      full_outline: fullOutline,
      language,
    }),
  });

  const result: ApiResponse<PageContentResult> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || result.error?.message || '生成页面内容失败');
  }

  return result.data;
}

/**
 * PPT文档完整结构
 */
export interface PPTDocumentData {
  project_id: string;
  ppt_meta: {
    title: string;
    theme_id: string;
    aspect_ratio: string;
    author?: string;
  };
  pages: Array<{
    page_id: string;
    order_index: number;
    layout_id: string;
    model: Record<string, unknown>;
  }>;
}

/**
 * 一键生成完整PPT文档
 */
export async function generateFullDocument(
  topic: string,
  requirements?: string,
  language: string = 'zh',
  schemeId: string = 'tech_blue'
): Promise<PPTDocumentData> {
  const response = await fetch(`${API_BASE}/api/html-renderer/full-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, requirements, language, scheme_id: schemeId }),
  });

  const result: ApiResponse<PPTDocumentData> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || result.error?.message || '生成PPT文档失败');
  }

  return result.data;
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/html-renderer/health`);
    const result: ApiResponse<any> = await response.json();
    return result.success === true;
  } catch {
    return false;
  }
}

/**
 * 生成进度回调
 */
export type ProgressCallback = (current: number, total: number, message: string) => void;

/**
 * 逐步生成PPT文档（带进度回调）
 */
export async function generateDocumentWithProgress(
  topic: string,
  requirements?: string,
  language: string = 'zh',
  onProgress?: ProgressCallback,
  schemeId: string = 'tech_blue'
): Promise<PPTDocumentData> {
  // Step 1: 生成大纲
  onProgress?.(0, 100, '正在生成大纲...');
  const outline = await generateOutline(topic, requirements, language, schemeId);
  onProgress?.(10, 100, `大纲生成完成，共 ${outline.pages.length} 页`);

  // Step 2: 逐页生成内容
  const pages: PPTDocumentData['pages'] = [];
  const totalPages = outline.pages.length;

  for (let i = 0; i < totalPages; i++) {
    const pageOutline = outline.pages[i];
    onProgress?.(
      10 + Math.floor((i / totalPages) * 85),
      100,
      `正在生成第 ${i + 1}/${totalPages} 页: ${pageOutline.title}`
    );

    try {
      const result = await generatePageContent(pageOutline, outline, language);
      pages.push({
        page_id: result.page_id,
        order_index: i,
        layout_id: result.layout_id,
        model: result.model,
      });
    } catch (error) {
      console.error(`生成第 ${i + 1} 页失败:`, error);
      // 使用 fallback 内容
      pages.push({
        page_id: pageOutline.page_id,
        order_index: i,
        layout_id: 'title_content',
        model: {
          title: pageOutline.title,
          content: ['内容生成失败，请手动编辑'],
        },
      });
    }
  }

  onProgress?.(95, 100, '正在整理文档...');

  const document: PPTDocumentData = {
    project_id: `ai-gen-${Date.now()}`,
    ppt_meta: {
      title: outline.title,
      theme_id: schemeId,
      aspect_ratio: '16:9',
    },
    pages,
  };

  onProgress?.(100, 100, '生成完成！');

  return document;
}
