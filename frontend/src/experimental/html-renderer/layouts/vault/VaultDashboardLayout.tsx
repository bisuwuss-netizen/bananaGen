import React from 'react';

interface Props { model: any; theme: any; }

export const VaultDashboardLayout: React.FC<Props> = ({ model }) => {
  const { title = '', subtitle = '', metrics = [], bars = [], bullets = [], insight = '' } = model;
  return (
    <div style={{ width: '100%', height: '100%', background: '#000812', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '48px 56px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,212,255,0.12)', paddingBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '3px', color: '#00D4FF', marginBottom: '4px' }}>◈ LIVE FEED</div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>{title}</h1>
        </div>
        <div style={{ fontSize: '14px', color: '#39FF14', letterSpacing: '2px' }}>● {subtitle || 'SYSTEM NOMINAL'}</div>
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', gap: '24px' }}>
        {/* Metric cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(metrics as any[]).slice(0, 3).map((m: any, idx: number) => (
            <div key={idx} style={{ flex: 1, padding: '16px 20px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderLeft: '3px solid #00D4FF' }}>
              <div style={{ fontSize: '11px', color: '#4A6B7A', marginBottom: '4px', letterSpacing: '1px' }}>{m.label || ''}</div>
              <div style={{ fontSize: '40px', fontWeight: 900, color: '#00D4FF', lineHeight: 1 }}>{m.value || '—'}</div>
              {m.note && <div style={{ fontSize: '11px', color: '#FF6B35', marginTop: '4px' }}>{m.note}</div>}
            </div>
          ))}
        </div>
        {/* Bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
          {(bars as any[]).slice(0, 4).map((b: any, idx: number) => {
            const pct = b.current ? Math.round(b.current / (b.baseline || 100) * 100) : 70;
            const crit = pct > 85;
            return (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', color: '#A0C0D0' }}>
                  <span>{b.label || ''}</span>
                  <span style={{ color: crit ? '#FF6B35' : '#39FF14', fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: '8px', background: '#0A1A24', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: crit ? '#FF6B35' : '#00D4FF', borderRadius: '2px' }} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Intelligence log */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '1px solid rgba(0,212,255,0.1)', paddingLeft: '24px' }}>
          <div style={{ fontSize: '11px', color: '#00D4FF', letterSpacing: '2px', marginBottom: '4px' }}>INTEL LOG</div>
          {(bullets as any[]).slice(0, 4).map((b: any, idx: number) => {
            const text = typeof b === 'string' ? b : b.text || '';
            const desc = typeof b === 'object' ? b.description || '' : '';
            const isFault = /fault|error|warn|crit/i.test(text);
            return (
              <div key={idx} style={{ padding: '10px 14px', background: isFault ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${isFault ? '#FF6B35' : '#1A4060'}`, fontSize: '13px' }}>
                <div style={{ color: isFault ? '#FF6B35' : '#A0C0D0', fontWeight: 700, marginBottom: '2px' }}>{text}</div>
                {desc && <div style={{ color: '#4A6B7A', fontSize: '11px' }}>{desc}</div>}
              </div>
            );
          })}
          {insight && <div style={{ marginTop: 'auto', padding: '12px 14px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', fontSize: '12px', color: '#00D4FF', lineHeight: 1.5 }}>{insight}</div>}
        </div>
      </div>
    </div>
  );
};

export function renderVaultDashboardLayoutHTML(model: any, _theme: any): string {
  const { title = '', subtitle = '', metrics = [], bars = [], bullets = [], insight = '' } = model;
  const metricsHTML = (metrics as any[]).slice(0, 3).map((m: any) => `
    <div style="flex:1;padding:16px 20px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.15);border-left:3px solid #00D4FF;">
      <div style="font-size:11px;color:#4A6B7A;margin-bottom:4px;letter-spacing:1px;">${m.label||''}</div>
      <div style="font-size:40px;font-weight:900;color:#00D4FF;line-height:1;">${m.value||'—'}</div>
      ${m.note?`<div style="font-size:11px;color:#FF6B35;margin-top:4px;">${m.note}</div>`:''}
    </div>`).join('');
  const barsHTML = (bars as any[]).slice(0, 4).map((b: any) => {
    const pct = b.current ? Math.round(b.current / (b.baseline||100) * 100) : 70;
    const crit = pct > 85;
    return `<div><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;color:#A0C0D0;"><span>${b.label||''}</span><span style="color:${crit?'#FF6B35':'#39FF14'};font-weight:700;">${pct}%</span></div><div style="height:8px;background:#0A1A24;border-radius:2px;"><div style="height:100%;width:${pct}%;background:${crit?'#FF6B35':'#00D4FF'};border-radius:2px;"></div></div></div>`;
  }).join('');
  const logHTML = (bullets as any[]).slice(0, 4).map((b: any) => {
    const text = typeof b === 'string' ? b : b.text || '';
    const desc = typeof b === 'object' ? b.description || '' : '';
    const isFault = /fault|error|warn|crit/i.test(text);
    return `<div style="padding:10px 14px;background:${isFault?'rgba(255,107,53,0.08)':'rgba(255,255,255,0.02)'};border-left:2px solid ${isFault?'#FF6B35':'#1A4060'};font-size:13px;"><div style="color:${isFault?'#FF6B35':'#A0C0D0'};font-weight:700;margin-bottom:2px;">${text}</div>${desc?`<div style="color:#4A6B7A;font-size:11px;">${desc}</div>`:''}</div>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#000812;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:48px 56px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,212,255,0.12);padding-bottom:16px;">
    <div><div style="font-size:11px;letter-spacing:3px;color:#00D4FF;margin-bottom:4px;">◈ LIVE FEED</div><h1 style="margin:0;font-size:32px;font-weight:900;color:#FFFFFF;">${title}</h1></div>
    <div style="font-size:14px;color:#39FF14;letter-spacing:2px;">● ${subtitle||'SYSTEM NOMINAL'}</div>
  </div>
  <div style="position:relative;flex:1;display:flex;gap:24px;">
    <div style="flex:1;display:flex;flex-direction:column;gap:16px;">${metricsHTML}</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:16px;justify-content:center;">${barsHTML}</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:10px;border-left:1px solid rgba(0,212,255,0.1);padding-left:24px;">
      <div style="font-size:11px;color:#00D4FF;letter-spacing:2px;margin-bottom:4px;">INTEL LOG</div>
      ${logHTML}
      ${insight?`<div style="margin-top:auto;padding:12px 14px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.2);font-size:12px;color:#00D4FF;line-height:1.5;">${insight}</div>`:''}
    </div>
  </div>
</section>`;
}
