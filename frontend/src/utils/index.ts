import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Project, Page } from '@/types';

/**
 * 合并 className (支持 Tailwind CSS)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 标准化后端返回的项目数据
 */
export function normalizeProject(data: any): Project {
  return {
    ...data,
    id: data.project_id || data.id,
    template_image_path: data.template_image_url || data.template_image_path,
    scheme_id: data.scheme_id || 'edu_dark',
    pages: (data.pages || []).map(normalizePage).sort((a: any, b: any) =>
      (a.order_index ?? 999) - (b.order_index ?? 999)
    ),
  };
}

/**
 * 标准化后端返回的页面数据
 */
export function normalizePage(data: any): Page {
  return {
    ...data,
    id: data.page_id || data.id,
    generated_image_path: data.generated_image_url || data.generated_image_path,
  };
}

/**
 * 防抖函数（支持 flush 立即执行）
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  flush: () => Promise<void>;
  cancel: () => void;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;
  let pendingPromise: Promise<void> | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    pendingArgs = args;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (pendingArgs) {
        const result = func(...pendingArgs);
        // Track the promise if func returns one
        if (result && typeof result.then === 'function') {
          pendingPromise = result;
        }
        pendingArgs = null;
      }
    }, wait);
  };

  // 立即执行待处理的调用，并等待完成
  debouncedFn.flush = async () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (pendingArgs) {
      const result = func(...pendingArgs);
      pendingArgs = null;
      // Wait for the async function to complete
      if (result && typeof result.then === 'function') {
        pendingPromise = result;
        await result;
      }
    } else if (pendingPromise) {
      // Wait for any in-flight promise
      await pendingPromise;
    }
    pendingPromise = null;
  };

  // 取消待处理的调用
  debouncedFn.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    pendingArgs = null;
  };

  return debouncedFn;
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 将错误消息转换为友好的中文提示
 */
export function normalizeErrorMessage(
  error: unknown,
  fallback: string = '操作失败'
): string {
  let raw = '';

  if (typeof error === 'string') {
    raw = error;
  } else if (error instanceof Error) {
    raw = error.message || '';
  } else if (error && typeof error === 'object') {
    const e = error as Record<string, any>;
    raw =
      e.message ||
      e.error_message ||
      e.error ||
      e.detail ||
      '';
    if (!raw) {
      try {
        raw = JSON.stringify(error);
      } catch {
        raw = String(error);
      }
    }
  } else if (error != null) {
    raw = String(error);
  }

  if (!raw) return fallback;

  const message = raw.toLowerCase();

  if (message.includes('no template image found')) {
    return '当前项目还没有模板，请先点击页面工具栏的"更换模板"按钮，选择或上传一张模板图片后再生成。';
  } else if (message.includes('page must have description content')) {
    return '该页面还没有描述内容，请先在"编辑页面描述"步骤为此页生成或填写描述。';
  } else if (message.includes('image already exists')) {
    return '该页面已经有图片，如需重新生成，请在生成时选择"重新生成"或稍后重试。';
  } else if (message.includes('retryerror')) {
    return '模型请求重试后仍失败，请稍后重试。';
  } else if (message.includes('limit_requests') || message.includes('429')) {
    return '请求过于频繁（429限流），请稍后再试。';
  } else if (message.includes('timeout') || message.includes('timed out')) {
    return '请求超时，请稍后重试。';
  }

  return raw;
}

/**
 * 从 Cookie 中获取指定名称的值
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}
