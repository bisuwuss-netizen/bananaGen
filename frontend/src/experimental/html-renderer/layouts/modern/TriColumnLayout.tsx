/**
 * 三柱支撑布局 - Tri-Column Layout
 * 设计理念：将页面平分为三列，每列代表一个"支柱"或"维度"
 * 适用场景：三大特点、三个步骤、三类人群、三种模式
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { TriColumnModel, ThemeConfig } from '../../types/schema';
import { getBaseSlideStyle } from '../../utils/styleHelper';

interface TriColumnLayoutProps {
  model: TriColumnModel;
  theme: ThemeConfig;
}

function normalizeTriColumnModel(model: Partial<TriColumnModel> & { bullets?: Array<{ text?: string; description?: string }> }): TriColumnModel {
  if (model.columns && Array.isArray(model.columns) && model.columns.length > 0) {
    return model as TriColumnModel;
  }
  if (model.bullets && Array.isArray(model.bullets)) {
    return {
      title: model.title || '三大要素',
      columns: model.bullets.slice(0, 3).map((b, idx) => ({
        number: idx + 1,
        title: typeof b === 'string' ? b : (b.text || '要素'),
        description: typeof b === 'object' ? (b.description || '') : '',
        accent_color: ['#3498db', '#e74c3c', '#2ecc71'][idx % 3],
      })),
      background_image: model.background_image,
    };
  }
  return {
    title: model.title || '三大要素',
    columns: [
      { number: 1, title: '要素一', description: '详细描述', accent_color: '#3498db' },
      { number: 2, title: '要素二', description: '详细描述', accent_color: '#e74c3c' },
      { number: 3, title: '要素三', description: '详细描述', accent_color: '#2ecc71' },
    ],
    background_image: model.background_image,
  };
}

export const TriColumnLayout: React.FC<TriColumnLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeTriColumnModel(model);
  const { title, columns, background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#f4f6f9',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: theme.fonts.body,
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    color: '#333',
    marginBottom: '60px',
    fontWeight: 'bold',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '40px',
    width: '1100px',
    height: '450px',
  };

  return (
    <section style={slideStyle}>
      <h2 style={titleStyle}>{title}</h2>

      <div style={containerStyle}>
        {columns.map((column, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              background: '#fff',
              borderTop: `6px solid ${column.accent_color}`,
              padding: '40px 30px',
              boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                color: column.accent_color,
                marginBottom: '20px',
                fontWeight: 'bold',
              }}
            >
              {String(column.number).padStart(2, '0')}
            </div>
            <h3
              style={{
                fontSize: '22px',
                color: '#333',
                margin: '0 0 20px 0',
              }}
            >
              {column.title}
            </h3>
            <p
              style={{
                fontSize: '16px',
                color: '#666',
                lineHeight: 1.6,
              }}
            >
              {column.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export function renderTriColumnLayoutHTML(model: TriColumnModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeTriColumnModel(model);
  const { title, columns, background_image } = normalizedModel;

  const slideBg = background_image
    ? `url(${background_image})`
    : '#f4f6f9';

  const columnsHTML = columns
    .map((column) => {
      const numStr = String(column.number).padStart(2, '0');
      return `
      <div style="flex: 1; background: #fff; border-top: 6px solid ${column.accent_color}; padding: 40px 30px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column; align-items: center; text-align: center;">
        <div style="font-size: 48px; color: ${column.accent_color}; margin-bottom: 20px; font-weight: bold;">${numStr}</div>
        <h3 style="font-size: 22px; color: #333; margin: 0 0 20px 0;">${column.title}</h3>
        <p style="font-size: 16px; color: #666; line-height: 1.6;">${column.description}</p>
      </div>`;
    })
    .join('\n');

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; font-family: ${theme.fonts.body}; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
  <h2 style="font-size: 36px; color: #333; margin-bottom: 60px; font-weight: bold;">${title}</h2>

  <div style="display: flex; gap: 40px; width: 1100px; height: 450px;">
    ${columnsHTML}
  </div>
</section>`;
}

export default TriColumnLayout;
