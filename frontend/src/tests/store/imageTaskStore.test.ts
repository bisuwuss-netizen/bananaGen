import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectStore } from '@/store/useProjectStore';
import * as api from '@/api/endpoints';
import { openTaskWebSocket } from '@/api/client';

vi.mock('@/api/endpoints', () => ({
  getProject: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  openTaskWebSocket: vi.fn(),
}));

describe('image task progress store handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { result } = renderHook(() => useProjectStore());
    act(() => {
      result.current.setCurrentProject(null);
      result.current.setError(null);
      result.current.setGlobalLoading(false);
    });
  });

  it('clears finished and failed pages from the generating map before the batch ends', async () => {
    const { result } = renderHook(() => useProjectStore());
    const project = {
      id: 'project-1',
      project_id: 'project-1',
      status: 'DESCRIPTIONS_GENERATED',
      render_mode: 'image',
      pages: [
        { id: 'page-1', page_id: 'page-1', status: 'GENERATING', outline_content: { title: '封面' } },
        { id: 'page-2', page_id: 'page-2', status: 'GENERATING', outline_content: { title: '目录' } },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;

    vi.mocked(api.getProject).mockResolvedValue({ data: project } as any);

    let wsCallbacks: any;
    vi.mocked(openTaskWebSocket).mockImplementation((_projectId, _taskId, callbacks) => {
      wsCallbacks = callbacks;
      return { close: vi.fn() } as any;
    });

    act(() => {
      result.current.setCurrentProject(project);
      useProjectStore.setState({
        pageGeneratingTasks: {
          'page-1': 'task-1',
          'page-2': 'task-1',
        },
      });
    });

    await act(async () => {
      result.current.pollImageTask('task-1', ['page-1', 'page-2']);
    });

    await act(async () => {
      await wsCallbacks.onMessage({
        task_id: 'task-1',
        status: 'PROCESSING',
        progress: {
          total: 2,
          completed: 1,
          failed: 1,
          completed_page_ids: ['page-1'],
          failed_page_ids: ['page-2'],
        },
      });
    });

    expect(result.current.pageGeneratingTasks).toEqual({});
  });
});
