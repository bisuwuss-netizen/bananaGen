import React from 'react';

interface Props { model: any; theme: any; }

export const VaultDeepAnalysisLayout: React.FC<Props> = ({ model }) => {
  const { title = '', subtitle = '', content = '', sidebar_title = 'ANALYSIS //', bullets = [] } = model;
  return (
    <div style={{ width: '100%', height: '100%', background: '#00050F', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '56px 64px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#00D4FF', marginBottom: '8px' }}>◈ {subtitle || 'IN-DEPTH DEBRIEF'}</div>
        <h1 style={{ margin: 0, fontSize: '40px', fontWeight: 900, color: '#FFFFFF' }}>{title}</h1>
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', gap: '48px' }}>
        {/* Main Text Area */}
        <div style={{ flex: 1.5, padding: '32px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '18px', lineHeight: 1.7, color: '#A0C0D0', whiteSpace: 'pre-wrap' }}>{content}</div>
        </div>
        {/* Sidebar Intel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '3px', color: '#39FF14', fontWeight: 700, borderBottom: '1px solid rgba(57,255,20,0.2)', paddingBottom: '12px' }}>{sidebar_title}</div>
          {bullets.map((b: any, idx: number) => {
            const text = typeof b === 'string' ? b : b.text || '';
            const desc = typeof b === 'object' ? b.description || '' : '';
            return (
              <div key={idx} style={{ padding: '16px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#00D4FF', marginBottom: '4px' }}>{text}</div>
                {desc && <div style={{ fontSize: '12px', color: '#4A6B7A', lineHeight: 1.5 }}>{desc}</div>}
              </div>
            );
          })}
          <div style={{ marginTop: 'auto', padding: '16px', border: '1px dashed rgba(0,212,255,0.2)', fontSize: '11px', color: '#4A6B7A', textAlign: 'center' }}>
            [ END OF CLASSIFIED SEGMENT ]
          </div>
        </div>
      </div>
    </div>
  );
};

export function renderVaultDeepAnalysisLayoutHTML(model: any, _theme: any): string {
  const { title = '', subtitle = '', content = '', sidebar_title = 'ANALYSIS //', bullets = [] } = model;
  const bulletsHTML = (bullets as any[]).map((b: any) => {
    const text = typeof b === 'string' ? b : b.text || '';
    const desc = typeof b === 'object' ? b.description || '' : '';
    return `<div style="padding:16px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1);"><div style="font-size:15px;font-weight:700;color:#00D4FF;margin-bottom:4px;">${text}</div>${desc?`<div style="font-size:12px;color:#4A6B7A;line-height:1.5;">${desc}</div>`:''}</div>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#00050F;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:56px 64px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;margin-bottom:32px;">
    <div style="font-size:11px;letter-spacing:4px;color:#00D4FF;margin-bottom:8px;">◈ ${subtitle || 'IN-DEPTH DEBRIEF'}</div>
    <h1 style="margin:0;font-size:40px;font-weight:900;color:#FFFFFF;">${title}</h1>
  </div>
  <div style="position:relative;flex:1;display:flex;gap:48px;">
    <div style="flex:1.5;padding:32px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;gap:20px;">
      <div style="font-size:18px;line-height:1.7;color:#A0C0D0;white-space:pre-wrap;">${content}</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;gap:20px;">
      <div style="font-size:13px;letter-spacing:3px;color:#39FF14;font-weight:700;border-bottom:1px solid rgba(57,255,20,0.2);padding-bottom:12px;">${sidebar_title}</div>
      ${bulletsHTML}
      <div style="margin-top:auto;padding:16px;border:1px dashed rgba(0,212,255,0.2);font-size:11px;color:#4A6B7A;text-align:center;">[ END OF CLASSIFIED SEGMENT ]</div>
    </div>
  </div>
</section>`;
}
