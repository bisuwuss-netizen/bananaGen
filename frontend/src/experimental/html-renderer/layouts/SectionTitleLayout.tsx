/**
 * 章节标题页布局组件
 */

import React from 'react';
import { SectionTitleModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../utils/styleHelper';

interface SectionTitleLayoutProps {
  model: SectionTitleModel;
  theme: ThemeConfig;
}

export const SectionTitleLayout: React.FC<SectionTitleLayoutProps> = ({ model, theme }) => {
  const { section_number, title, subtitle, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    padding: '0',
    backgroundColor: theme.colors.backgroundAlt,
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : {}),
  };

  const contentStyle = toInlineStyle({
    position: 'absolute',
    top: '50%',
    left: '0',
    transform: 'translateY(-50%)',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  });

  const leftBarStyle = toInlineStyle({
    width: '12px',
    height: '200px',
    backgroundColor: theme.colors.secondary,
    marginRight: '60px',
  });

  const textContainerStyle = toInlineStyle({
    flex: '1',
    paddingRight: '80px',
  });

  const numberStyle = toInlineStyle({
    fontSize: '120px',
    fontWeight: 'bold',
    color: theme.colors.secondary,
    opacity: '0.2',
    position: 'absolute',
    right: '80px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontFamily: theme.fonts.title,
  });

  const sectionLabelStyle = toInlineStyle({
    fontSize: '18px',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: '3px',
    margin: '0',
    marginBottom: '16px',
    fontWeight: '600',
  });

  const titleStyle = toInlineStyle({
    fontSize: '48px',
    fontWeight: 'bold',
    color: theme.colors.primary,
    margin: '0',
    lineHeight: '1.2',
  });

  const subtitleStyle = toInlineStyle({
    fontSize: '22px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '16px',
    lineHeight: '1.4',
  });

  return (
    <section style={slideStyle}>
      <div style={parseStyle(contentStyle)}>
        <div style={parseStyle(leftBarStyle)} />
        <div style={parseStyle(textContainerStyle)}>
          <p style={parseStyle(sectionLabelStyle)}>
            第 {section_number} 部分
          </p>
          <h1 style={parseStyle(titleStyle)}>{title}</h1>
          {subtitle && <p style={parseStyle(subtitleStyle)}>{subtitle}</p>}
        </div>
        <span style={parseStyle(numberStyle)}>
          {String(section_number).padStart(2, '0')}
        </span>
      </div>
    </section>
  );
};

export function renderSectionTitleLayoutHTML(model: SectionTitleModel, theme: ThemeConfig): string {
  const { section_number, title, subtitle, background_image } = model;

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : {}),
  });

  const contentStyle = toInlineStyle({
    position: 'absolute',
    top: '50%',
    left: '0',
    transform: 'translateY(-50%)',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  });

  const leftBarStyle = toInlineStyle({
    width: '12px',
    height: '200px',
    backgroundColor: theme.colors.secondary,
    marginRight: '60px',
  });

  const textContainerStyle = toInlineStyle({
    flex: '1',
    paddingRight: '80px',
  });

  const numberStyle = toInlineStyle({
    fontSize: '120px',
    fontWeight: 'bold',
    color: theme.colors.secondary,
    opacity: '0.2',
    position: 'absolute',
    right: '80px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontFamily: theme.fonts.title,
  });

  const sectionLabelStyle = toInlineStyle({
    fontSize: '18px',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: '3px',
    margin: '0',
    marginBottom: '16px',
    fontWeight: '600',
  });

  const titleStyle = toInlineStyle({
    fontSize: '48px',
    fontWeight: 'bold',
    color: theme.colors.primary,
    margin: '0',
    lineHeight: '1.2',
  });

  const subtitleStyle = toInlineStyle({
    fontSize: '22px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '16px',
    lineHeight: '1.4',
  });

  return `<section style="${slideStyle}">
  <div style="${contentStyle}">
    <div style="${leftBarStyle}"></div>
    <div style="${textContainerStyle}">
      <p style="${sectionLabelStyle}">第 ${section_number} 部分</p>
      <h1 style="${titleStyle}">${title}</h1>
      ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
    </div>
    <span style="${numberStyle}">${String(section_number).padStart(2, '0')}</span>
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

export default SectionTitleLayout;
