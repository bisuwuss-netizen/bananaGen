/**
 * 样式工具函数
 * 用于生成内联样式，确保符合HTML转PPT规范
 */

import { ThemeConfig } from '../types/schema';

/**
 * 将样式对象转换为内联样式字符串
 */
export function toInlineStyle(styles: Record<string, string | number | undefined>): string {
  return Object.entries(styles)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}:${value}`;
    })
    .join('; ');
}

/**
 * 合并多个样式对象
 */
export function mergeStyles(
  ...styleObjects: (Record<string, string | number | undefined> | undefined)[]
): Record<string, string | number | undefined> {
  return Object.assign({}, ...styleObjects.filter(Boolean));
}

/**
 * 基础幻灯片样式
 */
export function getBaseSlideStyle(theme: ThemeConfig): Record<string, string | number> {
  const baseStyle: Record<string, string | number> = {
    width: `${theme.sizes.slideWidth}px`,
    height: `${theme.sizes.slideHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    boxSizing: 'border-box',
    padding: theme.spacing.padding,
  };

  // 应用背景图案（如果配置了）
  if (theme.backgroundPatterns?.content) {
    baseStyle.backgroundImage = `url(${theme.backgroundPatterns.content})`;
    baseStyle.backgroundSize = 'cover';
    baseStyle.backgroundPosition = 'center';
    if (theme.backgroundPatterns.opacity !== undefined) {
      baseStyle.backgroundOpacity = theme.backgroundPatterns.opacity;
    }
  }

  return baseStyle;
}

/**
 * 标题样式
 */
export function getTitleStyle(theme: ThemeConfig): Record<string, string> {
  return {
    fontSize: theme.sizes.titleSize,
    fontWeight: 'bold',
    color: theme.colors.primary,
    margin: '0',
    lineHeight: '1.3',
    fontFamily: theme.fonts.title,
  };
}

/**
 * 副标题样式
 */
export function getSubtitleStyle(theme: ThemeConfig): Record<string, string> {
  return {
    fontSize: theme.sizes.subtitleSize,
    color: theme.colors.textLight,
    margin: '0',
    marginTop: '12px',
    lineHeight: '1.4',
  };
}

/**
 * 正文样式
 */
export function getBodyStyle(theme: ThemeConfig): Record<string, string> {
  return {
    fontSize: theme.sizes.bodySize,
    color: theme.colors.text,
    lineHeight: '1.6',
    margin: '0',
  };
}

/**
 * Flex容器样式
 */
export function getFlexStyle(
  direction: 'row' | 'column' = 'row',
  justify: string = 'flex-start',
  align: string = 'stretch',
  gap?: string
): Record<string, string> {
  return {
    display: 'flex',
    flexDirection: direction,
    justifyContent: justify,
    alignItems: align,
    ...(gap && { gap }),
  };
}

/**
 * 居中定位样式（绝对定位）
 */
export function getCenterPositionStyle(): Record<string, string> {
  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };
}

/**
 * 卡片样式
 */
export function getCardStyle(theme: ThemeConfig): Record<string, string> {
  const cardStyle: Record<string, string> = {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.decorations?.borderRadius || '12px',
    padding: '24px',
    boxShadow: theme.decorations?.cardShadow || '0 2px 8px rgba(0,0,0,0.08)',
  };

  // 应用强调边框（如果配置了）
  if (theme.decorations?.accentBorder) {
    cardStyle.borderLeft = `4px solid ${theme.colors.accent}`;
  }

  return cardStyle;
}

/**
 * 圆形数字标记样式
 */
export function getCircleNumberStyle(
  theme: ThemeConfig,
  size: number = 48
): Record<string, string | number> {
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: theme.colors.secondary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size * 0.5}px`,
    fontWeight: 'bold',
    flexShrink: '0',
  };
}

/**
 * 图标样式
 */
export function getIconStyle(
  theme: ThemeConfig,
  size: number = 24
): Record<string, string | number> {
  return {
    width: `${size}px`,
    height: `${size}px`,
    color: theme.colors.accent,
    flexShrink: '0',
  };
}

/**
 * 生成渐变背景
 */
export function generateGradient(
  startColor: string,
  endColor: string,
  angle: number = 135
): string {
  return `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
}

/**
 * 图片占位符样式
 */
export function getImagePlaceholderStyle(
  width: string = '100%',
  height: string = '200px'
): Record<string, string> {
  return {
    width,
    height,
    backgroundColor: '#e2e8f0',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#a0aec0',
    fontSize: '14px',
    border: '2px dashed #cbd5e0',
  };
}

/**
 * 页脚样式（用于学术方案等需要显示页码的场景）
 */
export function getFooterStyle(theme: ThemeConfig): Record<string, string> | null {
  if (!theme.decorations?.footerStyle?.show) {
    return null;
  }

  return {
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
  };
}
