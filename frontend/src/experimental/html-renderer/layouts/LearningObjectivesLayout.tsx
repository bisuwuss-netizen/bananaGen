/**
 * 学习目标布局组件（学术方案专属）
 * 特征：SMART目标结构 + 复选框 + 学时标签 + 认知层级标记
 */

import React from 'react';
import { LearningObjectivesModel, ThemeConfig } from '../types/schema';
import {
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface LearningObjectivesLayoutProps {
  model: LearningObjectivesModel;
  theme: ThemeConfig;
}

export const LearningObjectivesLayout: React.FC<LearningObjectivesLayoutProps> = ({ model, theme }) => {
  // 防御性检查
  if (!model) {
    console.error('[LearningObjectivesLayout] model is null/undefined');
    return (
      <section style={{
        ...getBaseSlideStyle(theme),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee',
        color: '#c00',
      }}>
        错误: LearningObjectivesLayout model 为空
      </section>
    );
  }

  const { title, course_code, background_image } = model;
  // 确保 objectives 是数组，防止 undefined.map 崩溃
  const objectives = Array.isArray(model.objectives) ? model.objectives : [];

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

  const titleStyle = getTitleStyle(theme);

  const objectivesContainerStyle: React.CSSProperties = {
    marginTop: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  // 认知层级颜色映射
  const getLevelColor = (level: string): string => {
    const levelMap: Record<string, string> = {
      '记忆': '#94a3b8',
      '理解': '#60a5fa',
      '应用': '#34d399',
      '分析': '#fbbf24',
      '综合': '#fb923c',
      '评价': '#f87171',
    };
    return levelMap[level] || theme.colors.secondary;
  };

  return (
    <section style={slideStyle}>
      <h2 style={{ ...titleStyle, marginBottom: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{title}</h2>

      {/* 课程代码（如果有） */}
      {course_code && (
        <div style={{
          fontSize: theme.sizes.smallSize,
          color: theme.colors.textLight,
          marginBottom: '20px',
        }}>
          课程代码: {course_code}
        </div>
      )}

      <div style={objectivesContainerStyle}>
        {objectives.map((objective, index) => {
          const baseCardStyle = getCardStyle(theme);
          const cardStyle: React.CSSProperties = {
            ...baseCardStyle as React.CSSProperties,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            padding: '20px',
            position: 'relative',
          };

          const checkboxStyle: React.CSSProperties = {
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: `2px solid ${theme.colors.secondary}`,
            backgroundColor: objective.checked ? theme.colors.secondary : 'transparent',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold',
          };

          const contentStyle: React.CSSProperties = {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          };

          const levelBadgeStyle: React.CSSProperties = {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: getLevelColor(objective.level),
            color: '#ffffff',
            fontSize: theme.sizes.smallSize,
            fontWeight: 600,
            marginRight: '8px',
          };

          const hoursBadgeStyle: React.CSSProperties = {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: theme.colors.backgroundAlt,
            color: theme.colors.textLight,
            fontSize: theme.sizes.smallSize,
            border: `1px solid ${theme.colors.secondary}`,
          };

          const textStyle: React.CSSProperties = {
            fontSize: theme.sizes.bodySize,
            color: theme.colors.text,
            lineHeight: '1.6',
            margin: 0,
          };

          return (
            <div key={index} style={cardStyle}>
              {/* 复选框 */}
              <div style={checkboxStyle}>
                {objective.checked && '✓'}
              </div>

              {/* 内容 */}
              <div style={contentStyle}>
                {/* 认知层级标签 + 学时标签 */}
                <div>
                  <span style={levelBadgeStyle}>{objective.level}</span>
                  {objective.hours && (
                    <span style={hoursBadgeStyle}>{objective.hours}学时</span>
                  )}
                </div>

                {/* 目标描述 */}
                <p style={textStyle}>{objective.text}</p>
              </div>
            </div>
          );
        })}
      </div>

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
          <span>{course_code || ''}</span>
          <span>学习目标</span>
        </div>
      )}
    </section>
  );
};

// 添加display name用于调试
LearningObjectivesLayout.displayName = 'LearningObjectivesLayout';

export default LearningObjectivesLayout;
