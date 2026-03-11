/**
 * 热身问题布局组件（互动方案专属）
 * 特征：大问号图标 + 思考气泡 + 倒计时提示 + 提示卡片
 */

import React from 'react';
import { WarmupQuestionModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface WarmupQuestionLayoutProps {
  model: WarmupQuestionModel;
  theme: ThemeConfig;
}

export const WarmupQuestionLayout: React.FC<WarmupQuestionLayoutProps> = ({ model, theme }) => {
  const { question, thinkTime, hints, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const iconContainerStyle = toInlineStyle({
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    marginBottom: '30px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  });

  const questionStyle = toInlineStyle({
    ...getTitleStyle(theme),
    fontSize: '36px',
    textAlign: 'center',
    maxWidth: '900px',
    lineHeight: '1.4',
    marginBottom: '40px',
  });

  const thinkTimeBadgeStyle = toInlineStyle({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: theme.decorations?.borderRadius || '20px',
    backgroundColor: theme.colors.accent,
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
    boxShadow: theme.decorations?.cardShadow || '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: '40px',
  });

  const hintsContainerStyle = toInlineStyle({
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '800px',
    width: '100%',
  });

  return (
    <section style={slideStyle}>
      {/* 大问号图标 */}
      <div style={iconContainerStyle}>
        ❓
      </div>

      {/* 问题文本 */}
      <h2 style={questionStyle}>{question}</h2>

      {/* 思考时间倒计时 */}
      {thinkTime && thinkTime > 0 && (
        <div style={thinkTimeBadgeStyle}>
          <span>⏱️</span>
          <span>思考时间：{thinkTime}秒</span>
        </div>
      )}

      {/* 提示卡片 */}
      {hints && hints.length > 0 && (
        <div style={hintsContainerStyle}>
          <div
            style={{
              fontSize: theme.sizes.bodySize,
              color: theme.colors.textLight,
              textAlign: 'center',
              marginBottom: '8px',
            }}
          >
            💡 思考提示
          </div>
          {hints.map((hint, index) => {
            const baseCardStyle = getCardStyle(theme);
            const hintCardStyle = toInlineStyle({
              ...baseCardStyle,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: theme.colors.backgroundAlt,
            });

            const hintNumberStyle = toInlineStyle({
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: theme.colors.secondary,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              flexShrink: '0',
            });

            const hintTextStyle = toInlineStyle({
              fontSize: theme.sizes.bodySize,
              color: theme.colors.text,
              lineHeight: '1.5',
            });

            return (
              <div key={index} style={hintCardStyle}>
                <div style={hintNumberStyle}>{index + 1}</div>
                <span style={hintTextStyle}>{hint}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// 添加display name用于调试
WarmupQuestionLayout.displayName = 'WarmupQuestionLayout';

export default WarmupQuestionLayout;
