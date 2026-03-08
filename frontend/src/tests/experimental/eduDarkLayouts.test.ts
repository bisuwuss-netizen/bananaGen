import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { renderLayoutHTML } from '@/experimental/html-renderer/layouts';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';
import { SlideRenderer } from '@/experimental/html-renderer/components/SlideRenderer';

describe('edu dark layouts html render', () => {
  const theme = getThemeByScheme('edu_dark');

  it('renders all edu dark layouts', () => {
    const cases: Array<{ layoutId: any; model: Record<string, unknown>; expected: string }> = [
      {
        layoutId: 'edu_cover',
        model: { title: '封面测试', subtitle: '副标题' },
        expected: '封面测试',
      },
      {
        layoutId: 'edu_toc',
        model: { title: '目录测试', items: [{ index: 1, text: '章节一' }] },
        expected: '章节一',
      },
      {
        layoutId: 'edu_tri_compare',
        model: {
          title: '三栏测试',
          columns: [
            { title: 'A', points: ['a1'] },
            { title: 'B', points: ['b1'] },
            { title: 'C', points: ['c1'] },
          ],
        },
        expected: '三栏测试',
      },
      {
        layoutId: 'edu_core_hub',
        model: {
          title: '模型测试',
          center_label: '中心',
          nodes: [{ title: '节点1' }, { title: '节点2' }],
        },
        expected: '中心',
      },
      {
        layoutId: 'edu_timeline_steps',
        model: {
          title: '时间轴测试',
          steps: [{ title: '步骤1', description: '描述1' }],
        },
        expected: '步骤1',
      },
      {
        layoutId: 'edu_logic_flow',
        model: {
          title: '流程测试',
          stages: [{ title: '阶段1', description: '说明1' }],
        },
        expected: '阶段1',
      },
      {
        layoutId: 'edu_data_board',
        model: {
          title: '数据测试',
          metrics: [{ value: '+1%', label: '指标' }],
          bars: [{ label: '维度', baseline: 40, current: 60 }],
        },
        expected: '数据测试',
      },
      {
        layoutId: 'edu_summary',
        model: {
          title: '总结测试',
          columns: [{ title: '列1', points: ['点1'] }],
        },
        expected: '总结测试',
      },
      {
        layoutId: 'edu_qa_case',
        model: {
          title: '问答字段映射测试',
          question: '什么是拓扑优化？',
          answer: '在约束下求最优材料分布的方法。',
          analysis: [
            { title: '分析维度1', content: '需考虑约束与目标函数。' },
            { title: '分析维度2', content: '要平衡质量与刚度表现。' },
          ],
          conclusion: '先建模再验证，避免主观结论。',
          variant: 'd',
        },
        expected: '什么是拓扑优化？',
      },
    ];

    for (const item of cases) {
      const html = renderLayoutHTML(item.layoutId, item.model as any, theme);
      expect(html).toContain(item.expected);
    }
  });

  it('renders edu_qa_case in SlideRenderer without falling back to unknown layout', () => {
    const page = {
      page_id: 'p-edu-qa-case',
      order_index: 1,
      layout_id: 'edu_qa_case' as const,
      model: {
        title: '问答测试',
        question: '为什么会出现卡顿？',
        answer: '主要由资源抢占和配置冲突导致。',
        analysis: [
          { title: '根因分析', content: 'GPU 显存占用过高导致响应延迟。' },
        ],
        conclusion: '先排查瓶颈再调优配置。',
        variant: 'd',
      },
    };

    const { getByText, queryByText } = render(
      React.createElement(SlideRenderer, { page: page as any, theme })
    );

    expect(getByText('为什么会出现卡顿？')).toBeTruthy();
    expect(getByText('主要由资源抢占和配置冲突导致。')).toBeTruthy();
    expect(queryByText('这是一个示例问题？')).toBeNull();
    expect(queryByText(/未知布局类型/)).toBeNull();
  });
});
