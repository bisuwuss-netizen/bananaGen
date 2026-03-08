/**
 * 左右双栏布局组件
 */

import React from 'react';
import { TwoColumnModel, ColumnContent, ThemeConfig } from '../types/schema';
import { ImageSlotFrame } from '../components/ImageSlotFrame';
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

type ResolvedColumnType = 'text' | 'image' | 'bullets';

function resolveColumnType(content: ColumnContent): ResolvedColumnType {
  if (content.type) return content.type;
  if (content.bullets && content.bullets.length > 0) return 'bullets';
  if (content.image_src) return 'image';
  return 'text';
}

function normalizeContentLines(content: ColumnContent['content']): string[] {
  const raw = Array.isArray(content) ? content : [content || ''];
  return raw
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({ model, theme, onImageUpload }) => {
  const { title, left, right, background_image } = model;

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
    const resolvedType = resolveColumnType(content);
    const contentArray = normalizeContentLines(content.content);

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

    const bulletTextWrapStyle = toInlineStyle({
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    });

    const bulletTitleStyle = toInlineStyle({
      fontSize: theme.sizes.bodySize,
      color: theme.colors.text,
      lineHeight: '1.8',
      margin: '0',
    });

    const bulletDescriptionStyle = toInlineStyle({
      fontSize: '14px',
      color: theme.colors.textLight,
      lineHeight: '1.6',
      margin: '0',
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

    if (resolvedType === 'image') {
      return (
        <>
          {content.header && <h3 style={parseStyle(headerStyle)}>{content.header}</h3>}
          <ImageSlotFrame
            src={content.image_src}
            alt={content.image_alt || ''}
            theme={theme}
            slotLabel={content.header ? `${content.header} 插槽` : '栏位图片插槽'}
            slotHint="建议使用与该栏内容匹配的说明图，当前栏位会按 contain 显示。"
            onClick={onImageUpload}
            frameStyle={parseStyle(imageFrameStyle)}
            imageStyle={parseStyle(imageStyle)}
            placeholderStyle={{ minHeight: '320px' }}
          />
        </>
      );
    }

    if (resolvedType === 'bullets') {
      // 优先使用 bullets 数组
      if (content.bullets && content.bullets.length > 0) {
        return (
          <>
            {content.header && <h3 style={parseStyle(headerStyle)}>{content.header}</h3>}
            {contentArray.map((text, index) => (
              <p key={`intro-${index}`} style={{ ...parseStyle(textStyle), marginTop: index > 0 ? '10px' : '0' }}>
                {text}
              </p>
            ))}
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
                  <div style={parseStyle(bulletTextWrapStyle)}>
                    <p style={parseStyle(bulletTitleStyle)}>{bullet.text}</p>
                    {bullet.description && (
                      <p style={parseStyle(bulletDescriptionStyle)}>{bullet.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }

      // Fallback: 如果使用了 content 数组 but type=bullets，解析其中可能的 HTML 标签
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
    const resolvedType = resolveColumnType(content);
    const contentArray = normalizeContentLines(content.content);

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

    const bulletTextWrapStyle = toInlineStyle({
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    });

    const bulletTitleStyle = toInlineStyle({
      fontSize: theme.sizes.bodySize,
      color: theme.colors.text,
      lineHeight: '1.8',
      margin: '0',
    });

    const bulletDescriptionStyle = toInlineStyle({
      fontSize: '14px',
      color: theme.colors.textLight,
      lineHeight: '1.6',
      margin: '0',
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

    if (resolvedType === 'image') {
      if (content.image_src) {
        html += `<div style="${imageFrameStyle}"><img src="${content.image_src}" alt="${content.image_alt || ''}" style="${imageStyle}" /></div>`;
      } else {
        const placeholderStyle = toInlineStyle({
          ...getImagePlaceholderStyle('100%', '100%'),
          minHeight: '320px',
        });
        html += `<div style="${placeholderStyle}">[图片占位]</div>`;
      }
    } else if (resolvedType === 'bullets') {
      if (content.bullets && content.bullets.length > 0) {
        contentArray.forEach((text, index) => {
          const marginStyle = index > 0 ? 'margin-top:10px;' : '';
          html += `<p style="${textStyle}${marginStyle}">${text}</p>`;
        });
        html += '<div>';
        content.bullets.forEach((bullet) => {
          const iconClass = bullet.icon
            ? bullet.icon.startsWith('fa') ? bullet.icon : `fa ${bullet.icon}`
            : 'fa fa-check';
          html += `<div style="${bulletItemStyle}">
            <div style="${bulletIconStyle}"><i class="${iconClass}"></i></div>
            <div style="${bulletTextWrapStyle}">
              <p style="${bulletTitleStyle}">${bullet.text}</p>
              ${bullet.description ? `<p style="${bulletDescriptionStyle}">${bullet.description}</p>` : ''}
            </div>
          </div>`;
        });
        html += '</div>';
      } else {
        contentArray.forEach((text, index) => {
          const iconMatch = text.match(/<i[^>]*class=["']([^"']+)["'][^>]*><\/i>\s*/);
          const cleanText = text.replace(/<i[^>]*><\/i>\s*/, '').trim();
          const iconClass = iconMatch ? iconMatch[1] : 'fa fa-check';
          const marginStyle = index > 0 ? 'margin-top:10px;' : '';

          html += `<div style="${bulletItemStyle}${marginStyle}">
            <div style="${bulletIconStyle}"><i class="${iconClass}"></i></div>
            <div style="${bulletTextWrapStyle}">
              <p style="${bulletTitleStyle}">${cleanText}</p>
            </div>
          </div>`;
        });
      }
    } else {
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
