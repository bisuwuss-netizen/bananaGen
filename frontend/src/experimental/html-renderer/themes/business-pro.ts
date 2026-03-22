import { ThemeConfig } from '../types/schema';

export const businessProTheme: ThemeConfig = {
  id: 'business_pro',
  name: '行业实战',
  colors: {
    primary: '#0a1628',
    secondary: '#152238',
    accent: '#39ff14',
    text: '#e2e8f0',
    textLight: '#94a3b8',
    background: '#0d1a2e',
    backgroundAlt: '#111f36',
  },
  fonts: {
    title: "'SF Mono', 'Fira Code', 'PingFang SC', 'Microsoft YaHei', monospace",
    body: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '44px',
    subtitleSize: '24px',
    bodySize: '19px',
    smallSize: '14px',
  },
  spacing: {
    padding: '54px',
    gap: '18px',
  },
  decorations: {
    borderRadius: '5px',
    cardShadow: '0 4px 24px rgba(0,0,0,0.45), 0 0 1px rgba(57,255,20,0.12)',
    accentBorder: true,
    footerStyle: { show: true, height: '32px', backgroundColor: '#0a1224' },
  },
  layoutVariants: {
    titleBullets: { cardShape: 'rectangle', iconStyle: 'filled' },
    twoColumn: { dividerStyle: 'solid', columnRatio: '50-50' },
  },
};

export default businessProTheme;
