import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage';
import { listRecoverableTasks, upsertRecoverableTask, watchRecoverableTask } from '@/store/projectStore/taskRecovery';
import {
  createProjectFromKnowledgeBase,
  listKnowledgeBaseFiles,
  startKnowledgeBaseOutlineTask,
} from '@/api/endpoints';

const mockNavigate = vi.fn();
const mockShow = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/api/endpoints', () => ({
  listKnowledgeBaseFiles: vi.fn(),
  uploadKnowledgeBaseDoc: vi.fn(),
  deleteKnowledgeBaseFile: vi.fn(),
  parseKnowledgeBaseFile: vi.fn(),
  startKnowledgeBaseOutlineTask: vi.fn(),
  createProjectFromKnowledgeBase: vi.fn(),
}));

vi.mock('@/store/projectStore/taskRecovery', () => ({
  listRecoverableTasks: vi.fn(),
  upsertRecoverableTask: vi.fn(),
  removeRecoverableTask: vi.fn(),
  watchRecoverableTask: vi.fn(),
}));

vi.mock('@/components/shared', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  useToast: () => ({
    show: mockShow,
    ToastContainer: () => <div data-testid="toast-container" />,
  }),
  ReferenceFileCard: ({ file }: any) => <div>{file.filename}</div>,
}));

describe('KnowledgeBasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    vi.mocked(listRecoverableTasks).mockReturnValue([]);
    vi.mocked(listKnowledgeBaseFiles).mockResolvedValue([
      {
        id: 'file-1',
        project_id: null,
        filename: 'sample.pdf',
        file_size: 1024,
        file_type: 'pdf',
        parse_status: 'completed',
        markdown_content: '# sample',
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ] as any);
    vi.mocked(startKnowledgeBaseOutlineTask).mockResolvedValue({
      task_id: 'kb-task-1',
      status: 'PENDING',
    } as any);
    vi.mocked(createProjectFromKnowledgeBase).mockResolvedValue({
      data: {
        project_id: 'project-1',
        status: 'DRAFT',
      },
    } as any);
    vi.mocked(watchRecoverableTask).mockImplementation(({ onMessage }: any) => {
      void onMessage({
        task_id: 'kb-task-1',
        status: 'COMPLETED',
        task_type: 'GENERATE_KNOWLEDGE_BASE_OUTLINE',
        progress: {
          outline_text: '# 研究汇报\n\n## 背景\n- 要点',
          current_step: '已完成',
        },
      });
      return {
        completion: Promise.resolve(),
        close: vi.fn(),
      };
    });
  });

  it('creates the project directly from the knowledge-base outline and keeps reference file ids', async () => {
    render(<KnowledgeBasePage />);

    fireEvent.click(await screen.findByRole('button', { name: '生成大纲' }));

    await waitFor(() => {
      expect(startKnowledgeBaseOutlineTask).toHaveBeenCalledWith(
        ['file-1'],
        undefined,
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '使用此大纲创建 PPT' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '使用此大纲创建 PPT' }));

    await waitFor(() => {
      expect(createProjectFromKnowledgeBase).toHaveBeenCalledWith({
        outlineText: '# 研究汇报\n\n## 背景\n- 要点',
        referenceFileIds: ['file-1'],
        renderMode: 'html',
        schemeId: 'edu_dark',
      });
    });

    expect(upsertRecoverableTask).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/project/project-1/outline', {
      state: { autoStartOutline: true, from: 'knowledge-base' },
    });
  });
});
