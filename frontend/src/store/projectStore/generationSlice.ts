import type { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import { openTaskWebSocket } from '@/api/client';
import { normalizeErrorMessage } from '@/utils';
import { buildInitialOutlineTaskProgress } from '@/utils/outlineProgress';
import type {
  ProjectGenerationSlice,
  ProjectStore,
  ProjectTaskPayload,
} from './types';

export const createGenerationSlice: StateCreator<ProjectStore, [], [], ProjectGenerationSlice> = (set, get) => ({
  generateOutline: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({
      isGlobalLoading: true,
      error: null,
      taskProgress: buildInitialOutlineTaskProgress(currentProject),
    });
    try {
      const response = await api.generateOutline(currentProject.id!);
      const taskId =
        response.data?.task_id
        || (response as any)?.task_id
        || (response as any)?.data?.data?.task_id;

      if (!taskId) {
        const maybeSyncPayload = Boolean(
          response.data?.outline
          || response.data?.pages
          || (response as any)?.outline
          || (response as any)?.pages
        );

        if (maybeSyncPayload) {
          await get().syncProject(currentProject.id!);
          set({
            activeTaskId: null,
            taskProgress: null,
            isGlobalLoading: false,
          });
          return;
        }

        await get().syncProject(currentProject.id!);
        const refreshedProject = get().currentProject;
        if (
          refreshedProject
          && refreshedProject.id === currentProject.id
          && (
            refreshedProject.status === 'OUTLINE_GENERATED'
            || (refreshedProject.pages?.length || 0) > 0
          )
        ) {
          set({
            activeTaskId: null,
            taskProgress: null,
            isGlobalLoading: false,
          });
          return;
        }

        console.warn('[generateOutline] unexpected response payload:', response);
        throw new Error('未收到任务ID');
      }

      set({ activeTaskId: taskId });
      await get().pollTask(taskId);
    } catch (error: any) {
      set({
        error: normalizeErrorMessage(error.message || '生成大纲失败'),
        activeTaskId: null,
        taskProgress: null,
        isGlobalLoading: false,
      });
      throw error;
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
    const isHtmlMode = currentProject.render_mode === 'html';

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

      let wsMessageCount = 0;
      let lastSyncedCompleted = 0;
      let lastSyncedFailed = 0;
      let isSyncing = false;
      openTaskWebSocket<ProjectTaskPayload>(currentProject.id, taskId, {
        onMessage: async (task) => {
          wsMessageCount++;
          const prog = task.progress as any;
          const currentCompleted = prog?.completed ?? 0;
          const currentFailed = prog?.failed ?? 0;

          if (task.progress) {
            set({ taskProgress: task.progress });
          }

          // 只在 progress 有变化 或 任务终态时才 syncProject，避免请求风暴
          const progressChanged = currentCompleted !== lastSyncedCompleted || currentFailed !== lastSyncedFailed;
          const isTerminal = task.status === 'COMPLETED' || task.status === 'FAILED';

          if ((progressChanged || isTerminal) && !isSyncing) {
            isSyncing = true;
            lastSyncedCompleted = currentCompleted;
            lastSyncedFailed = currentFailed;

            try {
              await get().syncProject();
              const { currentProject: updatedProject } = get();

              if (updatedProject) {
                const updatedTasks: Record<string, boolean> = {};
                updatedProject.pages.forEach((page) => {
                  if (page.id) {
                    const hasContent = isHtmlMode
                      ? !!(page as any).html_model && Object.keys((page as any).html_model || {}).length > 0
                      : !!page.description_content;
                    const isGenerating = page.status === 'GENERATING' || (!hasContent && initialTasks[page.id]);
                    if (isGenerating) {
                      updatedTasks[page.id] = true;
                    }
                  }
                });
                set({ pageDescriptionGeneratingTasks: updatedTasks });
              }
            } finally {
              isSyncing = false;
            }
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
            // 即使任务失败，也同步项目以获取已成功生成的部分内容
            await get().syncProject();
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
