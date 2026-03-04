/**
 * Tech Blue 主题配置
 * 适用于技术类/工程类教学PPT
 */

import { ThemeConfig } from '../types/schema';

export const techBlueTheme: ThemeConfig = {
  id: 'tech_blue',
  name: '科技发布',
  colors: {
    primary: '#0f4c81',
    secondary: '#1f78b4',
    accent: '#ff9f1c',
    text: '#1f2a37',
    textLight: '#526273',
    background: '#f7fbff',
    backgroundAlt: '#eaf3fb',
  },
  fonts: {
    title: "'Avenir Next', 'Segoe UI', 'PingFang SC', sans-serif",
    body: "'Avenir', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '46px',
    subtitleSize: '30px',
    bodySize: '24px',
    smallSize: '17px',
  },
  spacing: {
    padding: '56px',
    gap: '20px',
  },

  // 科技方案装饰配置：中等圆角、适中阴影、无页脚
  decorations: {
    borderRadius: '16px',
    cardShadow: '0 10px 28px rgba(15,76,129,0.14)',
    accentBorder: false,
    footerStyle: {
      show: false,
    },
  },

  layoutVariants: {
    titleBullets: {
      cardShape: 'rounded',
      iconStyle: 'filled',
    },
    twoColumn: {
      dividerStyle: 'solid',
      columnRatio: '50-50',
    },
  },
};

/**
 * 生成渐变背景样式
 */
export function generateGradientBackground(
  startColor: string = techBlueTheme.colors.primary,
  endColor: string = techBlueTheme.colors.secondary,
  angle: number = 135
): string {
  return `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
}

/**
 * 生成内联样式字符串
 * 将样式对象转换为内联样式字符串
 */
export function toInlineStyle(styles: Record<string, string | number>): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      // 将 camelCase 转换为 kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}:${value}`;
    })
    .join('; ');
}

/**
 * 获取基础幻灯片容器样式
 */
export function getSlideContainerStyle(theme: ThemeConfig): string {
  return toInlineStyle({
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    boxSizing: 'border-box',
  });
}

export default techBlueTheme;
