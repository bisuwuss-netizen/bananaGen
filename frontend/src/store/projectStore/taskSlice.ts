import type { StateCreator } from 'zustand';
import { normalizeErrorMessage } from '@/utils';
import {
  hasRecoverableTaskSubscription,
  listRecoverableTasks,
  removeRecoverableTask,
  upsertRecoverableTask,
  watchRecoverableTask,
  type RecoverableTaskKind,
} from './taskRecovery';
import type {
  ProjectStore,
  ProjectTaskPayload,
  ProjectTaskSlice,
} from './types';

const ACTIVE_TASK_FALLBACK_ERROR = '\u4efb\u52a1\u5931\u8d25';
const IMAGE_TASK_FALLBACK_ERROR = '\u6279\u91cf\u751f\u6210\u5931\u8d25';
const DESCRIPTION_TASK_FALLBACK_ERROR = '\u751f\u6210\u63cf\u8ff0\u5931\u8d25';

const getStoredProjectId = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const projectId = localStorage.getItem('currentProjectId') || undefined;
  return projectId || undefined;
};

const resolveProjectId = (
  get: () => ProjectStore,
  explicitProjectId?: string,
): string | undefined => explicitProjectId || get().currentProject?.id || getStoredProjectId();

const uniquePageIds = (pageIds: string[]): string[] => Array.from(new Set(pageIds.filter(Boolean)));

const parseTaskProgress = (task: ProjectTaskPayload): Record<string, any> | null => {
  if (!task.progress) {
    return null;
  }

  if (typeof task.progress === 'string') {
    try {
      return JSON.parse(task.progress) as Record<string, any>;
    } catch (error) {
      console.warn('[taskSlice] Failed to parse task progress:', error);
      return null;
    }
  }

  return task.progress as Record<string, any>;
};

const buildRecoverableRecord = (
  kind: RecoverableTaskKind,
  projectId: string,
  taskId: string,
  pageIds: string[] = [],
) => ({
  kind,
  projectId,
  taskId,
  pageIds: uniquePageIds(pageIds),
  updatedAt: Date.now(),
});

const mergeDescriptionTasks = (
  currentTasks: Record<string, boolean>,
  pageIds: string[],
): Record<string, boolean> => {
  const nextTasks = { ...currentTasks };
  uniquePageIds(pageIds).forEach((pageId) => {
    nextTasks[pageId] = true;
  });
  return nextTasks;
};

const mergeImageTasks = (
  currentTasks: Record<string, string>,
  taskId: string,
  pageIds: string[],
): Record<string, string> => {
  const nextTasks = { ...currentTasks };
  uniquePageIds(pageIds).forEach((pageId) => {
    nextTasks[pageId] = taskId;
  });
  return nextTasks;
};

const removeImageTasks = (
  currentTasks: Record<string, string>,
  taskId: string,
  pageIds: string[],
): Record<string, string> => {
  const nextTasks = { ...currentTasks };
  uniquePageIds(pageIds).forEach((pageId) => {
    if (nextTasks[pageId] === taskId) {
      delete nextTasks[pageId];
    }
  });
  return nextTasks;
};

