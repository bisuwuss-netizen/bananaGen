import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OutlineEditor } from '@/pages/OutlineEditor';
import { useProjectStore } from '@/store/useProjectStore';

const mockNavigate = vi.fn();
const mockGenerateOutline = vi.fn();
const mockSyncProject = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: 'project-1' }),
    useLocation: () => ({ state: { autoStartOutline: true, from: 'knowledge-base' } }),
  };
});

vi.mock('@/store/useProjectStore', () => ({
  useProjectStore: vi.fn(),
}));

vi.mock('@/components/shared', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Loading: ({ message }: any) => <div>{message}</div>,
  useConfirm: () => ({
    confirm: vi.fn(),
    ConfirmDialog: null,
  }),
  useToast: () => ({
    show: vi.fn(),
    ToastContainer: () => null,
  }),
  AiRefineSidebar: () => null,
  FilePreviewModal: () => null,
  ProjectResourcesList: () => null,
}));

vi.mock('@/components/outline/OutlineCard', () => ({
  OutlineCard: () => <div>outline-card</div>,
}));

vi.mock('@/components/outline/OutlineGenerationPanel', () => ({
  OutlineGenerationPanel: () => <div>outline-generation-panel</div>,
}));

describe('OutlineEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: {
        id: 'project-1',
        project_id: 'project-1',
        creation_type: 'outline',
        outline_text: '# 知识库大纲',
        description_text: '',
        idea_prompt: '',
        render_mode: 'html',
        scheme_id: 'edu_dark',
        status: 'DRAFT',
        pages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      syncProject: mockSyncProject,
      updatePageLocal: vi.fn(),
      saveAllPages: vi.fn(),
      reorderPages: vi.fn(),
      deletePageById: vi.fn(),
      addNewPage: vi.fn(),
      generateOutline: mockGenerateOutline,
      isGlobalLoading: false,
      taskProgress: null,
      aiRefineHistory: {},
      setAiRefineHistory: vi.fn(),
    } as any);
  });

  it('auto-starts outline parsing after navigating from knowledge-base creation', async () => {
    render(<OutlineEditor />);

    await waitFor(() => {
      expect(mockGenerateOutline).toHaveBeenCalledTimes(1);
    });
  });
});
