/**
 * 科技深色分割布局 - Dark Math Layout
 * 设计理念：深色背景提升专业感和科技感，亮色边框突出公式
 * 适用场景：数学公式、硬核概念、技术原理
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { DarkMathModel, ThemeConfig } from '../types/schema';
import { getBaseSlideStyle } from '../utils/styleHelper';

interface DarkMathLayoutProps {
  model: DarkMathModel;
  theme: ThemeConfig;
}

/**
 * 数据规范化函数 - 处理后端返回的不匹配数据格式
 */
function normalizeDarkMathModel(model: Partial<DarkMathModel> & { content?: string[]; highlight?: string }): DarkMathModel {
  if (model.formulas && Array.isArray(model.formulas) && model.formulas.length > 0) {
    return model as DarkMathModel;
  }
  const content = model.content || [];
  const contentText = Array.isArray(content) ? content.join(' ') : String(content);
  return {
    title: model.title || '理论标题',
    subtitle: model.subtitle,
    description: contentText || '理论描述内容',
    note: model.highlight,
    formulas: [{ label: '公式', latex: 'E = mc^2', explanation: '示例公式' }],
    background_image: model.background_image,
  };
}

export const DarkMathLayout: React.FC<DarkMathLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeDarkMathModel(model);
  const { title, subtitle, description, note, formulas, background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    padding: '60px 80px',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: theme.fonts.body,
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '50px',
    borderLeft: '8px solid #0f3460',
    paddingLeft: '20px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '48px',
    margin: 0,
    fontWeight: 'normal',
    letterSpacing: '2px',
    color: '#ffffff',
  };

  const accentTextStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#e94560',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '18px',
    color: '#a0a0a0',
    margin: '10px 0 0 0',
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    height: '100%',
    gap: '60px',
  };

  const leftColumnStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '20px',
    lineHeight: 1.8,
    color: '#dcdcdc',
    textAlign: 'justify',
  };

  const noteStyle: React.CSSProperties = {
    marginTop: '30px',
    padding: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    border: '1px dashed #444',
    fontSize: '16px',
    color: '#dcdcdc',
  };

  const rightColumnStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    justifyContent: 'center',
  };

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          {title.split(/(\*\*.*?\*\*)/).map((part, index) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <span key={index} style={accentTextStyle}>
                {part.slice(2, -2)}
              </span>
            ) : (
              part
            )
          )}
        </h1>
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      </div>

      <div style={contentStyle}>
        <div style={leftColumnStyle}>
          <p
            style={descriptionStyle}
            dangerouslySetInnerHTML={{
              __html: description
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #e94560;">$1</strong>'),
            }}
          />
          {note && (
            <div style={noteStyle}>
              <span style={{ color: '#e94560', fontWeight: 'bold' }}>注意：</span>
              {note}
            </div>
          )}
        </div>

        <div style={rightColumnStyle}>
          {formulas.map((formula, index) => (
            <div
              key={index}
              style={{
                background: '#16213e',
                padding: '30px',
                borderRadius: '12px',
                border: '1px solid #0f3460',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '20px',
                  background: '#e94560',
                  padding: '2px 12px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  color: '#fff',
                }}
              >
                {formula.label}
              </div>
              <div
                style={{
                  fontFamily: "'Times New Roman', serif",
                  fontSize: '24px',
                  textAlign: 'center',
                  color: '#fff',
                  marginBottom: '10px',
                }}
              >
                {formula.latex}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                  textAlign: 'center',
                }}
              >
                {formula.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export function renderDarkMathLayoutHTML(model: DarkMathModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeDarkMathModel(model);
  const { title, subtitle, description, note, formulas, background_image } = normalizedModel;

  const slideBg = background_image
    ? `url(${background_image})`
    : '#1a1a2e';

  const formattedTitle = title
    .replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: bold; color: #e94560;">$1</span>');

  const formattedDescription = description
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #e94560;">$1</strong>');

  const formulasHTML = formulas
    .map(
      (formula) => `
    <div style="background: #16213e; padding: 30px; border-radius: 12px; border: 1px solid #0f3460; box-shadow: 0 8px 20px rgba(0,0,0,0.3); position: relative;"
    >
      <div style="position: absolute; top: -12px; left: 20px; background: #e94560; padding: 2px 12px; font-size: 12px; border-radius: 4px; font-weight: bold; color: #fff;"
      >${formula.label}</div>
      <div style="font-family: 'Times New Roman', serif; font-size: 24px; text-align: center; color: #fff; margin-bottom: 10px;"
      >${formula.latex}</div>
      <div style="font-size: 14px; color: #666; text-align: center;"
      >${formula.explanation}</div>
    </div>
  `
    )
    .join('\n');

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; color: #ffffff; font-family: ${theme.fonts.body}; padding: 60px 80px; display: flex; flex-direction: column; box-sizing: border-box;"
>
  <div style="margin-bottom: 50px; border-left: 8px solid #0f3460; padding-left: 20px;"
  >
    <h1 style="font-size: 48px; margin: 0; font-weight: normal; letter-spacing: 2px; color: #ffffff;"
    >${formattedTitle}</h1>
    ${subtitle ? `<p style="font-size: 18px; color: #a0a0a0; margin: 10px 0 0 0;"
    >${subtitle}</p>` : ''}
  </div>

  <div style="display: flex; height: 100%; gap: 60px;"
  >
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;"
    >
      <p style="font-size: 20px; line-height: 1.8; color: #dcdcdc; text-align: justify;"
      >${formattedDescription}</p>
      ${note ? `
      <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px dashed #444; font-size: 16px; color: #dcdcdc;"
      >
        <span style="color: #e94560; font-weight: bold;"
        >注意：</span>${note}
      </div>` : ''}
    </div>

    <div style="flex: 1; display: flex; flex-direction: column; gap: 30px; justify-content: center;"
    >
      ${formulasHTML}
    </div>
  </div>
</section>`;
}

export default DarkMathLayout;
