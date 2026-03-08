import { describe, expect, it } from 'vitest';

import { getScaleToFit, getWidthFitScale } from '@/utils/slideScale';

describe('slideScale helpers', () => {
  it('shrinks by width when width is the limiting dimension', () => {
    expect(getScaleToFit(960, 720, 1280, 720)).toBe(0.75);
  });

  it('shrinks by height when height is the limiting dimension', () => {
    expect(getScaleToFit(1400, 540, 1280, 720)).toBe(0.75);
  });

  it('caps preview scaling at the original slide size', () => {
    expect(getScaleToFit(1800, 1200, 1280, 720)).toBe(1);
    expect(getWidthFitScale(1600, 1280)).toBe(1);
  });

  it('returns 0 for invalid dimensions so callers can keep the previous scale', () => {
    expect(getScaleToFit(0, 720, 1280, 720)).toBe(0);
    expect(getWidthFitScale(-1, 1280)).toBe(0);
  });
});
