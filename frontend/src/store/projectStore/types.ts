import type {
  Project,
  Task,
} from '@/types';

export interface ProjectCoreSlice {
  currentProject: Project | null;
  isGlobalLoading: boolean;
  activeTaskId: string | null;
  taskProgress: { total: number; completed: number } | null;
  error: string | null;
  pageGeneratingTasks: Record<string, string>;
  pageDescriptionGeneratingTasks: Record<string, boolean>;
  setCurrentProject: (project: Project | null) => void;
  setGlobalLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializeProject: (
    type: 'idea' | 'outline' | 'description',
    content: string,
    templateImage?: File,
    templateStyle?: string,
    renderMode?: 'image' | 'html',
    schemeId?: string
  ) => Promise<void>;
  syncProject: (projectId?: string) => Promise<void>;
}

export interface ProjectPageSlice {
  updatePageLocal: (pageId: string, data: any) => void;
  flushPendingUpdates: () => void;
  saveAllPages: () => Promise<void>;
  reorderPages: (newOrder: string[]) => Promise<void>;
  addNewPage: () => Promise<void>;
  deletePageById: (pageId: string) => Promise<void>;
}

export interface ProjectTaskSlice {
  startAsyncTask: (apiCall: () => Promise<any>) => Promise<void>;
  pollTask: (taskId: string) => Promise<void>;
  pollImageTask: (taskId: string, pageIds: string[]) => void;
}

export interface ProjectGenerationSlice {
  generateOutline: () => Promise<void>;
  generateFromDescription: () => Promise<void>;
  generateDescriptions: () => Promise<void>;
  generatePageDescription: (pageId: string) => Promise<void>;
  generateImages: (pageIds?: string[]) => Promise<void>;
  editPageImage: (
    pageId: string,
    editPrompt: string,
    contextImages?: {
      useTemplate?: boolean;
      descImageUrls?: string[];
      uploadedFiles?: File[];
    }
  ) => Promise<void>;
}

export interface ProjectExportSlice {
  exportPPTX: (pageIds?: string[]) => Promise<void>;
  exportPDF: (pageIds?: string[]) => Promise<void>;
  exportEditablePPTX: (filename?: string, pageIds?: string[]) => Promise<void>;
}

export type ProjectStore = ProjectCoreSlice &
  ProjectPageSlice &
  ProjectTaskSlice &
  ProjectGenerationSlice &
  ProjectExportSlice;

export type ProjectTaskPayload = Task;
