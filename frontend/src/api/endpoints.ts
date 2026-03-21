import { apiClient } from './client';
import type { Project, Task, ApiResponse, CreateProjectRequest, Page } from '@/types';
import type { Settings } from '../types/index';

export interface AuthUser {
  user_id: string;
  username: string;
  auth_enabled?: boolean;
}

export interface AuthStatus {
  enabled: boolean;
  authenticated: boolean;
  user: AuthUser | null;
}

export const loginAuth = async (
  username: string,
  password: string
): Promise<ApiResponse<AuthStatus>> => {
  const response = await apiClient.post<ApiResponse<AuthStatus>>('/api/auth/login', {
    username,
    password,
  });
  return response.data;
};

export const logoutAuth = async (): Promise<ApiResponse<AuthStatus>> => {
  const response = await apiClient.post<ApiResponse<AuthStatus>>('/api/auth/logout');
  return response.data;
};

export const getAuthStatus = async (): Promise<ApiResponse<AuthStatus>> => {
  const response = await apiClient.get<ApiResponse<AuthStatus>>('/api/auth/me');
  return response.data;
};

// ===== 项目相关 API =====

/**
 * 创建项目
 */
export const createProject = async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
  // 根据输入类型确定 creation_type
  let creation_type = 'idea';
  if (data.description_text) {
    creation_type = 'descriptions';
  } else if (data.outline_text) {
    creation_type = 'outline';
  }

  const response = await apiClient.post<ApiResponse<Project>>('/api/projects', {
    creation_type,
    idea_prompt: data.idea_prompt,
    outline_text: data.outline_text,
    description_text: data.description_text,
    template_style: data.template_style,
    scheme_id: data.scheme_id,
    render_mode: data.render_mode || 'image',  // 渲染模式：image 或 html
  });
  return response.data;
};

/**
 * 上传模板图片
 */
export const uploadTemplate = async (
  projectId: string,
  templateImage: File
): Promise<ApiResponse<{ template_image_url: string }>> => {
  const formData = new FormData();
  formData.append('template_image', templateImage);

  const response = await apiClient.post<ApiResponse<{ template_image_url: string }>>(
    `/api/projects/${projectId}/template`,
    formData
  );
  return response.data;
};

/**
 * 获取项目列表（历史项目）
 * @param limit 每页数量
 * @param offset 偏移量
 */
export const listProjects = async (limit?: number, offset?: number): Promise<ApiResponse<{ projects: Project[]; total: number }>> => {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append('limit', limit.toString());
  if (offset !== undefined) params.append('offset', offset.toString());

  const queryString = params.toString();
  const url = `/api/projects${queryString ? `?${queryString}` : ''}`;
  const response = await apiClient.get<ApiResponse<{ projects: Project[]; total: number }>>(url);
  return response.data;
};

/**
 * 获取项目详情
 */
export const getProject = async (projectId: string): Promise<ApiResponse<Project>> => {
  const response = await apiClient.get<ApiResponse<Project>>(`/api/projects/${projectId}`);
  return response.data;
};

/**
 * 删除项目
 */
export const deleteProject = async (projectId: string): Promise<ApiResponse> => {
  const response = await apiClient.delete<ApiResponse>(`/api/projects/${projectId}`);
  return response.data;
};

/**
 * 更新项目
 */
export const updateProject = async (
  projectId: string,
  data: Partial<Project>
): Promise<ApiResponse<Project>> => {
  const response = await apiClient.put<ApiResponse<Project>>(`/api/projects/${projectId}`, data);
  return response.data;
};

/**
 * 更新页面顺序
 */
export const updatePagesOrder = async (
  projectId: string,
  pageIds: string[]
): Promise<ApiResponse<Project>> => {
  const response = await apiClient.put<ApiResponse<Project>>(
    `/api/projects/${projectId}`,
    { pages_order: pageIds }
  );
  return response.data;
};

// ===== 大纲生成 =====

/**
 * 生成大纲
 * @param projectId 项目ID
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const generateOutline = async (projectId: string, language?: OutputLanguage): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/outline`,
    { language: lang }
  );
  return response.data;
};

// ===== 描述生成 =====

/**
 * 从描述文本生成大纲和页面描述（一次性完成）
 * @param projectId 项目ID
 * @param descriptionText 描述文本（可选）
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const generateFromDescription = async (projectId: string, descriptionText?: string, language?: OutputLanguage): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/from-description`,
    {
      ...(descriptionText ? { description_text: descriptionText } : {}),
      language: lang
    }
  );
  return response.data;
};

/**
 * 批量生成描述
 * @param projectId 项目ID
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const generateDescriptions = async (projectId: string, language?: OutputLanguage): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/descriptions`,
    { language: lang }
  );
  return response.data;
};

/**
 * 生成单页描述
 */
