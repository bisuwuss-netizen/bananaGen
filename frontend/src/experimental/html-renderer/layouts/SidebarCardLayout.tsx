/**
 * 左侧导航卡片布局 - Sidebar Card Layout
 * 设计理念：非对称布局，左侧深色块作为视觉锚点，右侧悬浮卡片展示内容
 * 适用场景：目录页、多点列举
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 目录序号使用 directory-list-index 类名
 * - 目录内容使用 slide-content-list-con 类名
 */

import React from 'react';
import { SidebarCardModel, ThemeConfig } from '../types/schema';
import { getBaseSlideStyle } from '../utils/styleHelper';

interface SidebarCardLayoutProps {
  model: SidebarCardModel;
  theme: ThemeConfig;
}

/**
 * 数据规范化函数 - 处理后端返回的不匹配数据格式
 * 将 title_content/title_bullets 格式转换为 SidebarCardModel 格式
 */
function normalizeSidebarCardModel(model: Partial<SidebarCardModel> & { content?: string[]; bullets?: Array<{ text?: string; description?: string }> }): SidebarCardModel {
  // 如果已经有正确的字段，直接返回
  if (model.items && Array.isArray(model.items) && model.items.length > 0) {
    return model as SidebarCardModel;
  }

  // 从 title_bullets 格式转换
  if (model.bullets && Array.isArray(model.bullets)) {
    return {
      title: model.title || '目录',
      subtitle: model.subtitle,
      items: model.bullets.map((b, idx) => ({
        index: idx + 1,
        title: typeof b === 'string' ? b : (b.text || '项目'),
        subtitle: typeof b === 'object' ? b.description : undefined,
      })),
      background_image: model.background_image,
    };
  }

  // 从 title_content 格式转换
  const content = model.content || [];
  if (content.length > 0) {
    return {
      title: model.title || '目录',
      subtitle: model.subtitle,
      items: content.map((c, idx) => ({
        index: idx + 1,
        title: String(c).slice(0, 20),
        subtitle: String(c).slice(20, 50),
      })),
      background_image: model.background_image,
    };
  }

  // 默认空数据
  return {
    title: model.title || '目录',
    subtitle: model.subtitle,
    items: [{ index: 1, title: '项目一' }, { index: 2, title: '项目二' }],
    background_image: model.background_image,
  };
}

export const SidebarCardLayout: React.FC<SidebarCardLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeSidebarCardModel(model);
  const { title, subtitle, items, background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    padding: '0',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const leftSidebarStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '35%',
    height: '100%',
    background: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingLeft: '60px',
    boxSizing: 'border-box',
  };

  const leftTitleStyle: React.CSSProperties = {
    fontSize: '64px',
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: '20px',
    lineHeight: 1.2,
  };

  const leftDividerStyle: React.CSSProperties = {
    width: '60px',
    height: '6px',
    background: '#fff',
    borderRadius: '3px',
  };

  const leftSubtitleStyle: React.CSSProperties = {
    fontSize: '18px',
    color: 'rgba(255,255,255,0.8)',
    marginTop: '30px',
    letterSpacing: '2px',
  };

  const rightContentStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '65%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 80px',
    boxSizing: 'border-box',
  };

  return (
    <section style={slideStyle}>
      <div style={leftSidebarStyle}>
        <div style={leftTitleStyle}>{title}</div>
        <div style={leftDividerStyle} />
        {subtitle && <div style={leftSubtitleStyle}>{subtitle}</div>}
      </div>

      <div style={rightContentStyle}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              padding: '25px 40px',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              marginBottom: index < items.length - 1 ? '25px' : 0,
            }}
          >
            <div
              className="directory-list-index"
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#e0e0e0',
                marginRight: '30px',
                fontStyle: 'italic',
              }}
            >
              {String(item.index).padStart(2, '0')}
            </div>
            <div className="slide-content-list-con" style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '24px',
                  color: '#333',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                {item.title}
              </div>
              {item.subtitle && (
                <div style={{ fontSize: '14px', color: '#888' }}>
                  {item.subtitle}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export function renderSidebarCardLayoutHTML(model: SidebarCardModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeSidebarCardModel(model);
  const { title, subtitle, items, background_image } = normalizedModel;

  const slideBg = background_image
    ? `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${background_image})`
    : theme.colors.background;

  const itemsHTML = items
    .map(
      (item, index) => `
    <div style="display: flex; align-items: center; background: #ffffff; padding: 25px 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: ${index < items.length - 1 ? '25px' : 0};">
      <div class="directory-list-index" style="font-size: 32px; font-weight: 900; color: #e0e0e0; margin-right: 30px; font-style: italic;">${String(item.index).padStart(2, '0')}</div>
      <div class="slide-content-list-con" style="flex: 1;">
        <div style="font-size: 24px; color: #333; font-weight: bold; margin-bottom: 4px;">${item.title}</div>
        ${item.subtitle ? `<div style="font-size: 14px; color: #888;">${item.subtitle}</div>` : ''}
      </div>
    </div>
  `
    )
    .join('\n');

  return `<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; position: relative; overflow: hidden; font-family: ${theme.fonts.body};">
    <div style="position: absolute; top: 0; left: 0; width: 35%; height: 100%; background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%); display: flex; flex-direction: column; justify-content: center; padding-left: 60px; box-sizing: border-box;">
      <div style="font-size: 64px; color: #ffffff; font-weight: bold; margin-bottom: 20px; line-height: 1.2;">${title}</div>
      <div style="width: 60px; height: 6px; background: #fff; border-radius: 3px;"></div>
      ${subtitle ? `<div style="font-size: 18px; color: rgba(255,255,255,0.8); margin-top: 30px; letter-spacing: 2px;">${subtitle}</div>` : ''}
    </div>
    <div style="position: absolute; top: 0; right: 0; width: 65%; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 0 80px; box-sizing: border-box;">
      ${itemsHTML}
    </div>
  </section>`;
}

export default SidebarCardLayout;
