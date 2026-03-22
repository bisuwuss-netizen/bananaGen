/**
 * 工业蓝图型：巨参数透出 - 极端留白+宏大数据参数亮相
 * 设计：极简白空间，超级大号的参数数字居中惊艳登场
 */
import React from 'react';
import type { ThemeConfig } from '../../types/schema';

interface Props { model: any; theme: ThemeConfig; }

export const BlueprintBigRevealLayout: React.FC<Props> = ({ model }) => {
  const { title='', bullets=[], subtitle='' } = model;
  const items: any[] = Array.isArray(bullets) ? bullets : [];
  const keyTakeaway = (model as any).keyTakeaway || '';
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', flexDirection:'column', justifyContent:'center', padding:'64px 80px', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.03, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'60px 60px' }} />
      <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:24, position:'relative', zIndex:1 }}>{subtitle || 'CRITICAL PARAMETER // 关键参数'}</div>
      <h2 style={{ margin:'0 0 48px 0', fontSize:36, fontWeight:800, color:'#7A9FB8', position:'relative', zIndex:1 }}>{title}</h2>
      {/* Giant parameters */}
      <div style={{ display:'flex', gap:64, alignItems:'flex-end', position:'relative', zIndex:1, marginBottom:48 }}>
        {items.map((b: any, i: number) => {
          const text = typeof b==='string' ? b : b.text||'';
          const desc = typeof b==='string' ? '' : b.description||'';
          return (
            <div key={i} style={{ flex:1 }}>
              <div style={{ fontSize: items.length<=2?100:64, fontWeight:900, color:'#FFFFFF', lineHeight:1, letterSpacing:-3, marginBottom:16, textShadow:'0 0 60px rgba(0,255,204,0.15)' }}>{text}</div>
              {desc && <p style={{ margin:0, fontSize:18, color:'#5A7090', lineHeight:1.5, borderTop:'1px solid #0D1A24', paddingTop:16 }}>{desc}</p>}
            </div>
          );
        })}
      </div>
      {keyTakeaway && (
        <div style={{ position:'relative', zIndex:1, borderLeft:'4px solid #00FFCC', paddingLeft:24, maxWidth:720 }}>
          <p style={{ margin:0, fontSize:20, color:'#A8C8D8', lineHeight:1.6 }}>{keyTakeaway}</p>
        </div>
      )}
    </div>
  );
};

export function renderBlueprintBigRevealLayoutHTML(model: any): string {
  const { title='', bullets=[], subtitle='' } = model;
  const items: any[] = Array.isArray(bullets) ? bullets : [];
  const keyTakeaway = model.keyTakeaway||'';
  const bigs = items.map((b:any, i:number) => {
    const text = typeof b==='string' ? b : b.text||'';
    const desc = typeof b==='string' ? '' : b.description||'';
    return `<div style="flex:1;">
      <div style="font-size:${items.length<=2?100:64}px;font-weight:900;color:#FFFFFF;line-height:1;letter-spacing:-3px;margin-bottom:16px;text-shadow:0 0 60px rgba(0,255,204,0.15);">${text}</div>
      ${desc?`<p style="margin:0;font-size:18px;color:#5A7090;line-height:1.5;border-top:1px solid #0D1A24;padding-top:16px;">${desc}</p>`:''}
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;flex-direction:column;justify-content:center;padding:64px 80px;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.03;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:60px 60px;"></div>
  <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:24px;position:relative;z-index:1;">${subtitle||'CRITICAL PARAMETER // 关键参数'}</div>
  <h2 style="margin:0 0 48px 0;font-size:36px;font-weight:800;color:#7A9FB8;position:relative;z-index:1;">${title}</h2>
  <div style="display:flex;gap:64px;align-items:flex-end;position:relative;z-index:1;margin-bottom:48px;">${bigs}</div>
  ${keyTakeaway?`<div style="position:relative;z-index:1;border-left:4px solid #00FFCC;padding-left:24px;max-width:720px;"><p style="margin:0;font-size:20px;color:#A8C8D8;line-height:1.6;">${keyTakeaway}</p></div>`:''}
</section>`;
}
