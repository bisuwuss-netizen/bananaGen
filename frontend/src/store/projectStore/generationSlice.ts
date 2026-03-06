import type { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import { openTaskWebSocket } from '@/api/client';
import { normalizeErrorMessage } from '@/utils';
import type {
  ProjectGenerationSlice,
  ProjectStore,
  ProjectTaskPayload,
} from './types';

export const createGenerationSlice: StateCreator<ProjectStore, [], [], ProjectGenerationSlice> = (set, get) => ({
  generateOutline: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isGlobalLoading: true, error: null });
    try {
      await api.generateOutline(currentProject.id!);
      await get().syncProject();
    } catch (error: any) {
      set({ error: error.message || '生成大纲失败' });
      throw error;
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  generateFromDescription: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isGlobalLoading: true, error: null });
    try {
      await api.generateFromDescription(currentProject.id!);
      await get().syncProject();
    } catch (error: any) {
      set({ error: error.message || '从描述生成失败' });
      throw error;
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  generateDescriptions: async () => {
    const { currentProject } = get();
    if (!currentProject?.id) return;

    await get().saveAllPages();
    const pages = currentProject.pages.filter((p) => p.id);
    if (pages.length === 0) return;

    const initialTasks: Record<string, boolean> = {};
    pages.forEach((page) => {
      if (page.id) {
        initialTasks[page.id] = true;
      }
    });
    set({ error: null, pageDescriptionGeneratingTasks: initialTasks });

    try {
      const response = await api.generateDescriptions(currentProject.id);
      const taskId = response.data?.task_id;
      if (!taskId) {
        throw new Error('未收到任务ID');
      }

      openTaskWebSocket<ProjectTaskPayload>(currentProject.id, taskId, {
        onMessage: async (task) => {
          if (task.progress) {
            set({ taskProgress: task.progress });
          }

          await get().syncProject();
          const { currentProject: updatedProject } = get();
          if (updatedProject) {
            const updatedTasks: Record<string, boolean> = {};
            updatedProject.pages.forEach((page) => {
              if (page.id) {
                const hasDescription = !!page.description_content;
                const isGenerating = page.status === 'GENERATING' || (!hasDescription && initialTasks[page.id]);
                if (isGenerating) {
                  updatedTasks[page.id] = true;
                }
              }
            });
            set({ pageDescriptionGeneratingTasks: updatedTasks });
          }

          if (task.status === 'COMPLETED') {
            set({ pageDescriptionGeneratingTasks: {}, taskProgress: null, activeTaskId: null });
            await get().syncProject();
          } else if (task.status === 'FAILED') {
            set({
              pageDescriptionGeneratingTasks: {},
              taskProgress: null,
              activeTaskId: null,
              error: normalizeErrorMessage(task.error_message || task.error || '生成描述失败'),
            });
          }
        },
        onError: () => {
          set({
            pageDescriptionGeneratingTasks: {},
            error: '描述生成任务连接失败',
          });
        },
      });
    } catch (error: any) {
      set({
        pageDescriptionGeneratingTasks: {},
        error: normalizeErrorMessage(error.message || '启动生成任务失败'),
      });
      throw error;
    }
  },

  generatePageDescription: async (pageId) => {
    const { currentProject, pageDescriptionGeneratingTasks } = get();
    if (!currentProject) return;

    await get().saveAllPages();
    if (pageDescriptionGeneratingTasks[pageId]) return;

    set({
      error: null,
      pageDescriptionGeneratingTasks: {
        ...pageDescriptionGeneratingTasks,
        [pageId]: true,
      },
    });

    try {
      await get().syncProject();
      await api.generatePageDescription(currentProject.id!, pageId, true);
      await get().syncProject();
    } catch (error: any) {
      set({ error: normalizeErrorMessage(error.message || '生成描述失败') });
      throw error;
    } finally {
      const { pageDescriptionGeneratingTasks: currentTasks } = get();
      const newTasks = { ...currentTasks };
      delete newTasks[pageId];
      set({ pageDescriptionGeneratingTasks: newTasks });
    }
  },

  generateImages: async (pageIds) => {
    const { currentProject, pageGeneratingTasks } = get();
    if (!currentProject) return;

    await get().saveAllPages();
    const targetPageIds = pageIds || currentProject.pages.map((p) => p.id).filter((id): id is string => !!id);
    const newPageIds = targetPageIds.filter((id) => !pageGeneratingTasks[id]);
    if (newPageIds.length === 0) return;

    set({ error: null });

    try {
      const response = await api.generateImages(currentProject.id!, undefined, pageIds);
      const taskId = response.data?.task_id;
      if (taskId) {
        const nextTasks = { ...pageGeneratingTasks };
        targetPageIds.forEach((id) => {
          nextTasks[id] = taskId;
        });
        set({ pageGeneratingTasks: nextTasks });
        await get().syncProject();
        get().pollImageTask(taskId, targetPageIds);
      } else {
        await get().syncProject();
      }
    } catch (error: any) {
      set({ error: normalizeErrorMessage(error.message || '批量生成图片失败') });
      throw error;
    }
  },

  editPageImage: async (pageId, editPrompt, contextImages) => {
    void pageId;
    void editPrompt;
    void contextImages;
    const message = '图片编辑功能已下线，请使用“重新生成此页”';
    set({ error: message });
    throw new Error(message);
  },
});
