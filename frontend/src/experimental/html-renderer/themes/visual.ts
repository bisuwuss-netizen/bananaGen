import { ThemeConfig } from '../types/schema';

export const visualTheme: ThemeConfig = {
  id: 'visual',
  name: '视觉叙事',
  colors: {
    primary: '#111827',
    secondary: '#0f766e',
    accent: '#f43f5e',
    text: '#1a2433',
    textLight: '#5b6472',
    background: '#fffcfa',
    backgroundAlt: '#fff1eb',
  },
  fonts: {
    title: "'DIN Alternate', 'Avenir Next', 'PingFang SC', sans-serif",
    body: "'Avenir', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '50px',
    subtitleSize: '28px',
    bodySize: '22px',
    smallSize: '17px',
  },
  spacing: {
    padding: '52px',
    gap: '20px',
  },

  // 视觉方案装饰配置：大圆角、强阴影、重视觉冲击
  decorations: {
    borderRadius: '18px',
    cardShadow: '0 16px 34px rgba(17,24,39,0.18)',
    accentBorder: false,
    footerStyle: {
      show: false,
    },
  },

  layoutVariants: {
    titleBullets: {
      cardShape: 'rounded',
      iconStyle: 'outlined',
    },
    twoColumn: {
      dividerStyle: 'none',
      columnRatio: '40-60',
    },
  },
};

export default visualTheme;
