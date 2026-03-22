import React from 'react';

interface Props { model: any; theme: any; }

export const VaultTerminalLayout: React.FC<Props> = ({ model }) => {
  const { title = 'TERMINAL OUTPUT', subtitle = '', log_entries = [] } = model;
  return (
    <div style={{ width: '100%', height: '100%', background: '#000000', color: '#39FF14', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '48px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(57,255,20,0.05) 1px,transparent 1px)', backgroundSize: '100% 4px', pointerEvents: 'none', opacity: 0.3 }} />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #39FF14', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '20px', fontWeight: 900 }}>{'>'} {title}</span>
          <span style={{ fontSize: '13px', color: 'rgba(57,255,20,0.5)', letterSpacing: '2px' }}>{subtitle || 'RUNNING...'}</span>
        </div>
        <div style={{ fontSize: '12px', padding: '4px 12px', border: '1px solid #39FF14' }}>PID: {Math.floor(Math.random() * 9000) + 1000}</div>
      </div>
      {/* Terminal View */}
      <div style={{ flex: 1, padding: '24px', background: 'rgba(57,255,20,0.02)', border: '1px solid rgba(57,255,20,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(log_entries as any[]).slice(0, 12).map((entry: any, idx: number) => {
          const timestamp = `[${new Date().toLocaleTimeString('en-GB', { hour12: false })}.${Math.floor(Math.random() * 999).toString().padStart(3, '0')}]`;
          const text = typeof entry === 'string' ? entry : entry.text || '';
          const type = typeof entry === 'object' ? entry.type || 'info' : 'info';
          const color = type === 'error' ? '#FF2222' : type === 'warn' ? '#FFAA00' : '#39FF14';
          return (
            <div key={idx} style={{ fontSize: '14px', lineHeight: 1.4, display: 'flex', gap: '16px' }}>
              <span style={{ color: 'rgba(57,255,20,0.4)', flexShrink: 0 }}>{timestamp}</span>
              <span style={{ color }}>{text}</span>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', marginTop: '8px' }}>
          <span style={{ color: 'rgba(57,255,20,0.4)', flexShrink: 0 }}>[{new Date().toLocaleTimeString('en-GB', { hour12: false })}.999]</span>
          <span style={{ color: '#39FF14' }}>{'>'} _</span>
        </div>
      </div>
      {/* Footer Meta */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(57,255,20,0.4)' }}>
        <span>LOC: //DEEP-VAULT/SYS/LOGS</span>
        <span style={{ color: '#39FF14', letterSpacing: '2px' }}>V-0.9.4 TERMINAL SECURE</span>
      </div>
    </div>
  );
};

export function renderVaultTerminalLayoutHTML(model: any, _theme: any): string {
  const { title = 'TERMINAL OUTPUT', subtitle = '', log_entries = [] } = model;
  const logHTML = (log_entries as any[]).slice(0, 12).map((entry: any, idx: number) => {
    const timestamp = `[10:14:02.${Math.floor(Math.random()*999).toString().padStart(3,'0')}]`;
    const text = typeof entry === 'string' ? entry : entry.text || '';
    const type = typeof entry === 'object' ? entry.type || 'info' : 'info';
    const color = type === 'error' ? '#FF2222' : type === 'warn' ? '#FFAA00' : '#39FF14';
    return `<div style="font-size:14px;line-height:1.4;display:flex;gap:16px;"><span style="color:rgba(57,255,20,0.4);flex-shrink:0;">${timestamp}</span><span style="color:${color};">${text}</span></div>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#000000;color:#39FF14;font-family:monospace;display:flex;flex-direction:column;padding:48px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(57,255,20,0.05) 1px,transparent 1px);background-size:100% 4px;pointer-events:none;opacity:0.3;"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #39FF14;padding-bottom:16px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:16px;"><span style="font-size:20px;font-weight:900;">> ${title}</span><span style="font-size:13px;color:rgba(57,255,20,0.5);letter-spacing:2px;">${subtitle||'RUNNING...'}</span></div>
    <div style="font-size:12px;padding:4px 12px;border:1px solid #39FF14;">PID: 4852</div>
  </div>
  <div style="flex:1;padding:24px;background:rgba(57,255,20,0.02);border:1px solid rgba(57,255,20,0.1);overflow:hidden;display:flex;flex-direction:column;gap:8px;">
    ${logHTML}
    <div style="display:flex;gap:16px;font-size:14px;margin-top:8px;"><span style="color:rgba(57,255,20,0.4);flex-shrink:0;">[10:14:03.124]</span><span style="color:#39FF14;">> _</span></div>
  </div>
  <div style="margin-top:20px;display:flex;justify-content:space-between;font-size:12px;color:rgba(57,255,20,0.4);"><span>LOC: //DEEP-VAULT/SYS/LOGS</span><span style="color:#39FF14;letter-spacing:2px;">V-0.9.4 TERMINAL SECURE</span></div>
</section>`;
}
