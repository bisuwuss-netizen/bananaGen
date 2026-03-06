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
  const variant = String(model.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderProcessStepsVariantB(model, theme, onImageUpload);
  }

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
  const variant = String(model.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderProcessStepsVariantBHTML(model, theme);
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

function renderProcessStepsVariantB(
  model: ProcessStepsModel,
  theme: ThemeConfig,
  onImageUpload?: () => void
): React.ReactElement {
  const steps = (model.steps || []).slice(0, 4);
  const palette = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b'];
  const fallbackSteps = steps.length > 0 ? steps : [{ number: 1, label: model.title || '步骤', description: '围绕目标设计并推进执行。' }];

  return (
    <section
      style={{
        width: theme.sizes.slideWidth,
        height: theme.sizes.slideHeight,
        background: model.background_image
          ? `linear-gradient(rgba(8,15,34,0.86), rgba(8,15,34,0.92)), url(${model.background_image}) center/cover no-repeat`
          : '#0b1120',
        padding: '60px 80px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: theme.fonts.body,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: '2px solid rgba(6,182,212,0.3)',
          paddingBottom: 20,
          marginBottom: 56,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 8, height: 40, borderRadius: 4, background: '#06b6d4', marginRight: 18 }} />
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: 42, fontWeight: 800, lineHeight: 1.2 }}>{model.title}</h2>
        </div>
        {model.subtitle && (
          <div style={{ color: '#93c5fd', fontSize: 22, lineHeight: 1.4, maxWidth: 420, textAlign: 'right' }}>
            {model.subtitle}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: '12%',
            right: '12%',
            height: 4,
            background: 'linear-gradient(to right, rgba(6,182,212,0.95), rgba(59,130,246,0.55), rgba(16,185,129,0.45))',
            zIndex: 1,
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 20, height: '100%' }}>
          {fallbackSteps.map((step, index) => {
            const color = palette[index % palette.length];
            const stepNo = String(step.number ?? index + 1).padStart(2, '0');
            const description = step.description || '明确阶段目标、执行动作和交付结果。';
            return (
              <div key={`${step.label}-${index}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    border: `4px solid ${color}`,
                    background: '#0b1120',
                    color,
                    fontSize: 28,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 26,
                    boxSizing: 'border-box',
                    boxShadow: `0 0 18px ${color}55`,
                  }}
                >
                  {step.icon ? <i className={step.icon.startsWith('fa') ? step.icon : `fa ${step.icon}`} /> : stepNo}
                </div>

                <div
                  style={{
                    width: '100%',
                    flex: 1,
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderTop: `4px solid ${color}`,
                    background: index === 0
                      ? 'linear-gradient(180deg, rgba(6,182,212,0.14), rgba(0,0,0,0.05))'
                      : 'rgba(255,255,255,0.03)',
                    padding: '28px 24px',
                    boxSizing: 'border-box',
                  }}
                >
                  <h3 style={{ margin: '0 0 16px 0', color, fontSize: 24, textAlign: 'center', lineHeight: 1.3 }}>
                    {step.label}
                  </h3>
                  <p style={{ margin: 0, color: '#cbd5e1', fontSize: 16, lineHeight: 1.7 }}>
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {model.image?.src && (
        <div
          style={{
            position: 'absolute',
            right: 84,
            bottom: 24,
            width: 140,
            height: 100,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: onImageUpload ? 'pointer' : 'default',
          }}
          onClick={onImageUpload}
        >
          <img src={model.image.src} alt={model.image.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
    </section>
  );
}

function renderProcessStepsVariantBHTML(model: ProcessStepsModel, theme: ThemeConfig): string {
  const steps = (model.steps || []).slice(0, 4);
  const palette = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b'];
  const fallbackSteps = steps.length > 0 ? steps : [{ number: 1, label: model.title || '步骤', description: '围绕目标设计并推进执行。' }];
  const background = model.background_image
    ? `linear-gradient(rgba(8,15,34,0.86), rgba(8,15,34,0.92)), url(${model.background_image}) center/cover no-repeat`
    : '#0b1120';

  const stepHTML = fallbackSteps.map((step, index) => {
    const color = palette[index % palette.length];
    const stepNo = String(step.number ?? index + 1).padStart(2, '0');
    const iconClass = step.icon ? (step.icon.startsWith('fa') ? step.icon : `fa ${step.icon}`) : '';
    const head = iconClass ? `<i class="${iconClass}"></i>` : stepNo;
    const description = step.description || '明确阶段目标、执行动作和交付结果。';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
      <div style="width:64px;height:64px;border-radius:50%;border:4px solid ${color};background:#0b1120;color:${color};font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:26px;box-sizing:border-box;box-shadow:0 0 18px ${color}55;">${head}</div>
      <div style="width:100%;flex:1;border-radius:16px;border:1px solid rgba(255,255,255,0.1);border-top:4px solid ${color};background:${index === 0 ? 'linear-gradient(180deg, rgba(6,182,212,0.14), rgba(0,0,0,0.05))' : 'rgba(255,255,255,0.03)'};padding:28px 24px;box-sizing:border-box;">
        <h3 style="margin:0 0 16px 0;color:${color};font-size:24px;text-align:center;line-height:1.3;">${step.label}</h3>
        <p style="margin:0;color:#cbd5e1;font-size:16px;line-height:1.7;">${description}</p>
      </div>
    </div>`;
  }).join('\n');

  const subtitleHTML = model.subtitle
    ? `<div style="color:#93c5fd;font-size:22px;line-height:1.4;max-width:420px;text-align:right;">${model.subtitle}</div>`
    : '';
  const imageDockHTML = model.image?.src
    ? `<div style="position:absolute;right:84px;bottom:24px;width:140px;height:100px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.2);"><img src="${model.image.src}" alt="${model.image.alt || ''}" style="width:100%;height:100%;object-fit:cover;" /></div>`
    : '';

  return `<section style="width:${theme.sizes.slideWidth}px;height:${theme.sizes.slideHeight}px;background:${background};padding:60px 80px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;font-family:${theme.fonts.body};position:relative;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(6,182,212,0.3);padding-bottom:20px;margin-bottom:56px;">
    <div style="display:flex;align-items:center;">
      <div style="width:8px;height:40px;border-radius:4px;background:#06b6d4;margin-right:18px;"></div>
      <h2 style="margin:0;color:#ffffff;font-size:42px;font-weight:800;line-height:1.2;">${model.title}</h2>
    </div>
    ${subtitleHTML}
  </div>
  <div style="position:relative;flex:1;">
    <div style="position:absolute;top:30px;left:12%;right:12%;height:4px;background:linear-gradient(to right, rgba(6,182,212,0.95), rgba(59,130,246,0.55), rgba(16,185,129,0.45));z-index:1;"></div>
    <div style="position:relative;z-index:2;display:flex;gap:20px;height:100%;">
      ${stepHTML}
    </div>
  </div>
  ${imageDockHTML}
</section>`;
}
