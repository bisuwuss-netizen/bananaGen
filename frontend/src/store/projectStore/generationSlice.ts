import type { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import { normalizeErrorMessage } from '@/utils';
import { buildInitialOutlineTaskProgress } from '@/utils/outlineProgress';
import type {
  ProjectGenerationSlice,
  ProjectStore,
} from './types';

export const createGenerationSlice: StateCreator<ProjectStore, [], [], ProjectGenerationSlice> = (set, get) => ({
  generateOutline: async () => {
    const { currentProject } = get();
    if (!currentProject) {
      return;
    }

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
          || (response as any)?.pages,
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
        throw new Error('\u672a\u6536\u5230\u4efb\u52a1 ID');
      }

      set({ activeTaskId: taskId });
      await get().pollTask(taskId, { projectId: currentProject.id!, persist: true });
    } catch (error: any) {
      set({
        error: normalizeErrorMessage(error.message || '\u751f\u6210\u5927\u7eb2\u5931\u8d25'),
        activeTaskId: null,
        taskProgress: null,
        isGlobalLoading: false,
      });
      throw error;
    }
  },

  generateFromDescription: async () => {
    const { currentProject } = get();
    if (!currentProject) {
      return;
    }

    set({ isGlobalLoading: true, error: null });
    try {
      await api.generateFromDescription(currentProject.id!);
      await get().syncProject();
    } catch (error: any) {
      set({ error: error.message || '\u4ece\u63cf\u8ff0\u751f\u6210\u5931\u8d25' });
      throw error;
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  generateDescriptions: async () => {
    const { currentProject } = get();
    if (!currentProject?.id) {
      return;
    }

    await get().saveAllPages();
    const pages = currentProject.pages.filter((page) => page.id);
    if (pages.length === 0) {
      return;
    }

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
        throw new Error('\u672a\u6536\u5230\u4efb\u52a1 ID');
      }

      void get().pollDescriptionTask(
        taskId,
        pages.map((page) => page.id!).filter(Boolean),
        { projectId: currentProject.id, persist: true },
      );
    } catch (error: any) {
      set({
        pageDescriptionGeneratingTasks: {},
        error: normalizeErrorMessage(error.message || '\u542f\u52a8\u751f\u6210\u4efb\u52a1\u5931\u8d25'),
      });
      throw error;
    }
  },

  generatePageDescription: async (pageId) => {
    const { currentProject, pageDescriptionGeneratingTasks } = get();
    if (!currentProject) {
      return;
    }

    await get().saveAllPages();
    if (pageDescriptionGeneratingTasks[pageId]) {
      return;
    }

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
      set({ error: normalizeErrorMessage(error.message || '\u751f\u6210\u63cf\u8ff0\u5931\u8d25') });
      throw error;
    } finally {
      const { pageDescriptionGeneratingTasks: currentTasks } = get();
      const nextTasks = { ...currentTasks };
      delete nextTasks[pageId];
      set({ pageDescriptionGeneratingTasks: nextTasks });
    }
  },

  generateImages: async (pageIds) => {
    const { currentProject, pageGeneratingTasks } = get();
    if (!currentProject) {
      return;
    }

    await get().saveAllPages();
    const targetPageIds =
      pageIds || currentProject.pages.map((page) => page.id).filter((id): id is string => !!id);
    const newPageIds = targetPageIds.filter((id) => !pageGeneratingTasks[id]);
    if (newPageIds.length === 0) {
      return;
    }

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
        void get().pollImageTask(taskId, targetPageIds, {
          projectId: currentProject.id!,
          persist: true,
        });
      } else {
        await get().syncProject();
      }
    } catch (error: any) {
      set({ error: normalizeErrorMessage(error.message || '\u6279\u91cf\u751f\u6210\u56fe\u7247\u5931\u8d25') });
      throw error;
    }
  },

  editPageImage: async (pageId, editPrompt, contextImages) => {
    void pageId;
    void editPrompt;
    void contextImages;
    const message =
      '\u56fe\u7247\u7f16\u8f91\u529f\u80fd\u5df2\u4e0b\u7ebf\uff0c\u8bf7\u4f7f\u7528\u201c\u91cd\u65b0\u751f\u6210\u6b64\u9875\u201d';
    set({ error: message });
    throw new Error(message);
  },
});
