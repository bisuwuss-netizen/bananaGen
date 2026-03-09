import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearPresetStylesCache, getPresetStyles } from '@/config/presetStyles';
import { listPresetStyles } from '@/api/endpoints';

vi.mock('@/api/endpoints', () => ({
  listPresetStyles: vi.fn(),
}));

describe('getPresetStyles', () => {
  beforeEach(() => {
    clearPresetStylesCache();
    vi.clearAllMocks();
  });

  it('接受后端 status=success 的响应格式', async () => {
    vi.mocked(listPresetStyles).mockResolvedValue({
      status: 'success',
      data: {
        styles: [
          {
            id: '1',
            name: '简约商务',
            description: '深蓝配色',
            previewImage: '/files/preset-style.png',
          },
        ],
      },
    } as any);

    const styles = await getPresetStyles();

    expect(styles).toEqual([
      {
        id: '1',
        name: '简约商务',
        description: '深蓝配色',
        previewImage: '/files/preset-style.png',
      },
    ]);
  });
});
