/**
 * 左右双栏布局组件
 */

import React from 'react';
import { TwoColumnModel, ColumnContent, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getImagePlaceholderStyle,
} from '../utils/styleHelper';

interface TwoColumnLayoutProps {
  model: TwoColumnModel;
  theme: ThemeConfig;
  onImageUpload?: (slotPath: string) => void; // 图片上传回调
}

export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({ model, theme, onImageUpload }) => {
  const { title, left, right, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : {}),
  };
  const titleStyle = toInlineStyle({ ...getTitleStyle(theme), textShadow: '0 1px 2px rgba(0,0,0,0.1)' });

  const columnsContainerStyle = toInlineStyle({
    marginTop: '40px',
    display: 'flex',
    gap: '40px',
    flex: '1',
  });

  const columnStyle = toInlineStyle({
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  });

  return (
    <section style={slideStyle}>
      <h2 style={parseStyle(titleStyle)}>{title}</h2>
      <div style={parseStyle(columnsContainerStyle)}>
        <div style={parseStyle(columnStyle)}>
          <ColumnRenderer
            content={left}
            theme={theme}
            onImageUpload={onImageUpload ? () => onImageUpload('left.image_src') : undefined}
          />
        </div>
        <div style={parseStyle(columnStyle)}>
          <ColumnRenderer
            content={right}
            theme={theme}
            onImageUpload={onImageUpload ? () => onImageUpload('right.image_src') : undefined}
          />
        </div>
      </div>
    </section>
  );
};

