/**
 * 破格叠加布局 - Overlap Layout
 * 设计理念：打破传统方正区块，通过元素叠加制造纵深感和层次感
 * 适用场景：核心概念引入、章节封面、关键模型展示
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { OverlapModel, ThemeConfig } from '../types/schema';
import { getBaseSlideStyle } from '../utils/styleHelper';

interface OverlapLayoutProps {
  model: OverlapModel;
  theme: ThemeConfig;
}

function normalizeOverlapModel(model: Partial<OverlapModel> & { subtitle?: string; content?: string[] }): OverlapModel {
  if (model.description !== undefined && model.key_point !== undefined) {
    return model as OverlapModel;
  }
  const content = model.content || [];
  const contentText = Array.isArray(content) ? content.join(' ') : String(content);
  return {
    background_text: model.background_text || '01',
    label: model.label || model.subtitle || 'SECTION',
    title: model.title || '标题',
    description: contentText || '描述内容',
    key_point: model.key_point || '关键点',
    accent_color: model.accent_color || '#e74c3c',
    background_image: model.background_image,
  };
}

export const OverlapLayout: React.FC<OverlapLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeOverlapModel(model);
  const { background_text, label, title, description, key_point, accent_color = '#e74c3c', background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#f0f2f5',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: theme.fonts.body,
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(240,242,245,0.95), rgba(240,242,245,0.95)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const backgroundTextStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '50px',
    left: '50px',
    color: 'rgba(255,255,255,0.1)',
    fontSize: '120px',
    fontWeight: 900,
    lineHeight: 1,
    whiteSpace: 'pre-line',
  };

  const leftPanelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '60%',
    height: '100%',
    background: 'linear-gradient(45deg, #000000, #434343)',
    zIndex: 1,
  };

  const contentCardStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: '80px',
    transform: 'translateY(-50%)',
    width: '50%',
    background: '#ffffff',
    padding: '60px',
    boxShadow: '-20px 20px 60px rgba(0,0,0,0.15)',
    borderRadius: '8px',
    zIndex: 2,
  };

  return (
    <section style={slideStyle}>
      <div style={leftPanelStyle}>
        <div style={backgroundTextStyle}>{background_text}</div>
      </div>

      <div style={contentCardStyle}>
        <h6
          style={{
            margin: '0 0 15px 0',
            color: accent_color,
            fontSize: '16px',
            fontWeight: 'bold',
            letterSpacing: '2px',
          }}
        >
          {label}
        </h6>
        <h2
          style={{
            margin: '0 0 30px 0',
            color: '#2c3e50',
            fontSize: '48px',
            lineHeight: 1.2,
            fontWeight: 'bold',
          }}
        >
          {title.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < title.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </h2>
        <p
          style={{
            margin: '0 0 25px 0',
            color: '#666',
            fontSize: '18px',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              background: accent_color,
              borderRadius: '50%',
              marginRight: '10px',
            }}
          />
          <span style={{ color: '#333', fontWeight: 'bold' }}>{key_point}</span>
        </div>
      </div>
    </section>
  );
};

export function renderOverlapLayoutHTML(model: OverlapModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeOverlapModel(model);
  const { background_text, label, title, description, key_point, accent_color = '#e74c3c', background_image } = normalizedModel;

  const slideBg = background_image
    ? `linear-gradient(rgba(240,242,245,0.95), rgba(240,242,245,0.95)), url(${background_image})`
    : '#f0f2f5';

  const titleWithBreaks = title.replace(/\n/g, '<br/>');

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; position: relative; overflow: hidden; font-family: ${theme.fonts.body};"
>
  <div style="position: absolute; top: 0; left: 0; width: 60%; height: 100%; background: linear-gradient(45deg, #000000, #434343); z-index: 1;"
  >
    <div style="position: absolute; bottom: 50px; left: 50px; color: rgba(255,255,255,0.1); font-size: 120px; font-weight: 900; line-height: 1; white-space: pre-line;"
    >${background_text}</div>
  </div>

  <div style="position: absolute; top: 50%; right: 80px; transform: translateY(-50%); width: 50%; background: #ffffff; padding: 60px; box-shadow: -20px 20px 60px rgba(0,0,0,0.15); border-radius: 8px; z-index: 2;"
  >
    <h6 style="margin: 0 0 15px 0; color: ${accent_color}; font-size: 16px; font-weight: bold; letter-spacing: 2px;"
    >${label}</h6>
    <h2 style="margin: 0 0 30px 0; color: #2c3e50; font-size: 48px; line-height: 1.2; font-weight: bold;"
    >${titleWithBreaks}</h2>
    <p style="margin: 0 0 25px 0; color: #666; font-size: 18px; line-height: 1.6;"
    >${description}</p>
    <div style="display: flex; align-items: center;"
    >
      <span style="display: inline-block; width: 10px; height: 10px; background: ${accent_color}; border-radius: 50%; margin-right: 10px;"
      ></span>
      <span style="color: #333; font-weight: bold;"
      >${key_point}</span>
    </div>
  </div>
</section>`;
}

export default OverlapLayout;
