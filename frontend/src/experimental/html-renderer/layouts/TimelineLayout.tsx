/**
 * 时间轴布局组件（视觉方案专属）
 * 特征：水平/垂直时间轴 + 事件节点 + 连接线
 */

import React from 'react';
import { TimelineModel, ThemeConfig } from '../types/schema';
import {
  toCSS,
  getBaseSlideStyle,
  getTitleStyle,
  getCardStyle,
} from '../utils/styleHelper';

interface TimelineLayoutProps {
  model: TimelineModel;
  theme: ThemeConfig;
}

export const TimelineLayout: React.FC<TimelineLayoutProps> = ({ model, theme }) => {
  const { title, events, orientation = 'horizontal', background_image } = model;

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

  const titleStyle = toCSS({ ...getTitleStyle(theme), textShadow: '0 1px 2px rgba(0,0,0,0.1)' });

  if (orientation === 'horizontal') {
    // 水平时间轴
    const timelineContainerStyle = toCSS({
      marginTop: '50px',
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingTop: '60px',
    });

    const timelineLineStyle = toCSS({
      position: 'absolute',
      top: '60px',
      left: '5%',
      right: '5%',
      height: '4px',
      backgroundColor: theme.colors.secondary,
      borderRadius: '2px',
    });

    return (
      <section style={slideStyle}>
        <h2 style={titleStyle}>{title}</h2>

        <div style={timelineContainerStyle}>
          {/* 时间轴连接线 */}
          <div style={timelineLineStyle}></div>

          {/* 事件节点 */}
          {events.map((event, index) => {
            const baseCardStyle = getCardStyle(theme);
            const eventNodeStyle = toCSS({
              width: `${100 / events.length - 2}%`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            });

            const dotStyle = toCSS({
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              border: '4px solid #ffffff',
              boxShadow: '0 0 0 4px ' + theme.colors.secondary,
              position: 'absolute',
              top: '-12px',
              zIndex: '2',
            });

            const yearStyle = toCSS({
              fontSize: '28px',
              fontWeight: 'bold',
              color: theme.colors.primary,
              marginBottom: '12px',
              marginTop: '20px',
            });

            const eventCardStyle = toCSS({
              ...baseCardStyle,
              padding: '16px',
              textAlign: 'center',
              minHeight: '120px',
              width: '100%',
            });

            const eventTitleStyle = toCSS({
              fontSize: theme.sizes.bodySize,
              fontWeight: 'bold',
              color: theme.colors.text,
              marginBottom: '8px',
            });

            const eventDescStyle = toCSS({
              fontSize: theme.sizes.smallSize,
              color: theme.colors.textLight,
              lineHeight: '1.5',
            });

            return (
              <div key={index} style={eventNodeStyle}>
                {/* 时间点 */}
                <div style={dotStyle}></div>

                {/* 年份 */}
                <div style={yearStyle}>{event.year}</div>

                {/* 事件卡片 */}
                <div style={eventCardStyle}>
                  {event.icon && (
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                      {event.icon}
                    </div>
                  )}
                  <div style={eventTitleStyle}>{event.title}</div>
                  <div style={eventDescStyle}>{event.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  } else {
    // 垂直时间轴
    const timelineContainerStyle = toCSS({
      marginTop: '40px',
      position: 'relative',
      paddingLeft: '50px',
    });

    const timelineLineStyle = toCSS({
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: '11px',
      width: '4px',
      backgroundColor: theme.colors.secondary,
      borderRadius: '2px',
    });

    return (
      <section style={slideStyle}>
        <h2 style={titleStyle}>{title}</h2>

        <div style={timelineContainerStyle}>
          {/* 时间轴连接线 */}
          <div style={timelineLineStyle}></div>

          {/* 事件节点 */}
          {events.map((event, index) => {
            const baseCardStyle = getCardStyle(theme);
            const eventNodeStyle = toCSS({
              position: 'relative',
              marginBottom: '30px',
              paddingLeft: '40px',
            });

            const dotStyle = toCSS({
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              border: '4px solid #ffffff',
              boxShadow: '0 0 0 4px ' + theme.colors.secondary,
              position: 'absolute',
              left: '0',
              top: '8px',
              zIndex: '2',
            });

            const eventCardStyle = toCSS({
              ...baseCardStyle,
              padding: '16px 20px',
              display: 'flex',
              gap: '16px',
            });

            const yearBadgeStyle = toCSS({
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#ffffff',
              backgroundColor: theme.colors.primary,
              padding: '8px 16px',
              borderRadius: theme.decorations?.borderRadius || '8px',
              flexShrink: '0',
              alignSelf: 'flex-start',
            });

            const eventContentStyle = toCSS({
              flex: '1',
            });

            const eventTitleStyle = toCSS({
              fontSize: theme.sizes.bodySize,
              fontWeight: 'bold',
              color: theme.colors.text,
              marginBottom: '6px',
            });

            const eventDescStyle = toCSS({
              fontSize: theme.sizes.smallSize,
              color: theme.colors.textLight,
              lineHeight: '1.5',
            });

            return (
              <div key={index} style={eventNodeStyle}>
                {/* 时间点 */}
                <div style={dotStyle}></div>

                {/* 事件卡片 */}
                <div style={eventCardStyle}>
                  <div style={yearBadgeStyle}>{event.year}</div>
                  <div style={eventContentStyle}>
                    <div style={eventTitleStyle}>
                      {event.icon && <span>{event.icon} </span>}
                      {event.title}
                    </div>
                    <div style={eventDescStyle}>{event.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }
};

// 添加display name用于调试
TimelineLayout.displayName = 'TimelineLayout';

export default TimelineLayout;
