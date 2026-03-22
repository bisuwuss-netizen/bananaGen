/**
 * 工业蓝图型：章节转场 - 巨码扫描切换
 * 设计：右边占满巨型工程编号，左边竖排浮现章节标题
 */
import React from 'react';
import type { SectionTitleModel, ThemeConfig } from '../../types/schema';

interface Props { model: SectionTitleModel; theme: ThemeConfig; }

export const BlueprintSectionTitleLayout: React.FC<Props> = ({ model }) => {
  const { title='', subtitle='' } = model;
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', display:'flex', alignItems:'center', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
      {/* Giant background section number */}
      <div style={{ position:'absolute', right:-40, top:'50%', transform:'translateY(-50%)', fontSize:520, fontWeight:900, color:'rgba(0,255,204,0.03)', fontFamily:'monospace', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>§</div>
      {/* Left vertical accent */}
      <div style={{ width:8, height:'100%', background:'linear-gradient(180deg,transparent,#00FFCC,transparent)', flexShrink:0, opacity:.6 }} />
      {/* Content */}
      <div style={{ padding:'0 80px', position:'relative', zIndex:2 }}>
        <div style={{ fontFamily:'monospace', fontSize:13, color:'#00FFCC', letterSpacing:6, textTransform:'uppercase', marginBottom:24 }}>SECTION BREAK // 章节过渡</div>
        <h1 style={{ margin:'0 0 28px 0', fontSize:72, fontWeight:900, color:'#FFFFFF', lineHeight:1.1, maxWidth:800 }}>{title}</h1>
        {subtitle && <p style={{ margin:0, fontSize:26, color:'#7A9FB8', maxWidth:640 }}>{subtitle}</p>}
      </div>
    </div>
  );
};

export function renderBlueprintSectionTitleLayoutHTML(model: any): string {
  const { title='', subtitle='' } = model;
  return `<section style="width:1280px;height:720px;background:#04070D;display:flex;align-items:center;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="position:absolute;right:-40px;top:50%;transform:translateY(-50%);font-size:520px;font-weight:900;color:rgba(0,255,204,0.03);font-family:monospace;line-height:1;">§</div>
  <div style="width:8px;height:100%;background:linear-gradient(180deg,transparent,#00FFCC,transparent);flex-shrink:0;opacity:.6;"></div>
  <div style="padding:0 80px;position:relative;z-index:2;">
    <div style="font-family:monospace;font-size:13px;color:#00FFCC;letter-spacing:6px;text-transform:uppercase;margin-bottom:24px;">SECTION BREAK // 章节过渡</div>
    <h1 style="margin:0 0 28px 0;font-size:72px;font-weight:900;color:#FFFFFF;line-height:1.1;max-width:800px;">${title}</h1>
    ${subtitle?`<p style="margin:0;font-size:26px;color:#7A9FB8;max-width:640px;">${subtitle}</p>`:''}
  </div>
</section>`;
}
