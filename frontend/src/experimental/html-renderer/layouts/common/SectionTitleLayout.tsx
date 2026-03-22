/**
 * 章节标题页布局组件
 */

import React from 'react';
import { SectionTitleModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../../utils/styleHelper';

interface SectionTitleLayoutProps {
  model: SectionTitleModel;
  theme: ThemeConfig;
}

export const SectionTitleLayout: React.FC<SectionTitleLayoutProps> = ({ model, theme }) => {
  const { section_number, title, subtitle, description, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    padding: '0',
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
  };

  const numberBgStyle: React.CSSProperties = {
    fontSize: '200px',
    fontWeight: 'bold',
    color: theme.colors.secondary,
    opacity: 0.08,
    position: 'absolute',
    right: '-20px',
    bottom: '-30px',
    fontFamily: theme.fonts.title,
    lineHeight: '1',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    display: 'flex',
    alignItems: 'center',
  };

  const leftBarStyle: React.CSSProperties = {
    width: '12px',
    alignSelf: 'stretch',
    backgroundColor: theme.colors.secondary,
    marginRight: '60px',
    flexShrink: 0,
  };

  const textContainerStyle: React.CSSProperties = {
    flex: 1,
    paddingRight: '200px',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '18px',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: '3px',
    margin: '0',
    marginBottom: '16px',
    fontWeight: '600',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: theme.colors.primary,
    margin: '0',
    lineHeight: '1.2',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '22px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '16px',
    lineHeight: '1.4',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '16px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '20px',
    lineHeight: '1.6',
    maxWidth: '600px',
    opacity: 0.85,
  };

  return (
    <section style={slideStyle}>
      <span style={numberBgStyle}>{String(section_number).padStart(2, '0')}</span>
      <div style={contentStyle}>
        <div style={leftBarStyle} />
        <div style={textContainerStyle}>
          <p style={sectionLabelStyle}>第 {section_number} 部分</p>
          <h1 style={titleStyle}>{title}</h1>
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          {description && <p style={descriptionStyle}>{description}</p>}
        </div>
      </div>
    </section>
  );
};

export function renderSectionTitleLayoutHTML(model: SectionTitleModel, theme: ThemeConfig): string {
  const { section_number, title, subtitle, description, background_image } = model;

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

  const numberBgStyle = toInlineStyle({
    fontSize: '200px',
    fontWeight: 'bold',
    color: theme.colors.secondary,
    opacity: '0.08',
    position: 'absolute',
    right: '-20px',
    bottom: '-30px',
    fontFamily: theme.fonts.title,
    lineHeight: '1',
    userSelect: 'none',
    pointerEvents: 'none',
  });

  const contentStyle = toInlineStyle({
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    display: 'flex',
    alignItems: 'center',
  });

  const leftBarStyle = toInlineStyle({
    width: '12px',
    alignSelf: 'stretch',
    backgroundColor: theme.colors.secondary,
    marginRight: '60px',
    flexShrink: '0',
  });

  const textContainerStyle = toInlineStyle({
    flex: '1',
    paddingRight: '200px',
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

  const descriptionStyle = toInlineStyle({
    fontSize: '16px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '20px',
    lineHeight: '1.6',
    maxWidth: '600px',
    opacity: '0.85',
  });

  return `<section style="${slideStyle}">
  <span style="${numberBgStyle}">${String(section_number).padStart(2, '0')}</span>
  <div style="${contentStyle}">
    <div style="${leftBarStyle}"></div>
    <div style="${textContainerStyle}">
      <p style="${sectionLabelStyle}">第 ${section_number} 部分</p>
      <h1 style="${titleStyle}">${title}</h1>
      ${subtitle ? `<p style="${subtitleStyle}">${subtitle}</p>` : ''}
      ${description ? `<p style="${descriptionStyle}">${description}</p>` : ''}
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

export default SectionTitleLayout;
