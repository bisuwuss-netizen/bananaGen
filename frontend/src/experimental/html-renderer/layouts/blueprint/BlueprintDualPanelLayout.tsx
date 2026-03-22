/**
 * 工业蓝图型：双栏白皮书 - 工程规格对比
 * 设计：两列完全等权，纸白线+深色底，类技术说明书 dense layout  
 */
import React from 'react';
import type { TwoColumnModel, ThemeConfig } from '../../types/schema';

interface Props { model: TwoColumnModel; theme: ThemeConfig; }

export const BlueprintDualPanelLayout: React.FC<Props> = ({ model }) => {
  const { title='', left, right } = model;
  const renderCol = (col: any) => {
    if (!col) return null;
    const { header='', bullets=[], content='' } = col;
    const bList: any[] = Array.isArray(bullets) ? bullets : [];
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'40px', borderRight:'1px solid #0D1A24' }}>
        <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:16 }}>COLUMN.A</div>
        <h3 style={{ margin:'0 0 32px 0', fontSize:26, fontWeight:900, color:'#FFFFFF', paddingBottom:16, borderBottom:'1px solid #1A2A38' }}>{header}</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:20, flex:1 }}>
          {bList.map((b: any, i: number) => {
            const t = typeof b === 'string' ? b : b.text||'';
            const d = typeof b === 'string' ? '' : b.description||'';
            return (
              <div key={i} style={{ paddingLeft:20, borderLeft:'2px solid rgba(0,255,204,0.3)' }}>
                <p style={{ margin:'0 0 4px 0', fontSize:18, fontWeight:700, color:'#FFFFFF' }}>{t}</p>
                {d && <p style={{ margin:0, fontSize:15, color:'#5A7A90', lineHeight:1.5 }}>{d}</p>}
              </div>
            );
          })}
          {content && <p style={{ margin:0, fontSize:16, color:'#7A9FB8', lineHeight:1.6 }}>{content}</p>}
        </div>
      </div>
    );
  };
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', flexDirection:'column', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
      {/* Header */}
      <div style={{ background:'#020508', borderBottom:'2px solid #00FFCC', padding:'24px 40px', display:'flex', alignItems:'center', gap:24, flexShrink:0, position:'relative', zIndex:1 }}>
        <div style={{ background:'#00FFCC', width:6, height:40, flexShrink:0 }} />
        <h1 style={{ margin:0, fontSize:32, fontWeight:900, color:'#FFFFFF' }}>{title}</h1>
        <div style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:12, color:'#4A6070', letterSpacing:2 }}>TECHNICAL COMPARISON // DUAL PANEL</div>
      </div>
      {/* Dual panels */}
      <div style={{ flex:1, display:'flex', position:'relative', zIndex:1 }}>
        {renderCol(left)}
        {renderCol(right)}
      </div>
    </div>
  );
};

export function renderBlueprintDualPanelLayoutHTML(model: any): string {
  const { title='', left, right } = model;
  const renderColHTML = (col: any, label: string) => {
    if (!col) return '<div style="flex:1;"></div>';
    const { header='', bullets=[], content='' } = col;
    const bList = Array.isArray(bullets) ? bullets : [];
    const rows = bList.map((b:any) => {
      const t = typeof b==='string' ? b : b.text||'';
      const d = typeof b==='string' ? '' : b.description||'';
      return `<div style="padding-left:20px;border-left:2px solid rgba(0,255,204,0.3);">
        <p style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#FFFFFF;">${t}</p>
        ${d?`<p style="margin:0;font-size:15px;color:#5A7A90;line-height:1.5;">${d}</p>`:''}
      </div>`;
    }).join('');
    return `<div style="flex:1;display:flex;flex-direction:column;padding:40px;border-right:1px solid #0D1A24;">
      <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">${label}</div>
      <h3 style="margin:0 0 32px 0;font-size:26px;font-weight:900;color:#FFFFFF;padding-bottom:16px;border-bottom:1px solid #1A2A38;">${header}</h3>
      <div style="display:flex;flex-direction:column;gap:20px;flex:1;">${rows}${content?`<p style="margin:0;font-size:16px;color:#7A9FB8;line-height:1.6;">${content}</p>`:''}</div>
    </div>`;
  };
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="background:#020508;border-bottom:2px solid #00FFCC;padding:24px 40px;display:flex;align-items:center;gap:24px;flex-shrink:0;position:relative;z-index:1;">
    <div style="background:#00FFCC;width:6px;height:40px;flex-shrink:0;"></div>
    <h1 style="margin:0;font-size:32px;font-weight:900;color:#FFFFFF;">${title}</h1>
    <div style="margin-left:auto;font-family:monospace;font-size:12px;color:#4A6070;letter-spacing:2px;">TECHNICAL COMPARISON // DUAL PANEL</div>
  </div>
  <div style="flex:1;display:flex;position:relative;z-index:1;">
    ${renderColHTML(left,'COLUMN.A')}
    ${renderColHTML(right,'COLUMN.B')}
  </div>
</section>`;
}
