import { ThemeConfig } from '../types/schema';

export const academicTheme: ThemeConfig = {
  id: 'academic',
  name: '学术研究',
  colors: {
    primary: '#1e3a5f',
    secondary: '#42566d',
    accent: '#b7791f',
    text: '#142132',
    textLight: '#5f6b7a',
    background: '#fcfcfb',
    backgroundAlt: '#f3f4f2',
  },
  fonts: {
    title: "'Noto Serif SC', 'Songti SC', 'STSong', serif",
    body: "'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  sizes: {
    slideWidth: 1280,
    slideHeight: 720,
    titleSize: '44px',
    subtitleSize: '26px',
    bodySize: '21px',
    smallSize: '15px',
  },
  spacing: {
    padding: '62px',
    gap: '20px',
  },

  // 学术方案装饰配置：小圆角、微阴影、页脚
  decorations: {
    borderRadius: '6px',
    cardShadow: '0 5px 14px rgba(20,33,50,0.08)',
    accentBorder: true,
    footerStyle: {
      show: true,
      height: '36px',
      backgroundColor: '#eef1f4',
    },
  },

  layoutVariants: {
    titleBullets: {
      cardShape: 'rectangle',
      iconStyle: 'filled',
    },
    twoColumn: {
      dividerStyle: 'solid',
      columnRatio: '50-50',
    },
  },
};

export default academicTheme;
