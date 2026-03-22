/**
 * 工业蓝图型：三基准对比 - 精准三维模型比照
 * 设计：3等分区域，各含边框、编号、内容，对比三代技术
 */
import React from 'react';
import type { ThemeConfig } from '../../types/schema';

interface Props { model: any; theme: ThemeConfig; }

export const BlueprintTriCompareLayout: React.FC<Props> = ({ model }) => {
  const { title='', columns=[], badge='' } = model;
  const cols: any[] = Array.isArray(columns) ? columns.slice(0, 3) : [];
  const accents = ['#00FFCC', '#3B82F6', '#A855F7'];
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', flexDirection:'column', padding:'56px', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:40, position:'relative', zIndex:1 }}>
        <div>
          <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:12 }}>TRI-AXIS COMPARISON // 三维比照</div>
          <h1 style={{ margin:0, fontSize:40, fontWeight:900, color:'#FFFFFF' }}>{title}</h1>
        </div>
        {badge && <div style={{ background:'rgba(0,255,204,0.06)', border:'1px solid rgba(0,255,204,0.25)', padding:'8px 20px', color:'#00FFCC', fontSize:14, fontWeight:700, letterSpacing:2 }}>{badge}</div>}
      </div>
      <div style={{ flex:1, display:'flex', gap:20, position:'relative', zIndex:1 }}>
        {cols.map((col: any, i: number) => {
          const { title:ct='', points=[] } = col;
          const accent = accents[i];
          return (
            <div key={i} style={{ flex:1, background:'#080E18', border:`1px solid ${accent}26`, position:'relative', padding:'32px', display:'flex', flexDirection:'column' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:`linear-gradient(90deg,${accent},transparent)` }} />
              <div style={{ fontFamily:'monospace', fontSize:12, color:accent, letterSpacing:3, marginBottom:16, textTransform:'uppercase' }}>GEN-{String.fromCharCode(73+i)}</div>
              <h3 style={{ margin:'0 0 28px 0', fontSize:26, fontWeight:900, color:'#FFFFFF', paddingBottom:16, borderBottom:'1px solid #0D1A24' }}>{ct}</h3>
              <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:12 }}>
                {(points as string[]).map((pt: string, j: number) => (
                  <li key={j} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ color:accent, flexShrink:0, fontWeight:900, marginTop:2 }}>▹</span>
                    <span style={{ fontSize:17, color:'#A8C8D8', lineHeight:1.5 }}>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderBlueprintTriCompareLayoutHTML(model: any): string {
  const { title='', columns=[], badge='' } = model;
  const cols: any[] = Array.isArray(columns) ? columns.slice(0,3) : [];
  const accents = ['#00FFCC','#3B82F6','#A855F7'];
  const colsHTML = cols.map((col:any, i:number) => {
    const { title:ct='', points=[] } = col;
    const accent = accents[i];
    const pts = (points as string[]).map((pt:string) =>
      `<li style="display:flex;gap:12px;align-items:flex-start;"><span style="color:${accent};flex-shrink:0;font-weight:900;margin-top:2px;">▹</span><span style="font-size:17px;color:#A8C8D8;line-height:1.5;">${pt}</span></li>`
    ).join('');
    return `<div style="flex:1;background:#080E18;border:1px solid ${accent}26;position:relative;padding:32px;display:flex;flex-direction:column;">
      <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${accent},transparent);"></div>
      <div style="font-family:monospace;font-size:12px;color:${accent};letter-spacing:3px;margin-bottom:16px;text-transform:uppercase;">GEN-${String.fromCharCode(73+i)}</div>
      <h3 style="margin:0 0 28px 0;font-size:26px;font-weight:900;color:#FFFFFF;padding-bottom:16px;border-bottom:1px solid #0D1A24;">${ct}</h3>
      <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px;">${pts}</ul>
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;flex-direction:column;padding:56px;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;position:relative;z-index:1;">
    <div>
      <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">TRI-AXIS COMPARISON // 三维比照</div>
      <h1 style="margin:0;font-size:40px;font-weight:900;color:#FFFFFF;">${title}</h1>
    </div>
    ${badge?`<div style="background:rgba(0,255,204,0.06);border:1px solid rgba(0,255,204,0.25);padding:8px 20px;color:#00FFCC;font-size:14px;font-weight:700;letter-spacing:2px;">${badge}</div>`:''}
  </div>
  <div style="flex:1;display:flex;gap:20px;position:relative;z-index:1;">${colsHTML}</div>
</section>`;
}
