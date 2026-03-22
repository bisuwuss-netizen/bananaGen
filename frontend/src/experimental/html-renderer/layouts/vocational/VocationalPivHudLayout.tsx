/**
 * 职教专属：状态参数平视显示器 (PIV HUD)
 * 适用于：高危环境状态监测、设备出厂性能验收指标、实时工艺参数墙
 */

import React from 'react';
import { EduDataBoardModel, ThemeConfig } from '../../types/schema';
import {
  toInlineStyle,
  getBaseSlideStyle,
} from '../../utils/styleHelper';

const asStyle = (styles: Record<string, string | number | undefined>): React.CSSProperties =>
  styles as React.CSSProperties;

export const VocationalPivHudLayout: React.FC<{
  model: EduDataBoardModel;
  theme: ThemeConfig;
}> = ({ model, theme }) => {
  const { title, subtitle, metrics, bars, bullets, insight, background_image } = model;
  
  const bgDark = '#060B0A'; // 略带幽绿的黑
  const hudGreen = '#39FF14'; // 极其刺眼的战术绿
  const textWhite = '#E0F0E8';

  const slideStyle: React.CSSProperties = {
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover' } : { backgroundColor: bgDark }),
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    padding: '40px 60px',
    color: textWhite,
    fontFamily: theme.fonts.body,
    border: `2px solid ${hudGreen}`,
    boxShadow: `inset 0 0 40px rgba(57, 255, 20, 0.1)`,
  };

  return (
    <section style={slideStyle}>
      {/* 战术边角 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: `4px solid ${hudGreen}`, borderLeft: `4px solid ${hudGreen}` }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: `4px solid ${hudGreen}`, borderRight: `4px solid ${hudGreen}` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: `4px solid ${hudGreen}`, borderLeft: `4px solid ${hudGreen}` }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: `4px solid ${hudGreen}`, borderRight: `4px solid ${hudGreen}` }} />

      {/* 顶部标题区 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid rgba(57,255,20,0.3)`, paddingBottom: '20px', marginBottom: '40px' }}>
        <div>
          <div style={{ fontSize: '14px', color: hudGreen, letterSpacing: '2px', fontWeight: 900, marginBottom: '8px' }}>[ PIV_SYS_HUD_DISPLAY ]</div>
          <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: textWhite }}>{title}</h2>
          {subtitle && <p style={{ margin: '8px 0 0 0', fontSize: '16px', color: '#889988' }}>{subtitle}</p>}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ padding: '4px 12px', backgroundColor: hudGreen, color: '#000', fontWeight: 900, fontSize: '14px' }}>STATUS: LIVE</div>
          <div style={{ fontSize: '12px', color: '#889988', fontFamily: 'monospace' }}>LINK_OK 100%</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '40px', flex: 1 }}>
        {/* 左侧：微观数值监控矩阵 */}
        <div style={{ flex: '3', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', alignContent: 'start' }}>
          {metrics && metrics.map((m, idx) => (
            <div key={idx} style={{
              backgroundColor: 'rgba(57,255,20,0.03)',
              border: `1px solid rgba(57,255,20,0.2)`,
              padding: '24px',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '10px', left: '10px', width: '6px', height: '6px', backgroundColor: hudGreen }} />
              <div style={{ color: '#889988', fontSize: '14px', fontWeight: 700, marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>{m.label}</div>
              <div style={{ color: hudGreen, fontSize: '48px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>{m.value}</div>
              {m.note && <div style={{ color: '#A0B0A0', fontSize: '13px', marginTop: '12px', borderTop: '1px dashed rgba(57,255,20,0.3)', paddingTop: '8px' }}>{m.note}</div>}
            </div>
          ))}

          {insight && (
            <div style={{ gridColumn: 'span 2', marginTop: '10px', backgroundColor: 'rgba(57,255,20,0.1)', borderLeft: `4px solid ${hudGreen}`, padding: '16px 20px', color: textWhite, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span> <span>{insight}</span>
            </div>
          )}
        </div>

        {/* 右侧：状态条与分析点 */}
        <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {bars && bars.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderBottom: `1px solid rgba(57,255,20,0.2)`, paddingBottom: '30px' }}>
              <div style={{ color: hudGreen, fontWeight: 900, fontSize: '14px', letterSpacing: '2px' }}>DATA / THRESHOLD</div>
              {bars.map((b, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700 }}>
                    <span style={{ color: textWhite }}>{b.label}</span>
                    <span style={{ color: hudGreen, fontFamily: 'monospace' }}>{b.current}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', position: 'relative' }}>
                    {/* 基准线（红线/标志线） */}
                    <div style={{ position: 'absolute', left: `${b.baseline}%`, top: '-4px', bottom: '-4px', width: '2px', backgroundColor: '#FF3333', zIndex: 10 }} />
                    {/* 当前值 */}
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${b.current}%`, backgroundColor: b.current > b.baseline ? hudGreen : '#FFCC00' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {bullets && bullets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: hudGreen, fontWeight: 900, fontSize: '14px', letterSpacing: '2px', marginBottom: '8px' }}>SYSTEM LOGS</div>
              {bullets.map((b, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', fontSize: '14px' }}>
                  <span style={{ color: hudGreen, fontFamily: 'monospace' }}>{'>_'}</span>
                  <div>
                    <div style={{ color: textWhite, fontWeight: 700 }}>{b.text}</div>
                    {b.description && <div style={{ color: '#889988', marginTop: '4px', lineHeight: 1.5 }}>{b.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export function renderVocationalPivHudLayoutHTML(model: any, theme: ThemeConfig): string {
  const { title, subtitle, metrics, bars, bullets, insight, background_image } = model;
  
  const bgDark = '#060B0A';
  const hudGreen = '#39FF14';
  const textWhite = '#E0F0E8';

  const slideStyle = toInlineStyle({
    ...getBaseSlideStyle(theme),
    ...(background_image ? { backgroundImage: `url(${background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: bgDark }),
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    padding: '40px 60px',
    color: textWhite,
    fontFamily: theme.fonts.body,
    border: `2px solid ${hudGreen}`,
    boxShadow: `inset 0 0 40px rgba(57, 255, 20, 0.1)`,
  });

  const metricsHTML = (metrics || []).map((m: any) => `
    <div style="background-color: rgba(57,255,20,0.03); border: 1px solid rgba(57,255,20,0.2); padding: 24px; position: relative;">
      <div style="position: absolute; top: 10px; left: 10px; width: 6px; height: 6px; background-color: ${hudGreen};"></div>
      <div style="color: #889988; font-size: 14px; font-weight: 700; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase;">${m.label}</div>
      <div style="color: ${hudGreen}; font-size: 48px; font-weight: 900; font-family: monospace; line-height: 1;">${m.value}</div>
      ${m.note ? `<div style="color: #A0B0A0; font-size: 13px; margin-top: 12px; border-top: 1px dashed rgba(57,255,20,0.3); padding-top: 8px;">${m.note}</div>` : ''}
    </div>
  `).join('\n');

  const insightHTML = insight ? `
    <div style="grid-column: span 2; margin-top: 10px; background-color: rgba(57,255,20,0.1); border-left: 4px solid ${hudGreen}; padding: 16px 20px; color: ${textWhite}; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 16px;">
      <span style="font-size: 24px;">⚠️</span> <span>${insight}</span>
    </div>
  ` : '';

  const barsHTML = (bars || []).map((b: any) => `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700;">
        <span style="color: ${textWhite};">${b.label}</span>
        <span style="color: ${hudGreen}; font-family: monospace;">${b.current}%</span>
      </div>
      <div style="height: 8px; background-color: rgba(255,255,255,0.1); position: relative;">
        <div style="position: absolute; left: ${b.baseline}%; top: -4px; bottom: -4px; width: 2px; background-color: #FF3333; z-index: 10;"></div>
        <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${b.current}%; background-color: ${b.current > b.baseline ? hudGreen : '#FFCC00'};"></div>
      </div>
    </div>
  `).join('\n');

  const bulletsHTML = (bullets || []).map((b: any) => `
    <div style="display: flex; gap: 12px; font-size: 14px;">
      <span style="color: ${hudGreen}; font-family: monospace;">&gt;_</span>
      <div>
        <div style="color: ${textWhite}; font-weight: 700;">${b.text}</div>
        ${b.description ? `<div style="color: #889988; margin-top: 4px; line-height: 1.5;">${b.description}</div>` : ''}
      </div>
    </div>
  `).join('\n');

  return `
<section style="${slideStyle}">
  <div style="position: absolute; top: 0; left: 0; width: 40px; height: 40px; border-top: 4px solid ${hudGreen}; border-left: 4px solid ${hudGreen};"></div>
  <div style="position: absolute; top: 0; right: 0; width: 40px; height: 40px; border-top: 4px solid ${hudGreen}; border-right: 4px solid ${hudGreen};"></div>
  <div style="position: absolute; bottom: 0; left: 0; width: 40px; height: 40px; border-bottom: 4px solid ${hudGreen}; border-left: 4px solid ${hudGreen};"></div>
  <div style="position: absolute; bottom: 0; right: 0; width: 40px; height: 40px; border-bottom: 4px solid ${hudGreen}; border-right: 4px solid ${hudGreen};"></div>
  
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(57,255,20,0.3); padding-bottom: 20px; margin-bottom: 40px;">
    <div>
      <div style="font-size: 14px; color: ${hudGreen}; letter-spacing: 2px; font-weight: 900; margin-bottom: 8px;">[ PIV_SYS_HUD_DISPLAY ]</div>
      <h2 style="margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: ${textWhite};">${title}</h2>
      ${subtitle ? `<p style="margin: 8px 0 0 0; font-size: 16px; color: #889988;">${subtitle}</p>` : ''}
    </div>
    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
      <div style="padding: 4px 12px; background-color: ${hudGreen}; color: #000; font-weight: 900; font-size: 14px;">STATUS: LIVE</div>
      <div style="font-size: 12px; color: #889988; font-family: monospace;">LINK_OK 100%</div>
    </div>
  </div>

  <div style="display: flex; gap: 40px; flex: 1;">
    <div style="flex: 3; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; align-content: start;">
      ${metricsHTML}
      ${insightHTML}
    </div>
    <div style="flex: 2; display: flex; flex-direction: column; gap: 30px;">
      ${bars && bars.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 20px; border-bottom: 1px solid rgba(57,255,20,0.2); padding-bottom: 30px;">
          <div style="color: ${hudGreen}; font-weight: 900; font-size: 14px; letter-spacing: 2px;">DATA / THRESHOLD</div>
          ${barsHTML}
        </div>
      ` : ''}
      ${bullets && bullets.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="color: ${hudGreen}; font-weight: 900; font-size: 14px; letter-spacing: 2px; margin-bottom: 8px;">SYSTEM LOGS</div>
          ${bulletsHTML}
        </div>
      ` : ''}
    </div>
  </div>
</section>`;
}
