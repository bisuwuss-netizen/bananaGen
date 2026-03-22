/**
 * 职教专属：硬核 SOP 操作流
 * 适用于：流水线标准作业、高危设备维修工序、精密实验步骤
 */

import React from 'react';
import { ProcessStepsModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../../utils/styleHelper';

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const VocationalSopBannerLayout: React.FC<{
  model: ProcessStepsModel;
  theme: ThemeConfig;
}> = ({ model, theme }) => {
  const { title, subtitle, steps, background_image } = model;
  
  // 深空灰背景与亮黄色对比
  const bgColor = theme.colors.background === '#ffffff' ? '#090A0E' : theme.colors.background;
  const accentColor = '#FFDD00'; // 工业标志亮黄
  const textWhite = '#F0F0F0';
  const borderDark = '#22252A';

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : { backgroundColor: bgColor }),
    border: `8px solid ${borderDark}`,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    padding: '0', // 极致出血流，满屏排版
    color: textWhite,
    fontFamily: theme.fonts.body,
  };

  return (
    <section style={slideStyle}>
      {/* 顶部硬切角 Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `2px solid ${accentColor}`,
        padding: '24px 40px',
        backgroundColor: '#111318',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: textWhite }}>{title}</h2>
          {subtitle && <p style={{ margin: '8px 0 0 0', fontSize: '16px', color: '#888A90', letterSpacing: '1px' }}>{subtitle}</p>}
        </div>
        <div style={{
          backgroundColor: accentColor,
          color: '#000',
          padding: '8px 24px',
          fontWeight: 900,
          fontSize: '18px',
          letterSpacing: '2px',
          clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)' // 硬切角
        }}>
          SOP // STANDARD OPERATION PROCEDURE
        </div>
      </div>

      {/* 横向步骤流看板 */}
      <div style={{
        display: 'flex',
        flex: 1,
        padding: '40px',
        gap: '24px',
        overflow: 'hidden'
      }}>
        {steps.map((step, index) => (
          <div key={index} style={{
            flex: 1,
            backgroundColor: '#161920',
            border: `1px solid ${borderDark}`,
            borderTop: `4px solid ${index === 0 ? accentColor : '#333740'}`, // 点亮第一个步骤或全亮
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              fontSize: '80px',
              fontWeight: 900,
              color: 'rgba(255, 255, 255, 0.03)',
              lineHeight: 0.8,
              zIndex: 0,
            }}>
              {step.number.toString().padStart(2, '0')}
            </div>
            
            <div style={{ zIndex: 1 }}>
              <div style={{
                color: index === 0 ? accentColor : '#888A90',
                fontSize: '14px',
                fontWeight: 700,
                marginBottom: '16px',
                letterSpacing: '1px'
              }}>
                STEP // {step.number.toString().padStart(2, '0')}
              </div>
              
              <h3 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 800, color: textWhite }}>{step.label}</h3>
              
              {step.description && (
                <p style={{ margin: 0, fontSize: '15px', color: '#A0A3AA', lineHeight: 1.6 }}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* 底部微质感极简栅格 */}
      <div style={{
        height: '4px',
        width: '100%',
        background: `repeating-linear-gradient(90deg, ${accentColor}, ${accentColor} 100px, transparent 100px, transparent 110px)`,
        marginTop: 'auto',
      }} />
    </section>
  );
};

export function renderVocationalSopBannerLayoutHTML(model: any, theme: ThemeConfig): string {
  const { title, subtitle, steps, background_image } = model;
  
  const bgColor = theme.colors.background === '#ffffff' ? '#090A0E' : theme.colors.background;
  const accentColor = '#FFDD00';
  const textWhite = '#F0F0F0';
  const borderDark = '#22252A';

  const slideStyle = toInlineStyle({
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: bgColor }),
    border: `8px solid ${borderDark}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxSizing: 'border-box',
    padding: '0',
    color: textWhite,
    fontFamily: theme.fonts.body,
  });

  const stepsHTML = steps.map((step: any, index: number) => `
    <div style="flex: 1; background-color: #161920; border: 1px solid ${borderDark}; border-top: 4px solid ${index === 0 ? accentColor : '#333740'}; display: flex; flex-direction: column; padding: 24px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="position: absolute; top: 10px; right: 10px; font-size: 80px; font-weight: 900; color: rgba(255, 255, 255, 0.03); line-height: 0.8; z-index: 0;">
        ${step.number.toString().padStart(2, '0')}
      </div>
      <div style="z-index: 1;">
        <div style="color: ${index === 0 ? accentColor : '#888A90'}; font-size: 14px; font-weight: 700; margin-bottom: 16px; letter-spacing: 1px;">
          STEP // ${step.number.toString().padStart(2, '0')}
        </div>
        <h3 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: ${textWhite};">${step.label}</h3>
        ${step.description ? `<p style="margin: 0; font-size: 15px; color: #A0A3AA; line-height: 1.6;">${step.description}</p>` : ''}
      </div>
    </div>
  `).join('\n');

  return `
<section style="${slideStyle}">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${accentColor}; padding: 24px 40px; background-color: #111318;">
    <div>
      <h2 style="margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: ${textWhite};">${title}</h2>
      ${subtitle ? `<p style="margin: 8px 0 0 0; font-size: 16px; color: #888A90; letter-spacing: 1px;">${subtitle}</p>` : ''}
    </div>
    <div style="background-color: ${accentColor}; color: #000; padding: 8px 24px; font-weight: 900; font-size: 18px; letter-spacing: 2px; clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px);">
      SOP // STANDARD OPERATION PROCEDURE
    </div>
  </div>
  <div style="display: flex; flex: 1; padding: 40px; gap: 24px; overflow: hidden;">
    ${stepsHTML}
  </div>
  <div style="height: 4px; width: 100%; background: repeating-linear-gradient(90deg, ${accentColor}, ${accentColor} 100px, transparent 100px, transparent 110px); margin-top: auto;"></div>
</section>`;
}
