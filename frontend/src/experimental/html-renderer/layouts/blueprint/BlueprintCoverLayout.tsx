/**
 * 工业蓝图型：封面 - 精工解析封面
 * 设计：极简 CAD 白字 + 蓝绿色线稿装饰，高奢精密仪器风
 */
import React from 'react';
import type { CoverModel, ThemeConfig } from '../../types/schema';

interface Props { model: CoverModel; theme: ThemeConfig; }

export const BlueprintCoverLayout: React.FC<Props> = ({ model }) => {
  const { title = '', subtitle = '', author = '', department = '', date = '' } = model;
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", position:'relative', overflow:'hidden', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', padding:'80px' }}>
      {/* Blueprint grid bg */}
      <div style={{ position:'absolute', inset:0, opacity:0.06, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }} />
      {/* Top-right corner deco */}
      <div style={{ position:'absolute', top:40, right:40, width:160, height:160, borderTop:'2px solid #00FFCC', borderRight:'2px solid #00FFCC', opacity:.4 }} />
      <div style={{ position:'absolute', bottom:40, left:40, width:120, height:120, borderBottom:'2px solid #00FFCC', borderLeft:'2px solid #00FFCC', opacity:.4 }} />
      {/* Classification badge */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
        <div style={{ background:'#00FFCC', color:'#04070D', padding:'4px 16px', fontSize:11, fontWeight:900, letterSpacing:4, textTransform:'uppercase' }}>BLUEPRINT // TECH</div>
        <span style={{ color:'#4A6070', fontSize:12, fontFamily:'monospace', letterSpacing:3 }}>{date || 'REV.A'}</span>
      </div>
      {/* Giant title */}
      <h1 style={{ margin:'0 0 24px 0', fontSize:76, fontWeight:900, lineHeight:1.1, color:'#FFFFFF', letterSpacing:-2, maxWidth:900 }}>{title}</h1>
      <p style={{ margin:'0 0 48px 0', fontSize:26, color:'#00FFCC', fontWeight:500, maxWidth:720, lineHeight:1.5 }}>{subtitle}</p>
      {/* Rule line */}
      <div style={{ width:480, height:1, background:'linear-gradient(90deg,#00FFCC,transparent)', marginBottom:32 }} />
      <div style={{ display:'flex', gap:64 }}>
        {author && <div><p style={{ margin:'0 0 4px 0', fontSize:11, color:'#4A6070', fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase' }}>DESIGNER</p><p style={{ margin:0, fontSize:18, fontWeight:700, color:'#A8C8D8' }}>{author}</p></div>}
        {department && <div><p style={{ margin:'0 0 4px 0', fontSize:11, color:'#4A6070', fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase' }}>DIVISION</p><p style={{ margin:0, fontSize:18, fontWeight:700, color:'#A8C8D8' }}>{department}</p></div>}
      </div>
    </div>
  );
};

export function renderBlueprintCoverLayoutHTML(model: any): string {
  const { title='', subtitle='', author='', department='', date='' } = model;
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;position:relative;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;padding:80px;">
  <div style="position:absolute;inset:0;opacity:0.06;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:60px 60px;pointer-events:none;"></div>
  <div style="position:absolute;top:40px;right:40px;width:160px;height:160px;border-top:2px solid #00FFCC;border-right:2px solid #00FFCC;opacity:.4;"></div>
  <div style="position:absolute;bottom:40px;left:40px;width:120px;height:120px;border-bottom:2px solid #00FFCC;border-left:2px solid #00FFCC;opacity:.4;"></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;">
    <div style="background:#00FFCC;color:#04070D;padding:4px 16px;font-size:11px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">BLUEPRINT // TECH</div>
    <span style="color:#4A6070;font-size:12px;font-family:monospace;letter-spacing:3px;">${date||'REV.A'}</span>
  </div>
  <h1 style="margin:0 0 24px 0;font-size:76px;font-weight:900;line-height:1.1;color:#FFFFFF;letter-spacing:-2px;max-width:900px;">${title}</h1>
  <p style="margin:0 0 48px 0;font-size:26px;color:#00FFCC;font-weight:500;max-width:720px;line-height:1.5;">${subtitle}</p>
  <div style="width:480px;height:1px;background:linear-gradient(90deg,#00FFCC,transparent);margin-bottom:32px;"></div>
  <div style="display:flex;gap:64px;">
    ${author?`<div><p style="margin:0 0 4px 0;font-size:11px;color:#4A6070;font-family:monospace;letter-spacing:2px;text-transform:uppercase;">DESIGNER</p><p style="margin:0;font-size:18px;font-weight:700;color:#A8C8D8;">${author}</p></div>`:''}
    ${department?`<div><p style="margin:0 0 4px 0;font-size:11px;color:#4A6070;font-family:monospace;letter-spacing:2px;text-transform:uppercase;">DIVISION</p><p style="margin:0;font-size:18px;font-weight:700;color:#A8C8D8;">${department}</p></div>`:''}
  </div>
</section>`;
}
