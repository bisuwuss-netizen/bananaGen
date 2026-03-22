import { ThemeConfig } from '../types/schema';

export const warmEduTheme: ThemeConfig = {
  id: 'warm_edu',
  name: '互动工作坊',
  colors: {
    primary: '#1a1a2e',
    secondary: '#4a4e69',
    accent: '#fbbf24',
    text: '#1f2937',
    textLight: '#6b7280',
    background: '#fefefe',
    backgroundAlt: '#f5f5f0',
  },
  fonts: {
    title: "'Inter', 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    body: "'Inter', 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '52px',
    subtitleSize: '24px',
    bodySize: '20px',
    smallSize: '14px',
  },
  spacing: {
    padding: '48px',
    gap: '24px',
  },
  decorations: {
    borderRadius: '16px',
    cardShadow: '0 4px 20px rgba(0,0,0,0.08)',
    accentBorder: false,
    footerStyle: { show: false },
  },
  layoutVariants: {
    titleBullets: { cardShape: 'rounded', iconStyle: 'hand-drawn' },
    twoColumn: { dividerStyle: 'solid', columnRatio: '50-50' },
  },
};

export default warmEduTheme;
