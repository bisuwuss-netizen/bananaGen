/**
 * 工业蓝图型：Bento数据阵列 - 技术参数全景仪表板
 * 设计：多格Bento Grid展示关键技术参数，深色卡片+亮色高亮数值
 */
import React from 'react';
import type { ThemeConfig } from '../../types/schema';

interface Props { model: any; theme: ThemeConfig; }

export const BlueprintBentoGridLayout: React.FC<Props> = ({ model }) => {
  const { title='', bullets=[] } = model;
  const items: any[] = Array.isArray(bullets) ? bullets.slice(0,6) : [];
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', flexDirection:'column', padding:'56px', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:32, position:'relative', zIndex:1 }}>
        <div>
          <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:12 }}>BENTO // PARAMETER MATRIX</div>
          <h1 style={{ margin:0, fontSize:44, fontWeight:900, color:'#FFFFFF' }}>{title}</h1>
        </div>
        <div style={{ fontFamily:'monospace', fontSize:12, color:'#2A4050', letterSpacing:2 }}>[{items.length}/{items.length} PARAMS ACTIVE]</div>
      </div>
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gridTemplateRows:'repeat(2,1fr)', gap:16, position:'relative', zIndex:1 }}>
        {items.map((b: any, i: number) => {
          const text = typeof b==='string' ? b : b.text||'';
          const desc = typeof b==='string' ? '' : b.description||'';
          const isLarge = i===0;
          return (
            <div key={i} style={{ gridColumn: isLarge?'span 2':undefined, background:'#080E18', border:'1px solid #0D1A24', padding:'28px 28px', position:'relative', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:`hsl(${(i*60)%360},70%,45%)` }} />
              <div>
                <div style={{ fontFamily:'monospace', fontSize:11, color:'#4A6070', letterSpacing:2, marginBottom:12 }}>P{String(i+1).padStart(2,'0')}</div>
                <h3 style={{ margin:'0 0 10px 0', fontSize: isLarge?28:20, fontWeight:900, color:'#FFFFFF', lineHeight:1.3 }}>{text}</h3>
                {desc && <p style={{ margin:0, fontSize:14, color:'#5A7090', lineHeight:1.5 }}>{desc}</p>}
              </div>
              <div style={{ marginTop:16, height:2, background:`hsl(${(i*60)%360},70%,45%)`, width:'33%', opacity:.6 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderBlueprintBentoGridLayoutHTML(model: any): string {
  const { title='', bullets=[] } = model;
  const items: any[] = Array.isArray(bullets) ? bullets.slice(0,6) : [];
  const cells = items.map((b:any, i:number) => {
    const text = typeof b==='string' ? b : b.text||'';
    const desc = typeof b==='string' ? '' : b.description||'';
    const isLarge = i===0;
    const hue = (i*60)%360;
    return `<div style="grid-column:${isLarge?'span 2':''};background:#080E18;border:1px solid #0D1A24;padding:28px;position:relative;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:hsl(${hue},70%,45%);"></div>
      <div>
        <div style="font-family:monospace;font-size:11px;color:#4A6070;letter-spacing:2px;margin-bottom:12px;">P${String(i+1).padStart(2,'0')}</div>
        <h3 style="margin:0 0 10px 0;font-size:${isLarge?28:20}px;font-weight:900;color:#FFFFFF;line-height:1.3;">${text}</h3>
        ${desc?`<p style="margin:0;font-size:14px;color:#5A7090;line-height:1.5;">${desc}</p>`:''}
      </div>
      <div style="margin-top:16px;height:2px;background:hsl(${hue},70%,45%);width:33%;opacity:.6;"></div>
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;flex-direction:column;padding:56px;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;position:relative;z-index:1;">
    <div>
      <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">BENTO // PARAMETER MATRIX</div>
      <h1 style="margin:0;font-size:44px;font-weight:900;color:#FFFFFF;">${title}</h1>
    </div>
    <div style="font-family:monospace;font-size:12px;color:#2A4050;letter-spacing:2px;">[${items.length}/${items.length} PARAMS ACTIVE]</div>
  </div>
  <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:16px;position:relative;z-index:1;">${cells}</div>
</section>`;
}
