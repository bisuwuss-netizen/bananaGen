/**
 * 理论讲解布局组件（学术方案专属）
 * 特征：左栏理论文字 + 右栏数学公式 + 底部引用脚注
 */

import React from 'react';
import { TheoryExplanationModel, ThemeConfig } from '../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface TheoryExplanationLayoutProps {
  model: TheoryExplanationModel;
  theme: ThemeConfig;
}

export const TheoryExplanationLayout: React.FC<TheoryExplanationLayoutProps> = ({ model, theme }) => {
  // 防御性检查
  if (!model) {
    console.error('[TheoryExplanationLayout] model is null/undefined');
    return (
      <section style={{
        ...getBaseSlideStyle(theme),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee',
        color: '#c00',
      }}
      >
        错误: TheoryExplanationLayout model 为空
      </section>
    );
  }

  const { title, formulas, references, background_image } = model;
  // 确保 theory 是数组，防止 undefined.map 崩溃
  const theory = Array.isArray(model.theory) ? model.theory : [];

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const titleStyle = getTitleStyle(theme);

  const contentContainerStyle: React.CSSProperties = {
    marginTop: '36px',
    display: 'flex',
    gap: '30px',
    flex: 1,
    height: references && references.length > 0 ? 'calc(100% - 200px)' : 'calc(100% - 140px)',
  };

  const theoryColumnStyle: React.CSSProperties = {
    flex: formulas && formulas.length > 0 ? 1 : 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const formulaColumnStyle: React.CSSProperties = {
    width: '45%',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const theoryParagraphStyle: React.CSSProperties = {
    fontSize: theme.sizes.bodySize,
    color: theme.colors.text,
    lineHeight: '1.8',
    margin: 0,
    textAlign: 'justify',
  };

  return (
    <section style={slideStyle}>
      <h2 style={{ ...titleStyle, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{title}</h2>

      <div style={contentContainerStyle}>
        {/* 左栏：理论段落 */}
        <div style={theoryColumnStyle}>
          {theory.map((paragraph, index) => (
            <p key={index} style={theoryParagraphStyle}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* 右栏：公式（如果有） */}
        {formulas && formulas.length > 0 && (
          <div style={formulaColumnStyle}>
            {formulas.map((formula, index) => {
              const baseCardStyle = getCardStyle(theme);
              const formulaCardStyle: React.CSSProperties = {
                ...(baseCardStyle as React.CSSProperties),
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: '#fafafa',
              };

              const latexStyle: React.CSSProperties = {
                fontSize: '18px',
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: theme.colors.primary,
                textAlign: 'center',
                padding: '16px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: `1px solid ${theme.colors.backgroundAlt}`,
                overflowX: 'auto',
              };

              const explanationStyle: React.CSSProperties = {
                fontSize: theme.sizes.smallSize,
                color: theme.colors.textLight,
                lineHeight: '1.5',
                textAlign: 'center',
                fontStyle: 'italic',
              };

              return (
                <div key={index} style={formulaCardStyle}>
                  {/* LaTeX公式（简单渲染） */}
                  <div style={latexStyle}>
                    {formula.latex}
                  </div>

                  {/* 公式说明 */}
                  <p style={explanationStyle}>{formula.explanation}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 引用文献脚注（如果有） */}
      {references && references.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: theme.decorations?.footerStyle?.show ? '50px' : '10px',
            left: '60px',
            right: '60px',
            padding: '16px 20px',
            backgroundColor: theme.colors.backgroundAlt,
            borderRadius: theme.decorations?.borderRadius || '4px',
            borderLeft: `4px solid ${theme.colors.accent}`,
          }}
        >
          <div
            style={{
              fontSize: theme.sizes.smallSize,
              color: theme.colors.textLight,
              lineHeight: '1.6',
            }}
          >
            <strong>参考文献：</strong>
            {references.map((ref, index) => (
              <span key={index}>
                {index > 0 && '; '}
                [{index + 1}] {ref}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 页脚（如果配置了显示页脚） */}
      {theme.decorations?.footerStyle?.show && (
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: theme.decorations.footerStyle.height || '40px',
            backgroundColor: theme.decorations.footerStyle.backgroundColor || theme.colors.backgroundAlt,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 60px',
            fontSize: theme.sizes.smallSize,
            color: theme.colors.textLight,
            borderTop: `1px solid ${theme.colors.backgroundAlt}`,
          }}
        >
          <span>理论推导</span>
          <span>{new Date().toLocaleDateString('zh-CN')}</span>
        </div>
      )}
    </section>
  );
};

// 添加display name用于调试
TheoryExplanationLayout.displayName = 'TheoryExplanationLayout';

export default TheoryExplanationLayout;
