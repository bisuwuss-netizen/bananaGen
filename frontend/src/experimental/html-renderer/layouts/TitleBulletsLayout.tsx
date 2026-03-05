/**
 * 标题+要点布局组件
 * 支持有图/无图两种渲染模式
 */

import React from 'react';
import { TitleBulletsModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getSubtitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface TitleBulletsLayoutProps {
  model: TitleBulletsModel;
  theme: ThemeConfig;
  onImageUpload?: () => void; // 图片上传回调
}

export const TitleBulletsLayout: React.FC<TitleBulletsLayoutProps> = ({ model, theme, onImageUpload }) => {
  const { title, subtitle, bullets, image, background_image } = model;
  const hasImage = image && (image.src || image.src === '');
  const variant = String(model.variant || 'a').toLowerCase();

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
  const subtitleStyle = toInlineStyle(getSubtitleStyle(theme));

  if (variant === 'b') {
    return renderTitleBulletsVariantB(model, theme, onImageUpload);
  }

  // 有图模式：左侧要点列表 + 右侧图片
  if (hasImage) {
    const imagePosition = image.position || 'right';
    const imageWidth = image.width || '45%';

    const flexContainerStyle = toInlineStyle({
      display: 'flex',
      flexDirection: imagePosition === 'left' ? 'row-reverse' : 'row',
      gap: '30px',
      marginTop: '30px',
      flex: '1',
      alignItems: 'stretch',
      height: 'calc(100% - 140px)',
      minHeight: '380px',
    });

    const bulletsColumnStyle = toInlineStyle({
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    });

    const imageColumnStyle = toInlineStyle({
      width: imageWidth,
      flexShrink: '0',
      display: 'flex',
      alignItems: 'stretch',
    });

    const imageFrameStyle = toInlineStyle({
      width: '100%',
      height: '100%',
      minHeight: '360px',
      borderRadius: '12px',
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

    const placeholderStyle = toInlineStyle({
      width: '100%',
      height: '100%',
      minHeight: '360px',
      backgroundColor: theme.colors.backgroundAlt,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.colors.textLight,
      fontSize: '14px',
      border: `2px dashed ${theme.colors.secondary}`,
    });

    return (
      <section style={slideStyle}>
        <h2 style={parseStyle(titleStyle)}>{title}</h2>
        {subtitle && <p style={parseStyle(subtitleStyle)}>{subtitle}</p>}
        <div style={parseStyle(flexContainerStyle)}>
          <div style={parseStyle(bulletsColumnStyle)}>
            {bullets.map((bullet, index) => (
              <BulletCard key={index} bullet={bullet} theme={theme} compact />
            ))}
          </div>
          <div style={parseStyle(imageColumnStyle)}>
            {image.src ? (
              <div style={parseStyle(imageFrameStyle)}>
                <img src={image.src} alt={image.alt || ''} style={parseStyle(imageStyle)} />
              </div>
            ) : (
              <div
                style={parseStyle(placeholderStyle)}
                onClick={onImageUpload}
                title="点击上传图片"
              >
                <span>点击上传图片</span>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // 无图模式：原有Grid布局
  const bulletsContainerStyle = toInlineStyle({
    marginTop: '40px',
    display: 'grid',
    gridTemplateColumns: bullets.length <= 3 ? 'repeat(auto-fit, minmax(300px, 1fr))' : 'repeat(2, 1fr)',
    gap: '24px',
  });

  const keyTakeawayStyle = toInlineStyle({
    marginTop: '30px',
    padding: '16px 20px',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.decorations?.borderRadius || '12px',
    borderLeft: `4px solid ${theme.colors.primary}`,
    fontSize: theme.sizes.bodySize,
    color: theme.colors.text,
    lineHeight: '1.5',
  });

  return (
    <section style={slideStyle}>
      <h2 style={parseStyle(titleStyle)}>{title}</h2>
      {subtitle && <p style={parseStyle(subtitleStyle)}>{subtitle}</p>}
      <div style={parseStyle(bulletsContainerStyle)}>
        {bullets.map((bullet, index) => (
          <BulletCard key={index} bullet={bullet} theme={theme} />
        ))}
      </div>

      {/* 页面核心要点总结 */}
      {model.keyTakeaway && (
        <div style={parseStyle(keyTakeawayStyle)}>
          <strong>🎯 核心要点：</strong>{model.keyTakeaway}
        </div>
      )}
    </section>
  );
};

const BulletCard: React.FC<{
  bullet: {
    icon?: string;
    text: string;
    description?: string;
    example?: string;
    note?: string;
    dataPoint?: {
      value: string;
      unit: string;
      source?: string;
    };
  };
  theme: ThemeConfig;
  compact?: boolean;
}> = ({ bullet, theme, compact }) => {
  // 使用getCardStyle应用主题装饰配置
  const baseCardStyle = getCardStyle(theme);
  const cardStyle = toInlineStyle({
    ...baseCardStyle,
    padding: compact ? '16px 20px' : '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: compact ? '12px' : '16px',
  });

  const iconContainerStyle = toInlineStyle({
    width: compact ? '40px' : '48px',
    height: compact ? '40px' : '48px',
    borderRadius: '10px',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? '16px' : '20px',
    flexShrink: '0',
  });

  const textContainerStyle = toInlineStyle({
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  });

  const bulletTextStyle = toInlineStyle({
    fontSize: compact ? '17px' : '20px',
    fontWeight: '600',
    color: theme.colors.text,
    margin: '0',
  });

  const descriptionStyle = toInlineStyle({
    fontSize: compact ? '14px' : '16px',
    color: theme.colors.textLight,
    margin: '0',
    lineHeight: '1.5',
  });

  const exampleStyle = toInlineStyle({
    fontSize: '14px',
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundAlt,
    padding: '8px 12px',
    borderRadius: '6px',
    borderLeft: `3px solid ${theme.colors.accent}`,
    margin: '0',
    lineHeight: '1.4',
  });

  const noteStyle = toInlineStyle({
    fontSize: '13px',
    color: '#d97706',
    backgroundColor: '#fffbeb',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #fcd34d',
    margin: '0',
    lineHeight: '1.3',
  });

  const dataPointStyle = toInlineStyle({
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
  });

  const dataValueStyle = toInlineStyle({
    fontSize: '18px',
    fontWeight: 'bold',
  });

  const dataUnitStyle = toInlineStyle({
    fontSize: '12px',
    opacity: '0.9',
  });

  return (
    <div style={parseStyle(cardStyle)}>
      <div style={parseStyle(iconContainerStyle)}>
        {bullet.icon ? (
          <i className={bullet.icon.startsWith('fa') ? bullet.icon : `fa ${bullet.icon}`} />
        ) : (
          <i className="fa fa-check" />
        )}
      </div>
      <div style={parseStyle(textContainerStyle)}>
        <p style={parseStyle(bulletTextStyle)}>{bullet.text}</p>
        {bullet.description && (
          <p style={parseStyle(descriptionStyle)}>{bullet.description}</p>
        )}

        {/* 数据支撑标签 */}
        {bullet.dataPoint && (
          <div style={parseStyle(dataPointStyle)}>
            <span style={parseStyle(dataValueStyle)}>{bullet.dataPoint.value}</span>
            <span style={parseStyle(dataUnitStyle)}>{bullet.dataPoint.unit}</span>
          </div>
        )}

        {/* 具体案例 */}
        {bullet.example && (
          <div style={parseStyle(exampleStyle)}>
            💡 案例：{bullet.example}
          </div>
        )}

        {/* 注意事项 */}
        {bullet.note && (
          <div style={parseStyle(noteStyle)}>
            ⚠️ 注意：{bullet.note}
          </div>
        )}
      </div>
    </div>
  );
};

export function renderTitleBulletsLayoutHTML(model: TitleBulletsModel, theme: ThemeConfig): string {
  const { title, subtitle, bullets, image, background_image } = model;
  const hasImage = image && (image.src !== undefined);
  const variant = String(model.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderTitleBulletsVariantBHTML(model, theme);
  }

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

  const subtitleStyle = toInlineStyle({
    fontSize: theme.sizes.subtitleSize,
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '12px',
    lineHeight: '1.4',
  });

  // 有图模式
  if (hasImage) {
    const imagePosition = image.position || 'right';
    const imageWidth = image.width || '45%';

    const flexContainerStyle = toInlineStyle({
      display: 'flex',
      flexDirection: imagePosition === 'left' ? 'row-reverse' : 'row',
      gap: '30px',
      marginTop: '30px',
      flex: '1',
      alignItems: 'stretch',
      height: 'calc(100% - 140px)',
      minHeight: '380px',
    });

    const bulletsColumnStyle = toInlineStyle({
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    });

    const imageColumnStyle = toInlineStyle({
      width: imageWidth,
      flexShrink: '0',
      display: 'flex',
      alignItems: 'stretch',
    });

    const bulletsHTML = bullets.map((bullet) => renderBulletCardHTML(bullet, theme, true)).join('\n      ');

    let imageHTML = '';
    if (image.src) {
      const imageFrameStyle = toInlineStyle({
        width: '100%',
        height: '100%',
        minHeight: '360px',
        borderRadius: '12px',
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
        minHeight: '360px',
        backgroundColor: theme.colors.backgroundAlt,
        borderRadius: '12px',
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
  ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
  <div style="${flexContainerStyle}">
    <div style="${bulletsColumnStyle}">
      ${bulletsHTML}
    </div>
    <div style="${imageColumnStyle}">
      ${imageHTML}
    </div>
  </div>
</section>`;
  }

  // 无图模式
  const bulletsContainerStyle = toInlineStyle({
    marginTop: '40px',
    display: 'grid',
    gridTemplateColumns: bullets.length <= 3 ? 'repeat(auto-fit, minmax(300px, 1fr))' : 'repeat(2, 1fr)',
    gap: '24px',
  });

  const bulletsHTML = bullets.map((bullet) => renderBulletCardHTML(bullet, theme, false)).join('\n    ');

  return `<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
  ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
  <div style="${bulletsContainerStyle}">
    ${bulletsHTML}
  </div>
</section>`;
}

function renderBulletCardHTML(
  bullet: { icon?: string; text: string; description?: string },
  theme: ThemeConfig,
  compact: boolean
): string {
  const cardStyle = toInlineStyle({
    padding: compact ? '16px 20px' : '24px',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: compact ? '12px' : '16px',
  });

  const iconContainerStyle = toInlineStyle({
    width: compact ? '40px' : '48px',
    height: compact ? '40px' : '48px',
    borderRadius: '10px',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? '16px' : '20px',
    flexShrink: '0',
  });

  const textContainerStyle = toInlineStyle({
    flex: '1',
  });

  const bulletTextStyle = toInlineStyle({
    fontSize: compact ? '17px' : '20px',
    fontWeight: '600',
    color: theme.colors.text,
    margin: '0',
  });

  const descriptionStyle = toInlineStyle({
    fontSize: compact ? '14px' : '16px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '6px',
    lineHeight: '1.5',
  });

  const iconClass = bullet.icon
    ? bullet.icon.startsWith('fa') ? bullet.icon : `fa ${bullet.icon}`
    : 'fa fa-check';

  return `<div style="${cardStyle}">
      <div style="${iconContainerStyle}">
        <i class="${iconClass}"></i>
      </div>
      <div style="${textContainerStyle}">
        <p style="${bulletTextStyle}">${bullet.text}</p>
        ${bullet.description ? `<p style="${descriptionStyle}">${bullet.description}</p>` : ''}
      </div>
    </div>`;
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

export default TitleBulletsLayout;

function renderTitleBulletsVariantB(
  model: TitleBulletsModel,
  theme: ThemeConfig,
  onImageUpload?: () => void
): React.ReactElement {
  const cards = (model.bullets || []).slice(0, 4);
  const accentColors = ['#f43f5e', '#06b6d4', '#10b981', '#f59e0b'];

  const sectionStyle: React.CSSProperties = {
    width: theme.sizes.slideWidth,
    height: theme.sizes.slideHeight,
    padding: '56px 72px',
    boxSizing: 'border-box',
    display: 'flex',
    gap: '44px',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    background: model.background_image
      ? `linear-gradient(rgba(8,15,34,0.86), rgba(8,15,34,0.9)), url(${model.background_image}) center/cover no-repeat`
      : 'linear-gradient(135deg, #0b1120 0%, #0f172a 100%)',
  };

  return (
    <section style={sectionStyle}>
      <div style={{ width: '35%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ width: 8, height: 60, borderRadius: 4, backgroundColor: '#06b6d4', boxShadow: '0 0 14px #06b6d4', marginBottom: 18 }} />
        <h2 style={{ fontSize: 46, lineHeight: 1.25, color: '#ffffff', margin: '0 0 12px 0', fontWeight: 800, letterSpacing: 1 }}>{model.title}</h2>
        {model.subtitle && <p style={{ margin: '0 0 26px 0', color: '#93c5fd', fontSize: 22, lineHeight: 1.45 }}>{model.subtitle}</p>}
        <div
          style={{
            width: '100%',
            height: 190,
            borderRadius: 18,
            border: '1px dashed rgba(6,182,212,0.35)',
            background: 'radial-gradient(circle at top left, rgba(6,182,212,0.2), rgba(0,0,0,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7dd3fc',
            fontSize: 42,
            cursor: onImageUpload ? 'pointer' : 'default',
          }}
          onClick={onImageUpload}
          title={onImageUpload ? '点击上传图片' : undefined}
        >
          {model.image?.src ? (
            <img src={model.image.src} alt={model.image.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 18 }} />
          ) : '📊'}
        </div>
      </div>

      <div style={{ width: '65%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
        {cards.map((bullet, index) => (
          <div
            key={`${bullet.text}-${index}`}
            style={{
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              borderLeft: `6px solid ${accentColors[index % accentColors.length]}`,
              background: index === 1 ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.03)',
              padding: '18px 22px',
              display: 'flex',
              gap: 18,
              alignItems: 'flex-start',
              boxShadow: index === 1 ? '0 0 18px rgba(6,182,212,0.12)' : 'none',
            }}
          >
            <div style={{ width: 160, flexShrink: 0, color: accentColors[index % accentColors.length], fontSize: 22, fontWeight: 700, lineHeight: 1.35 }}>
              {bullet.text}
            </div>
            <div style={{ flex: 1, color: '#cbd5e1', fontSize: 17, lineHeight: 1.6 }}>
              {bullet.description || bullet.example || bullet.note || '该要点用于承接上文并展开关键结论。'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderTitleBulletsVariantBHTML(model: TitleBulletsModel, theme: ThemeConfig): string {
  const cards = (model.bullets || []).slice(0, 4);
  const accentColors = ['#f43f5e', '#06b6d4', '#10b981', '#f59e0b'];
  const bg = model.background_image
    ? `linear-gradient(rgba(8,15,34,0.86), rgba(8,15,34,0.9)), url(${model.background_image}) center/cover no-repeat`
    : 'linear-gradient(135deg, #0b1120 0%, #0f172a 100%)';

  const cardHTML = cards.map((bullet, index) => {
    const content = bullet.description || bullet.example || bullet.note || '该要点用于承接上文并展开关键结论。';
    const accent = accentColors[index % accentColors.length];
    const glowing = index === 1;
    return `<div style="border-radius:12px;border:1px solid rgba(255,255,255,0.1);border-left:6px solid ${accent};background:${glowing ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.03)'};padding:18px 22px;display:flex;gap:18px;align-items:flex-start;box-shadow:${glowing ? '0 0 18px rgba(6,182,212,0.12)' : 'none'};">
      <div style="width:160px;flex-shrink:0;color:${accent};font-size:22px;font-weight:700;line-height:1.35;">${bullet.text}</div>
      <div style="flex:1;color:#cbd5e1;font-size:17px;line-height:1.6;">${content}</div>
    </div>`;
  }).join('\n');

  const imageHTML = model.image?.src
    ? `<img src="${model.image.src}" alt="${model.image.alt || ''}" style="width:100%;height:100%;object-fit:contain;border-radius:18px;" />`
    : '📊';

  return `<section style="width:${theme.sizes.slideWidth}px;height:${theme.sizes.slideHeight}px;padding:56px 72px;box-sizing:border-box;display:flex;gap:44px;overflow:hidden;font-family:${theme.fonts.body};background:${bg};">
  <div style="width:35%;display:flex;flex-direction:column;justify-content:center;">
    <div style="width:8px;height:60px;border-radius:4px;background:#06b6d4;box-shadow:0 0 14px #06b6d4;margin-bottom:18px;"></div>
    <h2 style="font-size:46px;line-height:1.25;color:#ffffff;margin:0 0 12px 0;font-weight:800;letter-spacing:1px;">${model.title}</h2>
    ${model.subtitle ? `<p style="margin:0 0 26px 0;color:#93c5fd;font-size:22px;line-height:1.45;">${model.subtitle}</p>` : ''}
    <div style="width:100%;height:190px;border-radius:18px;border:1px dashed rgba(6,182,212,0.35);background:radial-gradient(circle at top left, rgba(6,182,212,0.2), rgba(0,0,0,0.1));display:flex;align-items:center;justify-content:center;color:#7dd3fc;font-size:42px;">
      ${imageHTML}
    </div>
  </div>
  <div style="width:65%;display:flex;flex-direction:column;justify-content:space-between;gap:16px;">
    ${cardHTML}
  </div>
</section>`;
}
