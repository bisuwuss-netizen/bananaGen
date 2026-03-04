import { ThemeConfig } from '../types/schema';

export const practicalTheme: ThemeConfig = {
  id: 'practical',
  name: '实践操作',
  colors: {
    primary: '#0f6a62',
    secondary: '#1f9d75',
    accent: '#f59e0b',
    text: '#1d2a34',
    textLight: '#566678',
    background: '#fbfdfc',
    backgroundAlt: '#edf7f3',
  },
  fonts: {
    title: "'Avenir Next', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    body: "'Avenir', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '45px',
    subtitleSize: '28px',
    bodySize: '22px',
    smallSize: '16px',
  },
  spacing: {
    padding: '56px',
    gap: '20px',
  },

  // 实践方案装饰配置：小圆角、实用主义、清晰明确
  decorations: {
    borderRadius: '10px',
    cardShadow: '0 10px 24px rgba(15,106,98,0.12)',
    accentBorder: false,
    footerStyle: {
      show: false,
    },
  },

  layoutVariants: {
    titleBullets: {
      cardShape: 'rectangle',
      iconStyle: 'filled',
    },
    twoColumn: {
      dividerStyle: 'dashed',
      columnRatio: '50-50',
    },
  },
};

export default practicalTheme;
