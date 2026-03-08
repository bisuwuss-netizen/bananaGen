/**
 * 封面页布局组件
 */

import React from 'react';
import { CoverModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  generateGradient,
} from '../../utils/styleHelper';
import { isLayoutVariantB } from '../shared/layoutVariant';

interface CoverLayoutProps {
  model: CoverModel;
  theme: ThemeConfig;
  onImageUpload?: () => void; // 图片上传回调（封面页背景）
}

export const CoverLayout: React.FC<CoverLayoutProps> = ({ model, theme }) => {
  const { title, subtitle, author, department, date, background_image } = model;

  // 幻灯片容器样式
  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    padding: '0',
    background: background_image
      ? `url(${background_image}) center/cover no-repeat`
      : generateGradient(theme.colors.primary, theme.colors.secondary, 135),
  };

  const isVariantB = isLayoutVariantB(model);

  // 内容容器样式
  const contentStyle = toInlineStyle(isVariantB ? {
    position: 'absolute',
    bottom: '60px',
    left: '60px',
    textAlign: 'left',
    width: '80%',
    maxWidth: '900px',
  } : {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    width: '80%',
    maxWidth: '900px',
  });

  // 标题样式
  const titleStyle = toInlineStyle({
    fontSize: '52px',
    fontWeight: 'bold',
    color: background_image ? '#111111' : '#ffffff',
    margin: '0',
    lineHeight: '1.2',
    textShadow: background_image ? '0 1px 3px rgba(255,255,255,0.8)' : '0 2px 4px rgba(0,0,0,0.2)',
    fontFamily: theme.fonts.title,
  });

  // 副标题样式
  const subtitleStyle = toInlineStyle({
    fontSize: '28px',
    color: background_image ? '#333333' : 'rgba(255,255,255,0.9)',
    margin: '0',
    marginTop: '20px',
    lineHeight: '1.4',
  });

  // 作者信息样式
  const authorStyle = toInlineStyle({
    fontSize: '20px',
    color: background_image ? '#333333' : 'rgba(255,255,255,0.8)',
    margin: '0',
    marginTop: '40px',
    lineHeight: '1.6',
  });

  // 装饰线样式
  const decorLineStyle = toInlineStyle({
    width: isVariantB ? '120px' : '80px',
    height: isVariantB ? '6px' : '4px',
    backgroundColor: theme.colors.accent,
    margin: isVariantB ? '30px 0' : '30px auto',
    borderRadius: '2px',
  });

  return (
    <section style={{ ...slideStyle }}>
      <div style={{ ...parseStyle(contentStyle) }}>
        <h1 style={{ ...parseStyle(titleStyle) }}>{title}</h1>
        {subtitle && (
          <p style={{ ...parseStyle(subtitleStyle) }}>{subtitle}</p>
        )}
        <div style={{ ...parseStyle(decorLineStyle) }} />
        {(author || department || date) && (
          <p style={{ ...parseStyle(authorStyle) }}>
            {author && <span>{author}</span>}
            {department && <span style={{ marginLeft: '20px' }}>{department}</span>}
            {date && <span style={{ display: 'block', marginTop: '8px' }}>{date}</span>}
          </p>
        )}
      </div>
    </section>
  );
};

/**
 * 生成封面页HTML字符串（用于导出）
 */
export function renderCoverLayoutHTML(model: CoverModel, theme: ThemeConfig): string {
  const { title, subtitle, author, department, date, background_image } = model;

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    background: background_image
      ? `url(${background_image}) center/cover no-repeat`
      : generateGradient(theme.colors.primary, theme.colors.secondary, 135),
  });

  const isVariantB = isLayoutVariantB(model);

  const contentStyle = toInlineStyle(isVariantB ? {
    position: 'absolute',
    bottom: '60px',
    left: '60px',
    textAlign: 'left',
    width: '80%',
    maxWidth: '900px',
  } : {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    width: '80%',
    maxWidth: '900px',
  });

  const titleStyle = toInlineStyle({
    fontSize: '52px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0',
    lineHeight: '1.2',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
    fontFamily: theme.fonts.title,
  });

  const subtitleStyle = toInlineStyle({
    fontSize: '28px',
    color: 'rgba(255,255,255,0.9)',
    margin: '0',
    marginTop: '20px',
    lineHeight: '1.4',
  });

  const decorLineStyle = toInlineStyle({
    width: isVariantB ? '120px' : '80px',
    height: isVariantB ? '6px' : '4px',
    backgroundColor: theme.colors.accent,
    margin: isVariantB ? '30px 0' : '30px auto',
    borderRadius: '2px',
  });

  const authorStyle = toInlineStyle({
    fontSize: '20px',
    color: 'rgba(255,255,255,0.8)',
    margin: '0',
    marginTop: '40px',
    lineHeight: '1.6',
  });

  let authorHTML = '';
  if (author || department || date) {
    const parts = [];
    if (author) parts.push(`<span>${author}</span>`);
    if (department) parts.push(`<span style="margin-left:20px">${department}</span>`);
    if (date) parts.push(`<span style="display:block; margin-top:8px">${date}</span>`);
    authorHTML = `<p style="${authorStyle}">${parts.join('')}</p>`;
  }

  return `<section style="${slideStyle}">
  <div style="${contentStyle}">
    <h1 style="${titleStyle}">${title}</h1>
    ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
    <div style="${decorLineStyle}"></div>
    ${authorHTML}
  </div>
</section>`;
}

// 辅助函数：解析内联样式字符串为对象
function parseStyle(styleString: string): React.CSSProperties {
  const styles: Record<string, string> = {};
  styleString.split(';').forEach((rule) => {
    const [key, value] = rule.split(':').map((s) => s.trim());
    if (key && value) {
      // 将 kebab-case 转换为 camelCase
      const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      styles[camelKey] = value;
    }
  });
  return styles as React.CSSProperties;
}

export default CoverLayout;
