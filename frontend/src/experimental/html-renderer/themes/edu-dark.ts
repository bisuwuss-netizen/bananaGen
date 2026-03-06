import { ThemeConfig } from '../types/schema';

export const eduDarkTheme: ThemeConfig = {
  id: 'edu_dark',
  name: '深色教育',
  colors: {
    primary: '#0b1120',
    secondary: '#172554',
    accent: '#06b6d4',
    text: '#e2e8f0',
    textLight: '#93c5fd',
    background: '#0b1120',
    backgroundAlt: '#111827',
  },
  fonts: {
    title: "'PingFang SC', 'Microsoft YaHei', 'Avenir Next', sans-serif",
    body: "'PingFang SC', 'Microsoft YaHei', 'Avenir', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '44px',
    subtitleSize: '26px',
    bodySize: '20px',
    smallSize: '14px',
  },
  spacing: {
    padding: '54px',
    gap: '18px',
  },
  decorations: {
    borderRadius: '16px',
    cardShadow: '0 14px 32px rgba(6,12,28,0.35)',
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

export default eduDarkTheme;
