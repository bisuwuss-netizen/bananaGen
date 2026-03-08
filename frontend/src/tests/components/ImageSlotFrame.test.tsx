import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImageSlotFrame } from '@/experimental/html-renderer/components/ImageSlotFrame';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';

const theme = getThemeByScheme('visual');

describe('ImageSlotFrame', () => {
  it('renders a visible slot placeholder when no image source exists', () => {
    render(
      <ImageSlotFrame
        theme={theme}
        slotLabel="全幅图片插槽"
        slotHint="建议使用横向主视觉图"
      />
    );

    expect(screen.getByText('全幅图片插槽')).toBeInTheDocument();
    expect(screen.getByText('当前为图片插槽占位')).toBeInTheDocument();
    expect(screen.getByText('建议使用横向主视觉图')).toBeInTheDocument();
  });

  it('falls back to slot placeholder when the image fails to load', () => {
    render(
      <ImageSlotFrame
        src="https://example.com/broken-image.png"
        alt="broken"
        theme={theme}
        slotLabel="配图插槽"
      />
    );

    fireEvent.error(screen.getByAltText('broken'));

    expect(screen.getByText('配图插槽')).toBeInTheDocument();
    expect(screen.getByText('图片加载失败，当前展示插槽位置')).toBeInTheDocument();
  });
});
