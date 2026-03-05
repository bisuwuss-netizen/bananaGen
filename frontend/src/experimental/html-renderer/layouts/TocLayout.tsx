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

  const listContainerStyle = toInlineStyle({
    marginTop: '50px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  });

  return (
    <section style={slideStyle}>
      <h2 style={parseStyle(titleStyle)}>{title}</h2>
      <div style={parseStyle(listContainerStyle)}>
        {items.map((item) => (
          <TocItem key={item.index} item={item} theme={theme} />
        ))}
      </div>
    </section>
  );
};

const TocItem: React.FC<{ item: { index: number; text: string }; theme: ThemeConfig }> = ({
  item,
  theme,
}) => {
  const itemStyle = toInlineStyle({
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  });

  const indexStyle = toInlineStyle({
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
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
    fontWeight: '500',
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

  const listContainerStyle = toInlineStyle({
    marginTop: '50px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  });

  const itemsHTML = items
    .map((item) => {
      const itemStyle = toInlineStyle({
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      });

      const indexStyle = toInlineStyle({
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: theme.colors.secondary,
        color: '#ffffff',
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
        fontWeight: '500',
      });

      return `<div style="${itemStyle}">
      <span class="directory-list-index" style="${indexStyle}">${String(item.index).padStart(2, '0')}</span>
      <span class="slide-content-list-con" style="${textStyle}">${item.text}</span>
    </div>`;
    })
    .join('\n    ');

  return `<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
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
