// 预设 PPT 风格描述配置
// 从后端 API 获取预设风格数据

import { listPresetStyles } from '@/api/endpoints';

export interface PresetStyle {
    id: string;
    name: string;
    description: string; // 这里的描述已更新为详细的 AI 文生图 Prompt
    previewImage?: string; // 可选的预览图片路径
}

// 预设风格列表（从 API 获取）
let cachedStyles: PresetStyle[] | null = null;
let isLoading = false;
let loadPromise: Promise<PresetStyle[]> | null = null;

/**
 * 获取预设风格列表
 * 从后端 API 获取 status=1 的启用风格
 * 使用缓存机制，避免重复请求
 */
export const getPresetStyles = async (): Promise<PresetStyle[]> => {
  // 如果已有缓存，直接返回
  if (cachedStyles !== null) {
    return cachedStyles;
  }

  // 如果正在加载，返回同一个 Promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // 开始加载
  isLoading = true;
  loadPromise = (async () => {
    try {
      const response = await listPresetStyles();
      if (response.success && response.data?.styles) {
        // 将后端返回的数据转换为前端格式
        cachedStyles = response.data.styles.map(style => ({
          id: style.id,
          name: style.name,
          description: style.description || '',
          previewImage: style.previewImage || undefined,
        }));
        return cachedStyles;
      } else {
        console.warn('获取预设风格失败，返回空数组');
        return [];
      }
    } catch (error) {
      console.error('获取预设风格时出错:', error);
      return [];
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
};

/**
 * 清除缓存，强制重新加载
 */
export const clearPresetStylesCache = (): void => {
  cachedStyles = null;
  isLoading = false;
  loadPromise = null;
};

// 为了向后兼容，保留 PRESET_STYLES 导出
// 但这是一个异步函数，需要调用 getPresetStyles() 来获取数据
// 注意：直接使用 PRESET_STYLES 会返回空数组，应该使用 getPresetStyles()
export const PRESET_STYLES: PresetStyle[] = [];
