import { ThemeConfig } from '../types/schema';

// Deep Space & Glass Aesthetic
export const eduDarkTheme: ThemeConfig = {
  id: 'edu_dark',
  name: '深色教育 (Deep Space)',
  colors: {
    primary: '#f0f9ff',      // 标题高亮色 (Ice White)
    secondary: 'rgba(30, 41, 59, 0.7)', // 卡片背景 (Glass Slate)
    accent: '#06b6d4',       // 强调色 (Cyan)
    text: '#cbd5e1',         // 正文色 (Slate 300)
    textLight: '#94a3b8',    // 弱文本 (Slate 400)
    background: '#020617',   // 背景色 (Deep Space Black)
    backgroundAlt: '#0f172a', // 深色替代
  },
  fonts: {
    title: "'Inter', 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    body: "'Inter', 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '48px',
    subtitleSize: '24px',
    bodySize: '18px',
    smallSize: '14px',
  },
  spacing: {
    padding: '64px',
    gap: '24px',
  },
  decorations: {
    borderRadius: '24px',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    accentBorder: true, // 启用边框以增强玻璃感
    footerStyle: {
      show: true,
      backgroundColor: 'transparent',
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
  backgroundPatterns: {
    // 模拟星空/噪点纹理
    content: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?auto=format&fit=crop&q=80&w=2000&ixlib=rb-4.0.3', // 临时的深空背景图，实际应使用本地资源或CSS生成
    opacity: 0.4
  }
};

export default eduDarkTheme;
