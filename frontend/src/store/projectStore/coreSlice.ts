import type { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import { normalizeErrorMessage, normalizeProject } from '@/utils';
import type { ProjectCoreSlice, ProjectStore } from './types';

export const createCoreSlice: StateCreator<ProjectStore, [], [], ProjectCoreSlice> = (set, get) => ({
  currentProject: null,
  isGlobalLoading: false,
  activeTaskId: null,
  taskProgress: null,
  error: null,
  pageGeneratingTasks: {},
  pageDescriptionGeneratingTasks: {},

  setCurrentProject: (project) => set({ currentProject: project }),
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
  setError: (error) => set({ error }),

  initializeProject: async (type, content, templateImage, templateStyle, renderMode, schemeId) => {
    set({ isGlobalLoading: true, error: null });
    try {
      const request: any = {};

      if (type === 'idea') {
        request.idea_prompt = content;
      } else if (type === 'outline') {
        request.outline_text = content;
      } else if (type === 'description') {
        request.description_text = content;
        // 确保 creation_type 被正确设置
        request.creation_type = 'descriptions';
      }

      if (templateStyle?.trim()) {
        request.template_style = templateStyle.trim();
      }
      if (renderMode) {
        request.render_mode = renderMode;
      }
      if (schemeId) {
        request.scheme_id = schemeId;
      }

      const response = await api.createProject(request);
      const projectId = response.data?.project_id;
      if (!projectId) {
        throw new Error('项目创建失败：未返回项目ID');
      }
      
      // 调试日志：记录项目创建信息
      console.log('[initializeProject] 项目创建成功:', {
        projectId,
        type,
        creation_type: request.creation_type || (type === 'description' ? 'descriptions' : type === 'outline' ? 'outline' : 'idea'),
        has_description_text: !!request.description_text,
        has_outline_text: !!request.outline_text,
        has_idea_prompt: !!request.idea_prompt,
        description_text_length: request.description_text?.length || 0,
        render_mode: renderMode,
      });

      if (templateImage) {
        try {
          await api.uploadTemplate(projectId, templateImage);
        } catch (error) {
          console.warn('模板上传失败:', error);
        }
      }

      if (type === 'description') {
        try {
          // 无论是 HTML 模式还是图片模式，从描述生成都应该调用 generateOutline 任务
          // 因为 outline_task 已经支持从描述生成，会解析描述并生成大纲
          // 图片模式下也会生成大纲，只是后续生成PPT时会生成图片而不是HTML
          await api.generateOutline(projectId);
        } catch (error) {
          console.error('[初始化项目] 从描述生成失败:', error);
        }
      }

      const projectResponse = await api.getProject(projectId);
      const project = normalizeProject(projectResponse.data);
      if (project) {
        // 调试日志：记录同步的项目数据
        console.log('[initializeProject] 同步项目数据:', {
          projectId: project.id,
          creation_type: project.creation_type,
          has_description_text: !!project.description_text,
          has_outline_text: !!project.outline_text,
          has_idea_prompt: !!project.idea_prompt,
          description_text_preview: project.description_text?.substring(0, 50) || '无',
          render_mode: project.render_mode,
        });
        set({ currentProject: project });
        localStorage.setItem('currentProjectId', project.id!);
      }
    } catch (error: any) {
      set({ error: normalizeErrorMessage(error.message || '创建项目失败') });
      throw error;
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  syncProject: async (projectId) => {
    const { currentProject } = get();
    let targetProjectId = projectId;
    if (!targetProjectId) {
      if (currentProject?.id) {
        targetProjectId = currentProject.id;
      } else {
        targetProjectId = localStorage.getItem('currentProjectId') || undefined;
      }
    }

    if (!targetProjectId) {
      console.warn('syncProject: 没有可用的项目ID');
      return;
    }

    try {
      const response = await api.getProject(targetProjectId);
      if (response.data) {
        const project = normalizeProject(response.data);
        set({ currentProject: project });
        localStorage.setItem('currentProjectId', project.id!);
      }
    } catch (error: any) {
      let errorMessage = '同步项目失败';
      let shouldClearStorage = false;

      if (error.response) {
        const errorData = error.response.data;
        if (error.response.status === 404) {
          errorMessage = errorData?.error?.message || '项目不存在，可能已被删除';
          shouldClearStorage = true;
        } else if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = typeof errorData.error === 'string'
            ? errorData.error
            : errorData.error.message || '请求失败';
        } else {
          errorMessage = `请求失败: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = '网络错误，请检查后端服务是否启动';
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (shouldClearStorage) {
        localStorage.removeItem('currentProjectId');
        set({ currentProject: null, error: normalizeErrorMessage(errorMessage) });
      } else {
        set({ error: normalizeErrorMessage(errorMessage) });
      }
    }
  },
});
