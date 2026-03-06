/**
 * 沉浸全图遮罩布局 - Cinematic Overlay Layout
 * 设计理念：全屏背景图配合半透明遮罩层承载文字，展示震撼视觉效果
 * 适用场景：案例展示、作品集封面、成果展示
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { CinematicOverlayModel, ThemeConfig } from '../types/schema';

interface CinematicOverlayLayoutProps {
  model: CinematicOverlayModel;
  theme: ThemeConfig;
}

/**
 * 数据规范化函数 - 处理后端返回的不匹配数据格式
 * 将 title_content 格式转换为 CinematicOverlayModel 格式
 */
function normalizeCinematicOverlayModel(model: Partial<CinematicOverlayModel> & { content?: string[]; highlight?: string }): CinematicOverlayModel {
  // 如果已经有正确的字段，直接返回
  if (model.label !== undefined && model.description !== undefined) {
    return model as CinematicOverlayModel;
  }

  // 从 title_content 格式转换
  const content = model.content || [];
  const contentText = Array.isArray(content) ? content.join(' ') : String(content);

  return {
    label: 'COVER', // 默认值
    title: model.title || '标题',
    description: contentText || model.highlight || '描述内容',
    metric: undefined,
    background_image: model.background_image,
  };
}

export const CinematicOverlayLayout: React.FC<CinematicOverlayLayoutProps> = ({ model, theme }) => {
  // 防御性处理：如果数据不匹配，进行转换
  const normalizedModel = normalizeCinematicOverlayModel(model);
  const { label, title, description, metric, background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    width: 1280,
    height: 720,
    backgroundColor: '#333333',
    backgroundImage: background_image
      ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${background_image})`
      : 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    fontFamily: theme.fonts.body,
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: metric ? '240px' : '200px',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(10px)',
    padding: metric ? '50px 80px' : '40px 80px',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const contentStyle: React.CSSProperties = {
    width: metric ? '70%' : '100%',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#f1c40f',
    textTransform: 'uppercase',
    marginBottom: '10px',
    fontWeight: 'bold',
    letterSpacing: '1px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    color: '#fff',
    margin: '0 0 15px 0',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '18px',
    color: '#dcdcdc',
    lineHeight: 1.5,
    margin: 0,
  };

  const metricStyle: React.CSSProperties = {
    textAlign: 'right',
    borderLeft: '1px solid rgba(255,255,255,0.3)',
    paddingLeft: '40px',
  };

  return (
    <section style={slideStyle}>
      <div style={overlayStyle}>
        <div style={contentStyle}>
          <div style={labelStyle}>{label}</div>
          <h2 style={titleStyle}>{title}</h2>
          <p style={descriptionStyle}>{description}</p>
        </div>

        {metric && (
          <div style={metricStyle}>
            <div style={{ fontSize: '48px', color: '#fff', fontWeight: 'bold' }}>{metric.value}</div>
            <div style={{ fontSize: '14px', color: '#aaa' }}>{metric.label}</div>
          </div>
        )}
      </div>
    </section>
  );
};

export function renderCinematicOverlayLayoutHTML(model: CinematicOverlayModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeCinematicOverlayModel(model);
  const { label, title, description, metric, background_image } = normalizedModel;

  const slideBg = background_image
    ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${background_image})`
    : 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4))';

  const overlayHeight = metric ? '240px' : '200px';
  const contentWidth = metric ? '70%' : '100%';
  const overlayPadding = metric ? '50px 80px' : '40px 80px';

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; position: relative; font-family: ${theme.fonts.body};"
>
  <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${overlayHeight}; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(10px); padding: ${overlayPadding}; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;"
  >
    <div style="width: ${contentWidth};"
    >
      <div style="font-size: 14px; color: #f1c40f; text-transform: uppercase; margin-bottom: 10px; font-weight: bold; letter-spacing: 1px;"
      >${label}</div>
      <h2 style="font-size: 36px; color: #fff; margin: 0 0 15px 0;"
      >${title}</h2>
      <p style="font-size: 18px; color: #dcdcdc; line-height: 1.5; margin: 0;"
      >${description}</p>
    </div>

    ${metric ? `
    <div style="text-align: right; border-left: 1px solid rgba(255,255,255,0.3); padding-left: 40px;"
    >
      <div style="font-size: 48px; color: #fff; font-weight: bold;"
      >${metric.value}</div>
      <div style="font-size: 14px; color: #aaa;"
      >${metric.label}</div>
    </div>` : ''}
  </div>
</section>`;
}

export default CinematicOverlayLayout;
