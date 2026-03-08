import { describe, expect, it } from 'vitest';

import { getLayoutDisplayName } from '@/experimental/html-renderer/layouts';

describe('getLayoutDisplayName', () => {
  it('prefers alias-specific Chinese names before normalized names', () => {
    expect(getLayoutDisplayName('infographic_flow')).toBe('图解流');
    expect(getLayoutDisplayName('gallery_professional')).toBe('专业图库');
    expect(getLayoutDisplayName('specimen_detail')).toBe('标本特写');
  });

  it('returns Chinese names for normalized vocational and visual layouts', () => {
    expect(getLayoutDisplayName('vocational_bullets')).toBe('要点讲解');
    expect(getLayoutDisplayName('vocational_content')).toBe('内容讲解');
    expect(getLayoutDisplayName('vocational_comparison')).toBe('对比讲解');
    expect(getLayoutDisplayName('detail_zoom')).toBe('细节放大');
    expect(getLayoutDisplayName('portfolio')).toBe('作品集展示');
  });

  it('falls back to a Chinese placeholder when layout id is missing', () => {
    expect(getLayoutDisplayName(undefined)).toBe('未知布局');
    expect(getLayoutDisplayName(null)).toBe('未知布局');
  });
});
