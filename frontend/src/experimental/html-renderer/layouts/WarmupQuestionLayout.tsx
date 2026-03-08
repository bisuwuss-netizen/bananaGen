/**
 * 热身问题布局组件（互动方案专属）
 * 特征：大问号图标 + 思考气泡 + 倒计时提示 + 提示卡片
 */

import React from 'react';
import { WarmupQuestionModel, ThemeConfig } from '../types/schema';
import {
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
  toInlineStyle,
} from '../utils/styleHelper';

interface WarmupQuestionLayoutProps {
  model: WarmupQuestionModel;
  theme: ThemeConfig;
}

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const WarmupQuestionLayout: React.FC<WarmupQuestionLayoutProps> = ({ model, theme }) => {
  const { question, thinkTime, hints, background_image } = model;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const iconContainerStyle = asStyle({
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

  const questionStyle = asStyle({
    ...getTitleStyle(theme),
    fontSize: '36px',
    textAlign: 'center',
    maxWidth: '900px',
    lineHeight: '1.4',
    marginBottom: '40px',
  });

  const thinkTimeBadgeStyle = asStyle({
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

  const hintsContainerStyle = asStyle({
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
            const hintCardStyle = asStyle({
              ...baseCardStyle,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: theme.colors.backgroundAlt,
            });

            const hintNumberStyle = asStyle({
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

            const hintTextStyle = asStyle({
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

export function renderWarmupQuestionLayoutHTML(model: WarmupQuestionModel, theme: ThemeConfig): string {
  const { question, thinkTime, hints, background_image } = model;
  const slideStyle = toInlineStyle({
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  });

  const questionStyle = toInlineStyle({
    ...getTitleStyle(theme),
    fontSize: '36px', textAlign: 'center', maxWidth: '900px', lineHeight: '1.4', marginBottom: '40px',
  });

  const hintsHTML = (hints || []).map((hint, index) => {
    const hintCardStyle = toInlineStyle({
      ...getCardStyle(theme),
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
    });
    return `
    <div style="${hintCardStyle}">
      <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${theme.colors.secondary}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; flex-shrink: 0;">${index + 1}</div>
      <span style="font-size: ${theme.sizes.bodySize}; color: ${theme.colors.text}; line-height: 1.5;">${hint}</span>
    </div>`;
  }).join('\n');

  return `
<section style="${slideStyle}">
  <div style="width: 120px; height: 120px; border-radius: 50%; background-color: ${theme.colors.secondary}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 64px; margin-bottom: 30px;">❓</div>
  <h2 style="${questionStyle}">${question}</h2>
  ${thinkTime ? `<div style="padding: 12px 24px; border-radius: 20px; background-color: ${theme.colors.accent}; color: #ffffff; font-size: 20px; font-weight: bold; margin-bottom: 40px;">⏱️ 思考时间：${thinkTime}秒</div>` : ''}
  <div style="max-width: 800px; width: 100%;">
    ${hintsHTML}
  </div>
</section>`;
}

// 添加display name用于调试
WarmupQuestionLayout.displayName = 'WarmupQuestionLayout';

export default WarmupQuestionLayout;
