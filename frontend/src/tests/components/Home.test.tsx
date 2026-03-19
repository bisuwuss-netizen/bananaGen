import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Home } from '@/pages/Home';
import { getPresetStyles } from '@/config/presetStyles';
import { listUserTemplates } from '@/api/endpoints';
import { useProjectStore } from '@/store/useProjectStore';

const { mockUseProjectStore, mockGetState } = vi.hoisted(() => {
  const getState = vi.fn();
  const useProjectStore = Object.assign(vi.fn(), {
    getState,
  });
  return {
    mockUseProjectStore: useProjectStore,
    mockGetState: getState,
  };
});

const mockNavigate = vi.fn();
const mockInitializeProject = vi.fn();
const mockSetCurrentProject = vi.fn();
const mockShow = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/useProjectStore', () => ({
  useProjectStore: mockUseProjectStore,
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
      setCurrentProject: mockSetCurrentProject,
      currentProject: null,
      isGlobalLoading: false,
    } as any);
    mockGetState.mockReturnValue({
      currentProject: { id: 'new-project-id' },
    });
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

  it('keeps the teaching template and material entry available on the home page', async () => {
    render(<Home />);

    expect(screen.getAllByRole('button', { name: '素材生成' }).length).toBeGreaterThan(0);
    expect(screen.getByText('选择教学模板')).toBeInTheDocument();
    expect(screen.getByTestId('scheme-selector')).toBeInTheDocument();
  });
});
