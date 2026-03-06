/**
 * 投票互动布局组件（互动方案专属）
 * 特征：投票选项卡 + 表情符号 + 百分比进度条
 */

import React from 'react';
import { PollInteractiveModel, ThemeConfig } from '../types/schema';
import {
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface PollInteractiveLayoutProps {
  model: PollInteractiveModel;
  theme: ThemeConfig;
}

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const PollInteractiveLayout: React.FC<PollInteractiveLayoutProps> = ({ model, theme }) => {
  const { question, options, instruction, background_image } = model;

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

  const titleStyle = asStyle({
    ...getTitleStyle(theme),
    textAlign: 'center',
    marginBottom: '16px',
  });

  const instructionStyle = asStyle({
    fontSize: theme.sizes.bodySize,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: '40px',
  });

  const optionsContainerStyle = asStyle({
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '900px',
    margin: '0 auto',
  });

  // 默认投票结果（演示用，实际使用时可以是动态的）
  const demoResults = options.map(() => ({
    votes: Math.floor(Math.random() * 100),
    percentage: 0,
  }));

  const totalVotes = demoResults.reduce((sum, r) => sum + r.votes, 0);
  demoResults.forEach((result) => {
    result.percentage = totalVotes > 0 ? Math.round((result.votes / totalVotes) * 100) : 0;
  });

  return (
    <section style={slideStyle}>
      {/* 投票问题 */}
      <h2 style={titleStyle}>{question}</h2>

      {/* 投票说明 */}
      {instruction && (
        <p style={instructionStyle}>
          📱 {instruction}
        </p>
      )}

      {/* 投票选项 */}
      <div style={optionsContainerStyle}>
        {options.map((option, index) => {
          const baseCardStyle = getCardStyle(theme);
          const optionCardStyle = asStyle({
            ...baseCardStyle,
            padding: '20px 24px',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            position: 'relative',
            overflow: 'hidden',
          });

          const optionHeaderStyle = asStyle({
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
            position: 'relative',
            zIndex: '1',
          });

          const emojiStyle = asStyle({
            fontSize: '32px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.backgroundAlt,
            borderRadius: theme.decorations?.borderRadius || '12px',
            flexShrink: '0',
          });

          const optionTextStyle = asStyle({
            fontSize: theme.sizes.bodySize,
            color: theme.colors.text,
            fontWeight: '600',
            flex: '1',
          });

          const percentageStyle = asStyle({
            fontSize: '24px',
            color: theme.colors.primary,
            fontWeight: 'bold',
            flexShrink: '0',
          });

          const progressBarBgStyle = asStyle({
            position: 'absolute',
            top: '0',
            left: '0',
            bottom: '0',
            width: `${demoResults[index].percentage}%`,
            backgroundColor: theme.colors.secondary,
            opacity: '0.15',
            borderRadius: theme.decorations?.borderRadius || '12px',
            transition: 'width 0.5s ease',
            zIndex: '0',
          });

          return (
            <div
              key={index}
              style={optionCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* 背景进度条 */}
              <div style={progressBarBgStyle}></div>

              {/* 选项内容 */}
              <div style={optionHeaderStyle}>
                {/* 表情符号 */}
                <div style={emojiStyle}>
                  {option.emoji || String.fromCharCode(65 + index)}
                </div>

                {/* 选项文本 */}
                <span style={optionTextStyle}>{option.text}</span>

                {/* 百分比 */}
                <span style={percentageStyle}>
                  {demoResults[index].percentage}%
                </span>
              </div>

              {/* 投票数 */}
              <div
                style={{
                  fontSize: theme.sizes.smallSize,
                  color: theme.colors.textLight,
                  textAlign: 'right',
                  position: 'relative',
                  zIndex: '1',
                }}
              >
                {demoResults[index].votes} 票
              </div>
            </div>
          );
        })}
      </div>

      {/* 总投票数 */}
      <div
        style={{
          marginTop: '30px',
          textAlign: 'center',
          fontSize: theme.sizes.bodySize,
          color: theme.colors.textLight,
        }}
      >
        总投票数：{totalVotes} 票
      </div>
    </section>
  );
};

// 添加display name用于调试
PollInteractiveLayout.displayName = 'PollInteractiveLayout';

export default PollInteractiveLayout;
