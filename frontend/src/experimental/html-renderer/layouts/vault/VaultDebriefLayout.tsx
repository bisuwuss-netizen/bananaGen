import React from 'react';

interface Props { model: any; theme: any; }

export const VaultDebriefLayout: React.FC<Props> = ({ model }) => {
  const { title = 'DEBRIEF CONCLUDED', subtitle = '', content = '', keyTakeaway = '' } = model;
  return (
    <div style={{ width: '100%', height: '100%', background: '#00050F', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '64px 80px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(57,255,20,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
      {/* Huge watermark */}
      <div style={{ position: 'absolute', fontSize: '180px', fontWeight: 900, color: 'rgba(57,255,20,0.03)', transform: 'rotate(-15deg)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>ARCHIVED</div>
      
      <div style={{ position: 'relative', maxWidth: '800px' }}>
        <div style={{ display: 'inline-block', padding: '8px 24px', background: 'rgba(57,255,20,0.1)', border: '1px solid #39FF14', color: '#39FF14', fontSize: '14px', fontWeight: 700, letterSpacing: '4px', marginBottom: '32px', textTransform: 'uppercase' }}>
          ✓ {subtitle || 'MISSION ACCOMPLISHED'}
        </div>
        <h1 style={{ margin: '0 0 24px 0', fontSize: '56px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>{title}</h1>
        <p style={{ margin: '0 0 48px 0', fontSize: '20px', color: '#A0C0D0', lineHeight: 1.6 }}>{content}</p>
        
        {keyTakeaway && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '40px', height: '1px', background: '#39FF14' }} />
            <div style={{ fontSize: '12px', color: '#4A6B7A', letterSpacing: '2px' }}>KEY TAKEAWAY //</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#39FF14', letterSpacing: '1px' }}>{keyTakeaway}</div>
          </div>
        )}
      </div>
      
      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: '48px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '64px', fontSize: '12px', color: '#1A4060', letterSpacing: '2px' }}>
        <span>ENCRYPTION: AES-256</span>
        <span>VAULT STATUS: LOCKED</span>
        <span>SIG: 0x8F2C...9D31</span>
      </div>
    </div>
  );
};

export function renderVaultDebriefLayoutHTML(model: any, _theme: any): string {
  const { title = 'DEBRIEF CONCLUDED', subtitle = '', content = '', keyTakeaway = '' } = model;
  return `
<section style="width:1280px;height:720px;background:#00050F;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:64px 80px;box-sizing:border-box;position:relative;overflow:hidden;justify-content:center;align-items:center;text-align:center;">
  <div style="absolute;inset:0;background-image:radial-gradient(rgba(57,255,20,0.05) 1px,transparent 1px);background-size:32px 32px;pointer-events:none;"></div>
  <div style="position:absolute;font-size:180px;font-weight:900;color:rgba(57,255,20,0.03);transform:rotate(-15deg);pointer-events:none;white-space:nowrap;">ARCHIVED</div>
  <div style="position:relative;max-width:800px;">
    <div style="display:inline-block;padding:8px 24px;background:rgba(57,255,20,0.1);border:1px solid #39FF14;color:#39FF14;font-size:14px;font-weight:700;letter-spacing:4px;margin-bottom:32px;text-transform:uppercase;">✓ ${subtitle || 'MISSION ACCOMPLISHED'}</div>
    <h1 style="margin:0 0 24px 0;font-size:56px;font-weight:900;color:#FFFFFF;line-height:1.1;">${title}</h1>
    <p style="margin:0 0 48px 0;font-size:20px;color:#A0C0D0;line-height:1.6;">${content}</p>
    ${keyTakeaway?`<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:40px;height:1px;background:#39FF14;"></div><div style="font-size:12px;color:#4A6B7A;letter-spacing:2px;">KEY TAKEAWAY //</div><div style="font-size:18px;font-weight:700;color:#39FF14;letter-spacing:1px;">${keyTakeaway}</div></div>`:''}
  </div>
  <div style="position:absolute;bottom:48px;left:0;right:0;display:flex;justify-content:center;gap:64px;font-size:12px;color:#1A4060;letter-spacing:2px;"><span>ENCRYPTION: AES-256</span><span>VAULT STATUS: LOCKED</span><span>SIG: 0x8F2C...9D31</span></div>
</section>`;
}
