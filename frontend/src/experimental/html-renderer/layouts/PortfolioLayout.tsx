/**
 * 作品集布局组件（视觉方案专属）
 * 特征：多种栅格布局 + 图片卡片 + 标签展示
 */

import React from 'react';
import { PortfolioModel, ThemeConfig } from '../types/schema';
import { ImageSlotFrame } from '../components/ImageSlotFrame';
import {
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
  toInlineStyle,
} from '../utils/styleHelper';

interface PortfolioLayoutProps {
  model: PortfolioModel;
  theme: ThemeConfig;
}

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const PortfolioLayout: React.FC<PortfolioLayoutProps> = ({ model, theme }) => {
  const { title, subtitle, items, layout, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const titleStyle = asStyle({
    ...getTitleStyle(theme),
    marginBottom: '8px',
  });

  const subtitleStyle = asStyle({
    fontSize: theme.sizes.subtitleSize,
    color: theme.colors.textLight,
    marginBottom: '40px',
  });

  const portfolioGridStyle = asStyle({
    display: 'grid',
    gridTemplateColumns: layout === 'list' ? '1fr' : 'repeat(3, 1fr)',
    gap: '24px',
    height: 'calc(100% - 160px)',
    overflowY: 'auto',
    padding: '4px',
  });

  return (
    <section style={slideStyle}>
      <h2 style={titleStyle}>{title}</h2>
      {subtitle && <p style={subtitleStyle}>{subtitle}</p>}

      <div style={portfolioGridStyle}>
        {items.map((item, index) => {
          const baseCardStyle = getCardStyle(theme);
          const portfolioItemCardStyle = asStyle({
            ...baseCardStyle,
            display: 'flex',
            flexDirection: layout === 'list' ? 'row' : 'column',
            gap: '16px',
            padding: '12px',
            overflow: 'hidden',
          });

          const imageContainerStyle = asStyle({
            width: layout === 'list' ? '200px' : '100%',
            height: layout === 'list' ? '150px' : '200px',
            borderRadius: theme.decorations?.borderRadius || '8px',
            backgroundColor: theme.colors.backgroundAlt,
            overflow: 'hidden',
            flexShrink: '0',
          });

          return (
            <div key={index} style={portfolioItemCardStyle}>
              {/* 作品图片 */}
              <div style={imageContainerStyle}>
                <ImageSlotFrame
                  src={item.image_src}
                  alt={item.title}
                  theme={theme}
                  slotLabel="作品图插槽"
                  slotHint="建议放置案例效果图、界面截图或项目实拍图。"
                  frameStyle={{ width: '100%', height: '100%' }}
                  imageStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* 作品内容 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', margin: 0, color: theme.colors.text }}>{item.title}</h3>
                <p style={{ fontSize: theme.sizes.smallSize, margin: 0, color: theme.colors.textLight, lineHeight: '1.4', flex: 1 }}>{item.description}</p>
                
                {/* 标签 */}
                {item.tags && item.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {item.tags.map((tag, tagIdx) => (
                      <span 
                        key={tagIdx}
                        style={{
                          fontSize: '11px',
                          color: '#ffffff',
                          backgroundColor: theme.colors.accent,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 'bold',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export function renderPortfolioLayoutHTML(model: PortfolioModel, theme: ThemeConfig): string {
  const { title, subtitle, items, layout, background_image } = model;
  const slideStyle = toInlineStyle({
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  });

  const titleStyle = toInlineStyle({ ...getTitleStyle(theme), marginBottom: '8px' });
  const subtitleStyle = toInlineStyle({ fontSize: theme.sizes.subtitleSize, color: theme.colors.textLight, marginBottom: '40px' });

  const itemsHTML = items.map((item, index) => {
    const cardStyle = toInlineStyle({
      ...getCardStyle(theme),
      display: 'flex', flexDirection: layout === 'list' ? 'row' : 'column',
      gap: '16px', padding: '12px', overflow: 'hidden', marginBottom: '16px',
    });

    const imageStyle = toInlineStyle({
      width: layout === 'list' ? '200px' : '100%',
      height: layout === 'list' ? '140px' : '180px',
      borderRadius: theme.decorations?.borderRadius || '8px',
      backgroundColor: theme.colors.backgroundAlt,
      objectFit: 'cover',
    });

    return `
    <div style="${cardStyle}">
      ${item.image_src ? `<img src="${item.image_src}" alt="${item.title}" style="${imageStyle}" />` : `<div style="${imageStyle}; display: flex; align-items: center; justify-content: center; color: #ccc;">作品图片点位</div>`}
      <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
        <h3 style="font-size: 18px; margin: 0; color: ${theme.colors.text};">${item.title}</h3>
        <p style="font-size: ${theme.sizes.smallSize}; color: ${theme.colors.textLight}; margin: 0; line-height: 1.4;">${item.description}</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${(item.tags || []).map(tag => `<span style="font-size: 11px; background-color: ${theme.colors.accent}; color: #ffffff; padding: 2px 8px; border-radius: 10px;">${tag}</span>`).join(' ')}
        </div>
      </div>
    </div>`;
  }).join('\n');

  return `
<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
  ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
  <div style="display: grid; grid-template-columns: ${layout === 'list' ? '1fr' : 'repeat(3, 1fr)'}; gap: 24px;">
    ${itemsHTML}
  </div>
</section>`;
}

export default PortfolioLayout;
