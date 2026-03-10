import { describe, expect, it } from 'vitest';

import {
  buildInitialOutlineTaskProgress,
  extractOutlinePreviewTitles,
  getOutlineProgressMessages,
  getOutlineProgressStageText,
  hasConfirmedOutlinePageCount,
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
    expect(progress.page_count_confirmed).toBe(false);
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

  it('humanizes outline generation stage text for the loading panel', () => {
    expect(
      getOutlineProgressStageText({
        total: 8,
        completed: 0,
        current_step: '生成页面结构',
      } as any)
    ).toBe('正在规划整份 PPT 的页面结构和叙事顺序');

    expect(
      getOutlineProgressStageText({
        total: 8,
        completed: 3,
        current_step: '正在生成第 4 页',
      } as any)
    ).toBe('正在生成第 4 页大纲卡片，请稍候');
  });

  it('humanizes outline progress log messages for users', () => {
    expect(
      getOutlineProgressMessages({
        total: 6,
        completed: 3,
        messages: [
          '已读取 2 份已上传资料，正在组织章节结构。',
          '第 3/6 页已完成：研究方法',
        ],
      } as any)
    ).toEqual([
      '已读取 2 份参考资料，正在提炼章节线索。',
      '第 3/6 页大纲已生成：研究方法',
    ]);
  });

  it('only treats page counts as real after the outline structure is confirmed', () => {
    expect(
      hasConfirmedOutlinePageCount({
        total: 5,
        completed: 2,
        current_step: '生成页面结构',
        queued_cards: [{ title: '问题背景' }],
      } as any)
    ).toBe(false);

    expect(
      hasConfirmedOutlinePageCount({
        total: 6,
        completed: 0,
        current_step: '准备逐页写入',
        actual_total_pages: 6,
        page_count_confirmed: true,
      } as any)
    ).toBe(true);
  });
});
