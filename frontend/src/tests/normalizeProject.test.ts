import { describe, expect, it } from 'vitest';

import { normalizePage } from '@/utils';

describe('normalizePage', () => {
  it('converts part-based outline payloads into safe renderable outline content', () => {
    const normalized = normalizePage({
      page_id: 'page-1',
      order_index: 0,
      part: '引言',
      status: 'OUTLINE_GENERATED',
      outline_content: {
        part: '引言',
        pages: [
          { title: '封面', points: ['项目背景'] },
          { title: '目录', points: ['目标', '范围'] },
        ],
      },
    });

    expect(normalized.outline_content.title).toBe('引言');
    expect(normalized.outline_content.points).toEqual(['封面', '目录']);
  });

  it('keeps valid page outline payloads unchanged', () => {
    const normalized = normalizePage({
      page_id: 'page-2',
      order_index: 1,
      status: 'OUTLINE_GENERATED',
      outline_content: {
        title: '核心内容',
        points: ['要点一', '要点二'],
      },
    });

    expect(normalized.outline_content.title).toBe('核心内容');
    expect(normalized.outline_content.points).toEqual(['要点一', '要点二']);
  });
});
