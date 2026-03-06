/**
 * 安全提示布局组件（实践方案专属）
 * 特征：危险等级颜色 + 警告图标 + 强调框
 */

import React from 'react';
import { SafetyNoticeModel, ThemeConfig } from '../types/schema';
import {
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface SafetyNoticeLayoutProps {
  model: SafetyNoticeModel;
  theme: ThemeConfig;
}

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const SafetyNoticeLayout: React.FC<SafetyNoticeLayoutProps> = ({ model, theme }) => {
  const { title, warnings, summary, background_image } = model;

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

  const titleStyle = asStyle({ ...getTitleStyle(theme), textShadow: '0 1px 2px rgba(0,0,0,0.1)' });

  const warningsContainerStyle = asStyle({
    marginTop: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  });

  // 危险等级配置
  const getLevelConfig = (level: 'danger' | 'warning' | 'caution') => {
    const configs = {
      danger: {
        color: '#dc2626',
        bgColor: '#fef2f2',
        icon: '⚠️',
        label: '危险',
      },
      warning: {
        color: '#ea580c',
        bgColor: '#fff7ed',
        icon: '⚡',
        label: '警告',
      },
      caution: {
        color: '#ca8a04',
        bgColor: '#fefce8',
        icon: '⚠',
        label: '注意',
      },
    };
    return configs[level];
  };

  return (
    <section style={slideStyle}>
      <h2 style={titleStyle}>{title}</h2>

      <div style={warningsContainerStyle}>
        {warnings.map((warning, index) => {
          const config = getLevelConfig(warning.level);
          const baseCardStyle = getCardStyle(theme);
          const warningCardStyle = asStyle({
            ...baseCardStyle,
            backgroundColor: config.bgColor,
            borderLeft: `6px solid ${config.color}`,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          });

          const iconContainerStyle = asStyle({
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: config.color,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            flexShrink: '0',
          });

          const contentStyle = asStyle({
            flex: '1',
          });

          const levelBadgeStyle = asStyle({
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: config.color,
            color: '#ffffff',
            fontSize: theme.sizes.smallSize,
            fontWeight: 'bold',
            marginBottom: '8px',
          });

          const warningTextStyle = asStyle({
            fontSize: theme.sizes.bodySize,
            color: theme.colors.text,
            lineHeight: '1.6',
            margin: '0',
          });

          return (
            <div key={index} style={warningCardStyle}>
              {/* 警告图标 */}
              <div style={iconContainerStyle}>
                {warning.icon || config.icon}
              </div>

              {/* 警告内容 */}
              <div style={contentStyle}>
                <div style={levelBadgeStyle}>{config.label}</div>
                <p style={warningTextStyle}>{warning.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 总结说明 */}
      {summary && (
        <div
          style={{
            marginTop: '30px',
            padding: '20px 24px',
            backgroundColor: theme.colors.backgroundAlt,
            borderRadius: theme.decorations?.borderRadius || '12px',
            borderLeft: `4px solid ${theme.colors.primary}`,
          }}
        >
          <div
            style={{
              fontSize: theme.sizes.smallSize,
              color: theme.colors.text,
              lineHeight: '1.6',
            }}
          >
            <strong>💡 安全提示：</strong> {summary}
          </div>
        </div>
      )}
    </section>
  );
};

// 添加display name用于调试
SafetyNoticeLayout.displayName = 'SafetyNoticeLayout';

export default SafetyNoticeLayout;
