/**
 * 矩阵宫格布局 - Grid Matrix Layout
 * 设计理念：利用CSS Grid将页面划分为整齐的卡片区块，信息密度高且有条理
 * 适用场景：多点并列展示、软件功能对比、特性清单
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { GridMatrixModel, ThemeConfig } from '../types/schema';
import { getBaseSlideStyle } from '../utils/styleHelper';

interface GridMatrixLayoutProps {
  model: GridMatrixModel;
  theme: ThemeConfig;
}

function normalizeGridMatrixModel(model: Partial<GridMatrixModel> & { bullets?: Array<{ text?: string; description?: string }> }): GridMatrixModel {
  if (model.items && Array.isArray(model.items) && model.items.length > 0) {
    return model as GridMatrixModel;
  }
  if (model.bullets && Array.isArray(model.bullets)) {
    return {
      title: model.title || '特性矩阵',
      subtitle: model.subtitle,
      items: model.bullets.map((b) => ({
        title: typeof b === 'string' ? b : (b.text || '特性'),
        description: typeof b === 'object' ? (b.description || '') : '',
        accent_color: '#6c5ce7',
      })),
      background_image: model.background_image,
    };
  }
  return {
    title: model.title || '特性矩阵',
    subtitle: model.subtitle,
    items: [
      { title: '特性一', description: '详细描述', accent_color: '#6c5ce7' },
      { title: '特性二', description: '详细描述', accent_color: '#e74c3c' },
      { title: '特性三', description: '详细描述', accent_color: '#27ae60' },
      { title: '特性四', description: '详细描述', accent_color: '#f39c12' },
    ],
    background_image: model.background_image,
  };
}

export const GridMatrixLayout: React.FC<GridMatrixLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeGridMatrixModel(model);
  const { title, subtitle, items, background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#f8f9fa',
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
    textAlign: 'center',
    marginBottom: '50px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    color: '#333',
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#888',
    marginTop: '10px',
  };

  const gridStyle: React.CSSProperties = {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: items.length > 2 ? '1fr 1fr' : '1fr',
    gap: '40px',
  };

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>{title}</h2>
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      </div>

      <div style={gridStyle}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              borderTop: `4px solid ${item.accent_color || '#6c5ce7'}`,
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '15px',
              }}
            >
              {item.title}
            </div>
            <p
              style={{
                fontSize: '16px',
                color: '#666',
                lineHeight: 1.6,
                flex: 1,
              }}
              dangerouslySetInnerHTML={{
                __html: item.description.replace(
                  /\*\*(.*?)\*\*/g,
                  `<strong style="color: ${item.accent_color || '#6c5ce7'}">$1</strong>`
                ),
              }}
            />
            {item.tag && (
              <div
                style={{
                  fontSize: '14px',
                  color: '#999',
                  background: '#f0f0f0',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  alignSelf: 'flex-start',
                  marginTop: '10px',
                }}
              >
                {item.tag}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export function renderGridMatrixLayoutHTML(model: GridMatrixModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeGridMatrixModel(model);
  const { title, subtitle, items, background_image } = normalizedModel;

  const slideBg = background_image
    ? `url(${background_image})`
    : '#f8f9fa';

  const itemsHTML = items
    .map((item) => {
      const accentColor = item.accent_color || '#6c5ce7';
      const formattedDescription = item.description.replace(
        /\*\*(.*?)\*\*/g,
        `<strong style="color: ${accentColor}">$1</strong>`
      );

      return `
      <div style="background: #fff; padding: 30px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); display: flex; flex-direction: column; border-top: 4px solid ${accentColor};"
      >
        <div style="font-size: 24px; font-weight: bold; color: #333; margin-bottom: 15px;"
        >${item.title}</div>
        <p style="font-size: 16px; color: #666; line-height: 1.6; flex: 1;"
        >${formattedDescription}</p>
        ${item.tag ? `
        <div style="font-size: 14px; color: #999; background: #f0f0f0; padding: 8px 12px; border-radius: 6px; align-self: flex-start; margin-top: 10px;"
        >${item.tag}</div>` : ''}
      </div>`;
    })
    .join('\n');

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; padding: 60px 80px; display: flex; flex-direction: column; font-family: ${theme.fonts.body}; box-sizing: border-box;"
>
  <div style="text-align: center; margin-bottom: 50px;"
  >
    <h2 style="font-size: 36px; color: #333; margin: 0;"
    >${title}</h2>
    ${subtitle ? `<p style="font-size: 16px; color: #888; margin-top: 10px;"
    >${subtitle}</p>` : ''}
  </div>

  <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 40px;"
  >
    ${itemsHTML}
  </div>
</section>`;
}

export default GridMatrixLayout;