export const generatePageDescription = async (
  projectId: string,
  pageId: string,
  forceRegenerate: boolean = false,
  language?: OutputLanguage
): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}/generate/description`,
    { force_regenerate: forceRegenerate, language: lang }
  );
  return response.data;
};

/**
 * 根据用户要求修改大纲
 * @param projectId 项目ID
 * @param userRequirement 用户要求
 * @param previousRequirements 历史要求（可选）
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const refineOutline = async (
  projectId: string,
  userRequirement: string,
  previousRequirements?: string[],
  language?: OutputLanguage
): Promise<ApiResponse<{ pages: Page[]; summary: string }>> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse<{ pages: Page[]; summary: string }>>(
    `/api/projects/${projectId}/refine/outline`,
    {
      user_requirement: userRequirement,
      previous_requirements: previousRequirements || [],
      language: lang
    }
  );
  return response.data;
};

/**
 * 根据用户要求修改页面描述
 * @param projectId 项目ID
 * @param userRequirement 用户要求
 * @param previousRequirements 历史要求（可选）
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const refineDescriptions = async (
  projectId: string,
  userRequirement: string,
  previousRequirements?: string[],
  language?: OutputLanguage
): Promise<ApiResponse<{ pages: Page[]; summary: string }>> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse<{ pages: Page[]; summary: string }>>(
    `/api/projects/${projectId}/refine/descriptions`,
    {
      user_requirement: userRequirement,
      previous_requirements: previousRequirements || [],
      language: lang
    }
  );
  return response.data;
};

// ===== 图片生成 =====

/**
 * 批量生成图片
 * @param projectId 项目ID
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 * @param pageIds 可选的页面ID列表，如果不提供则生成所有页面
 */
export const generateImages = async (projectId: string, language?: OutputLanguage, pageIds?: string[]): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/images`,
    { language: lang, page_ids: pageIds }
  );
  return response.data;
};

/**
 * 生成单页图片
 */
export const generatePageImage = async (
  projectId: string,
  pageId: string,
  forceRegenerate: boolean = false,
  language?: OutputLanguage
): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}/generate/image`,
    { force_regenerate: forceRegenerate, language: lang }
  );
  return response.data;
};

/**
 * 获取页面图片历史版本
 */
export const getPageImageVersions = async (
  projectId: string,
  pageId: string
): Promise<ApiResponse<{ versions: any[] }>> => {
  const response = await apiClient.get<ApiResponse<{ versions: any[] }>>(
    `/api/projects/${projectId}/pages/${pageId}/image-versions`
  );
  return response.data;
};

/**
 * 设置当前使用的图片版本
 */
export const setCurrentImageVersion = async (
  projectId: string,
  pageId: string,
  versionId: string
): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}/image-versions/${versionId}/set-current`
  );
  return response.data;
};

// ===== 页面操作 =====

/**
 * 更新页面
 */
export const updatePage = async (
  projectId: string,
  pageId: string,
  data: Partial<Page>
): Promise<ApiResponse<Page>> => {
  const response = await apiClient.put<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages/${pageId}`,
    data
  );
  return response.data;
};

/**
 * 更新页面描述
 */
export const updatePageDescription = async (
  projectId: string,
  pageId: string,
  descriptionContent: any,
  language?: OutputLanguage
): Promise<ApiResponse<Page>> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.put<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages/${pageId}/description`,
    { description_content: descriptionContent, language: lang }
  );
  return response.data;
};

/**
 * 更新页面大纲
 */
export const updatePageOutline = async (
  projectId: string,
  pageId: string,
  outlineContent: any,
  language?: OutputLanguage
): Promise<ApiResponse<Page>> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.put<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages/${pageId}/outline`,
    { outline_content: outlineContent, language: lang }
  );
  return response.data;
};

/**
 * 删除页面
 */
export const deletePage = async (projectId: string, pageId: string): Promise<ApiResponse> => {
  const response = await apiClient.delete<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}`
  );
  return response.data;
};

