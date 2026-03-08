import { describe, expect, it } from 'vitest';

import {
  collectHtmlImageSlotDescriptors,
  normalizeImageSource,
  sanitizeHtmlModelImageSources,
} from '@/utils/htmlImageSlots';

describe('htmlImageSlots utils', () => {
  it('treats example.com sources as missing images', () => {
    expect(normalizeImageSource('https://example.com/images/demo.jpg')).toBe('');
    expect(normalizeImageSource('https://cdn.example.org/mock.png')).toBe('');
    expect(normalizeImageSource('data:image/png;base64,abc123')).toBe('data:image/png;base64,abc123');
  });

  it('sanitizes nested placeholder image urls inside HTML models', () => {
    const sanitized = sanitizeHtmlModelImageSources({
      image_src: 'https://example.com/main.png',
      image: { src: 'https://example.com/inline.png' },
      items: [
        { image_src: 'https://example.com/item-1.png', title: '案例一' },
        { image_src: 'https://assets.example.cn/item-2.png', title: '案例二' },
      ],
    });

    expect((sanitized as any).image_src).toBe('');
    expect((sanitized as any).image.src).toBe('');
    expect((sanitized as any).items[0].image_src).toBe('');
    expect((sanitized as any).items[1].image_src).toBe('https://assets.example.cn/item-2.png');
  });

  it('collects missing slots for portfolio and detail zoom layouts', () => {
    const inferTwoColumnPartType = () => 'text' as const;

    const portfolioSlots = collectHtmlImageSlotDescriptors(
      'portfolio',
      {
        items: [
          { image_src: '', title: '案例一' },
          { image_src: 'https://example.com/item.png', title: '案例二' },
          { image_src: 'https://cdn.valid.com/item.png', title: '案例三' },
        ],
      },
      { inferTwoColumnPartType }
    );

    const detailSlots = collectHtmlImageSlotDescriptors(
      'detail_zoom',
      { image_src: '' },
      { inferTwoColumnPartType }
    );

    expect(portfolioSlots.map((slot) => slot.slotPath)).toEqual([
      'items.0.image_src',
      'items.1.image_src',
      'items.2.image_src',
    ]);
    expect(portfolioSlots.filter((slot) => !slot.src).map((slot) => slot.slotPath)).toEqual([
      'items.0.image_src',
      'items.1.image_src',
    ]);
    expect(detailSlots).toEqual([
      { slotPath: 'image_src', slotRole: 'main', src: '' },
    ]);
  });
});
