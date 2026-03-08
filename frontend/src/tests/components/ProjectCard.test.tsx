import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectCard } from '@/components/history/ProjectCard';
import type { Project } from '@/types';

vi.mock('@/experimental/html-renderer/components/SlideRenderer', () => ({
  SlideRenderer: () => <div data-testid="mock-slide-renderer">html preview</div>,
}));

const buildProject = (overrides: Partial<Project> = {}): Project => ({
  project_id: 'project-1',
  idea_prompt: 'HTML 历史项目',
  render_mode: 'html',
  status: 'DESCRIPTIONS_GENERATED',
  scheme_id: 'edu_dark',
  pages: [],
  created_at: '2026-03-08T09:00:00Z',
  updated_at: '2026-03-08T09:00:00Z',
  ...overrides,
});

describe('ProjectCard preview', () => {
  it('renders html preview for html projects with preview page data', async () => {
    const project = buildProject({
      preview_page: {
        page_id: 'page-1',
        order_index: 0,
        outline_content: { title: '封面', points: [] },
        layout_id: 'edu_cover',
        html_model: { title: '封面' } as any,
        status: 'HTML_MODEL_GENERATED',
      },
    });

    render(
      <ProjectCard
        project={project}
        isSelected={false}
        isEditing={false}
        editingTitle=""
        onSelect={vi.fn()}
        onToggleSelect={vi.fn()}
        onDelete={vi.fn()}
        onStartEdit={vi.fn()}
        onTitleChange={vi.fn()}
        onTitleKeyDown={vi.fn()}
        onSaveEdit={vi.fn()}
        isBatchMode={false}
      />
    );

    expect(await screen.findByTestId('project-html-preview')).toBeInTheDocument();
    expect(screen.getByTestId('project-html-preview-frame')).toBeInTheDocument();
    expect(screen.getByTestId('mock-slide-renderer')).toBeInTheDocument();
    expect(screen.getByText('模板系列: 深色教育型')).toBeInTheDocument();
  });

  it('shows friendly failure reason when latest generation task failed', () => {
    const project = buildProject({
      status: 'FAILED',
      latest_generation_task: {
        task_id: 'task-1',
        task_type: 'GENERATE_IMAGES',
        status: 'FAILED',
        error_message: 'timeout',
      },
    });

    render(
      <ProjectCard
        project={project}
        isSelected={false}
        isEditing={false}
        editingTitle=""
        onSelect={vi.fn()}
        onToggleSelect={vi.fn()}
        onDelete={vi.fn()}
        onStartEdit={vi.fn()}
        onTitleChange={vi.fn()}
        onTitleKeyDown={vi.fn()}
        onSaveEdit={vi.fn()}
        isBatchMode={false}
      />
    );

    expect(screen.getByText('生成失败')).toBeInTheDocument();
    expect(screen.getByText('失败原因: 请求超时，请稍后重试。')).toBeInTheDocument();
  });
});
