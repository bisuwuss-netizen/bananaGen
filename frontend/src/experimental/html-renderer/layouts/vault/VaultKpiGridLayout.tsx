import React from 'react';

interface Props { model: any; theme: any; }

export const VaultKpiGridLayout: React.FC<Props> = ({ model }) => {
  const { title = 'CORE INTELLIGENCE', subtitle = '', bullets = [] } = model;
  const kpis = bullets.slice(0, 6);
  const colors = ['#00D4FF', '#39FF14', '#FF6B35', '#00D4FF', '#39FF14', '#FF6B35'];
  return (
    <div style={{ width: '100%', height: '100%', background: '#00050F', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '56px 64px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#00D4FF', marginBottom: '8px' }}>◈ {subtitle || 'INTEL METRICS'}</div>
        <h1 style={{ margin: 0, fontSize: '40px', fontWeight: 900, color: '#FFFFFF' }}>{title}</h1>
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {kpis.map((b: any, idx: number) => {
          const raw = typeof b === 'string' ? b : b.text || '';
          const [valueStr, ...labelParts] = raw.split(' ');
          const label = labelParts.join(' ') || raw;
          const value = labelParts.length > 0 ? valueStr : '—';
          const color = colors[idx % colors.length];
          return (
            <div key={idx} style={{ border: `1px solid rgba(${idx%3===0?'0,212,255':idx%3===1?'57,255,20':'255,107,53'},0.25)`, background: 'rgba(0,15,30,0.8)', padding: '28px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: color }} />
              <div style={{ fontSize: '11px', color: '#4A6B7A', letterSpacing: '2px', marginBottom: '12px' }}>M-{String(idx+1).padStart(2,'0')}</div>
              <div style={{ fontSize: '52px', fontWeight: 900, color: color, lineHeight: 1, letterSpacing: '-2px' }}>{value}</div>
              <div style={{ fontSize: '16px', color: '#A0C0D0', fontWeight: 500, marginTop: '12px', lineHeight: 1.3 }}>{label}</div>
              <div style={{ marginTop: '16px', width: '100%', height: '2px', background: '#0A1A24' }}>
                <div style={{ height: '100%', width: `${60 + idx * 6}%`, background: color, opacity: 0.5 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderVaultKpiGridLayoutHTML(model: any, _theme: any): string {
  const { title = 'CORE INTELLIGENCE', subtitle = '', bullets = [] } = model;
  const kpis = (bullets as any[]).slice(0, 6);
  const colors = ['#00D4FF','#39FF14','#FF6B35','#00D4FF','#39FF14','#FF6B35'];
  const cellsHTML = kpis.map((b: any, idx: number) => {
    const raw = typeof b === 'string' ? b : b.text || '';
    const parts = raw.split(' ');
    const value = parts.length > 1 ? parts[0] : '—';
    const label = parts.length > 1 ? parts.slice(1).join(' ') : raw;
    const color = colors[idx % colors.length];
    return `
    <div style="border:1px solid rgba(0,212,255,0.25);background:rgba(0,15,30,0.8);padding:28px;position:relative;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="position:absolute;top:0;left:0;width:100%;height:2px;background:${color};"></div>
      <div style="font-size:11px;color:#4A6B7A;letter-spacing:2px;margin-bottom:12px;">M-${String(idx+1).padStart(2,'0')}</div>
      <div style="font-size:52px;font-weight:900;color:${color};line-height:1;letter-spacing:-2px;">${value}</div>
      <div style="font-size:16px;color:#A0C0D0;font-weight:500;margin-top:12px;line-height:1.3;">${label}</div>
      <div style="margin-top:16px;width:100%;height:2px;background:#0A1A24;"><div style="height:100%;width:${60+idx*6}%;background:${color};opacity:0.5;"></div></div>
    </div>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#00050F;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:56px 64px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;margin-bottom:32px;">
    <div style="font-size:11px;letter-spacing:4px;color:#00D4FF;margin-bottom:8px;">◈ ${subtitle || 'INTEL METRICS'}</div>
    <h1 style="margin:0;font-size:40px;font-weight:900;color:#FFFFFF;">${title}</h1>
  </div>
  <div style="position:relative;flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
    ${cellsHTML}
  </div>
</section>`;
}