/**
 * 添加页面
 */
export const addPage = async (projectId: string, data: Partial<Page>): Promise<ApiResponse<Page>> => {
  const response = await apiClient.post<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages`,
    data
  );
  return response.data;
};

// ===== 任务查询 =====

/**
 * 查询任务状态
 */
export const getTaskStatus = async (projectId: string, taskId: string): Promise<ApiResponse<Task>> => {
  const response = await apiClient.get<ApiResponse<Task>>(`/api/projects/${projectId}/tasks/${taskId}`);
  return response.data;
};

// ===== 版式规划 =====

export interface LayoutPlanItem {
  page_id: string;
  layout_id: string;
  variant: string;
}

/**
 * 生成版式规划（在导出前调用，为每页分配 variant）
 */
export const generateLayoutPlan = async (
  projectId: string,
  seed?: string
): Promise<ApiResponse<{ layout_plan: LayoutPlanItem[] }>> => {
  const response = await apiClient.post<ApiResponse<{ layout_plan: LayoutPlanItem[] }>>(
    `/api/projects/${projectId}/generate/layout-plan`,
    seed ? { seed } : {}
  );
  return response.data;
};

// ===== 导出 =====

/**
 * Helper function to build query string with page_ids
 */
const buildPageIdsQuery = (pageIds?: string[]): string => {
  if (!pageIds || pageIds.length === 0) return '';
  const params = new URLSearchParams();
  params.set('page_ids', pageIds.join(','));
  return `?${params.toString()}`;
};

/**
 * 导出为PPTX
 * @param projectId 项目ID
 * @param pageIds 可选的页面ID列表，如果不提供则导出所有页面
 */
export const exportPPTX = async (
  projectId: string,
  pageIds?: string[]
): Promise<ApiResponse<{ download_url: string; download_url_absolute?: string }>> => {
  const url = `/api/projects/${projectId}/export/pptx${buildPageIdsQuery(pageIds)}`;
  const response = await apiClient.get<
    ApiResponse<{ download_url: string; download_url_absolute?: string }>
  >(url);
  return response.data;
};

/**
 * 导出为PDF
 * @param projectId 项目ID
 * @param pageIds 可选的页面ID列表，如果不提供则导出所有页面
 */
export const exportPDF = async (
  projectId: string,
  pageIds?: string[]
): Promise<ApiResponse<{ download_url: string; download_url_absolute?: string }>> => {
  const url = `/api/projects/${projectId}/export/pdf${buildPageIdsQuery(pageIds)}`;
  const response = await apiClient.get<
    ApiResponse<{ download_url: string; download_url_absolute?: string }>
  >(url);
  return response.data;
};

/**
 * 导出为可编辑PPTX（异步任务）
 * @param projectId 项目ID
 * @param filename 可选的文件名
 * @param pageIds 可选的页面ID列表，如果不提供则导出所有页面
 */
export const exportEditablePPTX = async (
  projectId: string,
  filename?: string,
  pageIds?: string[]
): Promise<ApiResponse<{ task_id: string }>> => {
  const response = await apiClient.post<
    ApiResponse<{ task_id: string }>
  >(`/api/projects/${projectId}/export/editable-pptx`, {
    filename,
    page_ids: pageIds
  });
  return response.data;
};

// ===== 素材生成 =====

/**
 * 生成单张素材图片（不绑定具体页面）
 * 现在返回异步任务ID，需要通过getTaskStatus轮询获取结果
 */
export const generateMaterialImage = async (
  projectId: string,
  prompt: string,
  refImage?: File | null,
  extraImages?: File[]
): Promise<ApiResponse<{ task_id: string; status: string }>> => {
  const formData = new FormData();
  formData.append('prompt', prompt);
  if (refImage) {
    formData.append('ref_image', refImage);
  }

  if (extraImages && extraImages.length > 0) {
    extraImages.forEach((file) => {
      formData.append('extra_images', file);
    });
  }

  const response = await apiClient.post<ApiResponse<{ task_id: string; status: string }>>(
    `/api/projects/${projectId}/materials/generate`,
    formData
  );
  return response.data;
};

/**
 * 素材信息接口
 */
export interface Material {
  id: string;
  project_id?: string | null;
  filename: string;
  url: string;
  relative_path: string;
  created_at: string;
  // 可选的附加信息：用于展示友好名称
  prompt?: string;
  original_filename?: string;
  source_filename?: string;
  name?: string;
}

/**
 * 获取素材列表
 * @param projectId 项目ID，可选
 *   - If provided and not 'all' or 'none': Get materials for specific project via /api/projects/{projectId}/materials
 *   - If 'all': Get all materials via /api/materials?project_id=all
 *   - If 'none': Get global materials (not bound to any project) via /api/materials?project_id=none
 *   - If not provided: Get all materials via /api/materials
 */
export const listMaterials = async (
  projectId?: string
): Promise<ApiResponse<{ materials: Material[]; count: number }>> => {
  let url: string;

  if (!projectId || projectId === 'all') {
    // Get all materials using global endpoint
    url = '/api/materials?project_id=all';
  } else if (projectId === 'none') {
    // Get global materials (not bound to any project)
    url = '/api/materials?project_id=none';
  } else {
    // Get materials for specific project
    url = `/api/projects/${projectId}/materials`;
  }

  const response = await apiClient.get<ApiResponse<{ materials: Material[]; count: number }>>(url);
  return response.data;
};

/**
 * 上传素材图片
 * @param file 图片文件
 * @param projectId 可选的项目ID
 *   - If provided: Upload material bound to the project
 *   - If not provided or 'none': Upload as global material (not bound to any project)
 */
export const uploadMaterial = async (
  file: File,
  projectId?: string | null
): Promise<ApiResponse<Material>> => {
  const formData = new FormData();
  formData.append('file', file);

  let url: string;
  if (!projectId || projectId === 'none') {
    // Use global upload endpoint for materials not bound to any project
    url = '/api/materials/upload';
  } else {
    // Use project-specific upload endpoint
    url = `/api/projects/${projectId}/materials/upload`;
  }

  const response = await apiClient.post<ApiResponse<Material>>(url, formData);
  return response.data;
};

/**
 * 删除素材
 */
export const deleteMaterial = async (materialId: string): Promise<ApiResponse<{ id: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ id: string }>>(`/api/materials/${materialId}`);
  return response.data;
};

/**
 * 关联素材到项目（通过URL）
 * @param projectId 项目ID
 * @param materialUrls 素材URL列表
 */
export const associateMaterialsToProject = async (
  projectId: string,
  materialUrls: string[]
): Promise<ApiResponse<{ updated_ids: string[]; count: number }>> => {
  const response = await apiClient.post<ApiResponse<{ updated_ids: string[]; count: number }>>(
    '/api/materials/associate',
    { project_id: projectId, material_urls: materialUrls }
  );
  return response.data;
};

// ===== 系统模板（从 MySQL templates 表） =====

export interface Template {
  template_id: string;
  name?: string;
  template_image_url: string; // 对应数据库中的 preview 字段
  status?: number; // 状态：1启用，0禁用
}

/**
 * 获取系统模板列表（从 MySQL templates 表）
 * @param page 页码（从1开始）
 * @param pageSize 每页数量（默认8，即2行x4列）
 */
export const listTemplates = async (
  page: number = 1,
  pageSize: number = 8
): Promise<ApiResponse<{ templates: Template[]; pagination: PaginationInfo }>> => {
  const response = await apiClient.get<ApiResponse<{ templates: Template[]; pagination: PaginationInfo }>>(
    `/api/projects/templates?page=${page}&page_size=${pageSize}`
  );
  return response.data;
};

export interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ===== 用户模板 =====

export interface UserTemplate {
  template_id: string;
  name?: string;
  template_image_url: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 上传用户模板
 */
export const uploadUserTemplate = async (
  templateImage: File,
  name?: string
): Promise<ApiResponse<UserTemplate>> => {
  const formData = new FormData();
  formData.append('template_image', templateImage);
  if (name) {
    formData.append('name', name);
  }

  const response = await apiClient.post<ApiResponse<UserTemplate>>(
    '/api/user-templates',
    formData
  );
  return response.data;
};

/**
 * 获取用户模板列表（支持分页）
 * @param page 页码（从1开始，默认1）
 * @param pageSize 每页数量（默认8，即2行x4列）
 * Note: user_id 从 cookie 中获取，由后端处理
 */
export const listUserTemplates = async (
  page: number = 1,
  pageSize: number = 8
): Promise<ApiResponse<{ templates: UserTemplate[]; pagination: PaginationInfo }>> => {
  const response = await apiClient.get<ApiResponse<{ templates: UserTemplate[]; pagination: PaginationInfo }>>(
    `/api/user-templates?page=${page}&page_size=${pageSize}`
  );
  return response.data;
};

/**
 * 删除用户模板
 */
export const deleteUserTemplate = async (templateId: string): Promise<ApiResponse> => {
  const response = await apiClient.delete<ApiResponse>(`/api/user-templates/${templateId}`);
  return response.data;
};

// ===== 参考文件相关 API =====

export interface ReferenceFile {
  id: string;
  project_id: string | null;
  filename: string;
  file_size: number;
  file_type: string;
  parse_status: 'pending' | 'parsing' | 'completed' | 'failed';
  markdown_content: string | null;
  error_message: string | null;
  image_caption_failed_count?: number;  // Optional, calculated dynamically
  created_at: string;
  updated_at: string;
}

/**
 * 上传参考文件
 * @param file 文件
 * @param projectId 可选的项目ID（如果不提供或为'none'，则为全局文件）
 */
export const uploadReferenceFile = async (
  file: File,
  projectId?: string | null
): Promise<ApiResponse<{ file: ReferenceFile }>> => {
  const formData = new FormData();
  formData.append('file', file);
  if (projectId && projectId !== 'none') {
    formData.append('project_id', projectId);
  }

  const response = await apiClient.post<ApiResponse<{ file: ReferenceFile }>>(
    '/api/reference-files/upload',
    formData
  );
  return response.data;
};

/**
 * 获取参考文件信息
 * @param fileId 文件ID
 */
export const getReferenceFile = async (fileId: string): Promise<ApiResponse<{ file: ReferenceFile }>> => {
  const response = await apiClient.get<ApiResponse<{ file: ReferenceFile }>>(
    `/api/reference-files/${fileId}`
  );
  return response.data;
};

/**
 * 列出项目的参考文件
 * @param projectId 项目ID（'global' 或 'none' 表示列出全局文件）
 */
export const listProjectReferenceFiles = async (
  projectId: string
): Promise<ApiResponse<{ files: ReferenceFile[] }>> => {
  const response = await apiClient.get<ApiResponse<{ files: ReferenceFile[] }>>(
    `/api/reference-files/project/${projectId}`
  );
  return response.data;
};

/**
 * 删除参考文件
 * @param fileId 文件ID
 */
export const deleteReferenceFile = async (fileId: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    `/api/reference-files/${fileId}`
  );
  return response.data;
};

/**
 * 触发文件解析
 * @param fileId 文件ID
 */
export const triggerFileParse = async (fileId: string): Promise<ApiResponse<{ file: ReferenceFile; message: string }>> => {
  const response = await apiClient.post<ApiResponse<{ file: ReferenceFile; message: string }>>(
    `/api/reference-files/${fileId}/parse`
  );
  return response.data;
};

/**
 * 将参考文件关联到项目
 * @param fileId 文件ID
 * @param projectId 项目ID
 */
export const associateFileToProject = async (
  fileId: string,
  projectId: string
): Promise<ApiResponse<{ file: ReferenceFile }>> => {
  const response = await apiClient.post<ApiResponse<{ file: ReferenceFile }>>(
    `/api/reference-files/${fileId}/associate`,
    { project_id: projectId }
  );
  return response.data;
};

/**
 * 从项目中移除参考文件（不删除文件本身）
 * @param fileId 文件ID
 */
export const dissociateFileFromProject = async (
  fileId: string
): Promise<ApiResponse<{ file: ReferenceFile; message: string }>> => {
  const response = await apiClient.post<ApiResponse<{ file: ReferenceFile; message: string }>>(
    `/api/reference-files/${fileId}/dissociate`
  );
  return response.data;
};

// ===== 输出语言设置 =====

export type OutputLanguage = 'zh' | 'ja' | 'en' | 'auto';

export interface OutputLanguageOption {
  value: OutputLanguage;
  label: string;
}

export const OUTPUT_LANGUAGE_OPTIONS: OutputLanguageOption[] = [
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'auto', label: '自动' },
];

/**
 * 获取默认输出语言设置（从服务器环境变量读取）
 *
 * 注意：这只返回服务器配置的默认语言。
 * 实际的语言选择应由前端在 sessionStorage 中管理，
 * 并在每次生成请求时通过 language 参数传递。
 */
export const getDefaultOutputLanguage = async (): Promise<ApiResponse<{ language: OutputLanguage }>> => {
  const response = await apiClient.get<ApiResponse<{ language: OutputLanguage }>>(
    '/api/output-language'
  );
  return response.data;
};

/**
 * 从后端 Settings 获取用户的输出语言偏好
 * 如果获取失败，返回默认值 'zh'
 */
export const getStoredOutputLanguage = async (): Promise<OutputLanguage> => {
  try {
    const response = await apiClient.get<ApiResponse<{ language: OutputLanguage }>>('/api/output-language');
    return response.data.data?.language || 'zh';
  } catch (error) {
    console.warn('Failed to load output language from settings, using default', error);
    return 'zh';
  }
};

/**
 * 获取系统设置
 */
export const getSettings = async (): Promise<ApiResponse<Settings>> => {
  const response = await apiClient.get<ApiResponse<Settings>>('/api/settings');
  return response.data;
};

/**
 * 更新系统设置
 */
export const updateSettings = async (
  data: Partial<Omit<Settings, 'id' | 'api_key_length' | 'created_at' | 'updated_at'>> & { api_key?: string }
): Promise<ApiResponse<Settings>> => {
  const response = await apiClient.put<ApiResponse<Settings>>('/api/settings', data);
  return response.data;
};

/**
 * 重置系统设置
 */
export const resetSettings = async (): Promise<ApiResponse<Settings>> => {
  const response = await apiClient.post<ApiResponse<Settings>>('/api/settings/reset');
  return response.data;
};

// ===== 预设风格相关 API =====

export interface PresetStyle {
  id: string;
  name: string;
  description: string; // AI 文生图 Prompt
  previewImage?: string; // 可选的预览图片路径
  status: number; // 状态：1启用，0禁用
}

/**
 * 获取预设风格列表（仅获取 status=1 的启用风格）
 */
export const listPresetStyles = async (): Promise<ApiResponse<{ styles: PresetStyle[] }>> => {
  const response = await apiClient.get<ApiResponse<{ styles: PresetStyle[] }>>('/api/preset-styles/');
  return response.data;
};

// ===== HTML 模式图片生成 =====

/**
 * HTML 图片生成槽位定义
 */
export interface HtmlImageSlot {
  page_id: string;
  slot_path: string;
  prompt: string;
  context?: {
    asset_type?: 'content' | 'background';
    layout_id?: string;
    scheme_id?: string;
    slot_role?: 'main' | 'left' | 'right' | 'background';
    page_title?: string;
    page_facts?: string[];
    project_topic?: string;
    extra_requirements?: string;
    template_style?: string;
    visual_goal?: string;
    industry?: string;
    audience?: string;
  };
}

/**
 * HTML 图片生成结果
 */
export interface HtmlImageResult {
  page_id: string;
  slot_path: string;
  image_base64?: string;
  error?: string;
}

/**
 * SSE 事件类型定义
 */
export interface HtmlImageSSEEvent {
  type: 'progress' | 'image' | 'error' | 'complete';
  current?: number;
  total?: number;
  page_id?: string;
  slot_path?: string;
  image_base64?: string;
  error?: string;
  summary?: { total: number; success: number; error: number };
}

const emitBufferedSseEvents = (
  buffer: string,
  onEvent: (event: HtmlImageSSEEvent) => void,
  flush = false
): string => {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const eventBlocks = normalized.split('\n\n');
  const trailing = flush ? '' : eventBlocks.pop() || '';

  for (const block of eventBlocks) {
    if (!block.trim()) {
      continue;
    }
    for (const line of block.split('\n')) {
      if (!line.startsWith('data: ')) {
        continue;
      }
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) {
        continue;
      }
      try {
        const event: HtmlImageSSEEvent = JSON.parse(jsonStr);
        onEvent(event);
      } catch (error) {
        console.error('Failed to parse SSE event:', jsonStr, error);
      }
    }
  }

  return trailing;
};

/**
 * 批量生成 HTML 模式图片（SSE 流式响应）
 * 每生成一张图片就立即通过回调函数通知调用方
 * 
 * @param projectId 项目ID
 * @param slots 需要生成图片的槽位列表
 * @param onEvent 接收 SSE 事件的回调函数
 */
export const generateHtmlImagesStreaming = async (
  projectId: string,
  slots: HtmlImageSlot[],
  onEvent: (event: HtmlImageSSEEvent) => void
): Promise<void> => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${apiBase}/api/projects/${projectId}/html-images/generate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slots }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader available');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  let done = false;
  while (!done) {
    const chunk = await reader.read();
    if (chunk.done) {
      buffer += decoder.decode();
      emitBufferedSseEvents(buffer, onEvent, true);
      done = true;
      continue;
    }

    buffer += decoder.decode(chunk.value, { stream: true });
    buffer = emitBufferedSseEvents(buffer, onEvent);
  }
};

// 保留旧的 API 函数以保持兼容性（现在返回最终汇总结果）
export const generateHtmlImages = async (
  projectId: string,
  slots: HtmlImageSlot[]
): Promise<ApiResponse<{
  results: HtmlImageResult[];
  summary: { total: number; success: number; error: number };
}>> => {
  const results: HtmlImageResult[] = [];
  let summary = { total: 0, success: 0, error: 0 };

  await generateHtmlImagesStreaming(projectId, slots, (event) => {
    if (event.type === 'image' && event.page_id && event.slot_path && event.image_base64) {
      results.push({
        page_id: event.page_id,
        slot_path: event.slot_path,
        image_base64: event.image_base64,
      });
    } else if (event.type === 'error' && event.page_id && event.slot_path) {
      results.push({
        page_id: event.page_id,
        slot_path: event.slot_path,
        error: event.error,
      });
    } else if (event.type === 'complete' && event.summary) {
      summary = event.summary;
    }
  });

  return {
    success: true,
    data: { results, summary },
  };
};

/**
 * 保存HTML模式的图片到服务器
 * 
 * @param projectId 项目ID
 * @param pageId 页面ID
 * @param slotPath 图片插槽路径（如 "image.src", "left.image_src"）
 * @param imageBase64 base64编码的图片数据（data URI格式）
 */
export const saveHtmlImage = async (
  projectId: string,
  pageId: string,
  slotPath: string,
  imageBase64: string
): Promise<ApiResponse<{
  image_path: string;
  image_url: string;
  page_id: string;
  slot_path: string;
}>> => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${apiBase}/api/projects/${projectId}/html-images/save`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_id: pageId,
      slot_path: slotPath,
      image_base64: imageBase64,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const data = await response.json();
  return data;
};

