/**
 * 标题+正文布局组件
 * 支持有图/无图两种渲染模式
 */

import React from 'react';
import { TitleContentModel, ThemeConfig } from '../../types/schema';
import { ImageSlotFrame } from '../../components/ImageSlotFrame';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getBodyStyle,
} from '../../utils/styleHelper';

interface TitleContentLayoutProps {
  model: TitleContentModel;
  theme: ThemeConfig;
  onImageUpload?: () => void; // 图片上传回调
}

export const TitleContentLayout: React.FC<TitleContentLayoutProps> = ({ model, theme, onImageUpload }) => {
  const { title, content, highlight, image, background_image } = model;
  const hasImage = image && (image.src || image.src === '');

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

  const contentArray = Array.isArray(content) ? content : [content];

  // 有图模式：左右分栏
  if (hasImage) {
    const imagePosition = image.position || 'right';
    const imageWidth = image.width || '45%';
    const contentWidth = `calc(100% - ${imageWidth} - 30px)`;

    const flexContainerStyle = toInlineStyle({
      display: 'flex',
      flexDirection: imagePosition === 'left' ? 'row-reverse' : 'row',
      gap: '30px',
      marginTop: '40px',
      flex: '1',
      alignItems: 'stretch',
      height: 'calc(100% - 140px)',
      minHeight: '360px',
    });

    const textColumnStyle = toInlineStyle({
      width: contentWidth,
      flex: '1',
    });

    const paragraphStyle = toInlineStyle({
      ...getBodyStyle(theme),
      marginTop: '16px',
    });

    const highlightStyle = toInlineStyle({
      marginTop: '24px',
      padding: '16px 20px',
      backgroundColor: theme.colors.backgroundAlt,
      borderLeft: `4px solid ${theme.colors.accent}`,
      borderRadius: '0 8px 8px 0',
      fontSize: theme.sizes.bodySize,
      color: theme.colors.text,
      fontStyle: 'italic',
    });

    const imageFrameStyle = toInlineStyle({
      width: '100%',
      height: '100%',
      minHeight: '320px',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    const imageStyle = toInlineStyle({
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      objectPosition: 'center',
    });

    return (
      <section style={slideStyle}>
        <h2 style={parseStyle(titleStyle)}>{title}</h2>
        <div style={parseStyle(flexContainerStyle)}>
          <div style={parseStyle(textColumnStyle)}>
            {contentArray.map((paragraph, index) => (
              <p key={index} style={parseStyle(paragraphStyle)}>
                {paragraph}
              </p>
            ))}
            {highlight && (
              <div style={parseStyle(highlightStyle)}>{highlight}</div>
            )}
          </div>
          <div style={parseStyle(toInlineStyle({ width: imageWidth, flexShrink: 0, display: 'flex', alignItems: 'stretch' }))}>
            <ImageSlotFrame
              src={image.src}
              alt={image.alt || ''}
              theme={theme}
              slotLabel="配图插槽"
              slotHint="建议使用与正文并列的辅助配图，默认按 contain 完整显示。"
              onClick={onImageUpload}
              frameStyle={parseStyle(imageFrameStyle)}
              imageStyle={parseStyle(imageStyle)}
            />
          </div>
        </div>
      </section>
    );
  }

  // 无图模式：原有全宽布局
  const contentContainerStyle = toInlineStyle({
    marginTop: '40px',
    flex: '1',
  });

  const paragraphStyle = toInlineStyle({
    ...getBodyStyle(theme),
    marginTop: '20px',
  });

  const highlightStyle = toInlineStyle({
    marginTop: '30px',
    padding: '20px 24px',
    backgroundColor: theme.colors.backgroundAlt,
    borderLeft: `4px solid ${theme.colors.accent}`,
    borderRadius: '0 8px 8px 0',
    fontSize: theme.sizes.bodySize,
    color: theme.colors.text,
    fontStyle: 'italic',
  });

  return (
    <section style={slideStyle}>
      <h2 style={parseStyle(titleStyle)}>{title}</h2>
      <div style={parseStyle(contentContainerStyle)}>
        {contentArray.map((paragraph, index) => (
          <p key={index} style={parseStyle(paragraphStyle)}>
            {paragraph}
          </p>
        ))}
        {highlight && (
          <div style={parseStyle(highlightStyle)}>{highlight}</div>
        )}
      </div>
    </section>
  );
};

export function renderTitleContentLayoutHTML(model: TitleContentModel, theme: ThemeConfig): string {
  const { title, content, highlight, image, background_image } = model;
  const hasImage = image && (image.src !== undefined);

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

  const contentArray = Array.isArray(content) ? content : [content];

  // 有图模式
  if (hasImage) {
    const imagePosition = image.position || 'right';
    const imageWidth = image.width || '45%';

    const flexContainerStyle = toInlineStyle({
      display: 'flex',
      flexDirection: imagePosition === 'left' ? 'row-reverse' : 'row',
      gap: '30px',
      marginTop: '40px',
      flex: '1',
      alignItems: 'stretch',
      height: 'calc(100% - 140px)',
      minHeight: '360px',
    });

    const textColumnStyle = toInlineStyle({
      flex: '1',
    });

    const paragraphStyle = toInlineStyle({
      fontSize: theme.sizes.bodySize,
      color: theme.colors.text,
      lineHeight: '1.8',
      margin: '0',
      marginTop: '16px',
    });

    const paragraphsHTML = contentArray
      .map((p) => `<p style="${paragraphStyle}">${p}</p>`)
      .join('\n      ');

    let highlightHTML = '';
    if (highlight) {
      const highlightStyle = toInlineStyle({
        marginTop: '24px',
        padding: '16px 20px',
        backgroundColor: theme.colors.backgroundAlt,
        borderLeft: `4px solid ${theme.colors.accent}`,
        borderRadius: '0 8px 8px 0',
        fontSize: theme.sizes.bodySize,
        color: theme.colors.text,
        fontStyle: 'italic',
      });
      highlightHTML = `\n      <div style="${highlightStyle}">${highlight}</div>`;
    }

    let imageHTML = '';
    if (image.src) {
      const imageFrameStyle = toInlineStyle({
        width: '100%',
        height: '100%',
        minHeight: '320px',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
      const imageStyle = toInlineStyle({
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        objectPosition: 'center',
      });
      imageHTML = `<div style="${imageFrameStyle}"><img src="${image.src}" alt="${image.alt || ''}" style="${imageStyle}" /></div>`;
    } else {
      const placeholderStyle = toInlineStyle({
        width: '100%',
        height: '100%',
        minHeight: '320px',
        backgroundColor: theme.colors.backgroundAlt,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.colors.textLight,
        fontSize: '14px',
        border: `2px dashed ${theme.colors.secondary}`,
      });
      imageHTML = `<div style="${placeholderStyle}"><span>点击上传图片</span></div>`;
    }

    return `<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
  <div style="${flexContainerStyle}">
    <div style="${textColumnStyle}">
      ${paragraphsHTML}${highlightHTML}
    </div>
    <div style="width:${imageWidth};flex-shrink:0;display:flex;align-items:stretch;">
      ${imageHTML}
    </div>
  </div>
</section>`;
  }

  // 无图模式
  const contentContainerStyle = toInlineStyle({
    marginTop: '40px',
  });

  const paragraphStyle = toInlineStyle({
    fontSize: theme.sizes.bodySize,
    color: theme.colors.text,
    lineHeight: '1.8',
    margin: '0',
    marginTop: '20px',
  });

  const paragraphsHTML = contentArray
    .map((p) => `<p style="${paragraphStyle}">${p}</p>`)
    .join('\n    ');

  let highlightHTML = '';
  if (highlight) {
    const highlightStyle = toInlineStyle({
      marginTop: '30px',
      padding: '20px 24px',
      backgroundColor: theme.colors.backgroundAlt,
      borderLeft: `4px solid ${theme.colors.accent}`,
      borderRadius: '0 8px 8px 0',
      fontSize: theme.sizes.bodySize,
      color: theme.colors.text,
      fontStyle: 'italic',
    });
    highlightHTML = `<div style="${highlightStyle}">${highlight}</div>`;
  }

  return `<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
  <div style="${contentContainerStyle}">
    ${paragraphsHTML}
    ${highlightHTML}
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

export default TitleContentLayout;
