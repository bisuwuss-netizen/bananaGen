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

      if (templateImage) {
        try {
          await api.uploadTemplate(projectId, templateImage);
        } catch (error) {
          console.warn('模板上传失败:', error);
        }
      }

      if (type === 'description') {
        try {
          await api.generateFromDescription(projectId, content);
        } catch (error) {
          console.error('[初始化项目] 从描述生成失败:', error);
        }
      }

      const projectResponse = await api.getProject(projectId);
      const project = normalizeProject(projectResponse.data);
      if (project) {
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
