import React from 'react';

interface Props { model: any; theme: any; }

export const VaultCoverLayout: React.FC<Props> = ({ model }) => {
  const { title = '', subtitle = '', author = '', date = '', classification = 'CONFIDENTIAL' } = model;
  return (
    <div style={{ width: '100%', height: '100%', background: '#00050F', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 80px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      {/* Blueprint grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      {/* Glow orb */}
      <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* Top bar */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', background: '#00D4FF', borderRadius: '50%' }} />
          <span style={{ fontSize: '13px', letterSpacing: '4px', color: '#00D4FF', textTransform: 'uppercase' }}>DATA VAULT // SECURE BRIEFING</span>
        </div>
        <div style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid #FF6B35', color: '#FF6B35', padding: '6px 20px', fontSize: '13px', fontWeight: 700, letterSpacing: '3px' }}>
          ▲ {classification}
        </div>
      </div>
      {/* Main content */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '12px' }}>
        <div style={{ borderLeft: '4px solid #00D4FF', paddingLeft: '32px' }}>
          {subtitle && <div style={{ fontSize: '16px', color: '#00D4FF', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '20px' }}>{subtitle}</div>}
          <h1 style={{ margin: '0 0 32px 0', fontSize: '64px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-1px', textShadow: '0 0 40px rgba(0,212,255,0.3)' }}>{title}</h1>
          <div style={{ display: 'flex', gap: '48px' }}>
            {author && <div><div style={{ fontSize: '11px', color: '#4A6B7A', letterSpacing: '2px', marginBottom: '4px' }}>ANALYST //</div><div style={{ fontSize: '18px', color: '#E8F4F8', fontWeight: 700 }}>{author}</div></div>}
            {date && <div><div style={{ fontSize: '11px', color: '#4A6B7A', letterSpacing: '2px', marginBottom: '4px' }}>TIMESTAMP //</div><div style={{ fontSize: '18px', color: '#39FF14', fontWeight: 700 }}>{date}</div></div>}
          </div>
        </div>
      </div>
      {/* Bottom status bar */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,212,255,0.1)', paddingTop: '20px', fontSize: '12px', color: '#2A4A5A', letterSpacing: '2px' }}>
        <span>VAULT-ID: DV-{Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
        <span style={{ color: '#39FF14' }}>● LIVE FEED ACTIVE</span>
      </div>
    </div>
  );
};

export function renderVaultCoverLayoutHTML(model: any, _theme: any): string {
  const { title = '', subtitle = '', author = '', date = '', classification = 'CONFIDENTIAL' } = model;
  return `
<section style="width:1280px;height:720px;background:#00050F;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;justify-content:space-between;padding:64px 80px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:absolute;top:-200px;right:-200px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(0,212,255,0.08) 0%,transparent 70%);pointer-events:none;"></div>
  <div style="position:relative;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,212,255,0.2);padding-bottom:24px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:8px;height:8px;background:#00D4FF;border-radius:50%;"></div>
      <span style="font-size:13px;letter-spacing:4px;color:#00D4FF;text-transform:uppercase;">DATA VAULT // SECURE BRIEFING</span>
    </div>
    <div style="background:rgba(255,107,53,0.15);border:1px solid #FF6B35;color:#FF6B35;padding:6px 20px;font-size:13px;font-weight:700;letter-spacing:3px;">▲ ${classification}</div>
  </div>
  <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;padding-left:12px;">
    <div style="border-left:4px solid #00D4FF;padding-left:32px;">
      ${subtitle ? `<div style="font-size:16px;color:#00D4FF;letter-spacing:4px;text-transform:uppercase;margin-bottom:20px;">${subtitle}</div>` : ''}
      <h1 style="margin:0 0 32px 0;font-size:64px;font-weight:900;color:#FFFFFF;line-height:1.2;letter-spacing:-1px;text-shadow:0 0 40px rgba(0,212,255,0.3);">${title}</h1>
      <div style="display:flex;gap:48px;">
        ${author ? `<div><div style="font-size:11px;color:#4A6B7A;letter-spacing:2px;margin-bottom:4px;">ANALYST //</div><div style="font-size:18px;color:#E8F4F8;font-weight:700;">${author}</div></div>` : ''}
        ${date ? `<div><div style="font-size:11px;color:#4A6B7A;letter-spacing:2px;margin-bottom:4px;">TIMESTAMP //</div><div style="font-size:18px;color:#39FF14;font-weight:700;">${date}</div></div>` : ''}
      </div>
    </div>
  </div>
  <div style="position:relative;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(0,212,255,0.1);padding-top:20px;font-size:12px;color:#2A4A5A;letter-spacing:2px;">
    <span>VAULT-ID: DV-A4F7C2</span>
    <span style="color:#39FF14;">● LIVE FEED ACTIVE</span>
  </div>
</section>`;
}
