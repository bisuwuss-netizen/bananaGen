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

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    padding: '0',
    ...(background_image
      ? { background: `url(${background_image}) center/cover no-repeat` }
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

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    background: background_image
      ? `url(${background_image}) center/cover no-repeat`
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
