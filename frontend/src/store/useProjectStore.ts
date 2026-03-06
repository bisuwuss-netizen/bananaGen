import { create } from 'zustand';
import { createCoreSlice } from './projectStore/coreSlice';
import { createPageSlice } from './projectStore/pageSlice';
import { createTaskSlice } from './projectStore/taskSlice';
import { createGenerationSlice } from './projectStore/generationSlice';
import { createExportSlice } from './projectStore/exportSlice';
import { createDebouncedUpdatePage } from './projectStore/shared';
import type { ProjectStore } from './projectStore/types';

export type { ProjectStore } from './projectStore/types';

export const useProjectStore = create<ProjectStore>()((set, get, api) => {
  const debouncedUpdatePage = createDebouncedUpdatePage(get);

  return {
    ...createCoreSlice(set, get, api),
    ...createPageSlice(debouncedUpdatePage)(set, get, api),
    ...createTaskSlice(set, get, api),
    ...createGenerationSlice(set, get, api),
    ...createExportSlice(set, get, api),
  };
});
