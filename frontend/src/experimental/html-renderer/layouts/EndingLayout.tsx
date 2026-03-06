/**
 * 结束页布局组件
 */

import React from 'react';
import { EndingModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  generateGradient,
} from '../utils/styleHelper';

interface EndingLayoutProps {
  model: EndingModel;
  theme: ThemeConfig;
}

export const EndingLayout: React.FC<EndingLayoutProps> = ({ model, theme }) => {
  const { title, subtitle, contact, background_image } = model;
  const isLightBackground = !!background_image;
  const variant = String(model.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEndingVariantB(model, theme);
  }

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    padding: '0',
    ...(background_image
      ? { background: `linear-gradient(rgba(11,17,32,0.72), rgba(17,24,39,0.72)), url(${background_image}) center/cover no-repeat, ${generateGradient(theme.colors.primary, theme.colors.secondary, 135)}` }
      : { background: generateGradient(theme.colors.primary, theme.colors.secondary, 135) }),
  };

  const contentStyle = toInlineStyle({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    width: '80%',
  });

  const titleStyle = toInlineStyle({
    fontSize: '56px',
    fontWeight: 'bold',
    color: isLightBackground ? '#111111' : '#ffffff',
    margin: '0',
    textShadow: isLightBackground ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
  });

  const subtitleStyle = toInlineStyle({
    fontSize: '24px',
    color: isLightBackground ? '#333333' : 'rgba(255,255,255,0.85)',
    margin: '0',
    marginTop: '20px',
  });

  const decorStyle = toInlineStyle({
    width: '60px',
    height: '4px',
    backgroundColor: theme.colors.accent,
    margin: '30px auto',
    borderRadius: '2px',
  });

  const contactStyle = toInlineStyle({
    fontSize: '18px',
    color: isLightBackground ? '#333333' : 'rgba(255,255,255,0.7)',
    margin: '0',
    marginTop: '20px',
  });

  return (
    <section style={slideStyle}>
      <div style={parseStyle(contentStyle)}>
        <h1 style={parseStyle(titleStyle)}>{title}</h1>
        {subtitle && <p style={parseStyle(subtitleStyle)}>{subtitle}</p>}
        <div style={parseStyle(decorStyle)} />
        {contact && <p style={parseStyle(contactStyle)}>{contact}</p>}
      </div>
    </section>
  );
};

