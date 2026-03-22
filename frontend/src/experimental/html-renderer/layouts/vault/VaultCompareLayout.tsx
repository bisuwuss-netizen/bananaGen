import React from 'react';

interface Props { model: any; theme: any; }

export const VaultCompareLayout: React.FC<Props> = ({ model }) => {
  const { title = 'COMPARATIVE INTEL', subtitle = '', categories = [], options = [] } = model;
  return (
    <div style={{ width: '100%', height: '100%', background: '#000D1A', color: '#E8F4F8', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', padding: '56px 64px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#00D4FF', marginBottom: '8px' }}>◈ {subtitle || 'CROSS-REFERENCE MATRIX'}</div>
        <h1 style={{ margin: 0, fontSize: '40px', fontWeight: 900, color: '#FFFFFF' }}>{title}</h1>
      </div>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', border: '1px solid rgba(0,212,255,0.15)', background: 'rgba(0,10,25,0.8)' }}>
        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,212,255,0.1)', borderBottom: '2px solid #00D4FF' }}>
              <th style={{ padding: '20px 24px', fontSize: '12px', color: '#4A6B7A', letterSpacing: '2px' }}>CATEGORY //</th>
              {options.map((opt: any, idx: number) => (
                <th key={idx} style={{ padding: '20px 24px', fontSize: '16px', fontWeight: 900, color: '#00D4FF', textAlign: 'center' }}>[ {typeof opt === 'string' ? opt : opt.name} ]</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(categories as any[]).map((cat: any, cIdx: number) => (
              <tr key={cIdx} style={{ borderBottom: '1px solid rgba(0,212,255,0.08)', background: cIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#A0C0D0' }}>{cat.name || cat}</td>
                {options.map((opt: any, oIdx: number) => {
                  const val = opt.values?.[cIdx] || '—';
                  const isPositive = /yes|true|high|win|pass/i.test(String(val));
                  const isNegative = /no|false|low|fail/i.test(String(val));
                  return (
                    <td key={oIdx} style={{ padding: '20px 24px', textAlign: 'center', fontSize: '15px', color: isPositive ? '#39FF14' : isNegative ? '#FF6B35' : '#FFFFFF' }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export function renderVaultCompareLayoutHTML(model: any, _theme: any): string {
  const { title = 'COMPARATIVE INTEL', subtitle = '', categories = [], options = [] } = model;
  const thsHTML = (options as any[]).map((opt: any) => `<th style="padding:20px 24px;font-size:16px;font-weight:900;color:#00D4FF;text-align:center;">[ ${typeof opt==='string'?opt:opt.name} ]</th>`).join('');
  const trsHTML = (categories as any[]).map((cat: any, cIdx: number) => {
    const tdsHTML = (options as any[]).map((opt: any) => {
      const val = opt.values?.[cIdx] || '—';
      const isPositive = /yes|true|high|win|pass|100%/i.test(String(val));
      const isNegative = /no|false|low|fail|0%/i.test(String(val));
      const color = isPositive ? '#39FF14' : isNegative ? '#FF6B35' : '#FFFFFF';
      return `<td style="padding:20px 24px;text-align:center;font-size:15px;color:${color};">${val}</td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid rgba(0,212,255,0.08);background:${cIdx%2===0?'transparent':'rgba(255,255,255,0.01)'};"><td style="padding:20px 24px;font-size:14px;font-weight:700;color:#A0C0D0;">${cat.name||cat}</td>${tdsHTML}</tr>`;
  }).join('');
  return `
<section style="width:1280px;height:720px;background:#000D1A;color:#E8F4F8;font-family:monospace;display:flex;flex-direction:column;padding:56px 64px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
  <div style="position:relative;margin-bottom:32px;">
    <div style="font-size:11px;letter-spacing:4px;color:#00D4FF;margin-bottom:8px;">◈ ${subtitle || 'CROSS-REFERENCE MATRIX'}</div>
    <h1 style="margin:0;font-size:40px;font-weight:900;color:#FFFFFF;">${title}</h1>
  </div>
  <div style="position:relative;flex:1;overflow:hidden;border:1px solid rgba(0,212,255,0.15);background:rgba(0,10,25,0.8);">
    <table style="width:100%;height:100%;border-collapse:collapse;text-align:left;">
      <thead><tr style="background:rgba(0,212,255,0.1);border-bottom:2px solid #00D4FF;"><th style="padding:20px 24px;font-size:12px;color:#4A6B7A;letter-spacing:2px;">CATEGORY //</th>${thsHTML}</tr></thead>
      <tbody>${trsHTML}</tbody>
    </table>
  </div>
</section>`;
}
