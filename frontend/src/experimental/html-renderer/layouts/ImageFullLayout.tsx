/**
 * 全图页布局组件
 */

import React from 'react';
import { ImageFullModel, ThemeConfig } from '../types/schema';
import { ImageSlotFrame } from '../components/ImageSlotFrame';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getImagePlaceholderStyle,
} from '../utils/styleHelper';

interface ImageFullLayoutProps {
  model: ImageFullModel;
  theme: ThemeConfig;
  onImageUpload?: () => void; // 图片上传回调
}

export const ImageFullLayout: React.FC<ImageFullLayoutProps> = ({ model, theme, onImageUpload }) => {
  const { title, image_src, image_alt, caption, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : {}),
  };

  const titleStyle = toInlineStyle({
    fontSize: '36px',
    fontWeight: 'bold',
    color: theme.colors.primary,
    margin: '0',
    marginBottom: '20px',
    textAlign: 'center',
  });

  const imageContainerStyle = toInlineStyle({
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  });

  const imageFrameStyle = toInlineStyle({
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  });

  const imageStyle = toInlineStyle({
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
  });

  const captionStyle = toInlineStyle({
    fontSize: '16px',
    color: theme.colors.textLight,
    textAlign: 'center',
    margin: '0',
    marginTop: '16px',
    fontStyle: 'italic',
  });

  return (
    <section style={slideStyle}>
      {title && <h2 style={parseStyle(titleStyle)}>{title}</h2>}
      <div style={parseStyle(imageContainerStyle)}>
        <ImageSlotFrame
          src={image_src}
          alt={image_alt || ''}
          theme={theme}
          slotLabel="全幅图片插槽"
          slotHint="建议使用横向主视觉图，当前页会按 contain 完整呈现。"
          onClick={onImageUpload}
          frameStyle={parseStyle(imageFrameStyle)}
          imageStyle={parseStyle(imageStyle)}
          placeholderStyle={{ width: '80%', height: '400px' }}
        />
      </div>
      {caption && <p style={parseStyle(captionStyle)}>{caption}</p>}
    </section>
  );
};

export function renderImageFullLayoutHTML(model: ImageFullModel, theme: ThemeConfig): string {
  const { title, image_src, image_alt, caption, background_image } = model;

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
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
  });

  const titleStyle = toInlineStyle({
    fontSize: '36px',
    fontWeight: 'bold',
    color: theme.colors.primary,
    margin: '0',
    marginBottom: '20px',
    textAlign: 'center',
  });

  const imageContainerStyle = toInlineStyle({
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  });

  const imageFrameStyle = toInlineStyle({
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  });

  const imageStyle = toInlineStyle({
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
  });

  const captionStyle = toInlineStyle({
    fontSize: '16px',
    color: theme.colors.textLight,
    textAlign: 'center',
    margin: '0',
    marginTop: '16px',
    fontStyle: 'italic',
  });

  let imageHTML = '';
  if (image_src) {
    imageHTML = `<div style="${imageFrameStyle}"><img src="${image_src}" alt="${image_alt || ''}" style="${imageStyle}" /></div>`;
  } else {
    const placeholderStyle = toInlineStyle(getImagePlaceholderStyle('80%', '400px'));
    imageHTML = `<div style="${placeholderStyle}">[图片占位]</div>`;
  }

  return `<section style="${slideStyle}">
  ${title ? `<h2 style="${titleStyle}">${title}</h2>` : ''}
  <div style="${imageContainerStyle}">
    ${imageHTML}
  </div>
  ${caption ? `<p style="${captionStyle}">${caption}</p>` : ''}
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

export default ImageFullLayout;
