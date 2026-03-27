import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SchemeSelector } from '@/components/shared/SchemeSelector';
import { layoutSchemes } from '@/data/layoutSchemes';

vi.mock('@/experimental/html-renderer/components/SlideRenderer', () => ({
  SlideRenderer: () => <div data-testid="mock-scheme-slide-renderer">scheme preview</div>,
}));

describe('SchemeSelector', () => {
  const academicScheme = layoutSchemes.find((scheme) => scheme.id === 'academic');
  const academicPreviewLabel = `预览 ${academicScheme?.name}`;

  it('does not open the storyboard on hover', () => {
    render(<SchemeSelector value="academic" onChange={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByLabelText(academicPreviewLabel));

    expect(screen.queryByTestId('scheme-preview-overlay')).not.toBeInTheDocument();
  });

  it('shows a scrollable storyboard when clicking preview button', async () => {
    render(<SchemeSelector value="academic" onChange={vi.fn()} />);

    fireEvent.click(screen.getByLabelText(academicPreviewLabel));

    const overlay = await screen.findByTestId('scheme-preview-overlay');
    expect(overlay).toBeInTheDocument();
    expect(within(overlay).getByText(academicScheme?.name ?? '')).toBeInTheDocument();
    expect(within(overlay).getByText('向下滚动查看完整故事预览')).toBeInTheDocument();
    expect(within(overlay).getByRole('dialog')).toHaveAttribute('aria-modal', 'true');

    const storyCards = within(overlay).getAllByTestId('scheme-preview-story-card');
    expect(storyCards).toHaveLength(academicScheme?.preview.pages.length ?? 0);
    expect(within(overlay).getAllByTestId('mock-scheme-slide-renderer')).toHaveLength(
      storyCards.length
    );
  });
});
