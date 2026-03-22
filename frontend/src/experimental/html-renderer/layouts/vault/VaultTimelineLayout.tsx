import React from 'react';

interface Props { model: any; theme: any; }

export const VaultTimelineLayout: React.FC<Props> = ({ model }) => {
  const { title = 'OPERATION TIMELINE', subtitle = '' } = model;
  const steps = model.steps || model.bullets || [];
  return (
    <div style={{ width: '100%', height: '100%', background: '#00050F', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '56px 64px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', marginBottom: '48px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#00D4FF', marginBottom: '8px' }}>◈ {subtitle || 'CHRONOLOGICAL SEQUENCE'}</div>
        <h1 style={{ margin: 0, fontSize: '40px', fontWeight: 900, color: '#FFFFFF' }}>{title}</h1>
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Timeline track */}
        <div style={{ position: 'absolute', left: '32px', top: '10%', bottom: '10%', width: '2px', background: 'linear-gradient(to bottom, transparent, #00D4FF88, #00D4FF, #00D4FF88, transparent)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '72px' }}>
          {steps.slice(0, 5).map((s: any, idx: number) => {
            const label = typeof s === 'string' ? s : s.label || s.text || '';
            const desc = typeof s === 'object' ? s.description || '' : '';
            const isActive = idx === 0;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', position: 'relative' }}>
                {/* Dot + line */}
                <div style={{ position: 'absolute', left: '-52px', top: '14px', width: '16px', height: '16px', borderRadius: '50%', background: isActive ? '#00D4FF' : '#0A2030', border: `2px solid ${isActive ? '#00D4FF' : '#1A4060'}`, boxShadow: isActive ? '0 0 12px #00D4FF' : 'none', flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '16px 24px', background: isActive ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: desc ? '8px' : 0 }}>
                    <span style={{ fontSize: '17px', fontWeight: 700, color: isActive ? '#FFFFFF' : '#6A8A9A' }}>{label}</span>
                    <span style={{ fontSize: '11px', color: isActive ? '#39FF14' : '#2A4A5A', letterSpacing: '2px' }}>T+{String(idx * 15).padStart(3, '0')}MIN</span>
                  </div>
                  {desc && <div style={{ fontSize: '13px', color: '#4A6B7A', lineHeight: 1.5 }}>{desc}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function renderVaultTimelineLayoutHTML(model: any, _theme: any): string {
  const { title = 'OPERATION TIMELINE', subtitle = '' } = model;
  const steps = model.steps || model.bullets || [];
  const stepsHTML = (steps as any[]).slice(0, 5).map((s: any, idx: number) => {
    const label = typeof s === 'string' ? s : s.label || s.text || '';
    const desc = typeof s === 'object' ? (s.description || '') : '';
    const isActive = idx === 0;
    return `
    <div style="display:flex;align-items:flex-start;gap:20px;position:relative;">
      <div style="position:absolute;left:-52px;top:14px;width:16px;height:16px;border-radius:50%;background:${isActive?'#00D4FF':'#0A2030'};border:2px solid ${isActive?'#00D4FF':'#1A4060'};box-shadow:${isActive?'0 0 12px #00D4FF':'none'};flex-shrink:0;"></div>
      <div style="flex:1;padding:16px 24px;background:${isActive?'rgba(0,212,255,0.08)':'rgba(255,255,255,0.02)'};border:1px solid ${isActive?'rgba(0,212,255,0.3)':'rgba(255,255,255,0.06)'};">
        <div style="display:flex;justify-content:space-between;align-items:center;${desc?'margin-bottom:8px;':''}">
          <span style="font-size:17px;font-weight:700;color:${isActive?'#FFFFFF':'#6A8A9A'};">${label}</span>
          <span style="font-size:11px;color:${isActive?'#39FF14':'#2A4A5A'};letter-spacing:2px;">T+${String(idx*15).padStart(3,'0')}MIN</span>
        </div>
        ${desc?`<div style="font-size:13px;color:#4A6B7A;line-height:1.5;">${desc}</div>`:''}
      </div>
    </div>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#00050F;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:56px 64px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;margin-bottom:48px;">
    <div style="font-size:11px;letter-spacing:4px;color:#00D4FF;margin-bottom:8px;">◈ ${subtitle || 'CHRONOLOGICAL SEQUENCE'}</div>
    <h1 style="margin:0;font-size:40px;font-weight:900;color:#FFFFFF;">${title}</h1>
  </div>
  <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="position:absolute;left:32px;top:10%;bottom:10%;width:2px;background:linear-gradient(to bottom,transparent,#00D4FF88,#00D4FF,#00D4FF88,transparent);"></div>
    <div style="display:flex;flex-direction:column;gap:16px;padding-left:72px;">
      ${stepsHTML}
    </div>
  </div>
</section>`;
}
