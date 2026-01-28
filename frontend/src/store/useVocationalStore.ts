import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 类型定义
export type VocationalScene = 'theory' | 'practice' | 'review' | 'mixed';
export type ImageSlotStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'uploaded';

export interface VocationalPage {
  id: string;
  title: string;
  bullets: string[];
  imageLayout: 'none' | 'right' | 'background';
  pageType?: 'theory' | 'practice';
  part?: string;
}

export interface ImageSlot {
  slot_id: string;
  page_index: number;
  description: string;
  status: ImageSlotStatus;
  image_path?: string;
  prompt?: string;
}

interface VocationalState {
  // 配置状态
  scene: VocationalScene;
  selectedPedagogy: string;
  selectedTemplate: string;
  practiceRatio: number;  // 0-100
  
  // 渲染状态
  previewHtml: string | null;
  previewUrl: string | null;
  imageSlots: ImageSlot[];
  layoutsUsed: Record<string, number>;
  
  // 大纲编辑状态
  pages: VocationalPage[];
  editingPageIndex: number | null;
  unsavedChanges: boolean;
  
  // 图片生成状态
  imageTaskId: string | null;
  imageProgress: {
    total: number;
    completed: number;
    failed: number;
  };
  
  // WebSocket 连接状态
  wsConnected: boolean;
  
  // 操作方法
  setScene: (scene: VocationalScene) => void;
  setPedagogy: (pedagogyId: string) => void;
  setTemplate: (templateId: string) => void;
  setPracticeRatio: (ratio: number) => void;
  setPreviewHtml: (html: string | null, url?: string | null) => void;
  setImageSlots: (slots: ImageSlot[]) => void;
  setLayoutsUsed: (layouts: Record<string, number>) => void;
  
  // 页面操作
  setPages: (pages: VocationalPage[]) => void;
  updatePageTitle: (index: number, title: string) => void;
  updatePageBullets: (index: number, bullets: string[]) => void;
  updatePageImageLayout: (index: number, layout: 'none' | 'right' | 'background') => void;
  setEditingPage: (index: number | null) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  addPage: (afterIndex: number) => void;
  deletePage: (index: number) => void;
  setUnsavedChanges: (changed: boolean) => void;
  
  // 图片操作
  setImageTaskId: (taskId: string | null) => void;
  updateImageProgress: (progress: { total: number; completed: number; failed: number }) => void;
  updateSlotStatus: (slotId: string, status: ImageSlotStatus, imagePath?: string) => void;
  
  // WebSocket
  setWsConnected: (connected: boolean) => void;
  
  // 重置
  reset: () => void;
}

// 场景默认理实比例
const SCENE_DEFAULT_RATIOS: Record<VocationalScene, number> = {
  theory: 20,
  mixed: 40,
  practice: 60,
  review: 30,
};

const initialState = {
  scene: 'theory' as VocationalScene,
  selectedPedagogy: '',
  selectedTemplate: '',
  practiceRatio: 20,
  previewHtml: null,
  previewUrl: null,
  imageSlots: [],
  layoutsUsed: {},
  pages: [],
  editingPageIndex: null,
  unsavedChanges: false,
  imageTaskId: null,
  imageProgress: { total: 0, completed: 0, failed: 0 },
  wsConnected: false,
};

export const useVocationalStore = create<VocationalState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 配置操作
      setScene: (scene) => set({ 
        scene, 
        practiceRatio: SCENE_DEFAULT_RATIOS[scene] 
      }),
      
      setPedagogy: (pedagogyId) => set({ 
        selectedPedagogy: pedagogyId,
        unsavedChanges: true,
      }),
      
      setTemplate: (templateId) => set({ 
        selectedTemplate: templateId,
        unsavedChanges: true,
      }),
      
      setPracticeRatio: (ratio) => set({ 
        practiceRatio: Math.max(0, Math.min(100, ratio)),
        unsavedChanges: true,
      }),
      
      // 预览操作
      setPreviewHtml: (html, url) => set({ 
        previewHtml: html,
        previewUrl: url ?? null,
      }),
      
      setImageSlots: (slots) => set({ imageSlots: slots }),
      
      setLayoutsUsed: (layouts) => set({ layoutsUsed: layouts }),
      
      // 页面操作
      setPages: (pages) => set({ pages }),
      
      updatePageTitle: (index, title) => set((state) => ({
        pages: state.pages.map((p, i) => 
          i === index ? { ...p, title } : p
        ),
        unsavedChanges: true,
      })),
      
      updatePageBullets: (index, bullets) => set((state) => ({
        pages: state.pages.map((p, i) => 
          i === index ? { ...p, bullets } : p
        ),
        unsavedChanges: true,
      })),
      
      updatePageImageLayout: (index, layout) => set((state) => ({
        pages: state.pages.map((p, i) => 
          i === index ? { ...p, imageLayout: layout } : p
        ),
        unsavedChanges: true,
      })),
      
      setEditingPage: (index) => set({ editingPageIndex: index }),
      
      reorderPages: (fromIndex, toIndex) => set((state) => {
        const newPages = [...state.pages];
        const [removed] = newPages.splice(fromIndex, 1);
        newPages.splice(toIndex, 0, removed);
        return { pages: newPages, unsavedChanges: true };
      }),
      
      addPage: (afterIndex) => set((state) => {
        const newPage: VocationalPage = {
          id: `page_${Date.now()}`,
          title: '新页面',
          bullets: [],
          imageLayout: 'none',
        };
        const newPages = [...state.pages];
        newPages.splice(afterIndex + 1, 0, newPage);
        return { pages: newPages, unsavedChanges: true };
      }),
      
      deletePage: (index) => set((state) => ({
        pages: state.pages.filter((_, i) => i !== index),
        editingPageIndex: state.editingPageIndex === index ? null : state.editingPageIndex,
        unsavedChanges: true,
      })),
      
      setUnsavedChanges: (changed) => set({ unsavedChanges: changed }),
      
      // 图片操作
      setImageTaskId: (taskId) => set({ imageTaskId: taskId }),
      
      updateImageProgress: (progress) => set({ imageProgress: progress }),
      
      updateSlotStatus: (slotId, status, imagePath) => set((state) => ({
        imageSlots: state.imageSlots.map((slot) =>
          slot.slot_id === slotId
            ? { ...slot, status, image_path: imagePath ?? slot.image_path }
            : slot
        ),
      })),
      
      // WebSocket
      setWsConnected: (connected) => set({ wsConnected: connected }),
      
      // 重置
      reset: () => set(initialState),
    }),
    {
      name: 'vocational-editor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 只持久化配置，不持久化临时状态
        selectedPedagogy: state.selectedPedagogy,
        selectedTemplate: state.selectedTemplate,
        practiceRatio: state.practiceRatio,
        scene: state.scene,
      }),
    }
  )
);
