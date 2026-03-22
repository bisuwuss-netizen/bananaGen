/**
 * 工业蓝图型：学习目标 - 技术规格卡（三轴向对比）
 * 设计：等宽三栏参数卡，CAD图纸质感
 */
import React from 'react';
import type { ThemeConfig } from '../../types/schema';

interface Props { model: any; theme: ThemeConfig; }

export const BlueprintSpecCardLayout: React.FC<Props> = ({ model }) => {
  const { title = '', subtitle = '', bullets = [] } = model;
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', flexDirection:'column', padding:'64px', boxSizing:'border-box', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:48, position:'relative', zIndex:1 }}>
        <div>
          <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:12 }}>SPECIFICATION CARD // 技术要求</div>
          <h1 style={{ margin:0, fontSize:48, fontWeight:900, color:'#FFFFFF' }}>{title}</h1>
        </div>
        {subtitle && <div style={{ background:'rgba(0,255,204,0.08)', border:'1px solid rgba(0,255,204,0.3)', padding:'12px 24px', color:'#00FFCC', fontSize:16, maxWidth:360, textAlign:'right' }}>{subtitle}</div>}
      </div>
      {/* Spec Cards */}
      <div style={{ flex:1, display:'flex', gap:24, position:'relative', zIndex:1 }}>
        {(bullets as any[]).map((b: any, i: number) => {
          const text = typeof b === 'string' ? b : b.text || '';
          const desc = typeof b === 'string' ? '' : b.description || '';
          return (
            <div key={i} style={{ flex:1, background:'#080E18', border:'1px solid #1A2A38', position:'relative', padding:'40px 32px', display:'flex', flexDirection:'column' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#00FFCC,transparent)' }} />
              <div style={{ fontFamily:'monospace', fontSize:11, color:'#4A6070', letterSpacing:3, textTransform:'uppercase', marginBottom:16 }}>PARAM // {String(i+1).padStart(2,'0')}</div>
              <h3 style={{ margin:'0 0 16px 0', fontSize:26, fontWeight:900, color:'#FFFFFF', lineHeight:1.3 }}>{text}</h3>
              {desc && <p style={{ margin:0, fontSize:16, color:'#7A9FB8', lineHeight:1.6 }}>{desc}</p>}
              <div style={{ marginTop:'auto', paddingTop:24, borderTop:'1px solid #0D1A24', fontFamily:'monospace', fontSize:11, color:'#2A4050', letterSpacing:2 }}>STATUS: REQUIRED</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderBlueprintSpecCardLayoutHTML(model: any): string {
  const { title='', subtitle='', bullets=[] } = model;
  const cards = (bullets as any[]).map((b:any, i:number) => {
    const text = typeof b==='string' ? b : b.text||'';
    const desc = typeof b==='string' ? '' : b.description||'';
    return `<div style="flex:1;background:#080E18;border:1px solid #1A2A38;position:relative;padding:40px 32px;display:flex;flex-direction:column;">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#00FFCC,transparent);"></div>
      <div style="font-family:monospace;font-size:11px;color:#4A6070;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">PARAM // ${String(i+1).padStart(2,'0')}</div>
      <h3 style="margin:0 0 16px 0;font-size:26px;font-weight:900;color:#FFFFFF;line-height:1.3;">${text}</h3>
      ${desc?`<p style="margin:0;font-size:16px;color:#7A9FB8;line-height:1.6;">${desc}</p>`:''}
      <div style="margin-top:auto;padding-top:24px;border-top:1px solid #0D1A24;font-family:monospace;font-size:11px;color:#2A4050;letter-spacing:2px;">STATUS: REQUIRED</div>
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;flex-direction:column;padding:64px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:48px;position:relative;z-index:1;">
    <div>
      <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">SPECIFICATION CARD // 技术要求</div>
      <h1 style="margin:0;font-size:48px;font-weight:900;color:#FFFFFF;">${title}</h1>
    </div>
    ${subtitle?`<div style="background:rgba(0,255,204,0.08);border:1px solid rgba(0,255,204,0.3);padding:12px 24px;color:#00FFCC;font-size:16px;max-width:360px;text-align:right;">${subtitle}</div>`:''}
  </div>
  <div style="flex:1;display:flex;gap:24px;position:relative;z-index:1;">${cards}</div>
</section>`;
}
