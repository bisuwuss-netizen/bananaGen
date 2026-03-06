import type { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import type { ProjectExportSlice, ProjectStore } from './types';

export const createExportSlice: StateCreator<ProjectStore, [], [], ProjectExportSlice> = (set, get) => ({
  exportPPTX: async (pageIds) => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isGlobalLoading: true, error: null });
    try {
      const response = await api.exportPPTX(currentProject.id!, pageIds);
      const downloadUrl = response.data?.download_url || response.data?.download_url_absolute;
      if (!downloadUrl) {
        throw new Error('导出链接获取失败');
      }
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      set({ error: error.message || '导出失败' });
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  exportPDF: async (pageIds) => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isGlobalLoading: true, error: null });
    try {
      const response = await api.exportPDF(currentProject.id!, pageIds);
      const downloadUrl = response.data?.download_url || response.data?.download_url_absolute;
      if (!downloadUrl) {
        throw new Error('导出链接获取失败');
      }
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      set({ error: error.message || '导出失败' });
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  exportEditablePPTX: async (filename, pageIds) => {
    const { currentProject, startAsyncTask } = get();
    if (!currentProject) return;

    try {
      await startAsyncTask(() => api.exportEditablePPTX(currentProject.id!, filename, pageIds));
    } catch (error: any) {
      set({ error: error.message || '导出可编辑PPTX失败' });
    }
  },
});