// ===== 知识库相关 API =====

export interface KnowledgeBaseOutlineTaskResponse {
  task_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface CreateKnowledgeBaseProjectRequest {
  outlineText: string;
  referenceFileIds: string[];
  renderMode?: 'image' | 'html';
  schemeId?: string;
}

export const uploadKnowledgeBaseDoc = async (file: File): Promise<ReferenceFile> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<{ file: ReferenceFile }>>(
    '/api/reference-files/upload',
    formData
  );
  return response.data.data!.file;
};

export const listKnowledgeBaseFiles = async (): Promise<ReferenceFile[]> => {
  const response = await apiClient.get<ApiResponse<{ files: ReferenceFile[] }>>(
    '/api/reference-files/project/global'
  );
  return response.data.data?.files ?? [];
};

export const deleteKnowledgeBaseFile = async (fileId: string): Promise<void> => {
  await apiClient.delete(`/api/reference-files/${fileId}`);
};

export const parseKnowledgeBaseFile = async (fileId: string): Promise<void> => {
  await apiClient.post(`/api/reference-files/${fileId}/parse`);
};

export const startKnowledgeBaseOutlineTask = async (
  referenceFileIds: string[],
  extraRequirements?: string,
): Promise<KnowledgeBaseOutlineTaskResponse> => {
  const response = await apiClient.post<ApiResponse<KnowledgeBaseOutlineTaskResponse>>(
    '/api/knowledge-base/generate-outline',
    {
      reference_file_ids: referenceFileIds,
      extra_requirements: extraRequirements,
    },
  );
  return response.data.data as KnowledgeBaseOutlineTaskResponse;
};

export const createProjectFromKnowledgeBase = async (
  payload: CreateKnowledgeBaseProjectRequest,
): Promise<ApiResponse<{ project_id: string; status: string }>> => {
  const response = await apiClient.post<ApiResponse<{ project_id: string; status: string }>>(
    '/api/knowledge-base/create-project',
    {
      outline_text: payload.outlineText,
      reference_file_ids: payload.referenceFileIds,
      render_mode: payload.renderMode || 'html',
      scheme_id: payload.schemeId || 'edu_dark',
    },
  );
  return response.data;
};

