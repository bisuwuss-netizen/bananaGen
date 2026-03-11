/**
 * 流程步骤布局组件
 * 支持有图/无图两种渲染模式
 */

import React from 'react';
import { ProcessStepsModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getSubtitleStyle,
} from '../utils/styleHelper';

interface ProcessStepsLayoutProps {
  model: ProcessStepsModel;
  theme: ThemeConfig;
  onImageUpload?: () => void; // 图片上传回调
}

export const ProcessStepsLayout: React.FC<ProcessStepsLayoutProps> = ({ model, theme, onImageUpload }) => {
  const { title, subtitle, steps, image, background_image } = model;
  const hasImage = image && (image.src || image.src === '');

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

  // 有图模式：步骤在上，图片在下
  if (hasImage) {
    const stepsContainerStyle = toInlineStyle({
      marginTop: '30px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '16px',
      position: 'relative',
    });

    const connectorStyle = toInlineStyle({
      position: 'absolute',
      top: '30px',
      left: '60px',
      right: '60px',
      height: '3px',
      backgroundColor: theme.colors.backgroundAlt,
      zIndex: '0',
    });

    const imageContainerStyle = toInlineStyle({
      marginTop: '30px',
      display: 'flex',
      justifyContent: 'center',
    });

    const imageFrameStyle = toInlineStyle({
      width: image.width || '90%',
      height: '320px',
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
      width: image.width || '90%',
      height: '320px',
      backgroundColor: theme.colors.backgroundAlt,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.colors.textLight,
      fontSize: '14px',
      border: `2px dashed ${theme.colors.secondary}`,
      cursor: onImageUpload ? 'pointer' : 'default',
    });

    return (
      <section style={slideStyle}>
        <h2 style={parseStyle(titleStyle)}>{title}</h2>
        {subtitle && <p style={parseStyle(subtitleStyle)}>{subtitle}</p>}
        <div style={parseStyle(stepsContainerStyle)}>
          <div style={parseStyle(connectorStyle)} />
          {steps.map((step, index) => (
            <StepCard key={index} step={step} theme={theme} compact />
          ))}
        </div>
        <div style={parseStyle(imageContainerStyle)}>
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
      </section>
    );
  }

  // 无图模式：原有布局
  const stepsContainerStyle = toInlineStyle({
    marginTop: '50px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
    position: 'relative',
  });

  const connectorStyle = toInlineStyle({
    position: 'absolute',
    top: '40px',
    left: '80px',
    right: '80px',
    height: '4px',
    backgroundColor: theme.colors.backgroundAlt,
    zIndex: '0',
  });

  return (
    <section style={slideStyle}>
      <h2 style={parseStyle(titleStyle)}>{title}</h2>
      {subtitle && <p style={parseStyle(subtitleStyle)}>{subtitle}</p>}
      <div style={parseStyle(stepsContainerStyle)}>
        <div style={parseStyle(connectorStyle)} />
        {steps.map((step, index) => (
          <StepCard key={index} step={step} theme={theme} />
        ))}
      </div>
    </section>
  );
};

