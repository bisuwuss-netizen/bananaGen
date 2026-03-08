import { describe, expect, it } from 'vitest';

import {
  buildInitialOutlineTaskProgress,
  extractOutlinePreviewTitles,
  resolveGeneratedOutlineCards,
  resolveQueuedOutlineCards,
} from '@/utils/outlineProgress';

describe('outlineProgress utils', () => {
  const baseProject = {
    id: 'project-1',
    project_id: 'project-1',
    idea_prompt: 'AI 助手在高校教学中的应用',
    outline_text: '1. 行业背景\n2. 典型场景\n3. 落地方法\n4. 风险与治理',
    description_text: '',
    extra_requirements: '',
    creation_type: 'outline',
    render_mode: 'html',
    scheme_id: 'edu_dark',
    status: 'DRAFT',
    pages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  it('extracts deduplicated preview titles from project input', () => {
    const titles = extractOutlinePreviewTitles(baseProject);
    expect(titles).toEqual(['行业背景', '典型场景', '落地方法', '风险与治理']);
  });

  it('builds an immediate placeholder progress payload for outline generation', () => {
    const progress = buildInitialOutlineTaskProgress(baseProject);

    expect(progress.current_step).toBe('准备生成大纲');
    expect(progress.preview_cards?.length).toBeGreaterThan(0);
    expect(progress.generated_cards).toEqual([]);
    expect(progress.queued_cards?.length).toBeGreaterThan(0);
    expect(progress.preview_cards?.[0].title).toBe('行业背景');
    expect(progress.percent).toBeGreaterThan(0);
    expect(progress.render_mode).toBe('html');
  });

  it('separates generated cards from queued cards', () => {
    const generated = resolveGeneratedOutlineCards(baseProject, {
      total: 4,
      completed: 2,
      generated_cards: [{ title: '封面' }, { title: '行业背景' }],
      queued_cards: [{ title: '落地方法' }, { title: '总结' }],
    } as any);

    const queued = resolveQueuedOutlineCards(baseProject, {
      total: 4,
      completed: 2,
      generated_cards: [{ title: '封面' }, { title: '行业背景' }],
      queued_cards: [{ title: '落地方法' }, { title: '总结' }],
    } as any);

    expect(generated).toHaveLength(2);
    expect(queued).toHaveLength(2);
    expect(generated[0].title).toBe('封面');
    expect(queued[0].title).toBe('落地方法');
  });
});
