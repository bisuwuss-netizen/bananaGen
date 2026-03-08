/**
 * 标题+要点布局组件
 * 支持有图/无图两种渲染模式
 */

import React from 'react';
import { TitleBulletsModel, ThemeConfig } from '../../types/schema';
import { ImageSlotFrame } from '../../components/ImageSlotFrame';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getSubtitleStyle,
  getCardStyle,
} from '../../utils/styleHelper';

interface TitleBulletsLayoutProps {
  model: TitleBulletsModel;
  theme: ThemeConfig;
  onImageUpload?: () => void; // 图片上传回调
}

type BulletItem = {
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

function shouldUseSimpleBullets(bullets: BulletItem[]): boolean {
  if (!Array.isArray(bullets) || bullets.length === 0) return false;
  if (bullets.length <= 2) return false;
  return bullets.every((bullet) => !bullet.example && !bullet.note && !bullet.dataPoint);
}

export const TitleBulletsLayout: React.FC<TitleBulletsLayoutProps> = ({ model, theme, onImageUpload }) => {
  const variant = String((model as any).variant || 'a').toLowerCase();
  const { title, subtitle, bullets, image, background_image } = model;
  const hasImage = image && (image.src || image.src === '');
  const useSimpleBullets = shouldUseSimpleBullets(bullets as BulletItem[]);

  if (variant === 'b') {
    return (
      <TitleBulletsVariantB
        title={title}
        subtitle={subtitle}
        bullets={Array.isArray(bullets) ? (bullets as BulletItem[]) : []}
        keyTakeaway={model.keyTakeaway}
        background_image={background_image}
        theme={theme}
      />
    );
  }

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
  const subtitleStyle = toInlineStyle(getSubtitleStyle(theme));

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
      gap: useSimpleBullets ? '10px' : '16px',
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

    return (
      <section style={slideStyle}>
        <h2 style={parseStyle(titleStyle)}>{title}</h2>
        {subtitle && <p style={parseStyle(subtitleStyle)}>{subtitle}</p>}
        <div style={parseStyle(flexContainerStyle)}>
          <div style={parseStyle(bulletsColumnStyle)}>
            {useSimpleBullets
              ? bullets.map((bullet, index) => (
                <SimpleBulletLine key={index} bullet={bullet} theme={theme} />
              ))
              : bullets.map((bullet, index) => (
                <BulletCard key={index} bullet={bullet} theme={theme} compact />
              ))}
          </div>
          <div style={parseStyle(imageColumnStyle)}>
            <ImageSlotFrame
              src={image.src}
              alt={image.alt || ''}
              theme={theme}
              slotLabel="要点配图插槽"
              slotHint="建议使用横向说明图或案例图，配合左侧要点信息展示。"
              onClick={onImageUpload}
              frameStyle={parseStyle(imageFrameStyle)}
              imageStyle={parseStyle(imageStyle)}
            />
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

const TitleBulletsVariantB: React.FC<{
  title: string; subtitle?: string; bullets: BulletItem[];
  keyTakeaway?: string; background_image?: string; theme: ThemeConfig;
}> = ({ title, subtitle, bullets, keyTakeaway, background_image, theme }) => {
  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
  };
  const titleStyle = parseStyle(toInlineStyle({ ...getTitleStyle(theme), textShadow: '0 1px 2px rgba(0,0,0,0.1)' }));
  const subtitleStyleObj = parseStyle(toInlineStyle(getSubtitleStyle(theme)));
  const ktStyle = parseStyle(toInlineStyle({
    marginTop: '24px', padding: '16px 20px', backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.decorations?.borderRadius || '12px', borderLeft: `4px solid ${theme.colors.primary}`,
    fontSize: theme.sizes.bodySize, color: theme.colors.text, lineHeight: '1.5',
  }));
  return (
    <section style={slideStyle}>
      <h2 style={titleStyle}>{title}</h2>
      {subtitle && <p style={subtitleStyleObj}>{subtitle}</p>}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bullets.map((bullet, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', backgroundColor: theme.colors.secondary,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, flexShrink: 0,
            }}>{index + 1}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 600, color: theme.colors.text }}>{bullet.text}</p>
              {bullet.description && <p style={{ margin: '4px 0 0', fontSize: 15, color: theme.colors.textLight, lineHeight: 1.5 }}>{bullet.description}</p>}
            </div>
          </div>
        ))}
      </div>
      {keyTakeaway && <div style={ktStyle}><strong>🎯 核心要点：</strong>{keyTakeaway}</div>}
    </section>
  );
};

