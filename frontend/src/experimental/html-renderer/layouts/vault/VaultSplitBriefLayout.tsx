import React from 'react';

interface Props { model: any; theme: any; }

export const VaultSplitBriefLayout: React.FC<Props> = ({ model }) => {
  const { title = '', left, right } = model;
  const leftHeader = left?.header || 'INTEL A';
  const leftBullets = left?.bullets || [];
  const rightHeader = right?.header || 'INTEL B';
  const rightBullets = right?.bullets || [];
  const rightContent = right?.content || '';
  return (
    <div style={{ width: '100%', height: '100%', background: '#000D1A', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '56px 64px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', marginBottom: '32px', borderBottom: '1px solid rgba(0,212,255,0.15)', paddingBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 900, color: '#FFFFFF' }}>{title}</h1>
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', gap: '0' }}>
        {/* Left */}
        <div style={{ flex: 1, paddingRight: '48px', borderRight: '1px solid rgba(0,212,255,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '3px', color: '#00D4FF', fontWeight: 700, marginBottom: '8px' }}>[ {leftHeader} ]</div>
          {leftBullets.map((b: any, idx: number) => {
            const text = typeof b === 'string' ? b : b.text || '';
            const desc = typeof b === 'object' ? b.description || '' : '';
            return (
              <div key={idx} style={{ borderLeft: '2px solid rgba(0,212,255,0.3)', paddingLeft: '16px' }}>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#FFFFFF', marginBottom: '4px' }}>{text}</div>
                {desc && <div style={{ fontSize: '13px', color: '#4A6B7A' }}>{desc}</div>}
              </div>
            );
          })}
        </div>
        {/* Right */}
        <div style={{ flex: 1, paddingLeft: '48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '3px', color: '#FF6B35', fontWeight: 700, marginBottom: '8px' }}>[ {rightHeader} ]</div>
          {rightBullets.map((b: any, idx: number) => {
            const text = typeof b === 'string' ? b : b.text || '';
            const desc = typeof b === 'object' ? b.description || '' : '';
            return (
              <div key={idx} style={{ borderLeft: '2px solid rgba(255,107,53,0.4)', paddingLeft: '16px' }}>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#FFFFFF', marginBottom: '4px' }}>{text}</div>
                {desc && <div style={{ fontSize: '13px', color: '#4A6B7A' }}>{desc}</div>}
              </div>
            );
          })}
          {rightContent && (
            <div style={{ marginTop: 'auto', padding: '20px 24px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)', fontSize: '14px', color: '#FF6B35', lineHeight: 1.6 }}>
              ⚠ {rightContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function renderVaultSplitBriefLayoutHTML(model: any, _theme: any): string {
  const { title = '', left, right } = model;
  const leftHeader = left?.header || 'INTEL A';
  const leftBullets = (left?.bullets || []) as any[];
  const rightHeader = right?.header || 'INTEL B';
  const rightBullets = (right?.bullets || []) as any[];
  const rightContent = right?.content || '';
  const leftHTML = leftBullets.map((b: any) => {
    const text = typeof b === 'string' ? b : b.text || '';
    const desc = typeof b === 'object' ? b.description || '' : '';
    return `<div style="border-left:2px solid rgba(0,212,255,0.3);padding-left:16px;"><div style="font-size:17px;font-weight:600;color:#FFFFFF;margin-bottom:4px;">${text}</div>${desc?`<div style="font-size:13px;color:#4A6B7A;">${desc}</div>`:''}</div>`;
  }).join('');
  const rightHTML = rightBullets.map((b: any) => {
    const text = typeof b === 'string' ? b : b.text || '';
    const desc = typeof b === 'object' ? b.description || '' : '';
    return `<div style="border-left:2px solid rgba(255,107,53,0.4);padding-left:16px;"><div style="font-size:17px;font-weight:600;color:#FFFFFF;margin-bottom:4px;">${text}</div>${desc?`<div style="font-size:13px;color:#4A6B7A;">${desc}</div>`:''}</div>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#000D1A;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:56px 64px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;margin-bottom:32px;border-bottom:1px solid rgba(0,212,255,0.15);padding-bottom:24px;">
    <h1 style="margin:0;font-size:36px;font-weight:900;color:#FFFFFF;">${title}</h1>
  </div>
  <div style="position:relative;flex:1;display:flex;gap:0;">
    <div style="flex:1;padding-right:48px;border-right:1px solid rgba(0,212,255,0.1);display:flex;flex-direction:column;gap:16px;">
      <div style="font-size:13px;letter-spacing:3px;color:#00D4FF;font-weight:700;margin-bottom:8px;">[ ${leftHeader} ]</div>
      ${leftHTML}
    </div>
    <div style="flex:1;padding-left:48px;display:flex;flex-direction:column;gap:16px;">
      <div style="font-size:13px;letter-spacing:3px;color:#FF6B35;font-weight:700;margin-bottom:8px;">[ ${rightHeader} ]</div>
      ${rightHTML}
      ${rightContent ? `<div style="margin-top:auto;padding:20px 24px;background:rgba(255,107,53,0.08);border:1px solid rgba(255,107,53,0.25);font-size:14px;color:#FF6B35;line-height:1.6;">⚠ ${rightContent}</div>` : ''}
    </div>
  </div>
</section>`;
}
