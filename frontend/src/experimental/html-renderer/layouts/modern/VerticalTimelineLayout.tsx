/**
 * 垂直脉络布局 - Vertical Timeline Layout
 * 设计理念：左侧保留一条贯穿的线条，右侧内容块依序排列
 * 适用场景：历史回顾、步骤详解、技术迭代路线
 *
 * HTML转PPT要求：
 * - 使用 section 标签代表幻灯片
 * - 内联样式直接应用于HTML元素
 * - 幻灯片背景使用 background 或 background-image
 */

import React from 'react';
import { VerticalTimelineModel, ThemeConfig } from '../../types/schema';
import { getBaseSlideStyle } from '../../utils/styleHelper';

interface VerticalTimelineLayoutProps {
  model: VerticalTimelineModel;
  theme: ThemeConfig;
}

function normalizeVerticalTimelineModel(model: Partial<VerticalTimelineModel> & { content?: string[]; bullets?: Array<{ text?: string; description?: string }> }): VerticalTimelineModel {
  if (model.events && Array.isArray(model.events) && model.events.length > 0) {
    return model as VerticalTimelineModel;
  }
  if (model.bullets && Array.isArray(model.bullets)) {
    return {
      title: model.title || '时间线',
      events: model.bullets.map((b) => ({
        title: typeof b === 'string' ? b : (b.text || '事件'),
        description: typeof b === 'object' ? (b.description || '') : '',
        is_highlighted: false,
      })),
      accent_color: model.accent_color || '#27ae60',
      background_image: model.background_image,
    };
  }
  return {
    title: model.title || '时间线',
    events: [
      { title: '第一阶段', description: '开始', is_highlighted: false },
      { title: '第二阶段', description: '发展', is_highlighted: false },
      { title: '第三阶段', description: '完成', is_highlighted: true },
    ],
    accent_color: '#27ae60',
    background_image: model.background_image,
  };
}

export const VerticalTimelineLayout: React.FC<VerticalTimelineLayoutProps> = ({ model, theme }) => {
  const normalizedModel = normalizeVerticalTimelineModel(model);
  const { title, events, accent_color = '#27ae60', background_image } = normalizedModel;

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    backgroundColor: '#ffffff',
    padding: '60px 100px',
    fontFamily: theme.fonts.body,
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '32px',
    color: '#333',
    fontWeight: 'bold',
    marginBottom: '50px',
    paddingLeft: '20px',
    borderLeft: `6px solid ${accent_color}`,
  };

  const timelineStyle: React.CSSProperties = {
    position: 'relative',
    paddingLeft: '40px',
    borderLeft: '2px solid #e0e0e0',
    marginLeft: '20px',
  };

  return (
    <section style={slideStyle}>
      <div style={headerStyle}>{title}</div>

      <div style={timelineStyle}>
        {events.map((event, index) => {
          const isHighlighted = event.is_highlighted || index === events.length - 1;

          return (
            <div
              key={index}
              style={{
                marginBottom: index < events.length - 1 ? '50px' : 0,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-49px',
                  top: '5px',
                  width: '16px',
                  height: '16px',
                  background: isHighlighted ? accent_color : '#ffffff',
                  border: `4px solid ${accent_color}`,
                  borderRadius: '50%',
                }}
              />

              <h3
                style={{
                  margin: '0 0 10px 0',
                  color: '#2c3e50',
                  fontSize: '24px',
                }}
              >
                {event.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: '#7f8c8d',
                  fontSize: '16px',
                }}
              >
                {event.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export function renderVerticalTimelineLayoutHTML(model: VerticalTimelineModel, theme: ThemeConfig): string {
  const normalizedModel = normalizeVerticalTimelineModel(model);
  const { title, events, accent_color = '#27ae60', background_image } = normalizedModel;

  const slideBg = background_image
    ? `url(${background_image})`
    : '#ffffff';

  const eventsHTML = events
    .map((event, index) => {
      const isHighlighted = event.is_highlighted || index === events.length - 1;
      const dotBg = isHighlighted ? accent_color : '#ffffff';

      return `
      <div style="margin-bottom: ${index < events.length - 1 ? '50px' : 0}; position: relative;">
        <div style="position: absolute; left: -49px; top: 5px; width: 16px; height: 16px; background: ${dotBg}; border: 4px solid ${accent_color}; border-radius: 50%;"></div>
        <h3 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 24px;">${event.title}</h3>
        <p style="margin: 0; color: #7f8c8d; font-size: 16px;">${event.description}</p>
      </div>`;
    })
    .join('\n');

  return `
<section style="width: 1280px; height: 720px; background: ${slideBg}; background-size: cover; background-position: center; padding: 60px 100px; font-family: ${theme.fonts.body}; box-sizing: border-box;">
  <div style="font-size: 32px; color: #333; font-weight: bold; margin-bottom: 50px; padding-left: 20px; border-left: 6px solid ${accent_color};">
    ${title}
  </div>

  <div style="position: relative; padding-left: 40px; border-left: 2px solid #e0e0e0; margin-left: 20px;">
    ${eventsHTML}
  </div>
</section>`;
}

export default VerticalTimelineLayout;
