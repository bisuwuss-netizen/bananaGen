/**
 * 同心聚焦布局 - Concentric Focus Layout
 * 设计理念：利用多层半透明圆形构建"靶心"效果，将视线强制引导至屏幕正中央
 * 适用场景：提出关键问题、展示核心论点、转场页
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { ConcentricFocusModel, ThemeConfig } from '../types/schema';

interface ConcentricFocusLayoutProps {
  model: ConcentricFocusModel;
  theme: ThemeConfig;
}

function normalizeConcentricFocusModel(model: Partial<ConcentricFocusModel> & { content?: string[]; highlight?: string }): ConcentricFocusModel {
  if (model.label !== undefined && model.title !== undefined) {
    return model as ConcentricFocusModel;
  }
  const content = model.content || [];
  const contentText = Array.isArray(content) ? content.join(' ') : String(content);
  return {
    label: 'FOCUS',
    title: model.title || '核心问题',
    subtitle: model.subtitle || contentText.slice(0, 50) || model.highlight,
    accent_color: model.accent_color || '#4a90e2',
    background_image: model.background_image,
  };
}

export const ConcentricFocusLayout: React.FC<ConcentricFocusLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeConcentricFocusModel(model);
  const { label, title, subtitle, accent_color = '#4a90e2', background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    backgroundColor: '#0c1427',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const ring1Style: React.CSSProperties = {
    position: 'absolute',
    width: '900px',
    height: '900px',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '50%',
  };

  const ring2Style: React.CSSProperties = {
    position: 'absolute',
    width: '600px',
    height: '600px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50%',
  };

  const glowStyle: React.CSSProperties = {
    position: 'absolute',
    width: '400px',
    height: '400px',
    background: `radial-gradient(circle, ${accent_color}33 0%, ${accent_color}00 70%)`,
    borderRadius: '50%',
  };

  const contentStyle: React.CSSProperties = {
    zIndex: 10,
    textAlign: 'center',
    color: '#ffffff',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '16px',
    letterSpacing: '4px',
    color: accent_color,
    marginBottom: '20px',
    fontWeight: 'bold',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '64px',
    margin: 0,
    lineHeight: 1.2,
    textShadow: `0 0 20px ${accent_color}80`,
  };

  const dividerStyle: React.CSSProperties = {
    width: '60px',
    height: '4px',
    background: accent_color,
    margin: '30px auto',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '20px',
    color: '#aab7c4',
  };

  return (
    <section style={slideStyle}>
      <div style={ring1Style} />
      <div style={ring2Style} />
      <div style={glowStyle} />

      <div style={contentStyle}>
        <div style={labelStyle}>{label}</div>
        <h1 style={titleStyle}>
          {title.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < title.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </h1>
        <div style={dividerStyle} />
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      </div>
    </section>
  );
};

export function renderConcentricFocusLayoutHTML(model: ConcentricFocusModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeConcentricFocusModel(model);
  const { label, title, subtitle, accent_color = '#4a90e2', background_image } = normalizedModel;

  const slideBg = background_image
    ? `url(${background_image})`
    : '#0c1427';

  const titleWithBreaks = title.replace(/\n/g, '<br/>');

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; font-family: ${theme.fonts.body};"
>
  <div style="position: absolute; width: 900px; height: 900px; border: 1px solid rgba(255,255,255,0.05); border-radius: 50%;"
  ></div>
  <div style="position: absolute; width: 600px; height: 600px; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%;"
  ></div>
  <div style="width: 400px; height: 400px; background: radial-gradient(circle, ${accent_color}33 0%, ${accent_color}00 70%); position: absolute; border-radius: 50%;"
  ></div>

  <div style="z-index: 10; text-align: center; color: #ffffff;"
  >
    <div style="font-size: 16px; letter-spacing: 4px; color: ${accent_color}; margin-bottom: 20px; font-weight: bold;"
    >${label}</div>
    <h1 style="font-size: 64px; margin: 0; line-height: 1.2; text-shadow: 0 0 20px ${accent_color}80;"
    >${titleWithBreaks}</h1>
    <div style="width: 60px; height: 4px; background: ${accent_color}; margin: 30px auto;"
    ></div>
    ${subtitle ? `<p style="font-size: 20px; color: #aab7c4;"
    >${subtitle}</p>` : ''}
  </div>
</section>`;
}

export default ConcentricFocusLayout;
