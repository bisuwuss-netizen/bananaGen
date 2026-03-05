import { describe, expect, it } from 'vitest';
import { renderLayoutHTML } from '@/experimental/html-renderer/layouts';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';

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
    ];

    for (const item of cases) {
      const html = renderLayoutHTML(item.layoutId, item.model as any, theme);
      expect(html).toContain(item.expected);
    }
  });
});
