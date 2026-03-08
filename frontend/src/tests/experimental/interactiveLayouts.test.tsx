import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { normalizeLayoutId, renderLayoutHTML } from '@/experimental/html-renderer/layouts';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';
import { SlideRenderer } from '@/experimental/html-renderer/components/SlideRenderer';

describe('interactive scheme layout mapping', () => {
  const theme = getThemeByScheme('interactive');

  it('normalizes interactive raw layout ids to vocational renderers', () => {
    expect(normalizeLayoutId('group_collab' as any)).toBe('vocational_bullets');
    expect(normalizeLayoutId('case_discussion' as any)).toBe('vocational_content');
    expect(normalizeLayoutId('feedback_poll' as any)).toBe('vocational_content');
  });

  it('renders interactive content layouts in HTML export without unknown fallback', () => {
    const html = renderLayoutHTML(
      'case_discussion' as any,
      {
        title: '案例研讨：建模返工复盘',
        content: [
          '模型返工通常发生在拓扑规划不足或布线策略失衡时。',
          '复盘时需要同时看问题表现、修改动作和结果验证。',
        ],
        highlight: '先定位拓扑瓶颈，再决定是否返工。',
      } as any,
      theme,
    );

    expect(html).toContain('案例研讨：建模返工复盘');
    expect(html).not.toContain('未知布局类型');
  });

  it('renders group_collab in SlideRenderer without falling back to unknown layout', () => {
    const page = {
      page_id: 'p-interactive-bullets',
      order_index: 1,
      layout_id: 'group_collab' as const,
      model: {
        title: '协作任务：分组设计概念机甲',
        subtitle: '从拓扑逻辑到工业级协同实战。',
        bullets: [
          { text: '角色分工与职责界定。', description: '明确主模、细化与贴图岗位。' },
          { text: '时间节点与流程控制。', description: '里程碑需要和验收节点绑定。' },
        ],
        keyTakeaway: '协作效率来自清晰分工与统一质量标准。',
      },
    };

    const { getByText, queryByText } = render(
      React.createElement(SlideRenderer, { page: page as any, theme }),
    );

    expect(getByText('协作任务：分组设计概念机甲')).toBeTruthy();
    expect(getByText('角色分工与职责界定。')).toBeTruthy();
    expect(queryByText(/未知布局类型/)).toBeNull();
  });

  it('renders feedback_poll in SlideRenderer through vocational content mapping', () => {
    const page = {
      page_id: 'p-interactive-content',
      order_index: 2,
      layout_id: 'feedback_poll' as const,
      model: {
        title: '即时反馈：学习痛点收集',
        content: [
          '请分享当前最难掌握的环节，以及你最希望获得的工具支持。',
          '反馈将用于调整下一轮案例讲解与练习节奏。',
        ],
        highlight: '识别痛点是优化工作流的第一步。',
      },
    };

    const { getByText, queryByText } = render(
      React.createElement(SlideRenderer, { page: page as any, theme }),
    );

    expect(getByText('即时反馈：学习痛点收集')).toBeTruthy();
    expect(getByText(/识别痛点是优化工作流的第一步/)).toBeTruthy();
    expect(queryByText(/未知布局类型/)).toBeNull();
  });
});
