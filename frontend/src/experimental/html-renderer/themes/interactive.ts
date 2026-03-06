import { ThemeConfig } from '../types/schema';

export const interactiveTheme: ThemeConfig = {
  id: 'interactive',
  name: '课堂互动',
  colors: {
    primary: '#1d4ed8',
    secondary: '#14b8a6',
    accent: '#f97316',
    text: '#0f2137',
    textLight: '#54657a',
    background: '#f8fcff',
    backgroundAlt: '#ecf7ff',
  },
  fonts: {
    title: "'Poppins', 'Avenir Next', 'PingFang SC', sans-serif",
    body: "'Avenir', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '48px',
    subtitleSize: '30px',
    bodySize: '23px',
    smallSize: '18px',
  },
  spacing: {
    padding: '54px',
    gap: '22px',
  },

  // 互动方案装饰配置：大圆角、强阴影、无页脚
  decorations: {
    borderRadius: '22px',
    cardShadow: '0 14px 30px rgba(29,78,216,0.16)',
    accentBorder: false,
    footerStyle: {
      show: false,
    },
  },

  layoutVariants: {
    titleBullets: {
      cardShape: 'rounded',
      iconStyle: 'hand-drawn',
    },
    twoColumn: {
      dividerStyle: 'none',
      columnRatio: '50-50',
    },
  },
};

export default interactiveTheme;
