import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Home } from '@/pages/Home';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/useProjectStore', () => ({
  useProjectStore: () => ({
    initializeProject: vi.fn(),
    isGlobalLoading: false,
  }),
}));

vi.mock('@/api/endpoints', () => ({
  listUserTemplates: vi.fn().mockResolvedValue({ data: { templates: [] } }),
  uploadReferenceFile: vi.fn(),
  associateFileToProject: vi.fn(),
  triggerFileParse: vi.fn(),
  uploadMaterial: vi.fn(),
  associateMaterialsToProject: vi.fn(),
}));

vi.mock('@/config/presetStyles', () => ({
  getPresetStyles: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/features/home-characters', () => ({
  HomeCharactersPromptStage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/shared/TemplateSelector', () => ({
  TemplateSelector: () => <div data-testid="template-selector">模板选择器</div>,
  getTemplateFile: vi.fn(),
}));

vi.mock('@/components/shared', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  Textarea: React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
  >((props, ref) => <textarea ref={ref} {...props} />),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useToast: () => ({
    show: vi.fn(),
    ToastContainer: () => null,
  }),
  MaterialGeneratorModal: () => null,
  ReferenceFileList: () => null,
  ReferenceFileSelector: () => null,
  FilePreviewModal: () => null,
  ImagePreviewList: () => null,
  SchemeSelector: ({ value }: { value?: string }) => (
    <div data-testid="scheme-selector">{value || 'scheme'}</div>
  ),
}));

describe('Home render mode selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('在首页提供中文模式切换，并随模式切换模板区域文案', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /可编辑模式/ })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /图像模式/ })).toBeInTheDocument();
    expect(screen.getByText('选择教学模板')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /图像模式/ }));
    expect(screen.getByText('选择风格模板')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /可编辑模式/ }));
    expect(screen.getByText('选择教学模板')).toBeInTheDocument();
  });
});
