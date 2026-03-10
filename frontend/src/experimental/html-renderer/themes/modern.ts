import { ThemeConfig } from '../types/schema';

/**
 * 现代创新主题 - Modern Creative Theme
 * 设计理念：大胆的色彩对比、非对称布局、强烈的视觉冲击力
 * 适用场景：科技演示、创意设计、产品发布、教育培训
 */

export const modernTheme: ThemeConfig = {
  id: 'modern',
  name: '现代创新',
  colors: {
    primary: '#14213d',
    secondary: '#1f3a5f',
    accent: '#ff7b00',
    text: '#1d2633',
    textLight: '#5a6575',
    background: '#f4f8fc',
    backgroundAlt: '#ffffff',
  },
  fonts: {
    title: "'Poppins', 'Avenir Next', 'PingFang SC', sans-serif",
    body: "'Avenir', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '46px',
    subtitleSize: '26px',
    bodySize: '20px',
    smallSize: '15px',
  },
  spacing: {
    padding: '54px',
    gap: '20px',
  },

  // 现代方案装饰配置：大圆角、强阴影、无边框
  decorations: {
    borderRadius: '20px',
    cardShadow: '0 18px 40px rgba(20,33,61,0.16)',
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
      dividerStyle: 'none',
      columnRatio: '50-50',
    },
  },
};

export default modernTheme;
