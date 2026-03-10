import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SlideCard } from '@/components/preview/SlideCard';

vi.mock('@/components/shared', () => ({
  StatusBadge: ({ status }: any) => <div>{status}</div>,
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
  useConfirm: () => ({
    confirm: vi.fn(),
    ConfirmDialog: <div data-testid="confirm-dialog" />,
  }),
}));

vi.mock('@/api/client', () => ({
  getImageUrl: (path: string) => path,
}));

describe('SlideCard', () => {
  it('shows a retry action for failed pages without generated images', () => {
    const onRetry = vi.fn();

    render(
      <SlideCard
        page={{
          id: 'page-1',
          page_id: 'page-1',
          status: 'FAILED',
          generated_image_path: '',
          outline_content: { title: '目录页' },
        } as any}
        index={1}
        isSelected={false}
        onClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '再次生成' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