export function renderEndingLayoutHTML(model: EndingModel, theme: ThemeConfig): string {
  const { title, subtitle, contact, background_image } = model;
  const isLightBackground = !!background_image;
  const variant = String(model.variant || 'a').toLowerCase();

  if (variant === 'b') {
    return renderEndingVariantBHTML(model, theme);
  }

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    background: background_image
      ? `linear-gradient(rgba(11,17,32,0.72), rgba(17,24,39,0.72)), url(${background_image}) center/cover no-repeat, ${generateGradient(theme.colors.primary, theme.colors.secondary, 135)}`
      : generateGradient(theme.colors.primary, theme.colors.secondary, 135),
  });

  const contentStyle = toInlineStyle({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    width: '80%',
  });

  const titleStyle = toInlineStyle({
    fontSize: '56px',
    fontWeight: 'bold',
    color: isLightBackground ? '#111111' : '#ffffff',
    margin: '0',
    textShadow: isLightBackground ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
  });

  const subtitleStyle = toInlineStyle({
    fontSize: '24px',
    color: isLightBackground ? '#333333' : 'rgba(255,255,255,0.85)',
    margin: '0',
    marginTop: '20px',
  });

  const decorStyle = toInlineStyle({
    width: '60px',
    height: '4px',
    backgroundColor: theme.colors.accent,
    margin: '30px auto',
    borderRadius: '2px',
  });

  const contactStyle = toInlineStyle({
    fontSize: '18px',
    color: isLightBackground ? '#333333' : 'rgba(255,255,255,0.7)',
    margin: '0',
    marginTop: '20px',
  });

  return `<section style="${slideStyle}">
  <div style="${contentStyle}">
    <h1 style="${titleStyle}">${title}</h1>
    ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
    <div style="${decorStyle}"></div>
    ${contact ? `<p style="${contactStyle}">${contact}</p>` : ''}
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

export default EndingLayout;

function renderEndingVariantB(model: EndingModel, theme: ThemeConfig): React.ReactElement {
  const contact = typeof model.contact === 'string' ? model.contact : '';
  const blocks = (model.reflection_blocks || []).slice(0, 4);
  const fallbackBlocks = blocks.length > 0
    ? blocks
    : [
      { title: '技术底座层面', items: ['持续优化推理时延与并发容量。'] },
      { title: '教学教法层面', items: ['沉淀可复用课程模板与师训机制。'] },
      { title: '数据反馈闭环', items: ['缩短预警到干预链路，形成持续迭代。'] },
    ];
  const headline = model.closing || model.subtitle || '构建可信赖、可持续优化的智慧教育新生态。';
  const titlePalette = ['#67e8f9', '#93c5fd', '#6ee7b7', '#fbbf24'];

  return (
    <section
      style={{
        width: theme.sizes.slideWidth,
        height: theme.sizes.slideHeight,
        background: model.background_image
          ? `linear-gradient(rgba(11,17,32,0.72), rgba(17,24,39,0.72)), url(${model.background_image}) center/cover no-repeat, linear-gradient(180deg, #0b1120 0%, #172554 100%)`
          : 'linear-gradient(180deg, #0b1120 0%, #172554 100%)',
        padding: '56px 72px',
        boxSizing: 'border-box',
        display: 'flex',
        gap: 34,
        overflow: 'hidden',
        fontFamily: theme.fonts.body,
      }}
    >
      <div
        style={{
          width: '35%',
          borderRadius: 24,
          border: '1px solid #06b6d4',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.22) 0%, rgba(59,130,246,0.36) 100%)',
          boxShadow: '0 0 36px rgba(6,182,212,0.2)',
          padding: '48px 36px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 24, left: 26, fontSize: 56, color: 'rgba(255,255,255,0.2)' }}>💡</div>
        <h2 style={{ margin: '0 0 24px 0', color: '#ffffff', fontSize: 44, lineHeight: 1.2, fontWeight: 800 }}>
          {model.title}
        </h2>
        <div style={{ width: 58, height: 4, background: '#ffffff', marginBottom: 32 }} />
        <p style={{ margin: 0, color: '#e2e8f0', fontSize: 25, lineHeight: 1.6, fontWeight: 700 }}>
          {headline}
        </p>
        {contact && (
          <p style={{ margin: '28px 0 0 0', color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 1.4 }}>
            {contact}
          </p>
        )}
      </div>

      <div style={{ width: '65%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
        {fallbackBlocks.map((block, index) => {
          const items = Array.isArray(block.items) && block.items.length > 0 ? block.items : ['围绕该维度制定可执行的改进动作。'];
          const titleColor = titlePalette[index % titlePalette.length];
          return (
            <div
              key={`${block.title}-${index}`}
              style={{
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                padding: '22px 26px',
                boxSizing: 'border-box',
                display: 'flex',
                gap: 24,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 196,
                  flexShrink: 0,
                  textAlign: 'right',
                  paddingRight: 18,
                  borderRight: '1px solid rgba(255,255,255,0.1)',
                  color: titleColor,
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                {block.title}
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 18, lineHeight: 1.6 }}>
                {items.map((item, itemIndex) => (
                  <li key={`${item}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function renderEndingVariantBHTML(model: EndingModel, theme: ThemeConfig): string {
  const blocks = (model.reflection_blocks || []).slice(0, 4);
  const fallbackBlocks = blocks.length > 0
    ? blocks
    : [
      { title: '技术底座层面', items: ['持续优化推理时延与并发容量。'] },
      { title: '教学教法层面', items: ['沉淀可复用课程模板与师训机制。'] },
      { title: '数据反馈闭环', items: ['缩短预警到干预链路，形成持续迭代。'] },
    ];
  const headline = model.closing || model.subtitle || '构建可信赖、可持续优化的智慧教育新生态。';
  const titlePalette = ['#67e8f9', '#93c5fd', '#6ee7b7', '#fbbf24'];
  const background = model.background_image
    ? `linear-gradient(rgba(11,17,32,0.72), rgba(17,24,39,0.72)), url(${model.background_image}) center/cover no-repeat, linear-gradient(180deg, #0b1120 0%, #172554 100%)`
    : 'linear-gradient(180deg, #0b1120 0%, #172554 100%)';

  const blockHTML = fallbackBlocks.map((block, index) => {
    const items = Array.isArray(block.items) && block.items.length > 0 ? block.items : ['围绕该维度制定可执行的改进动作。'];
    const itemsHTML = items.map((item) => `<li>${item}</li>`).join('');
    const titleColor = titlePalette[index % titlePalette.length];
    return `<div style="border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);padding:22px 26px;box-sizing:border-box;display:flex;gap:24px;align-items:center;">
      <div style="width:196px;flex-shrink:0;text-align:right;padding-right:18px;border-right:1px solid rgba(255,255,255,0.1);color:${titleColor};font-size:24px;font-weight:700;line-height:1.3;">${block.title}</div>
      <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:18px;line-height:1.6;">${itemsHTML}</ul>
    </div>`;
  }).join('\n');

  const contactHTML = model.contact
    ? `<p style="margin:28px 0 0 0;color:rgba(255,255,255,0.82);font-size:16px;line-height:1.4;">${model.contact}</p>`
    : '';

  return `<section style="width:${theme.sizes.slideWidth}px;height:${theme.sizes.slideHeight}px;background:${background};padding:56px 72px;box-sizing:border-box;display:flex;gap:34px;overflow:hidden;font-family:${theme.fonts.body};">
  <div style="width:35%;border-radius:24px;border:1px solid #06b6d4;background:linear-gradient(135deg, rgba(6,182,212,0.22) 0%, rgba(59,130,246,0.36) 100%);box-shadow:0 0 36px rgba(6,182,212,0.2);padding:48px 36px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;position:relative;">
    <div style="position:absolute;top:24px;left:26px;font-size:56px;color:rgba(255,255,255,0.2);">💡</div>
    <h2 style="margin:0 0 24px 0;color:#ffffff;font-size:44px;line-height:1.2;font-weight:800;">${model.title}</h2>
    <div style="width:58px;height:4px;background:#ffffff;margin-bottom:32px;"></div>
    <p style="margin:0;color:#e2e8f0;font-size:25px;line-height:1.6;font-weight:700;">${headline}</p>
    ${contactHTML}
  </div>
  <div style="width:65%;display:flex;flex-direction:column;justify-content:space-between;gap:16px;">
    ${blockHTML}
  </div>
</section>`;
}
