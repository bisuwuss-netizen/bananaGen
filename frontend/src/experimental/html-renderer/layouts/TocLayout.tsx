/**
 * 目录页布局组件
 */

import React from 'react';
import { TocModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
} from '../utils/styleHelper';

interface TocLayoutProps {
  model: TocModel;
  theme: ThemeConfig;
}

export const TocLayout: React.FC<TocLayoutProps> = ({ model, theme }) => {
  const { title, items, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : {}),
  };
  const titleStyle = toInlineStyle({ ...getTitleStyle(theme), textShadow: '0 1px 2px rgba(0,0,0,0.1)' });

  // @ts-ignore
  const isVariantB = String((model as any).layout_variant || (model as any).variant || 'a').toLowerCase() === 'b';

  const listContainerStyle = toInlineStyle({
    marginTop: '50px',
    display: isVariantB ? 'grid' : 'flex',
    gridTemplateColumns: isVariantB ? '1fr 1fr' : undefined,
    flexDirection: isVariantB ? undefined : 'column',
    columnGap: isVariantB ? '40px' : undefined,
    rowGap: '24px',
  });

  return (
    <section style={slideStyle}>
      <h2 style={{ ...parseStyle(titleStyle), ...(isVariantB ? { borderBottom: `2px solid ${theme.colors.primary}`, paddingBottom: '16px', display: 'inline-block' } : {}) }}>{title}</h2>
      <div style={parseStyle(listContainerStyle)}>
        {items.map((item) => (
          <TocItem key={item.index} item={item} theme={theme} isVariantB={isVariantB} />
        ))}
      </div>
    </section>
  );
};

const TocItem: React.FC<{ item: { index: number; text: string }; theme: ThemeConfig; isVariantB?: boolean }> = ({
  item,
  theme,
  isVariantB,
}) => {
  const itemStyle = toInlineStyle({
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    ...(isVariantB ? {
      backgroundColor: theme.colors.backgroundAlt,
      padding: '20px',
      borderRadius: '8px',
      borderLeft: `4px solid ${theme.colors.secondary}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
    } : {})
  });

  const indexStyle = toInlineStyle({
    width: '48px',
    height: '48px',
    borderRadius: isVariantB ? '8px' : '50%',
    backgroundColor: isVariantB ? '#ffffff' : theme.colors.secondary,
    color: isVariantB ? theme.colors.secondary : '#ffffff',
    border: isVariantB ? `2px solid ${theme.colors.secondary}` : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    flexShrink: '0',
  });

  const textStyle = toInlineStyle({
    fontSize: '24px',
    color: theme.colors.text,
    fontWeight: isVariantB ? '600' : '500',
  });

  return (
    <div style={parseStyle(itemStyle)}>
      <span className="directory-list-index" style={parseStyle(indexStyle)}>
        {String(item.index).padStart(2, '0')}
      </span>
      <span className="slide-content-list-con" style={parseStyle(textStyle)}>
        {item.text}
      </span>
    </div>
  );
};

/**
 * 生成目录页HTML字符串
 */
export function renderTocLayoutHTML(model: TocModel, theme: ThemeConfig): string {
  const { title, items, background_image } = model;

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : {}),
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
  });

  const titleStyle = toInlineStyle({
    fontSize: theme.sizes.titleSize,
    fontWeight: 'bold',
    color: theme.colors.primary,
    margin: '0',
    lineHeight: '1.3',
    fontFamily: theme.fonts.title,
  });

  // @ts-ignore
  const isVariantB = String((model as any).layout_variant || (model as any).variant || 'a').toLowerCase() === 'b';

  const listContainerStyle = toInlineStyle({
    marginTop: '50px',
    display: isVariantB ? 'grid' : 'flex',
    gridTemplateColumns: isVariantB ? '1fr 1fr' : undefined,
    flexDirection: isVariantB ? undefined : 'column',
    columnGap: isVariantB ? '40px' : undefined,
    rowGap: '24px',
  });

  const itemsHTML = items
    .map((item) => {
      const itemStyle = toInlineStyle({
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        ...(isVariantB ? { backgroundColor: theme.colors.backgroundAlt, padding: '20px', borderRadius: '8px', borderLeft: `4px solid ${theme.colors.secondary}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' } : {})
      });

      const indexStyle = toInlineStyle({
        width: '48px',
        height: '48px',
        borderRadius: isVariantB ? '8px' : '50%',
        backgroundColor: isVariantB ? '#ffffff' : theme.colors.secondary,
        color: isVariantB ? theme.colors.secondary : '#ffffff',
        border: isVariantB ? `2px solid ${theme.colors.secondary}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        flexShrink: '0',
      });

      const textStyle = toInlineStyle({
        fontSize: '24px',
        color: theme.colors.text,
        fontWeight: isVariantB ? '600' : '500',
      });

      return `<div style="${itemStyle}">
      <span class="directory-list-index" style="${indexStyle}">${String(item.index).padStart(2, '0')}</span>
      <span class="slide-content-list-con" style="${textStyle}">${item.text}</span>
    </div>`;
    })
    .join('\n    ');

  const finalTitleStyle = isVariantB 
    ? `${titleStyle} border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 16px; display: inline-block;`
    : titleStyle;

  return `<section style="${slideStyle}">
  <h2 style="${finalTitleStyle}">${title}</h2>
  <div style="${listContainerStyle}">
    ${itemsHTML}
  </div>
</section>`;
}

function parseStyle(styleString: string): React.CSSProperties {
  const styles: Record<string, string> = {};
  styleString.split(';').forEach((rule) => {
    const [key, value] = rule.split(':').map((s) => s.trim());
    if (key && value) {
      const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      styles[camelKey] = value;
    }
  });
  return styles as React.CSSProperties;
}

export default TocLayout;
