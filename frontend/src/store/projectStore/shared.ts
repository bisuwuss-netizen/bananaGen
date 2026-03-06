import * as api from '@/api/endpoints';
import { debounce } from '@/utils';
import type { ProjectStore } from './types';

export const createDebouncedUpdatePage = (get: () => ProjectStore) =>
  debounce(
    async (projectId: string, pageId: string, data: any) => {
      try {
        if (data.description_content) {
          await api.updatePageDescription(projectId, pageId, data.description_content);
        } else if (data.outline_content) {
          await api.updatePageOutline(projectId, pageId, data.outline_content);
        } else {
          await api.updatePage(projectId, pageId, data);
        }

        await get().syncProject(projectId);
      } catch (error) {
        console.error('保存页面失败:', error);
      }
    },
    1000
  );
