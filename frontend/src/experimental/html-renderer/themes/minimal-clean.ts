import { ThemeConfig } from '../types/schema';

export const minimalCleanTheme: ThemeConfig = {
  id: 'minimal_clean',
  name: '沉浸叙事',
  colors: {
    primary: '#4f46e5',
    secondary: '#6366f1',
    accent: '#4f46e5',
    text: '#1a1a1a',
    textLight: '#6b7280',
    background: '#fafafa',
    backgroundAlt: '#f0f0f5',
  },
  fonts: {
    title: "'Georgia', 'Noto Serif SC', 'Source Han Serif CN', serif",
    body: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '48px',
    subtitleSize: '26px',
    bodySize: '20px',
    smallSize: '14px',
  },
  spacing: {
    padding: '72px',
    gap: '28px',
  },
  decorations: {
    borderRadius: '26px',
    cardShadow: '0 16px 48px rgba(79,70,229,0.10), 0 4px 16px rgba(0,0,0,0.06)',
    accentBorder: false,
    footerStyle: { show: false },
  },
  layoutVariants: {
    titleBullets: { cardShape: 'rounded', iconStyle: 'outlined' },
    twoColumn: { dividerStyle: 'none', columnRatio: '50-50' },
  },
};

export default minimalCleanTheme;
