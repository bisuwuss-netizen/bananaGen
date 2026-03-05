/**
 * 细节标注布局组件（实践方案专属）
 * 特征：主图片 + 标注点 + 标注说明
 */

import React from 'react';
import { DetailZoomModel, ThemeConfig } from '../types/schema';
import {
  toCSS,
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface DetailZoomLayoutProps {
  model: DetailZoomModel;
  theme: ThemeConfig;
}

export const DetailZoomLayout: React.FC<DetailZoomLayoutProps> = ({ model, theme }) => {
  const { title, image_src, annotations, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const titleStyle = toCSS({ ...getTitleStyle(theme), textShadow: '0 1px 2px rgba(0,0,0,0.1)' });

  const contentContainerStyle = toCSS({
    marginTop: '36px',
    display: 'flex',
    gap: '30px',
    height: 'calc(100% - 140px)',
  });

  const imageContainerStyle = toCSS({
    flex: '1.2',
    position: 'relative',
    borderRadius: theme.decorations?.borderRadius || '12px',
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
  });

  const imageStyle = toCSS({
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  });

  const annotationsListStyle = toCSS({
    flex: '0.8',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
  });

  return (
    <section style={slideStyle}>
      <h2 style={titleStyle}>{title}</h2>

      <div style={contentContainerStyle}>
        {/* 左侧：主图片 + 标注点 */}
        <div style={imageContainerStyle}>
          {image_src ? (
            <img src={image_src} alt={title} style={imageStyle} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.textLight,
              }}
            >
              图片占位符
            </div>
          )}

          {/* 标注点 */}
          {annotations.map((annotation, index) => {
            const markerStyle = toCSS({
              position: 'absolute',
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: theme.colors.accent,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: '2',
              border: '3px solid #ffffff',
            });

            const pulseStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: theme.colors.accent,
              opacity: 0.5,
              animation: 'pulse 2s infinite',
              zIndex: 1,
            };

            return (
              <React.Fragment key={index}>
                {/* 脉冲动画背景 */}
                <div style={pulseStyle}></div>
                {/* 标注点 */}
                <div style={markerStyle}>
                  {index + 1}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* 右侧：标注说明列表 */}
        <div style={annotationsListStyle}>
          {annotations.map((annotation, index) => {
            const baseCardStyle = getCardStyle(theme);
            const annotationCardStyle = toCSS({
              ...baseCardStyle,
              padding: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            });

            const numberBadgeStyle = toCSS({
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: theme.colors.accent,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              flexShrink: '0',
            });

            const contentStyle = toCSS({
              flex: '1',
            });

            const labelStyle = toCSS({
              fontSize: theme.sizes.bodySize,
              fontWeight: 'bold',
              color: theme.colors.text,
              marginBottom: '4px',
            });

            const descStyle = toCSS({
              fontSize: theme.sizes.smallSize,
              color: theme.colors.textLight,
              lineHeight: '1.5',
            });

            return (
              <div key={index} style={annotationCardStyle}>
                <div style={numberBadgeStyle}>{index + 1}</div>
                <div style={contentStyle}>
                  <div style={labelStyle}>{annotation.label}</div>
                  <div style={descStyle}>{annotation.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 内联CSS动画 */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.5;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0.2;
            }
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.5;
            }
          }
        `}
      </style>
    </section>
  );
};

// 添加display name用于调试
DetailZoomLayout.displayName = 'DetailZoomLayout';

export default DetailZoomLayout;