const BulletCard: React.FC<{
  bullet: BulletItem;
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

const SimpleBulletLine: React.FC<{
  bullet: BulletItem;
  theme: ThemeConfig;
}> = ({ bullet, theme }) => {
  const rowStyle = toInlineStyle({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  });

  const markerStyle = toInlineStyle({
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    flexShrink: '0',
    marginTop: '3px',
  });

  const textWrapStyle = toInlineStyle({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  });

  const titleStyle = toInlineStyle({
    fontSize: '18px',
    lineHeight: '1.5',
    color: theme.colors.text,
    margin: '0',
    fontWeight: '600',
  });

  const descriptionStyle = toInlineStyle({
    fontSize: '14px',
    lineHeight: '1.6',
    color: theme.colors.textLight,
    margin: '0',
  });

  const iconClass = bullet.icon
    ? bullet.icon.startsWith('fa') ? bullet.icon : `fa ${bullet.icon}`
    : 'fa fa-check';

  return (
    <div style={parseStyle(rowStyle)}>
      <div style={parseStyle(markerStyle)}>
        <i className={iconClass} />
      </div>
      <div style={parseStyle(textWrapStyle)}>
        <p style={parseStyle(titleStyle)}>{bullet.text}</p>
        {bullet.description && <p style={parseStyle(descriptionStyle)}>{bullet.description}</p>}
      </div>
    </div>
  );
};

export function renderTitleBulletsLayoutHTML(model: TitleBulletsModel, theme: ThemeConfig): string {
  const variant = String((model as any).variant || 'a').toLowerCase();
  if (variant === 'b') {
    return renderTitleBulletsVariantBHTML(model, theme);
  }
  const { title, subtitle, bullets, image, keyTakeaway, background_image } = model;
  const hasImage = image && (image.src !== undefined);
  const useSimpleBullets = shouldUseSimpleBullets(bullets as BulletItem[]);

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
      gap: useSimpleBullets ? '10px' : '16px',
    });

    const imageColumnStyle = toInlineStyle({
      width: imageWidth,
      flexShrink: '0',
      display: 'flex',
      alignItems: 'stretch',
    });

    const bulletsHTML = useSimpleBullets
      ? bullets.map((bullet) => renderSimpleBulletLineHTML(bullet, theme)).join('\n      ')
      : bullets.map((bullet) => renderBulletCardHTML(bullet, theme, true)).join('\n      ');

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
  ${keyTakeaway ? `<div style="${keyTakeawayStyle}"><strong>🎯 核心要点：</strong>${keyTakeaway}</div>` : ''}
