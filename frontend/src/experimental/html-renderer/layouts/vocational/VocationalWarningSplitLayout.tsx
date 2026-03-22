/**
 * 职教专属：红黄警戒断路器（对比双栏）
 * 适用于：合规与违规操作对比、正误分析、危险工况排查
 */

import React from 'react';
import { TwoColumnModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../../utils/styleHelper';

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const VocationalWarningSplitLayout: React.FC<{
  model: TwoColumnModel;
  theme: ThemeConfig;
}> = ({ model, theme }) => {
  const { title, left, right, background_image } = model;
  
  const bgDark = '#090A0E';
  const warningRed = '#FF3333';
  const textWhite = '#F0F0F0';
  
  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : { backgroundColor: bgDark }),
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    boxSizing: 'border-box',
    padding: '0',
    color: textWhite,
    fontFamily: theme.fonts.body,
    overflow: 'hidden',
  };

  const renderColumn = (col: any, isWarning: boolean) => {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: 900, 
          color: isWarning ? warningRed : '#00FFCC', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          textTransform: 'uppercase'
        }}>
          {isWarning ? '🛑 绝对禁止 (STOP)' : '✅ 标准操作 (ALLOW)'}
          <span style={{ color: textWhite, marginLeft: 'auto', fontSize: '18px' }}>{col.header}</span>
        </h3>
        {col.bullets && col.bullets.map((bullet: any, idx: number) => (
          <div key={idx} style={{
            backgroundColor: isWarning ? 'rgba(255,51,51,0.05)' : 'rgba(0,255,204,0.05)',
            borderLeft: `4px solid ${isWarning ? warningRed : '#00FFCC'}`,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <strong style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 800 }}>{bullet.text}</strong>
            {bullet.description && <span style={{ fontSize: '15px', color: '#A0A3AA', lineHeight: 1.6 }}>{bullet.description}</span>}
          </div>
        ))}
        {col.content && (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '24px', fontSize: '16px', lineHeight: 1.6, color: '#D0D0D0' }}>
            {Array.isArray(col.content) ? col.content.join('<br/>') : col.content}
          </div>
        )}
      </div>
    )
  };

  return (
    <section style={slideStyle}>
      {/* 标题悬挂式标签 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: textWhite,
        color: '#000',
        padding: '12px 40px',
        fontWeight: 900,
        fontSize: '20px',
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        letterSpacing: '2px'
      }}>
        {title}
      </div>

      {/* 左侧正常态区域 */}
      <div style={{
        flex: 1,
        padding: '80px 40px 40px 60px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {renderColumn(left, false)}
      </div>

      {/* 分割警戒线 */}
      <div style={{
        width: '12px',
        background: `repeating-linear-gradient(
          45deg,
          ${warningRed},
          ${warningRed} 10px,
          #000 10px,
          #000 20px
        )`,
        boxShadow: '0 0 20px rgba(255,51,51,0.3)',
        zIndex: 5
      }}></div>

      {/* 右侧极其刺眼的警戒区 */}
      <div style={{
        flex: 1,
        backgroundColor: '#1A0808', // 暗红色底层
        padding: '80px 60px 40px 40px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {renderColumn(right, true)}
      </div>
    </section>
  );
};

export function renderVocationalWarningSplitLayoutHTML(model: any, theme: ThemeConfig): string {
  const { title, left, right, background_image } = model;
  
  const bgDark = '#090A0E';
  const warningRed = '#FF3333';
  const textWhite = '#F0F0F0';

  const slideStyle = toInlineStyle({
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: bgDark }),
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    boxSizing: 'border-box',
    padding: '0',
    color: textWhite,
    fontFamily: theme.fonts.body,
    overflow: 'hidden',
  });

  const generateColumnHTML = (col: any, isWarning: boolean) => {
    let bulletsHTML = '';
    if (col.bullets) {
      bulletsHTML = col.bullets.map((b: any) => `
        <div style="background-color: ${isWarning ? 'rgba(255,51,51,0.05)' : 'rgba(0,255,204,0.05)'}; border-left: 4px solid ${isWarning ? warningRed : '#00FFCC'}; padding: 20px; display: flex; flex-direction: column; margin-bottom: 20px;">
          <strong style="font-size: 18px; margin-bottom: 8px; font-weight: 800;">${b.text}</strong>
          ${b.description ? `<span style="font-size: 15px; color: #A0A3AA; line-height: 1.6;">${b.description}</span>` : ''}
        </div>
      `).join('');
    }
    
    let contentHTML = '';
    if (col.content) {
      contentHTML = `<div style="background-color: rgba(255,255,255,0.03); padding: 24px; font-size: 16px; line-height: 1.6; color: #D0D0D0;">${Array.isArray(col.content) ? col.content.join('<br/>') : col.content}</div>`;
    }

    return `
      <div style="flex: 1; display: flex; flex-direction: column;">
        <h3 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 900; color: ${isWarning ? warningRed : '#00FFCC'}; display: flex; align-items: center; gap: 12px; text-transform: uppercase;">
          ${isWarning ? '🛑 绝对禁止 (STOP)' : '✅ 标准操作 (ALLOW)'}
          <span style="color: ${textWhite}; margin-left: auto; font-size: 18px;">${col.header || ''}</span>
        </h3>
        ${bulletsHTML}
        ${contentHTML}
      </div>
    `;
  };

  return `
<section style="${slideStyle}">
  <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); background-color: ${textWhite}; color: #000; padding: 12px 40px; font-weight: 900; font-size: 20px; z-index: 10; box-shadow: 0 4px 20px rgba(0,0,0,0.5); letter-spacing: 2px;">
    ${title}
  </div>
  <div style="flex: 1; padding: 80px 40px 40px 60px; display: flex; flex-direction: column; position: relative;">
    ${generateColumnHTML(left, false)}
  </div>
  <div style="width: 12px; background: repeating-linear-gradient(45deg, ${warningRed}, ${warningRed} 10px, #000 10px, #000 20px); box-shadow: 0 0 20px rgba(255,51,51,0.3); z-index: 5;"></div>
  <div style="flex: 1; background-color: #1A0808; padding: 80px 60px 40px 40px; display: flex; flex-direction: column; position: relative;">
    ${generateColumnHTML(right, true)}
  </div>
</section>`;
}
