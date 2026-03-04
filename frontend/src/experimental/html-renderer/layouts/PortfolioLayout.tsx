/**
 * 作品展示布局组件（视觉方案专属）
 * 特征：网格/瀑布流布局 + 作品卡片 + 标签
 */

import React from 'react';
import { PortfolioModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getSubtitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface PortfolioLayoutProps {
  model: PortfolioModel;
  theme: ThemeConfig;
}

export const PortfolioLayout: React.FC<PortfolioLayoutProps> = ({ model, theme }) => {
  const { title, subtitle, items, layout = 'grid', background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const titleStyle = toInlineStyle({ ...getTitleStyle(theme), textShadow: '0 1px 2px rgba(0,0,0,0.1)' });
  const subtitleStyle = toInlineStyle(getSubtitleStyle(theme));

  const gridContainerStyle = toInlineStyle({
    marginTop: '36px',
    display: 'grid',
    gridTemplateColumns: layout === 'grid'
      ? `repeat(${items.length <= 2 ? items.length : 3}, 1fr)`
      : 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  });

  return (
    <section style={slideStyle}>
      <h2 style={titleStyle}>{title}</h2>
      {subtitle && <p style={subtitleStyle}>{subtitle}</p>}

      <div style={gridContainerStyle}>
        {items.map((item, index) => {
          const baseCardStyle = getCardStyle(theme);
          const itemCardStyle = toInlineStyle({
            ...baseCardStyle,
            padding: '0',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          });

          const imageContainerStyle = toInlineStyle({
            width: '100%',
            height: '180px',
            overflow: 'hidden',
            backgroundColor: theme.colors.backgroundAlt,
            position: 'relative',
          });

          const imageStyle = toInlineStyle({
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s',
          });

          const contentStyle = toInlineStyle({
            padding: '16px',
          });

          const itemTitleStyle = toInlineStyle({
            fontSize: theme.sizes.bodySize,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: '8px',
            lineHeight: '1.3',
          });

          const itemDescStyle = toInlineStyle({
            fontSize: theme.sizes.smallSize,
            color: theme.colors.textLight,
            lineHeight: '1.5',
            marginBottom: '12px',
          });

          const tagsContainerStyle = toInlineStyle({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          });

          const tagStyle = toInlineStyle({
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: theme.colors.secondary,
            color: '#ffffff',
            fontWeight: '500',
          });

          return (
            <div
              key={index}
              style={itemCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                const img = e.currentTarget.querySelector('img');
                if (img) (img as HTMLElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                const img = e.currentTarget.querySelector('img');
                if (img) (img as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              {/* 作品图片 */}
              <div style={imageContainerStyle}>
                {item.image_src ? (
                  <img
                    src={item.image_src}
                    alt={item.title}
                    style={imageStyle}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.colors.textLight,
                      fontSize: theme.sizes.smallSize,
                    }}
                  >
                    作品预览
                  </div>
                )}
              </div>

              {/* 作品信息 */}
              <div style={contentStyle}>
                <div style={itemTitleStyle}>{item.title}</div>
                {item.description && (
                  <div style={itemDescStyle}>{item.description}</div>
                )}

                {/* 标签 */}
                {item.tags && item.tags.length > 0 && (
                  <div style={tagsContainerStyle}>
                    {item.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} style={tagStyle}>
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

// 添加display name用于调试
PortfolioLayout.displayName = 'PortfolioLayout';

export default PortfolioLayout;