const ColumnRenderer: React.FC<{
  content: ColumnContent;
  theme: ThemeConfig;
  onImageUpload?: () => void;
}> = ({
  content,
  theme,
  onImageUpload,
}) => {
    const headerStyle = toInlineStyle({
      fontSize: '24px',
      fontWeight: '600',
      color: theme.colors.secondary,
      margin: '0',
      marginBottom: '16px',
    });

    const textStyle = toInlineStyle({
      fontSize: theme.sizes.bodySize,
      color: theme.colors.text,
      lineHeight: '1.8',
      margin: '0',
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

    const bulletItemStyle = toInlineStyle({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      marginTop: '12px',
    });

    const bulletIconStyle = toInlineStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: theme.colors.accent,
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      flexShrink: '0',
      marginTop: '2px',
    });

    if (content.type === 'image') {
      return (
        <>
          {content.header && <h3 style={parseStyle(headerStyle)}>{content.header}</h3>}
          {content.image_src ? (
            <div style={parseStyle(imageFrameStyle)}>
              <img
                src={content.image_src}
                alt={content.image_alt || ''}
                style={parseStyle(imageStyle)}
              />
            </div>
          ) : (
            <div
              style={parseStyle(toInlineStyle({
                ...getImagePlaceholderStyle('100%', '100%'),
                minHeight: '320px',
                cursor: onImageUpload ? 'pointer' : 'default',
              }))}
              onClick={onImageUpload}
              title="点击上传图片"
            >
              点击上传图片
            </div>
          )}
        </>
      );
    }

    if (content.type === 'bullets') {
      // 优先使用 bullets 数组
      if (content.bullets && content.bullets.length > 0) {
        return (
          <>
            {content.header && <h3 style={parseStyle(headerStyle)}>{content.header}</h3>}
            <div>
              {content.bullets.map((bullet, index) => (
                <div key={index} style={parseStyle(bulletItemStyle)}>
                  <div style={parseStyle(bulletIconStyle)}>
                    {bullet.icon ? (
                      <i className={bullet.icon.startsWith('fa') ? bullet.icon : `fa ${bullet.icon}`} />
                    ) : (
                      <i className="fa fa-check" />
                    )}
                  </div>
                  <span style={parseStyle(textStyle)}>{bullet.text}</span>
                </div>
              ))}
            </div>
          </>
        );
      }

      // Fallback: 如果使用了 content 数组但 type=bullets，解析其中可能的 HTML 标签
      const contentArray = Array.isArray(content.content) ? content.content : [content.content || ''];
      return (
        <>
          {content.header && <h3 style={parseStyle(headerStyle)}>{content.header}</h3>}
          <div>
            {contentArray.map((text, index) => {
              // 尝试解析 <i class="..."></i> 标签提取图标
              const iconMatch = text.match(/<i[^>]*class=["']([^"']+)["'][^>]*><\/i>\s*/);
              const cleanText = text.replace(/<i[^>]*><\/i>\s*/, '').trim();
              const iconClass = iconMatch ? iconMatch[1] : 'fa fa-check';

              return (
                <div key={index} style={parseStyle(bulletItemStyle)}>
                  <div style={parseStyle(bulletIconStyle)}>
                    <i className={iconClass} />
                  </div>
                  <span style={parseStyle(textStyle)}>{cleanText}</span>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    // 默认文本类型
    const contentArray = Array.isArray(content.content) ? content.content : [content.content || ''];
    return (
      <>
        {content.header && <h3 style={parseStyle(headerStyle)}>{content.header}</h3>}
        {contentArray.map((text, index) => (
          <p key={index} style={{ ...parseStyle(textStyle), marginTop: index > 0 ? '16px' : '0' }}>
            {text}
          </p>
        ))}
      </>
    );
  };

export function renderTwoColumnLayoutHTML(model: TwoColumnModel, theme: ThemeConfig): string {
  const { title, left, right, background_image } = model;

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

  const columnsContainerStyle = toInlineStyle({
    marginTop: '40px',
    display: 'flex',
    gap: '40px',
  });

  const columnStyle = toInlineStyle({
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  });

  function renderColumnHTML(content: ColumnContent): string {
    const headerStyle = toInlineStyle({
      fontSize: '24px',
      fontWeight: '600',
      color: theme.colors.secondary,
      margin: '0',
      marginBottom: '16px',
    });

    const textStyle = toInlineStyle({
      fontSize: theme.sizes.bodySize,
      color: theme.colors.text,
      lineHeight: '1.8',
      margin: '0',
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

    const bulletItemStyle = toInlineStyle({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      marginTop: '12px',
    });

    const bulletIconStyle = toInlineStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: theme.colors.accent,
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      flexShrink: '0',
      marginTop: '2px',
    });

    let html = '';
    if (content.header) {
      html += `<h3 style="${headerStyle}">${content.header}</h3>`;
    }

    if (content.type === 'image') {
      if (content.image_src) {
        html += `<div style="${imageFrameStyle}"><img src="${content.image_src}" alt="${content.image_alt || ''}" style="${imageStyle}" /></div>`;
      } else {
        const placeholderStyle = toInlineStyle({
          ...getImagePlaceholderStyle('100%', '100%'),
          minHeight: '320px',
        });
        html += `<div style="${placeholderStyle}">[图片占位]</div>`;
      }
    } else if (content.type === 'bullets' && content.bullets) {
      html += '<div>';
      content.bullets.forEach((bullet) => {
        const iconClass = bullet.icon
          ? bullet.icon.startsWith('fa') ? bullet.icon : `fa ${bullet.icon}`
          : 'fa fa-check';
        html += `<div style="${bulletItemStyle}">
          <div style="${bulletIconStyle}"><i class="${iconClass}"></i></div>
          <span style="${textStyle}">${bullet.text}</span>
        </div>`;
      });
      html += '</div>';
    } else {
      const contentArray = Array.isArray(content.content) ? content.content : [content.content || ''];
      contentArray.forEach((text, index) => {
        const marginStyle = index > 0 ? 'margin-top:16px;' : '';
        html += `<p style="${textStyle}${marginStyle}">${text}</p>`;
      });
    }

    return html;
  }

  return `<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
  <div style="${columnsContainerStyle}">
    <div style="${columnStyle}">
      ${renderColumnHTML(left)}
    </div>
    <div style="${columnStyle}">
      ${renderColumnHTML(right)}
    </div>
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

export default TwoColumnLayout;
