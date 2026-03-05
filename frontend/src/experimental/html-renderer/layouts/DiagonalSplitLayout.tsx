/**
 * 动感斜切布局 - Diagonal Split Layout
 * 设计理念：通过 CSS 线性渐变创造出倾斜的背景分割线，充满动感和现代感
 * 适用场景：两种方法对比、现状与未来对比、优缺点对比
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { DiagonalSplitModel, ThemeConfig } from '../types/schema';

interface DiagonalSplitLayoutProps {
  model: DiagonalSplitModel;
  theme: ThemeConfig;
}

function normalizeDiagonalSplitModel(model: Partial<DiagonalSplitModel>): DiagonalSplitModel {
  if (model.left && model.right) {
    return model as DiagonalSplitModel;
  }
  return {
    left: {
      title: '左侧标题',
      subtitle: '左侧描述',
      description: '',
      accent_color: '#e74c3c',
      points: ['要点一', '要点二'],
    },
    right: {
      title: '右侧标题',
      subtitle: '右侧描述',
      description: '',
      accent_color: '#3498db',
      points: ['要点一', '要点二'],
    },
    background_image: model.background_image,
  };
}

export const DiagonalSplitLayout: React.FC<DiagonalSplitLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeDiagonalSplitModel(model);
  const { left, right, background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    background: background_image
      ? `linear-gradient(115deg, #222f3e 50%, #c8d6e5 50%), url(${background_image})`
      : 'linear-gradient(115deg, #222f3e 50%, #c8d6e5 50%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: theme.fonts.body,
    display: 'flex',
    overflow: 'hidden',
  };

  const leftColumnStyle: React.CSSProperties = {
    flex: 1,
    padding: '80px',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingRight: '120px',
  };

  const rightColumnStyle: React.CSSProperties = {
    flex: 1,
    padding: '80px',
    color: '#222f3e',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingLeft: '120px',
  };

  const renderTitle = (title: string, subtitle: string | undefined, accentColor: string, isLight: boolean) => (
    <>
      <h2 style={{ fontSize: '48px', marginBottom: '30px', borderBottom: `4px solid ${accentColor}`, paddingBottom: '15px', display: 'inline-block', color: isLight ? '#ffffff' : '#222f3e' }}>
        {title.split('<br/>').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < title.split('<br/>').length - 1 && <br />}
          </React.Fragment>
        ))}
      </h2>
      {subtitle && <p style={{ fontSize: '20px', lineHeight: 1.8, color: isLight ? '#c8d6e5' : '#576574' }}>{subtitle}</p>}
    </>
  );

  return (
    <section style={slideStyle}>
      <div style={leftColumnStyle}>
        {renderTitle(left.title, left.subtitle, left.accent_color, true)}
        <ul style={{ marginTop: '30px', paddingLeft: '20px', fontSize: '18px', color: '#c8d6e5', lineHeight: 2 }}>
          {left.points.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </div>

      <div style={rightColumnStyle}>
        {renderTitle(right.title, right.subtitle, right.accent_color, false)}
        <ul style={{ marginTop: '30px', paddingLeft: '20px', fontSize: '18px', color: '#576574', lineHeight: 2 }}>
          {right.points.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export function renderDiagonalSplitLayoutHTML(model: DiagonalSplitModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeDiagonalSplitModel(model);
  const { left, right, background_image } = normalizedModel;

  const slideBg = background_image
    ? `linear-gradient(115deg, #222f3e 50%, #c8d6e5 50%), url(${background_image})`
    : 'linear-gradient(115deg, #222f3e 50%, #c8d6e5 50%)';

  const leftPointsHTML = left.points.map(p => `<li>${p}</li>`).join('\n');
  const rightPointsHTML = right.points.map(p => `<li>${p}</li>`).join('\n');

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; font-family: ${theme.fonts.body}; display: flex; overflow: hidden;">
  <div style="flex: 1; padding: 80px; color: #ffffff; display: flex; flex-direction: column; justify-content: center; padding-right: 120px;">
    <h2 style="font-size: 48px; margin-bottom: 30px; border-bottom: 4px solid ${left.accent_color}; padding-bottom: 15px; display: inline-block; color: #ffffff;">${left.title}</h2>
    ${left.subtitle ? `<p style="font-size: 20px; line-height: 1.8; color: #c8d6e5;">${left.subtitle}</p>` : ''}
    <ul style="margin-top: 30px; padding-left: 20px; font-size: 18px; color: #c8d6e5; line-height: 2;">
      ${leftPointsHTML}
    </ul>
  </div>

  <div style="flex: 1; padding: 80px; color: #222f3e; display: flex; flex-direction: column; justify-content: center; padding-left: 120px;">
    <h2 style="font-size: 48px; margin-bottom: 30px; border-bottom: 4px solid ${right.accent_color}; padding-bottom: 15px; display: inline-block; color: #222f3e;">${right.title}</h2>
    ${right.subtitle ? `<p style="font-size: 20px; line-height: 1.8; color: #576574;">${right.subtitle}</p>` : ''}
    <ul style="margin-top: 30px; padding-left: 20px; font-size: 18px; color: #576574; line-height: 2;">
      ${rightPointsHTML}
    </ul>
  </div>
</section>`;
}

export default DiagonalSplitLayout;
