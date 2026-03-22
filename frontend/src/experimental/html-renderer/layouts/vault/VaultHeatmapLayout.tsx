import React from 'react';

interface Props { model: any; theme: any; }

const RISK_COLORS: Record<string, string> = {
  critical: '#FF2222', high: '#FF6B35', medium: '#FFAA00', low: '#39FF14', info: '#00D4FF', safe: '#1A4A2A',
};

export const VaultHeatmapLayout: React.FC<Props> = ({ model }) => {
  const { title = 'RISK MATRIX', subtitle = '', bullets = [] } = model;
  const cells = bullets.slice(0, 6);
  const levels = ['critical','high','medium','low','info','safe'];
  return (
    <div style={{ width: '100%', height: '100%', background: '#000A14', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '56px 64px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,107,53,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,53,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#FF6B35', letterSpacing: '4px', marginBottom: '8px' }}>◈ THREAT ASSESSMENT</div>
          <h1 style={{ margin: 0, fontSize: '40px', fontWeight: 900, color: '#FFFFFF' }}>{title}</h1>
        </div>
        {subtitle && <div style={{ fontSize: '14px', color: '#4A6B7A', maxWidth: '320px', textAlign: 'right' }}>{subtitle}</div>}
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '12px' }}>
        {cells.map((b: any, idx: number) => {
          const raw = typeof b === 'string' ? b : b.text || '';
          const desc = typeof b === 'object' ? b.description || '' : '';
          const level = levels[idx % levels.length];
          const color = RISK_COLORS[level];
          const hex16 = color + '28';
          return (
            <div key={idx} style={{ background: hex16, border: `1px solid ${color}44`, position: 'relative', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color, textTransform: 'uppercase', padding: '3px 8px', background: `${color}22`, border: `1px solid ${color}44` }}>{level.toUpperCase()}</div>
                <div style={{ fontSize: '28px', color: `${color}33`, fontWeight: 900 }}>0{idx+1}</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px', lineHeight: 1.3 }}>{raw}</div>
                {desc && <div style={{ fontSize: '13px', color: '#5A7A8A', lineHeight: 1.5 }}>{desc}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderVaultHeatmapLayoutHTML(model: any, _theme: any): string {
  const { title = 'RISK MATRIX', subtitle = '', bullets = [] } = model;
  const cells = (bullets as any[]).slice(0, 6);
  const levels = ['critical','high','medium','low','info','safe'];
  const cellsHTML = cells.map((b: any, idx: number) => {
    const raw = typeof b === 'string' ? b : b.text || '';
    const desc = typeof b === 'object' ? b.description || '' : '';
    const level = levels[idx % levels.length];
    const color = RISK_COLORS[level];
    return `
    <div style="background:${color}28;border:1px solid ${color}44;position:relative;padding:24px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${color};"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:${color};text-transform:uppercase;padding:3px 8px;background:${color}22;border:1px solid ${color}44;">${level.toUpperCase()}</div>
        <div style="font-size:28px;color:${color}33;font-weight:900;">0${idx+1}</div>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700;color:#FFFFFF;margin-bottom:6px;line-height:1.3;">${raw}</div>
        ${desc ? `<div style="font-size:13px;color:#5A7A8A;line-height:1.5;">${desc}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#000A14;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:56px 64px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,107,53,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,53,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;">
    <div>
      <div style="font-size:11px;color:#FF6B35;letter-spacing:4px;margin-bottom:8px;">◈ THREAT ASSESSMENT</div>
      <h1 style="margin:0;font-size:40px;font-weight:900;color:#FFFFFF;">${title}</h1>
    </div>
    ${subtitle ? `<div style="font-size:14px;color:#4A6B7A;max-width:320px;text-align:right;">${subtitle}</div>` : ''}
  </div>
  <div style="position:relative;flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:12px;">
    ${cellsHTML}
  </div>
</section>`;
}
