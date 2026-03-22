/**
 * 工业蓝图型：目录 - 规格明细清单
 * 设计：竖排图纸目录，带图纸修订栏格式，精密工程风
 */
import React from 'react';
import type { TocModel, ThemeConfig } from '../../types/schema';

interface Props { model: TocModel; theme: ThemeConfig; }

export const BlueprintTocLayout: React.FC<Props> = ({ model }) => {
  const { title = 'CONTENTS', items = [] } = model;
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />
      {/* Left sidebar - draftsman column */}
      <div style={{ width:280, background:'#020508', borderRight:'2px solid #00FFCC', padding:'48px 32px', display:'flex', flexDirection:'column', flexShrink:0, position:'relative', zIndex:2 }}>
        <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:24 }}>DWG NO.</div>
        <div style={{ fontSize:64, fontWeight:900, color:'#FFFFFF', lineHeight:1, marginBottom:8 }}>TOC</div>
        <div style={{ fontSize:20, fontWeight:700, color:'#00FFCC', marginBottom:48 }}>{title}</div>
        <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:12 }}>
          {['SCALE: N/A', 'SHEET: 1/1', 'DATE: 2026'].map(v => (
            <div key={v} style={{ borderTop:'1px solid #12202A', paddingTop:12, fontSize:12, color:'#4A6070', fontFamily:'monospace', letterSpacing:2 }}>{v}</div>
          ))}
        </div>
      </div>
      {/* Right: items */}
      <div style={{ flex:1, padding:'48px 64px', display:'flex', flexDirection:'column', justifyContent:'center', gap:0, position:'relative', zIndex:2 }}>
        {(items as any[]).map((item: any, i: number) => {
          const text = typeof item === 'string' ? item : item.title || item.text || '';
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', borderBottom:'1px solid #0D1A24', padding:'20px 0' }}>
              <span style={{ fontFamily:'monospace', fontSize:14, color:'#00FFCC', width:56, flexShrink:0 }}>{String(i+1).padStart(2,'0')}.</span>
              <span style={{ flex:1, fontSize:22, fontWeight:700, color:'#FFFFFF' }}>{text}</span>
              <div style={{ width:120, height:1, background:'linear-gradient(90deg,transparent,#00FFCC)', opacity:.3 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderBlueprintTocLayoutHTML(model: any): string {
  const { title = 'CONTENTS', items = [] } = model;
  const rows = (items as any[]).map((item: any, i: number) => {
    const text = typeof item === 'string' ? item : item.title || item.text || '';
    return `<div style="display:flex;align-items:center;border-bottom:1px solid #0D1A24;padding:20px 0;">
      <span style="font-family:monospace;font-size:14px;color:#00FFCC;width:56px;flex-shrink:0;">${String(i+1).padStart(2,'0')}.</span>
      <span style="flex:1;font-size:22px;font-weight:700;color:#FFFFFF;">${text}</span>
      <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,#00FFCC);opacity:.3;"></div>
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="width:280px;background:#020508;border-right:2px solid #00FFCC;padding:48px 32px;display:flex;flex-direction:column;flex-shrink:0;position:relative;z-index:2;">
    <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:24px;">DWG NO.</div>
    <div style="font-size:64px;font-weight:900;color:#FFFFFF;line-height:1;margin-bottom:8px;">TOC</div>
    <div style="font-size:20px;font-weight:700;color:#00FFCC;margin-bottom:48px;">${title}</div>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px;">
      <div style="border-top:1px solid #12202A;padding-top:12px;font-size:12px;color:#4A6070;font-family:monospace;letter-spacing:2px;">SCALE: N/A</div>
      <div style="border-top:1px solid #12202A;padding-top:12px;font-size:12px;color:#4A6070;font-family:monospace;letter-spacing:2px;">SHEET: 1/1</div>
      <div style="border-top:1px solid #12202A;padding-top:12px;font-size:12px;color:#4A6070;font-family:monospace;letter-spacing:2px;">DATE: 2026</div>
    </div>
  </div>
  <div style="flex:1;padding:48px 64px;display:flex;flex-direction:column;justify-content:center;gap:0;position:relative;z-index:2;">${rows}</div>
</section>`;
}
