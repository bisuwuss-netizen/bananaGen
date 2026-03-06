import type { StateCreator } from 'zustand';
import { openTaskWebSocket } from '@/api/client';
import { normalizeErrorMessage } from '@/utils';
import type { ProjectStore, ProjectTaskPayload, ProjectTaskSlice } from './types';

export const createTaskSlice: StateCreator<ProjectStore, [], [], ProjectTaskSlice> = (set, get) => ({
  startAsyncTask: async (apiCall) => {
    set({ isGlobalLoading: true, error: null });
    try {
      const response = await apiCall();
      const taskId = response.data?.task_id;
      if (taskId) {
        set({ activeTaskId: taskId });
        await get().pollTask(taskId);
      } else {
        await get().syncProject();
        set({ isGlobalLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '任务启动失败', isGlobalLoading: false });
      throw error;
    }
  },

  pollTask: async (taskId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    let lastCompleted = 0;
    await new Promise<void>((resolve) => {
      const socket = openTaskWebSocket<ProjectTaskPayload>(currentProject.id!, taskId, {
        onMessage: async (task) => {
          if (task.progress) {
            set({ taskProgress: task.progress });
            const prog = typeof task.progress === 'string' ? JSON.parse(task.progress) : task.progress;
            const completed = prog?.completed ?? 0;
            if (completed > lastCompleted) {
              lastCompleted = completed;
              await get().syncProject();
            }
          }

          if (task.status === 'COMPLETED') {
            if (task.task_type === 'EXPORT_EDITABLE_PPTX' && task.progress) {
              const progress = typeof task.progress === 'string'
                ? JSON.parse(task.progress)
                : task.progress;
              const downloadUrl = progress?.download_url;
              if (downloadUrl) {
                setTimeout(() => window.open(downloadUrl, '_blank'), 500);
              }
            }

            set({ activeTaskId: null, taskProgress: null, isGlobalLoading: false });
            await get().syncProject();
            socket.close();
            resolve();
            return;
          }

          if (task.status === 'FAILED') {
            set({
              error: normalizeErrorMessage(task.error_message || task.error || '任务失败'),
              activeTaskId: null,
              taskProgress: null,
              isGlobalLoading: false,
            });
            socket.close();
            resolve();
          }
        },
        onError: () => {
          set({
            error: '任务 WebSocket 连接失败',
            activeTaskId: null,
            taskProgress: null,
            isGlobalLoading: false,
          });
          resolve();
        },
        onClose: () => {
          resolve();
        },
      });
    });
  },

  pollImageTask: async (taskId, pageIds) => {
    const { currentProject } = get();
    if (!currentProject) return;

    openTaskWebSocket<ProjectTaskPayload>(currentProject.id!, taskId, {
      onMessage: async (task) => {
        const { pageGeneratingTasks } = get();
        const newTasks = { ...pageGeneratingTasks };

        if (task.status === 'COMPLETED') {
          pageIds.forEach((id) => {
            if (newTasks[id] === taskId) {
              delete newTasks[id];
            }
          });
          set({ pageGeneratingTasks: newTasks });
          await get().syncProject();
          return;
        }

        if (task.status === 'FAILED') {
          pageIds.forEach((id) => {
            if (newTasks[id] === taskId) {
              delete newTasks[id];
            }
          });
          set({
            pageGeneratingTasks: newTasks,
            error: normalizeErrorMessage(task.error_message || task.error || '批量生成失败'),
          });
          await get().syncProject();
          return;
        }

        await get().syncProject();
      },
      onError: () => {
        const { pageGeneratingTasks } = get();
        const newTasks = { ...pageGeneratingTasks };
        pageIds.forEach((id) => {
          delete newTasks[id];
        });
        set({ pageGeneratingTasks: newTasks, error: '图片生成任务连接失败' });
      },
    });
  },
});
