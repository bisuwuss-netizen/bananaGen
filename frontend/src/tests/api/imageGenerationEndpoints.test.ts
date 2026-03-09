import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { generateImages, generatePageImage } from '@/api/endpoints';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('image generation endpoints', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { language: 'zh' } },
    } as any);
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true },
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('批量生成图片时显式传递 use_template', async () => {
    await generateImages('project-1', undefined, ['page-1', 'page-2'], false);

    expect(apiClient.post).toHaveBeenCalledWith('/api/projects/project-1/generate/images', {
      language: 'zh',
      page_ids: ['page-1', 'page-2'],
      use_template: false,
    });
  });

  it('单页生成图片时显式传递 use_template', async () => {
    await generatePageImage('project-1', 'page-3', true, undefined, false);

    expect(apiClient.post).toHaveBeenCalledWith('/api/projects/project-1/pages/page-3/generate/image', {
      force_regenerate: true,
      language: 'zh',
      use_template: false,
    });
  });
});