const StepCard: React.FC<{
  step: { number: number; label: string; description?: string; icon?: string };
  theme: ThemeConfig;
  compact?: boolean;
}> = ({ step, theme, compact }) => {
  const cardStyle = toInlineStyle({
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
    zIndex: '1',
  });

  const circleStyle = toInlineStyle({
    width: compact ? '60px' : '80px',
    height: compact ? '60px' : '80px',
    borderRadius: '50%',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? '22px' : '28px',
    fontWeight: 'bold',
    marginBottom: compact ? '12px' : '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  });

  const labelStyle = toInlineStyle({
    fontSize: compact ? '16px' : '20px',
    fontWeight: '600',
    color: theme.colors.text,
    margin: '0',
  });

  const descriptionStyle = toInlineStyle({
    fontSize: compact ? '12px' : '14px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '6px',
    lineHeight: '1.4',
    maxWidth: compact ? '120px' : '150px',
  });

  return (
    <div style={parseStyle(cardStyle)}>
      <div style={parseStyle(circleStyle)}>
        {step.icon ? (
          <i className={step.icon.startsWith('fa') ? step.icon : `fa ${step.icon}`} />
        ) : (
          step.number
        )}
      </div>
      <p style={parseStyle(labelStyle)}>{step.label}</p>
      {step.description && (
        <p style={parseStyle(descriptionStyle)}>{step.description}</p>
      )}
    </div>
  );
};

export function renderProcessStepsLayoutHTML(model: ProcessStepsModel, theme: ThemeConfig): string {
  const { title, subtitle, steps, image, background_image } = model;
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

  const subtitleStyle = toInlineStyle({
    fontSize: theme.sizes.subtitleSize,
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '12px',
    lineHeight: '1.4',
  });

  // 有图模式
  if (hasImage) {
    const stepsContainerStyle = toInlineStyle({
      marginTop: '30px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '16px',
      position: 'relative',
    });

    const connectorStyle = toInlineStyle({
      position: 'absolute',
      top: '30px',
      left: '60px',
      right: '60px',
      height: '3px',
      backgroundColor: theme.colors.backgroundAlt,
      zIndex: '0',
    });

    const imageContainerStyle = toInlineStyle({
      marginTop: '30px',
      display: 'flex',
      justifyContent: 'center',
    });

    const stepsHTML = steps.map((step) => renderStepCardHTML(step, theme, true)).join('\n    ');

    let imageHTML = '';
    if (image.src) {
      const imageFrameStyle = toInlineStyle({
        width: image.width || '90%',
        height: '320px',
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
        width: image.width || '90%',
        height: '320px',
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
  <div style="${stepsContainerStyle}">
    <div style="${connectorStyle}"></div>
    ${stepsHTML}
  </div>
  <div style="${imageContainerStyle}">
    ${imageHTML}
  </div>
</section>`;
  }

  // 无图模式
  const stepsContainerStyle = toInlineStyle({
    marginTop: '50px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
    position: 'relative',
  });

  const connectorStyle = toInlineStyle({
    position: 'absolute',
    top: '40px',
    left: '80px',
    right: '80px',
    height: '4px',
    backgroundColor: theme.colors.backgroundAlt,
    zIndex: '0',
  });

  const stepsHTML = steps.map((step) => renderStepCardHTML(step, theme, false)).join('\n    ');

  return `<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
  ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
  <div style="${stepsContainerStyle}">
    <div style="${connectorStyle}"></div>
    ${stepsHTML}
  </div>
</section>`;
}

function renderStepCardHTML(
  step: { number: number; label: string; description?: string; icon?: string },
  theme: ThemeConfig,
  compact: boolean
): string {
  const cardStyle = toInlineStyle({
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
    zIndex: '1',
  });

  const circleStyle = toInlineStyle({
    width: compact ? '60px' : '80px',
    height: compact ? '60px' : '80px',
    borderRadius: '50%',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? '22px' : '28px',
    fontWeight: 'bold',
    marginBottom: compact ? '12px' : '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  });

  const labelStyle = toInlineStyle({
    fontSize: compact ? '16px' : '20px',
    fontWeight: '600',
    color: theme.colors.text,
    margin: '0',
  });

  const descriptionStyle = toInlineStyle({
    fontSize: compact ? '12px' : '14px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '6px',
    lineHeight: '1.4',
    maxWidth: compact ? '120px' : '150px',
  });

  const iconClass = step.icon
    ? step.icon.startsWith('fa') ? step.icon : `fa ${step.icon}`
    : '';
  const circleContent = iconClass
    ? `<i class="${iconClass}"></i>`
    : String(step.number);

  return `<div style="${cardStyle}">
      <div style="${circleStyle}">${circleContent}</div>
      <p style="${labelStyle}">${step.label}</p>
      ${step.description ? `<p style="${descriptionStyle}">${step.description}</p>` : ''}
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

export default ProcessStepsLayout;