</section>`;
}

function renderTitleBulletsVariantBHTML(model: TitleBulletsModel, theme: ThemeConfig): string {
  const { title, subtitle, bullets, image, keyTakeaway, background_image } = model;
  const hasImage = image && (image.src !== undefined);
  const palette = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    ...(background_image ? {
      backgroundImage: `url(${background_image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    } : {}),
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
    display: 'flex',
    flexDirection: 'column',
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

  const bulletsHTML = bullets.map((bullet, index) => {
    const color = palette[index % palette.length];
    const b = bullet as BulletItem;
    return `<div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:${index < bullets.length - 1 ? '20px' : '0'};position:relative;">
      <div style="position:absolute;left:-32px;top:2px;width:24px;height:24px;border-radius:50%;background-color:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;z-index:1;">${index + 1}</div>
      <div style="flex:1;">
        <p style="font-size:18px;font-weight:600;color:${theme.colors.text};margin:0 0 4px 0;line-height:1.4;">${b.text}</p>
        ${b.description ? `<p style="font-size:14px;color:${theme.colors.textLight};margin:0;line-height:1.5;">${b.description}</p>` : ''}
      </div>
    </div>`;
  }).join('\n');

  let imageHTML = '';
  if (hasImage) {
    if (image!.src) {
      imageHTML = `<div style="width:40%;flex-shrink:0;display:flex;align-items:stretch;"><div style="width:100%;border-radius:12px;overflow:hidden;"><img src="${image!.src}" alt="${image!.alt || ''}" style="width:100%;height:100%;object-fit:contain;" /></div></div>`;
    } else {
      imageHTML = `<div style="width:40%;flex-shrink:0;display:flex;align-items:stretch;"><div style="width:100%;background-color:${theme.colors.backgroundAlt};border-radius:12px;display:flex;align-items:center;justify-content:center;color:${theme.colors.textLight};font-size:14px;border:2px dashed ${theme.colors.secondary};"><span>点击上传图片</span></div></div>`;
    }
  }

  const keyTakeawayHTML = keyTakeaway ? `<div style="margin-top:20px;padding:14px 18px;background-color:${theme.colors.backgroundAlt};border-radius:${theme.decorations?.borderRadius || '12px'};border-left:4px solid ${theme.colors.primary};font-size:${theme.sizes.bodySize};color:${theme.colors.text};line-height:1.5;"><strong>🎯 核心要点：</strong>${keyTakeaway}</div>` : '';

  return `<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
  ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
  <div style="margin-top:30px;flex:1;display:flex;flex-direction:${hasImage ? 'row' : 'column'};gap:${hasImage ? '30px' : '0'};">
    <div style="flex:1;position:relative;padding-left:32px;">
      <div style="position:absolute;left:11px;top:12px;bottom:12px;width:2px;background:linear-gradient(to bottom,${theme.colors.primary},${theme.colors.secondary});opacity:0.3;"></div>
      ${bulletsHTML}
    </div>
    ${imageHTML}
  </div>
  ${keyTakeawayHTML}
</section>`;
}

function renderBulletCardHTML(
  bullet: BulletItem,
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
    marginTop: '6px',
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
        ${bullet.dataPoint ? `<div style="${dataPointStyle}"><span style="${dataValueStyle}">${bullet.dataPoint.value}</span><span style="${dataUnitStyle}">${bullet.dataPoint.unit}</span></div>` : ''}
        ${bullet.example ? `<div style="${exampleStyle}">💡 案例：${bullet.example}</div>` : ''}
        ${bullet.note ? `<div style="${noteStyle}">⚠️ 注意：${bullet.note}</div>` : ''}
      </div>
    </div>`;
}

function renderSimpleBulletLineHTML(bullet: BulletItem, theme: ThemeConfig): string {
  const rowStyle = toInlineStyle({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  });

  const markerStyle = toInlineStyle({
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    flexShrink: '0',
    marginTop: '3px',
  });

  const textWrapStyle = toInlineStyle({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  });

  const titleStyle = toInlineStyle({
    fontSize: '18px',
    lineHeight: '1.5',
    color: theme.colors.text,
    margin: '0',
    fontWeight: '600',
  });

  const descriptionStyle = toInlineStyle({
    fontSize: '14px',
    lineHeight: '1.6',
    color: theme.colors.textLight,
    margin: '0',
  });

  const iconClass = bullet.icon
    ? bullet.icon.startsWith('fa') ? bullet.icon : `fa ${bullet.icon}`
    : 'fa fa-check';

  return `<div style="${rowStyle}">
      <div style="${markerStyle}">
        <i class="${iconClass}"></i>
      </div>
      <div style="${textWrapStyle}">
        <p style="${titleStyle}">${bullet.text}</p>
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
