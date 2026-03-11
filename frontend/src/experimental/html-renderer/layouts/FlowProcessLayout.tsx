/**
 * 横向流程图解布局 - Flow Process Layout
 * 设计理念：横向步骤流，用CSS绘制连接线和圆点，直观连贯
 * 适用场景：流程图解、步骤说明
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { FlowProcessModel, ThemeConfig } from '../types/schema';
import { getBaseSlideStyle } from '../utils/styleHelper';

interface FlowProcessLayoutProps {
  model: FlowProcessModel;
  theme: ThemeConfig;
}

function normalizeFlowProcessModel(model: Partial<FlowProcessModel> & { content?: string[]; bullets?: Array<{ text?: string; description?: string }> }): FlowProcessModel {
  if (model.steps && Array.isArray(model.steps) && model.steps.length > 0) {
    return model as FlowProcessModel;
  }
  if (model.bullets && Array.isArray(model.bullets)) {
    return {
      title: model.title || '流程步骤',
      steps: model.bullets.map((b, idx) => ({
        number: idx + 1,
        label: typeof b === 'string' ? b : (b.text || '步骤'),
        description: typeof b === 'object' ? (b.description || '') : '',
      })),
      background_image: model.background_image,
    };
  }
  const content = model.content || [];
  if (content.length > 0) {
    return {
      title: model.title || '流程步骤',
      steps: content.map((c, idx) => ({
        number: idx + 1,
        label: String(c).slice(0, 15),
        description: String(c).slice(15, 50),
      })),
      background_image: model.background_image,
    };
  }
  return {
    title: model.title || '流程步骤',
    steps: [
      { number: 1, label: '步骤一', description: '开始流程' },
      { number: 2, label: '步骤二', description: '执行操作' },
      { number: 3, label: '步骤三', description: '完成流程' },
    ],
    background_image: model.background_image,
  };
}

export const FlowProcessLayout: React.FC<FlowProcessLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeFlowProcessModel(model);
  const { title, steps, background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: theme.fonts.body,
    ...(background_image
      ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.95)), url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '42px',
    color: '#333',
    marginBottom: '80px',
    position: 'relative',
    textAlign: 'center',
  };

  const underlineStyle: React.CSSProperties = {
    display: 'block',
    width: '60px',
    height: '4px',
    background: '#6c5ce7',
    margin: '15px auto 0 auto',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    width: '1000px',
    justifyContent: 'space-between',
    position: 'relative',
  };

  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    top: '30px',
    left: '50px',
    right: '50px',
    height: '4px',
    background: '#f0f0f0',
    zIndex: 0,
  };

  return (
    <section style={slideStyle}>
      <h2 style={titleStyle}>
        {title}
        <span style={underlineStyle} />
      </h2>

      <div style={containerStyle}>
        <div style={lineStyle} />

        {steps.map((step, index) => {
          const isFirst = index === 0;
          const isActive = index === 0;

          return (
            <div
              key={index}
              style={{
                position: 'relative',
                zIndex: 1,
                textAlign: 'center',
                width: '220px',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  background: isActive ? '#6c5ce7' : '#fff',
                  border: isActive ? 'none' : '2px solid #6c5ce7',
                  color: isActive ? '#fff' : '#6c5ce7',
                  borderRadius: '50%',
                  margin: '0 auto 25px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  boxShadow: isActive ? '0 0 0 8px rgba(108, 92, 231, 0.1)' : 'none',
                }}
              >
                {step.number}
              </div>
              <h3
                style={{
                  fontSize: '20px',
                  color: '#2d3436',
                  margin: '0 0 10px 0',
                }}
              >
                {step.label}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#636e72',
                  lineHeight: 1.5,
                }}
                dangerouslySetInnerHTML={{
                  __html: step.description.replace(/\n/g, '<br/>'),
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export function renderFlowProcessLayoutHTML(model: FlowProcessModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeFlowProcessModel(model);
  const { title, steps, background_image } = normalizedModel;

  const slideBg = background_image
    ? `linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.95)), url(${background_image})`
    : '#ffffff';

  const stepsHTML = steps
    .map((step, index) => {
      const isActive = index === 0;
      const bgColor = isActive ? '#6c5ce7' : '#fff';
      const borderStyle = isActive ? 'none' : '2px solid #6c5ce7';
      const textColor = isActive ? '#fff' : '#6c5ce7';
      const boxShadow = isActive ? '0 0 0 8px rgba(108, 92, 231, 0.1)' : 'none';

      return `
      <div style="position: relative; z-index: 1; text-align: center; width: 220px;"
      >
        <div style="width: 60px; height: 60px; background: ${bgColor}; border: ${borderStyle}; color: ${textColor}; border-radius: 50%; margin: 0 auto 25px auto; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; box-shadow: ${boxShadow};"
        >${step.number}</div>
        <h3 style="font-size: 20px; color: #2d3436; margin: 0 0 10px 0;"
        >${step.label}</h3>
        <p style="font-size: 14px; color: #636e72; line-height: 1.5;"
        >${step.description.replace(/\n/g, '<br/>')}</p>
      </div>`;
    })
    .join('\n');

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; font-family: ${theme.fonts.body}; display: flex; flex-direction: column; justify-content: center; align-items: center;"
>
  <h2 style="font-size: 42px; color: #333; margin-bottom: 80px; position: relative; text-align: center;"
  >${title}<span style="display: block; width: 60px; height: 4px; background: #6c5ce7; margin: 15px auto 0 auto;"
  ></span></h2>

  <div style="display: flex; width: 1000px; justify-content: space-between; position: relative;"
  >
    <div style="position: absolute; top: 30px; left: 50px; right: 50px; height: 4px; background: #f0f0f0; z-index: 0;"
    ></div>
    ${stepsHTML}
  </div>
</section>`;
}

export default FlowProcessLayout;
