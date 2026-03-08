import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { getThemeByScheme } from '@/experimental/html-renderer/themes';
import {
  TwoColumnLayout,
  renderTwoColumnLayoutHTML,
} from '@/experimental/html-renderer/layouts/common';
import { renderTitleBulletsLayoutHTML } from '@/experimental/html-renderer/layouts/common';

describe('layout text coverage', () => {
  const theme = getThemeByScheme('tech_blue');

  it('renders two_column bullets and descriptions even when type is missing', () => {
    const model = {
      title: '目录 / 议程规划：案例复盘',
      left: {
        header: '问题与解决方案',
        content: '左栏导语',
        bullets: [
          { text: '左栏要点1', description: '左栏要点1说明' },
          { text: '左栏要点2', description: '左栏要点2说明' },
        ],
      },
      right: {
        header: '结果与启示',
        content: '右栏导语',
        bullets: [
          { text: '右栏要点1', description: '右栏要点1说明' },
          { text: '右栏要点2', description: '右栏要点2说明' },
        ],
      },
    };

    const { getByText } = render(<TwoColumnLayout model={model as any} theme={theme} />);
    expect(getByText('左栏导语')).toBeTruthy();
    expect(getByText('左栏要点1')).toBeTruthy();
    expect(getByText('左栏要点1说明')).toBeTruthy();
    expect(getByText('右栏导语')).toBeTruthy();
    expect(getByText('右栏要点1')).toBeTruthy();
    expect(getByText('右栏要点1说明')).toBeTruthy();

    const html = renderTwoColumnLayoutHTML(model as any, theme);
    expect(html).toContain('左栏导语');
    expect(html).toContain('左栏要点1');
    expect(html).toContain('左栏要点1说明');
    expect(html).toContain('右栏导语');
    expect(html).toContain('右栏要点1');
    expect(html).toContain('右栏要点1说明');
  });

  it('renders title_bullets advanced fields in html export', () => {
    const model = {
      title: '核心能力拆解',
      subtitle: '关键知识点',
      bullets: [
        {
          text: '流程标准化',
          description: '统一模板和命名规则',
          example: '项目A落地后返工率下降',
          note: '先统一规范再做自动化',
          dataPoint: { value: '35%', unit: '效率提升' },
        },
      ],
      keyTakeaway: '先标准化，再规模化。',
    };

    const html = renderTitleBulletsLayoutHTML(model as any, theme);
    expect(html).toContain('流程标准化');
    expect(html).toContain('统一模板和命名规则');
    expect(html).toContain('项目A落地后返工率下降');
    expect(html).toContain('先统一规范再做自动化');
    expect(html).toContain('35%');
    expect(html).toContain('效率提升');
    expect(html).toContain('先标准化，再规模化。');
  });
});
