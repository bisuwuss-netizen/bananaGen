import React from 'react';

interface Props { model: any; theme: any; }

export const VaultIndexLayout: React.FC<Props> = ({ model }) => {
  const { title = 'MISSION INDEX', subtitle = '', items = [] } = model;
  return (
    <div style={{ width: '100%', height: '100%', background: '#000D1A', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', padding: '64px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', gap: '64px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      {/* Left panel */}
      <div style={{ position: 'relative', width: '35%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#00D4FF', marginBottom: '16px', textTransform: 'uppercase' }}>◈ INTEL DOSSIER</div>
        <h1 style={{ margin: '0 0 24px 0', fontSize: '48px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.15 }}>{title}</h1>
        {subtitle && <p style={{ margin: '0 0 40px 0', fontSize: '16px', color: '#4A6B7A', lineHeight: 1.6 }}>{subtitle}</p>}
        <div style={{ padding: '20px 24px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderLeft: '3px solid #00D4FF' }}>
          <div style={{ fontSize: '11px', color: '#4A6B7A', letterSpacing: '2px', marginBottom: '8px' }}>CLEARANCE REQUIRED</div>
          <div style={{ fontSize: '14px', color: '#00D4FF', fontWeight: 700 }}>{items.length} CLASSIFIED SECTIONS</div>
        </div>
      </div>
      {/* Right: sections */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
        {items.map((item: any, idx: number) => {
          const text = typeof item === 'string' ? item : item.text || '';
          const isActive = idx === 0;
          const fillPct = Math.max(20, 100 - idx * 18);
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '16px 24px', background: isActive ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.06)'}`, position: 'relative' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: isActive ? '#00D4FF' : '#1A3040', width: '48px', flexShrink: 0 }}>{String(idx + 1).padStart(2, '0')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: isActive ? '#FFFFFF' : '#6A8A9A', marginBottom: '6px' }}>{text}</div>
                <div style={{ width: '100%', height: '3px', background: '#0A1A24' }}>
                  <div style={{ height: '100%', width: `${fillPct}%`, background: isActive ? '#00D4FF' : '#1A3040' }} />
                </div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: isActive ? '#39FF14' : '#2A4A5A' }}>{isActive ? '▶ ACTIVE' : 'QUEUED'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderVaultIndexLayoutHTML(model: any, _theme: any): string {
  const { title = 'MISSION INDEX', subtitle = '', items = [] } = model;
  const itemsHTML = items.map((item: any, idx: number) => {
    const text = typeof item === 'string' ? item : item.text || '';
    const isActive = idx === 0;
    const fillPct = Math.max(20, 100 - idx * 18);
    return `
    <div style="display:flex;align-items:center;gap:24px;padding:16px 24px;background:${isActive ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)'};border:1px solid ${isActive ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.06)'};">
      <div style="font-size:32px;font-weight:900;color:${isActive ? '#00D4FF' : '#1A3040'};width:48px;flex-shrink:0;">${String(idx + 1).padStart(2,'0')}</div>
      <div style="flex:1;">
        <div style="font-size:18px;font-weight:700;color:${isActive ? '#FFFFFF' : '#6A8A9A'};margin-bottom:6px;">${text}</div>
        <div style="width:100%;height:3px;background:#0A1A24;"><div style="height:100%;width:${fillPct}%;background:${isActive ? '#00D4FF' : '#1A3040'};"></div></div>
      </div>
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${isActive ? '#39FF14' : '#2A4A5A'};">${isActive ? '▶ ACTIVE' : 'QUEUED'}</div>
    </div>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#000D1A;color:#E8F4F8;font-family:monospace;display:flex;padding:64px;box-sizing:border-box;position:relative;overflow:hidden;gap:64px;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;width:35%;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-size:11px;letter-spacing:4px;color:#00D4FF;margin-bottom:16px;text-transform:uppercase;">◈ INTEL DOSSIER</div>
    <h1 style="margin:0 0 24px 0;font-size:48px;font-weight:900;color:#FFFFFF;line-height:1.15;">${title}</h1>
    ${subtitle ? `<p style="margin:0 0 40px 0;font-size:16px;color:#4A6B7A;line-height:1.6;">${subtitle}</p>` : ''}
    <div style="padding:20px 24px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.15);border-left:3px solid #00D4FF;">
      <div style="font-size:11px;color:#4A6B7A;letter-spacing:2px;margin-bottom:8px;">CLEARANCE REQUIRED</div>
      <div style="font-size:14px;color:#00D4FF;font-weight:700;">${items.length} CLASSIFIED SECTIONS</div>
    </div>
  </div>
  <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px;">
    ${itemsHTML}
  </div>
</section>`;
}
