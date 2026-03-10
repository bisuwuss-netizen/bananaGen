import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Home } from '@/pages/Home';
import { getPresetStyles } from '@/config/presetStyles';
import { listUserTemplates } from '@/api/endpoints';
import { useProjectStore } from '@/store/useProjectStore';

const mockNavigate = vi.fn();
const mockInitializeProject = vi.fn();
const mockShow = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/useProjectStore', () => ({
  useProjectStore: vi.fn(),
}));

vi.mock('@/api/endpoints', () => ({
  listUserTemplates: vi.fn(),
  uploadReferenceFile: vi.fn(),
  associateFileToProject: vi.fn(),
  triggerFileParse: vi.fn(),
  uploadMaterial: vi.fn(),
  associateMaterialsToProject: vi.fn(),
}));

vi.mock('@/config/presetStyles', () => ({
  getPresetStyles: vi.fn(),
}));

vi.mock('@/components/shared', () => ({
  Button: ({ children, onClick, disabled, loading, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled || loading} {...props}>
      {children}
    </button>
  ),
  Textarea: React.forwardRef<HTMLTextAreaElement, any>((props, ref) => (
    <textarea ref={ref} {...props} />
  )),
  Card: ({ children }: any) => <div>{children}</div>,
  useToast: () => ({
    show: mockShow,
    ToastContainer: () => <div data-testid="toast-container" />,
  }),
  MaterialGeneratorModal: () => null,
  ReferenceFileList: () => null,
  ReferenceFileSelector: () => null,
  FilePreviewModal: () => null,
  ImagePreviewList: () => null,
  SchemeSelector: ({ value, onChange }: any) => (
    <button type="button" data-testid="scheme-selector" onClick={() => onChange(value)}>
      scheme-selector
    </button>
  ),
}));

vi.mock('@/components/shared/TemplateSelector', () => ({
  TemplateSelector: () => null,
  getTemplateFile: vi.fn(),
}));

vi.mock('@/features/home-characters', () => ({
  HomeCharactersPromptStage: ({ children }: any) => <div>{children}</div>,
}));

describe('Home submit flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    vi.mocked(useProjectStore).mockReturnValue({
      initializeProject: mockInitializeProject,
      isGlobalLoading: false,
    } as any);
    vi.mocked(listUserTemplates).mockResolvedValue({ data: { templates: [] } } as any);
    vi.mocked(getPresetStyles).mockResolvedValue([]);

    mockInitializeProject.mockResolvedValue(undefined);
    (window.localStorage.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentProjectId') return 'new-project-id';
      return null;
    });
  });

  it('creates a fresh project even when last submission matches current content', async () => {
    sessionStorage.setItem('home_activeTab', 'idea');
    sessionStorage.setItem('home_content', '同一份教学主题');
    sessionStorage.setItem('home_selectedSchemeId', 'academic');
    sessionStorage.setItem(
      'home_lastSubmission',
      JSON.stringify({
        content: '同一份教学主题',
        activeTab: 'idea',
        selectedSchemeId: 'academic',
        projectId: 'old-project-id',
      })
    );

    render(<Home />);

    fireEvent.click(await screen.findByRole('button', { name: '下一步' }));

    await waitFor(() => {
      expect(mockInitializeProject).toHaveBeenCalledWith(
        'idea',
        '同一份教学主题',
        undefined,
        undefined,
        'html',
        'academic'
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/project/new-project-id/outline');
    expect(mockNavigate).not.toHaveBeenCalledWith('/project/old-project-id/outline');
  });

  it('keeps both html and image modes available on the home page', async () => {
    render(<Home />);

    expect(screen.getByRole('button', { name: 'HTML 结构化' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Image 图片生成' })).toBeInTheDocument();
    expect(screen.getByText('选择教学模板')).toBeInTheDocument();
    expect(screen.getByTestId('scheme-selector')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Image 图片生成' }));

    await waitFor(() => {
      expect(screen.getByText('选择风格模板')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('scheme-selector')).not.toBeInTheDocument();
  });
});
