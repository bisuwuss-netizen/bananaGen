import type { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import type { ProjectPageSlice, ProjectStore } from './types';

export const createPageSlice = (
  debouncedUpdatePage: ReturnType<typeof import('./shared').createDebouncedUpdatePage>
): StateCreator<ProjectStore, [], [], ProjectPageSlice> => (set, get) => ({
  updatePageLocal: (pageId, data) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updatedPages = currentProject.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            ...data,
            ...(data.outline_content
              ? {
                  description_content: null,
                  html_model: null,
                  generated_image_path: null,
                  status: 'DRAFT',
                }
              : {}),
          }
        : page
    );

    set({
      currentProject: {
        ...currentProject,
        pages: updatedPages,
      },
    });

    debouncedUpdatePage(currentProject.id!, pageId, data);
  },

  flushPendingUpdates: () => {
    debouncedUpdatePage.flush();
  },

  saveAllPages: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    await debouncedUpdatePage.flush();
    await get().syncProject(currentProject.id!);
  },

  reorderPages: async (newOrder) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const reorderedPages = newOrder
      .map((id) => currentProject.pages.find((p) => p.id === id))
      .filter(Boolean) as typeof currentProject.pages;

    set({
      currentProject: {
        ...currentProject,
        pages: reorderedPages,
      },
    });

    try {
      await api.updatePagesOrder(currentProject.id!, newOrder);
    } catch (error: any) {
      set({ error: error.message || '更新顺序失败' });
      await get().syncProject();
    }
  },

  addNewPage: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      const response = await api.addPage(currentProject.id!, {
        outline_content: { title: '新页面', points: [] },
        order_index: currentProject.pages.length,
      });
      if (response.data) {
        await get().syncProject();
      }
    } catch (error: any) {
      set({ error: error.message || '添加页面失败' });
    }
  },

  deletePageById: async (pageId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      await api.deletePage(currentProject.id!, pageId);
      await get().syncProject();
    } catch (error: any) {
      set({ error: error.message || '删除页面失败' });
    }
  },
});
