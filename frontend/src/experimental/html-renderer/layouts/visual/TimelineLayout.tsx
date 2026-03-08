/**
 * 时间线布局组件（视觉方案专属）
 * 特征：横向/纵向时间轴 + 节点卡片 + 进度指示
 */

import React from 'react';
import { TimelineModel, ThemeConfig } from '../../types/schema';
import {
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
  toInlineStyle,
} from '../../utils/styleHelper';

interface TimelineLayoutProps {
  model: TimelineModel;
  theme: ThemeConfig;
}

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const TimelineLayout: React.FC<TimelineLayoutProps> = ({ model, theme }) => {
  const { title, events, orientation, background_image } = model;
  const isHorizontal = orientation === 'horizontal';

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  };

  const titleStyle = asStyle({
    ...getTitleStyle(theme),
    marginBottom: '40px',
  });

  const timelineContainerStyle = asStyle({
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    gap: isHorizontal ? '20px' : '30px',
    alignItems: isHorizontal ? 'flex-start' : 'stretch',
    padding: isHorizontal ? '40px 0' : '0 40px',
    height: 'calc(100% - 140px)',
    overflow: 'hidden',
    position: 'relative',
  });

  // 时间轴连线
  const lineStyle = asStyle({
    position: 'absolute',
    backgroundColor: theme.colors.secondary,
    opacity: 0.3,
    zIndex: 0,
    ...(isHorizontal
      ? {
        top: '120px',
        left: '60px',
        right: '60px',
        height: '4px',
      }
      : {
        top: '40px',
        bottom: '40px',
        left: '74px',
        width: '4px',
      }),
  });

  return (
    <section style={slideStyle}>
      <h2 style={titleStyle}>{title}</h2>

      <div style={timelineContainerStyle}>
        {/* 时间轴线 */}
        <div style={lineStyle}></div>

        {events.map((event, index) => {
          const eventItemStyle = asStyle({
            display: 'flex',
            flexDirection: isHorizontal ? 'column' : 'row',
            alignItems: isHorizontal ? 'center' : 'flex-start',
            gap: '16px',
            flex: isHorizontal ? '1' : 'none',
            position: 'relative',
            zIndex: 1,
          });

          const nodeStyle = asStyle({
            width: isHorizontal ? '40px' : '48px',
            height: isHorizontal ? '40px' : '48px',
            borderRadius: '50%',
            backgroundColor: theme.colors.accent,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isHorizontal ? '18px' : '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            flexShrink: '0',
            marginTop: isHorizontal ? '0' : '4px',
          });

          const cardStyle = asStyle({
            ...getCardStyle(theme),
            flex: 1,
            padding: '16px 20px',
            width: isHorizontal ? '100%' : 'auto',
          });

          return (
            <div key={index} style={eventItemStyle}>
              {/* 年份/时间标志 */}
              <div 
                style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: theme.colors.primary,
                  marginBottom: isHorizontal ? '8px' : '0',
                  minWidth: isHorizontal ? 'auto' : '100px',
                  textAlign: isHorizontal ? 'center' : 'right',
                }}
              >
                {event.year}
              </div>

              {/* 节点 */}
              <div style={nodeStyle}>
                {event.icon || '●'}
              </div>

              {/* 内容卡片 */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: '18px', margin: '0 0 8px 0', color: theme.colors.text }}>{event.title}</h3>
                <p style={{ fontSize: theme.sizes.smallSize, margin: 0, color: theme.colors.textLight, lineHeight: '1.4' }}>{event.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export function renderTimelineLayoutHTML(model: TimelineModel, theme: ThemeConfig): string {
  const { title, events, orientation, background_image } = model;
  const isHorizontal = orientation === 'horizontal';

  const slideStyle = toInlineStyle({
    ...getBaseSlideStyle(theme),
    ...(background_image
      ? {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {}),
  });

  const titleStyle = toInlineStyle({ ...getTitleStyle(theme), marginBottom: '40px' });

  const eventsHTML = events.map((event, index) => {
    const nodeStyle = toInlineStyle({
      width: isHorizontal ? '40px' : '48px', height: isHorizontal ? '40px' : '48px',
      borderRadius: '50%', backgroundColor: theme.colors.accent, color: '#ffffff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: isHorizontal ? '18px' : '24px', flexShrink: '0',
    });

    const cardStyle = toInlineStyle({
      ...getCardStyle(theme),
      flex: '1', padding: '16px 20px',
    });

    return `
    <div style="display: flex; flex-direction: ${isHorizontal ? 'column' : 'row'}; align-items: ${isHorizontal ? 'center' : 'flex-start'}; gap: 16px; flex: ${isHorizontal ? '1' : 'none'}; position: relative; z-index: 1;">
      <div style="font-size: 24px; font-weight: bold; color: ${theme.colors.primary}; margin-bottom: ${isHorizontal ? '8px' : '0'}; min-width: ${isHorizontal ? 'auto' : '100px'}; text-align: ${isHorizontal ? 'center' : 'right'};">${event.year}</div>
      <div style="${nodeStyle}">${event.icon || '●'}</div>
      <div style="${cardStyle}">
        <h3 style="font-size: 18px; margin: 0 0 8px 0; color: ${theme.colors.text};">${event.title}</h3>
        <p style="font-size: ${theme.sizes.smallSize}; margin: 0; color: ${theme.colors.textLight}; line-height: 1.4;">${event.description}</p>
      </div>
    </div>`;
  }).join('\n');

  return `
<section style="${slideStyle}">
  <h2 style="${titleStyle}">${title}</h2>
  <div style="display: flex; flex-direction: ${isHorizontal ? 'row' : 'column'}; gap: 20px; padding: ${isHorizontal ? '40px 0' : '0 40px'}; height: calc(100% - 140px); position: relative;">
    ${eventsHTML}
  </div>
</section>`;
}

export default TimelineLayout;