export const createTaskSlice: StateCreator<ProjectStore, [], [], ProjectTaskSlice> = (set, get) => ({
  startAsyncTask: async (apiCall) => {
    const projectId = resolveProjectId(get);
    set({ isGlobalLoading: true, error: null });

    try {
      const response = await apiCall();
      const taskId = response.data?.task_id;

      if (taskId) {
        set({ activeTaskId: taskId });
        await get().pollTask(taskId, { projectId, persist: false });
      } else {
        await get().syncProject(projectId);
        set({ isGlobalLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.message || '\u4efb\u52a1\u542f\u52a8\u5931\u8d25',
        isGlobalLoading: false,
      });
      throw error;
    }
  },

  pollTask: async (taskId, options = {}) => {
    const projectId = resolveProjectId(get, options.projectId);
    if (!projectId) {
      return;
    }

    const record = buildRecoverableRecord('active', projectId, taskId);
    if (options.persist) {
      upsertRecoverableTask(record);
    }

    set({
      activeTaskId: taskId,
      isGlobalLoading: true,
      error: null,
    });

    let lastCompleted = 0;
    const subscription = watchRecoverableTask({
      record,
      onMessage: async (task) => {
        const progress = parseTaskProgress(task);

        if (task.progress) {
          set({ taskProgress: task.progress });
        }

        const completed = progress?.completed ?? 0;
        if (completed > lastCompleted) {
          lastCompleted = completed;
          await get().syncProject(projectId);
        }

        if (task.status === 'COMPLETED') {
          if (task.task_type === 'EXPORT_EDITABLE_PPTX' && progress?.download_url) {
            setTimeout(() => window.open(progress.download_url as string, '_blank'), 500);
          }

          removeRecoverableTask('active', taskId);
          set({ activeTaskId: null, taskProgress: null, isGlobalLoading: false });
          await get().syncProject(projectId);
          return;
        }

        if (task.status === 'FAILED') {
          removeRecoverableTask('active', taskId);
          set({
            error: normalizeErrorMessage(task.error_message || task.error || ACTIVE_TASK_FALLBACK_ERROR),
            activeTaskId: null,
            taskProgress: null,
            isGlobalLoading: false,
          });
          await get().syncProject(projectId);
        }
      },
    });

    return subscription.completion;
  },

  pollDescriptionTask: async (taskId, pageIds, options = {}) => {
    const projectId = resolveProjectId(get, options.projectId);
    if (!projectId) {
      return;
    }

    const stablePageIds = uniquePageIds(pageIds);
    const record = buildRecoverableRecord('descriptions', projectId, taskId, stablePageIds);
    if (options.persist) {
      upsertRecoverableTask(record);
    }

    set((state) => ({
      error: null,
      pageDescriptionGeneratingTasks: mergeDescriptionTasks(
        state.pageDescriptionGeneratingTasks,
        stablePageIds,
      ),
    }));

    let lastSyncedCompleted = 0;
    let lastSyncedFailed = 0;
    let isSyncing = false;

    const subscription = watchRecoverableTask({
      record,
      onMessage: async (task) => {
        const progress = parseTaskProgress(task);
        const currentCompleted = progress?.completed ?? 0;
        const currentFailed = progress?.failed ?? 0;

        if (task.progress) {
          set({ taskProgress: task.progress });
        }

        const progressChanged =
          currentCompleted !== lastSyncedCompleted || currentFailed !== lastSyncedFailed;
        const isTerminal = task.status === 'COMPLETED' || task.status === 'FAILED';

        if ((progressChanged || isTerminal) && !isSyncing) {
          isSyncing = true;
          lastSyncedCompleted = currentCompleted;
          lastSyncedFailed = currentFailed;

          try {
            await get().syncProject(projectId);
            const { currentProject: updatedProject } = get();

            if (updatedProject?.id === projectId) {
              const isHtmlMode = updatedProject.render_mode === 'html';
              const updatedTasks: Record<string, boolean> = {};

              updatedProject.pages.forEach((page) => {
                if (!page.id) {
                  return;
                }

                const hasContent = isHtmlMode
                  ? !!(page as any).html_model && Object.keys((page as any).html_model || {}).length > 0
                  : !!page.description_content;
                const isGenerating = page.status === 'GENERATING' || (!hasContent && stablePageIds.includes(page.id));

                if (isGenerating) {
                  updatedTasks[page.id] = true;
                }
              });

              set({ pageDescriptionGeneratingTasks: updatedTasks });
            }
          } finally {
            isSyncing = false;
          }
        }

        if (task.status === 'COMPLETED') {
          removeRecoverableTask('descriptions', taskId);
          set({ pageDescriptionGeneratingTasks: {}, taskProgress: null, activeTaskId: null });
          await get().syncProject(projectId);
          return;
        }

        if (task.status === 'FAILED') {
          removeRecoverableTask('descriptions', taskId);
          set({
            pageDescriptionGeneratingTasks: {},
            taskProgress: null,
            activeTaskId: null,
            error: normalizeErrorMessage(task.error_message || task.error || DESCRIPTION_TASK_FALLBACK_ERROR),
          });
          await get().syncProject(projectId);
        }
      },
    });

    return subscription.completion;
  },

  pollImageTask: async (taskId, pageIds, options = {}) => {
    const projectId = resolveProjectId(get, options.projectId);
    if (!projectId) {
      return;
    }

    const stablePageIds = uniquePageIds(pageIds);
    const record = buildRecoverableRecord('images', projectId, taskId, stablePageIds);
    if (options.persist) {
      upsertRecoverableTask(record);
    }

    set((state) => ({
      error: null,
      pageGeneratingTasks: mergeImageTasks(state.pageGeneratingTasks, taskId, stablePageIds),
    }));

    const subscription = watchRecoverableTask({
      record,
      onMessage: async (task) => {
        const progress = parseTaskProgress(task);
        const completedPageIds = Array.isArray(progress?.completed_page_ids)
          ? progress.completed_page_ids.filter(Boolean)
          : [];
        const failedPageIds = Array.isArray(progress?.failed_page_ids)
          ? progress.failed_page_ids.filter(Boolean)
          : [];

        if (completedPageIds.length > 0 || failedPageIds.length > 0) {
          set((state) => ({
            pageGeneratingTasks: removeImageTasks(
              state.pageGeneratingTasks,
              taskId,
              [...completedPageIds, ...failedPageIds],
            ),
          }));
        }

        if (task.status === 'COMPLETED') {
          removeRecoverableTask('images', taskId);
          set((state) => ({
            pageGeneratingTasks: removeImageTasks(state.pageGeneratingTasks, taskId, stablePageIds),
          }));
          await get().syncProject(projectId);
          return;
        }

        if (task.status === 'FAILED') {
          removeRecoverableTask('images', taskId);
          set((state) => ({
            pageGeneratingTasks: removeImageTasks(state.pageGeneratingTasks, taskId, stablePageIds),
            error: normalizeErrorMessage(task.error_message || task.error || IMAGE_TASK_FALLBACK_ERROR),
          }));
          await get().syncProject(projectId);
          return;
        }

        await get().syncProject(projectId);
      },
    });

    return subscription.completion;
  },

  restoreGenerationTasks: async (projectId) => {
    const targetProjectId = resolveProjectId(get, projectId);
    if (!targetProjectId) {
      return;
    }

    const records = listRecoverableTasks(targetProjectId);
    if (records.length === 0) {
      return;
    }

    const descriptionTasks = records.filter((record) => record.kind === 'descriptions');
    const imageTasks = records.filter((record) => record.kind === 'images');
    const activeTask = records.find((record) => record.kind === 'active');

    if (activeTask) {
      set({
        activeTaskId: activeTask.taskId,
        isGlobalLoading: true,
      });
    }

    if (descriptionTasks.length > 0) {
      const mergedDescriptionTasks = descriptionTasks.reduce<Record<string, boolean>>(
        (acc, record) => mergeDescriptionTasks(acc, record.pageIds),
        get().pageDescriptionGeneratingTasks,
      );
      set({ pageDescriptionGeneratingTasks: mergedDescriptionTasks });
    }

    if (imageTasks.length > 0) {
      const mergedImageTasks = imageTasks.reduce<Record<string, string>>(
        (acc, record) => mergeImageTasks(acc, record.taskId, record.pageIds),
        get().pageGeneratingTasks,
      );
      set({ pageGeneratingTasks: mergedImageTasks });
    }

    if (activeTask && !hasRecoverableTaskSubscription('active', activeTask.taskId)) {
      void get().pollTask(activeTask.taskId, {
        projectId: activeTask.projectId,
        persist: true,
      });
    }

    descriptionTasks.forEach((record) => {
      if (hasRecoverableTaskSubscription('descriptions', record.taskId)) {
        return;
      }

      void get().pollDescriptionTask(record.taskId, record.pageIds, {
        projectId: record.projectId,
        persist: true,
      });
    });

    imageTasks.forEach((record) => {
      if (hasRecoverableTaskSubscription('images', record.taskId)) {
        return;
      }

      void get().pollImageTask(record.taskId, record.pageIds, {
        projectId: record.projectId,
        persist: true,
      });
    });
  },
});
