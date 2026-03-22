import React from 'react';

interface Props { model: any; theme: any; }

export const VaultFlowCircuitLayout: React.FC<Props> = ({ model }) => {
  const { title = 'LOGIC FLOW', subtitle = '' } = model;
  const steps = model.steps || model.bullets || [];
  return (
    <div style={{ width: '100%', height: '100%', background: '#00050F', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '56px 64px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(57,255,20,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(57,255,20,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', marginBottom: '48px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#39FF14', marginBottom: '8px' }}>◈ {subtitle || 'PROCESS CIRCUIT'}</div>
        <h1 style={{ margin: 0, fontSize: '40px', fontWeight: 900, color: '#FFFFFF' }}>{title}</h1>
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: '0' }}>
        {steps.slice(0, 5).map((s: any, idx: number, arr: any[]) => {
          const label = typeof s === 'string' ? s : s.label || s.text || '';
          const desc = typeof s === 'object' ? (s.description || '') : '';
          const isLast = idx === arr.length - 1;
          return (
            <React.Fragment key={idx}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '20px 16px', background: 'rgba(57,255,20,0.06)', border: '1px solid rgba(57,255,20,0.3)', width: '100%', textAlign: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#000', padding: '0 8px', fontSize: '10px', color: '#39FF14', letterSpacing: '2px' }}>NODE-{idx+1}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px', lineHeight: 1.3 }}>{label}</div>
                  {desc && <div style={{ fontSize: '11px', color: '#4A6B7A', lineHeight: 1.4 }}>{desc}</div>}
                </div>
              </div>
              {!isLast && (
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px', gap: '2px' }}>
                  <div style={{ width: '24px', height: '1px', background: '#39FF14', opacity: 0.5 }} />
                  <span style={{ color: '#39FF14', fontSize: '14px' }}>▶</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export function renderVaultFlowCircuitLayoutHTML(model: any, _theme: any): string {
  const { title = 'LOGIC FLOW', subtitle = '' } = model;
  const steps = (model.steps || model.bullets || []) as any[];
  const nodesHTML = steps.slice(0, 5).map((s: any, idx: number) => {
    const label = typeof s === 'string' ? s : s.label || s.text || '';
    const desc = typeof s === 'object' ? (s.description || '') : '';
    const isLast = idx === Math.min(steps.length, 5) - 1;
    return `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:12px;">
      <div style="padding:20px 16px;background:rgba(57,255,20,0.06);border:1px solid rgba(57,255,20,0.3);width:100%;text-align:center;position:relative;box-sizing:border-box;">
        <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#000;padding:0 8px;font-size:10px;color:#39FF14;letter-spacing:2px;">NODE-${idx+1}</div>
        <div style="font-size:15px;font-weight:700;color:#FFFFFF;margin-bottom:8px;line-height:1.3;">${label}</div>
        ${desc?`<div style="font-size:11px;color:#4A6B7A;line-height:1.4;">${desc}</div>`:''}
      </div>
    </div>
    ${!isLast?`<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:0 4px;gap:2px;"><div style="width:24px;height:1px;background:#39FF14;opacity:0.5;"></div><span style="color:#39FF14;font-size:14px;">▶</span></div>`:''}`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#00050F;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:56px 64px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(57,255,20,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(57,255,20,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;margin-bottom:48px;">
    <div style="font-size:11px;letter-spacing:4px;color:#39FF14;margin-bottom:8px;">◈ ${subtitle || 'PROCESS CIRCUIT'}</div>
    <h1 style="margin:0;font-size:40px;font-weight:900;color:#FFFFFF;">${title}</h1>
  </div>
  <div style="position:relative;flex:1;display:flex;align-items:center;gap:0;">
    ${nodesHTML}
  </div>
</section>`;
}
