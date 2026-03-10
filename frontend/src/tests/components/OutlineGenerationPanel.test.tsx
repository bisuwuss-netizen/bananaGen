import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OutlineGenerationPanel } from '@/components/outline/OutlineGenerationPanel';

vi.mock('@/components/shared', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

describe('OutlineGenerationPanel', () => {
  const baseProject = {
    id: 'project-1',
    project_id: 'project-1',
    idea_prompt: '生成一份关于 3D 建模基础教学的课程讲解 PPT',
    outline_text: '',
    description_text: '',
    extra_requirements: '',
    creation_type: 'idea',
    render_mode: 'html',
    scheme_id: 'academic',
    status: 'DRAFT',
    pages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  it('does not show guessed page counts before the actual outline size is known', () => {
    render(
      <OutlineGenerationPanel
        project={baseProject}
        progress={{
          total: 5,
          completed: 2,
          percent: 38,
          current_step: '生成页面结构',
          messages: ['正在调用 AI 规划页面结构与叙事顺序。'],
          generated_cards: [],
          queued_cards: [{ title: '课程目标', status: 'planning' }],
          page_count_confirmed: false,
          render_mode: 'html',
        }}
      />
    );

    expect(screen.getByText('待确定')).toBeInTheDocument();
    expect(screen.getByText('待规划 · HTML 结构化')).toBeInTheDocument();
    expect(screen.getByText('页数规划中')).toBeInTheDocument();
    expect(screen.getByText('正在规划的页面结构')).toBeInTheDocument();
    expect(screen.getByText('结构确定后再显示真实页数')).toBeInTheDocument();
  });

  it('shows real counts after the actual outline size is confirmed', () => {
    render(
      <OutlineGenerationPanel
        project={baseProject}
        progress={{
          total: 6,
          completed: 2,
          percent: 52,
          current_step: '正在生成第 3 页',
          messages: ['第 2/6 页已完成：课程目标'],
          generated_cards: [
            { title: '封面', status: 'ready' },
            { title: '课程目标', status: 'ready' },
          ],
          queued_cards: [
            { title: '核心概念', status: 'planning' },
            { title: '建模流程', status: 'planning' },
            { title: '案例演示', status: 'planning' },
            { title: '课堂总结', status: 'planning' },
          ],
          actual_total_pages: 6,
          page_count_confirmed: true,
          render_mode: 'html',
        }}
      />
    );

    expect(screen.getByText('2/6 已完成')).toBeInTheDocument();
    expect(screen.getByText('6 · HTML 结构化')).toBeInTheDocument();
    expect(screen.getByText('排队中的页面')).toBeInTheDocument();
    expect(screen.getByText('4 张')).toBeInTheDocument();
  });
});
