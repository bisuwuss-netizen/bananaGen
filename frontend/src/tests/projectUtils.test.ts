import { describe, expect, it } from 'vitest';

import type { Project } from '@/types';
import {
  getProjectFailureReason,
  getProjectRoute,
  getProjectSchemeName,
  getStatusText,
} from '@/utils/projectUtils';

const buildProject = (overrides: Partial<Project> = {}): Project => ({
  project_id: 'project-1',
  idea_prompt: '测试项目',
  render_mode: 'html',
  status: 'DESCRIPTIONS_GENERATED',
  pages: [],
  created_at: '2026-03-08T09:00:00Z',
  updated_at: '2026-03-08T09:00:00Z',
  ...overrides,
});

describe('projectUtils history status', () => {
  it('treats completed html projects as completed and routes to preview', () => {
    const project = buildProject({
      pages: [
        {
          page_id: 'page-1',
          order_index: 0,
          outline_content: { title: '封面', points: [] },
          has_description_content: true,
          has_html_model: true,
          status: 'HTML_MODEL_GENERATED',
        },
      ],
    });

    expect(getStatusText(project)).toBe('已完成');
    expect(getProjectRoute(project)).toBe('/project/project-1/preview');
  });

  it('routes html projects without generated content back to detail flow', () => {
    const project = buildProject({
      pages: [
        {
          page_id: 'page-1',
          order_index: 0,
          outline_content: { title: '目录', points: [] },
          has_description_content: false,
          has_html_model: false,
          status: 'DRAFT',
        },
      ],
    });

    expect(getStatusText(project)).toBe('待生成内容');
    expect(getProjectRoute(project)).toBe('/project/project-1/detail');
  });

  it('keeps image projects with descriptions on the detail step', () => {
    const project = buildProject({
      render_mode: 'image',
      pages: [
        {
          page_id: 'page-1',
          order_index: 0,
          outline_content: { title: '正文', points: [] },
          has_description_content: true,
          status: 'DESCRIPTION_GENERATED',
        },
      ],
    });

    expect(getStatusText(project)).toBe('待生成图片');
    expect(getProjectRoute(project)).toBe('/project/project-1/detail');
  });

  it('marks projects with failed latest generation task as failed even without pages', () => {
    const project = buildProject({
      status: 'FAILED',
      latest_generation_task: {
        task_id: 'task-1',
        task_type: 'GENERATE_DESCRIPTIONS',
        status: 'FAILED',
        error_message: 'timed out',
      },
    });

    expect(getStatusText(project)).toBe('生成失败');
    expect(getProjectFailureReason(project)).toBe('请求超时，请稍后重试。');
  });

  it('resolves friendly scheme names for history cards', () => {
    const project = buildProject({ scheme_id: 'interactive' });

    expect(getProjectSchemeName(project)).toBe('课堂互动型');
  });
});
