/**
 * 工业蓝图型：工艺流程 - 精密时序轴
 * 设计：水平渐进时序线，每节点配置参数注释，冷峻蓝绿
 */
import React from 'react';
import type { ThemeConfig } from '../../types/schema';

interface Props { model: any; theme: ThemeConfig; }

export const BlueprintTimelineLayout: React.FC<Props> = ({ model }) => {
  const { title='', events=[] } = model;
  const evts: any[] = Array.isArray(events) ? events : [];
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', flexDirection:'column', padding:'64px', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
      <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:12, position:'relative', zIndex:1 }}>PROCESS TIMELINE // 工艺时序</div>
      <h1 style={{ margin:'0 0 64px 0', fontSize:44, fontWeight:900, color:'#FFFFFF', position:'relative', zIndex:1 }}>{title}</h1>
      {/* Timeline */}
      <div style={{ flex:1, display:'flex', alignItems:'center', position:'relative', zIndex:1 }}>
        {/* Horizontal line */}
        <div style={{ position:'absolute', top:'40%', left:0, right:0, height:2, background:'linear-gradient(90deg,#00FFCC,rgba(0,255,204,0.2))', zIndex:0 }} />
        {evts.map((evt: any, i: number) => {
          const t = evt.title||evt.year||'';
          const d = evt.description||'';
          const isActive = i === 0;
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:1 }}>
              {/* Node */}
              <div style={{ width: isActive?20:14, height: isActive?20:14, borderRadius:'50%', border:`2px solid ${isActive?'#00FFCC':'#1A3040'}`, background: isActive?'#00FFCC':'#04070D', marginBottom:20, boxShadow: isActive?'0 0 16px rgba(0,255,204,0.6)':undefined }} />
              <div style={{ padding:'16px 12px', background:'#080E18', border:`1px solid ${isActive?'rgba(0,255,204,0.4)':'#1A2A38'}`, width:'90%', boxSizing:'border-box' }}>
                <div style={{ fontFamily:'monospace', fontSize:11, color:'#4A6070', letterSpacing:2, marginBottom:8 }}>STEP {String(i+1).padStart(2,'0')}</div>
                <h4 style={{ margin:'0 0 8px 0', fontSize:20, fontWeight:800, color: isActive?'#00FFCC':'#FFFFFF' }}>{t}</h4>
                <p style={{ margin:0, fontSize:14, color:'#5A7090', lineHeight:1.5 }}>{d}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function renderBlueprintTimelineLayoutHTML(model: any): string {
  const { title='', events=[] } = model;
  const evts: any[] = Array.isArray(events) ? events : [];
  const nodes = evts.map((evt:any, i:number) => {
    const t = evt.title||evt.year||'';
    const d = evt.description||'';
    const isActive = i===0;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;z-index:1;">
      <div style="width:${isActive?20:14}px;height:${isActive?20:14}px;border-radius:50%;border:2px solid ${isActive?'#00FFCC':'#1A3040'};background:${isActive?'#00FFCC':'#04070D'};margin-bottom:20px;${isActive?'box-shadow:0 0 16px rgba(0,255,204,0.6);':''}"></div>
      <div style="padding:16px 12px;background:#080E18;border:1px solid ${isActive?'rgba(0,255,204,0.4)':'#1A2A38'};width:90%;box-sizing:border-box;">
        <div style="font-family:monospace;font-size:11px;color:#4A6070;letter-spacing:2px;margin-bottom:8px;">STEP ${String(i+1).padStart(2,'0')}</div>
        <h4 style="margin:0 0 8px 0;font-size:20px;font-weight:800;color:${isActive?'#00FFCC':'#FFFFFF'};">${t}</h4>
        <p style="margin:0;font-size:14px;color:#5A7090;line-height:1.5;">${d}</p>
      </div>
    </div>`;
  }).join('');
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;flex-direction:column;padding:64px;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;position:relative;z-index:1;">PROCESS TIMELINE // 工艺时序</div>
  <h1 style="margin:0 0 64px 0;font-size:44px;font-weight:900;color:#FFFFFF;position:relative;z-index:1;">${title}</h1>
  <div style="flex:1;display:flex;align-items:center;position:relative;z-index:1;">
    <div style="position:absolute;top:40%;left:0;right:0;height:2px;background:linear-gradient(90deg,#00FFCC,rgba(0,255,204,0.2));z-index:0;"></div>
    ${nodes}
  </div>
</section>`;
}
