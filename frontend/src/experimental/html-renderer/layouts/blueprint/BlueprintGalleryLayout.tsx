/**
 * 工业蓝图型：图库矩阵 - 金相切片观测格
 * 设计：无框浮动展示，标签悬浮，精密工业图像展览风格
 */
import React from 'react';
import type { ThemeConfig } from '../../types/schema';

interface Props { model: any; theme: ThemeConfig; }

export const BlueprintGalleryLayout: React.FC<Props> = ({ model }) => {
  const { title='', subtitle='', items=[] } = model;
  const list: any[] = Array.isArray(items) ? items.slice(0,3) : [];
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', flexDirection:'column', padding:'56px', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:32, position:'relative', zIndex:1 }}>
        <div>
          <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:12 }}>OBSERVATION MATRIX // 观测矩阵</div>
          <h1 style={{ margin:0, fontSize:40, fontWeight:900, color:'#FFFFFF' }}>{title}</h1>
        </div>
        {subtitle && <div style={{ fontSize:16, color:'#5A7090', maxWidth:360, textAlign:'right' }}>{subtitle}</div>}
      </div>
      <div style={{ flex:1, display:'flex', gap:16, position:'relative', zIndex:1 }}>
        {list.map((item: any, i: number) => {
          const { title:it='', description:id='', image_src } = item;
          return (
            <div key={i} style={{ flex:1, position:'relative', overflow:'hidden', border:'1px solid #0D1A24', background: image_src ? undefined : '#080E18', backgroundImage: image_src ? `url(${image_src})` : undefined, backgroundSize:'cover', backgroundPosition:'center' }}>
              {/* Overlay */}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(4,7,13,0) 30%,rgba(4,7,13,0.95) 100%)' }} />
              {/* Corner brackets */}
              <div style={{ position:'absolute', top:16, left:16, width:32, height:32, borderTop:'1.5px solid #00FFCC', borderLeft:'1.5px solid #00FFCC', opacity:.6 }} />
              <div style={{ position:'absolute', top:16, right:16, width:32, height:32, borderTop:'1.5px solid #00FFCC', borderRight:'1.5px solid #00FFCC', opacity:.6 }} />
              {/* Index badge */}
              <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', fontFamily:'monospace', fontSize:11, color:'#4A6070', letterSpacing:3 }}>IMG-{String(i+1).padStart(2,'0')}</div>
              {/* Bottom info */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'24px 24px' }}>
                <h3 style={{ margin:'0 0 8px 0', fontSize:20, fontWeight:900, color:'#FFFFFF' }}>{it}</h3>
                {id && <p style={{ margin:0, fontSize:14, color:'#5A7090' }}>{id}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderBlueprintGalleryLayoutHTML(model: any): string {
  const { title='', subtitle='', items=[] } = model;
  const list: any[] = Array.isArray(items) ? items.slice(0,3) : [];
  const cells = list.map((item:any, i:number) => {
    const { title:it='', description:id='', image_src } = item;
    return `<div style="flex:1;position:relative;overflow:hidden;border:1px solid #0D1A24;background:${image_src?`url(${image_src})`:'#080E18'};background-size:cover;background-position:center;">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,7,13,0) 30%,rgba(4,7,13,0.95) 100%);"></div>
      <div style="position:absolute;top:16px;left:16px;width:32px;height:32px;border-top:1.5px solid #00FFCC;border-left:1.5px solid #00FFCC;opacity:.6;"></div>
      <div style="position:absolute;top:16px;right:16px;width:32px;height:32px;border-top:1.5px solid #00FFCC;border-right:1.5px solid #00FFCC;opacity:.6;"></div>
      <div style="position:absolute;top:16px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:11px;color:#4A6070;letter-spacing:3px;">IMG-${String(i+1).padStart(2,'0')}</div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:24px;">
        <h3 style="margin:0 0 8px 0;font-size:20px;font-weight:900;color:#FFFFFF;">${it}</h3>
        ${id?`<p style="margin:0;font-size:14px;color:#5A7090;">${id}</p>`:''}
      </div>
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;flex-direction:column;padding:56px;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;position:relative;z-index:1;">
    <div>
      <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">OBSERVATION MATRIX // 观测矩阵</div>
      <h1 style="margin:0;font-size:40px;font-weight:900;color:#FFFFFF;">${title}</h1>
    </div>
    ${subtitle?`<div style="font-size:16px;color:#5A7090;max-width:360px;text-align:right;">${subtitle}</div>`:''}
  </div>
  <div style="flex:1;display:flex;gap:16px;position:relative;z-index:1;">${cells}</div>
</section>`;
}
