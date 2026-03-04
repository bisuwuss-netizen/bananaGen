/**
 * 引用页布局组件
 */

import React from 'react';
import { QuoteModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../utils/styleHelper';

interface QuoteLayoutProps {
  model: QuoteModel;
  theme: ThemeConfig;
}

export const QuoteLayout: React.FC<QuoteLayoutProps> = ({ model, theme }) => {
  const { quote, author, source, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : {}),
  };

  const containerStyle = toInlineStyle({
    maxWidth: '900px',
    textAlign: 'center',
    padding: '0 40px',
  });

  const quoteMarkStyle = toInlineStyle({
    fontSize: '120px',
    color: theme.colors.secondary,
    opacity: '0.2',
    lineHeight: '0.8',
    fontFamily: 'Georgia, serif',
  });

  const quoteTextStyle = toInlineStyle({
    fontSize: '32px',
    color: theme.colors.text,
    lineHeight: '1.6',
    margin: '0',
    marginTop: '-40px',
    fontStyle: 'italic',
    position: 'relative',
    zIndex: '1',
  });

  const authorStyle = toInlineStyle({
    fontSize: '20px',
    color: theme.colors.secondary,
    margin: '0',
    marginTop: '30px',
    fontWeight: '600',
  });

  const sourceStyle = toInlineStyle({
    fontSize: '16px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '8px',
  });

  return (
    <section style={slideStyle}>
      <div style={parseStyle(containerStyle)}>
        <div style={parseStyle(quoteMarkStyle)}>"</div>
        <p style={parseStyle(quoteTextStyle)}>{quote}</p>
        {author && <p style={parseStyle(authorStyle)}>— {author}</p>}
        {source && <p style={parseStyle(sourceStyle)}>{source}</p>}
      </div>
    </section>
  );
};

export function renderQuoteLayoutHTML(model: QuoteModel, theme: ThemeConfig): string {
  const { quote, author, source, background_image } = model;

  const slideStyle = toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundAlt,
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : {}),
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const containerStyle = toInlineStyle({
    maxWidth: '900px',
    textAlign: 'center',
    padding: '0 40px',
  });

  const quoteMarkStyle = toInlineStyle({
    fontSize: '120px',
    color: theme.colors.secondary,
    opacity: '0.2',
    lineHeight: '0.8',
    fontFamily: 'Georgia, serif',
  });

  const quoteTextStyle = toInlineStyle({
    fontSize: '32px',
    color: theme.colors.text,
    lineHeight: '1.6',
    margin: '0',
    marginTop: '-40px',
    fontStyle: 'italic',
    position: 'relative',
    zIndex: '1',
  });

  const authorStyle = toInlineStyle({
    fontSize: '20px',
    color: theme.colors.secondary,
    margin: '0',
    marginTop: '30px',
    fontWeight: '600',
  });

  const sourceStyle = toInlineStyle({
    fontSize: '16px',
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '8px',
  });

  return `<section style="${slideStyle}">
  <div style="${containerStyle}">
    <div style="${quoteMarkStyle}">"</div>
    <p style="${quoteTextStyle}">${quote}</p>
    ${author ? `<p style="${authorStyle}">— ${author}</p>` : ''}
    ${source ? `<p style="${sourceStyle}">${source}</p>` : ''}
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

export default QuoteLayout;
