/**
 * 工业蓝图型：原理讲解 - 剖面图注释板 
 * 设计：左边大型CAD线图区域，右边轮廓注释列，全程冷蓝色系
 */
import React from 'react';
import type { ThemeConfig } from '../../types/schema';

interface Props { model: any; theme: ThemeConfig; }

export const BlueprintAnnotationLayout: React.FC<Props> = ({ model }) => {
  const { title='', content=[] } = model;
  const lines: string[] = Array.isArray(content) ? content : [content].filter(Boolean);
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', boxSizing:'border-box', overflow:'hidden' }}>
      {/* Left CAD visual panel */}
      <div style={{ width:'45%', position:'relative', borderRight:'1px solid #0D1A24', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.07, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'30px 30px' }} />
        {/* Schematic circles decor */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:340, height:340, borderRadius:'50%', border:'1px solid rgba(0,255,204,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:220, height:220, borderRadius:'50%', border:'1px dashed rgba(0,255,204,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:100, height:100, borderRadius:'50%', border:'2px solid rgba(0,255,204,0.4)', background:'rgba(0,255,204,0.05)' }} />
          </div>
        </div>
        {/* Cross lines */}
        <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'rgba(0,255,204,0.1)' }} />
        <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:'rgba(0,255,204,0.1)' }} />
        {/* Corner brackets */}
        <div style={{ position:'absolute', top:40, left:40, width:48, height:48, borderTop:'2px solid #00FFCC', borderLeft:'2px solid #00FFCC' }} />
        <div style={{ position:'absolute', bottom:40, right:40, width:48, height:48, borderBottom:'2px solid #00FFCC', borderRight:'2px solid #00FFCC' }} />
        <div style={{ position:'absolute', bottom:24, left:24, fontFamily:'monospace', fontSize:11, color:'#2A4050', letterSpacing:2 }}>CROSS-SECTION // VIEW-A</div>
      </div>
      {/* Right annotation panel */}
      <div style={{ flex:1, padding:'56px 48px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:16 }}>TECHNICAL ANNOTATION</div>
        <h1 style={{ margin:'0 0 40px 0', fontSize:40, fontWeight:900, color:'#FFFFFF', lineHeight:1.2 }}>{title}</h1>
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
              <div style={{ flexShrink:0, width:32, height:32, border:'1px solid #00FFCC', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginTop:2 }}>
                <span style={{ fontSize:13, fontWeight:900, color:'#00FFCC', fontFamily:'monospace' }}>{String.fromCharCode(65+i)}</span>
              </div>
              <p style={{ margin:0, fontSize:18, color:'#A8C8D8', lineHeight:1.6 }}>{line}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export function renderBlueprintAnnotationLayoutHTML(model: any): string {
  const { title='', content=[] } = model;
  const lines: string[] = Array.isArray(content) ? content : [content].filter(Boolean);
  const noteRows = lines.map((line, i) => `
    <div style="display:flex;gap:20px;align-items:flex-start;">
      <div style="flex-shrink:0;width:32px;height:32px;border:1px solid #00FFCC;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:2px;">
        <span style="font-size:13px;font-weight:900;color:#00FFCC;font-family:monospace;">${String.fromCharCode(65+i)}</span>
      </div>
      <p style="margin:0;font-size:18px;color:#A8C8D8;line-height:1.6;">${line}</p>
    </div>`).join('');
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;box-sizing:border-box;overflow:hidden;">
  <div style="width:45%;position:relative;border-right:1px solid #0D1A24;overflow:hidden;">
    <div style="position:absolute;inset:0;opacity:0.07;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:30px 30px;"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:340px;height:340px;border-radius:50%;border:1px solid rgba(0,255,204,0.15);display:flex;align-items:center;justify-content:center;">
      <div style="width:220px;height:220px;border-radius:50%;border:1px dashed rgba(0,255,204,0.2);display:flex;align-items:center;justify-content:center;">
        <div style="width:100px;height:100px;border-radius:50%;border:2px solid rgba(0,255,204,0.4);background:rgba(0,255,204,0.05);"></div>
      </div>
    </div>
    <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(0,255,204,0.1);"></div>
    <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(0,255,204,0.1);"></div>
    <div style="position:absolute;top:40px;left:40px;width:48px;height:48px;border-top:2px solid #00FFCC;border-left:2px solid #00FFCC;"></div>
    <div style="position:absolute;bottom:40px;right:40px;width:48px;height:48px;border-bottom:2px solid #00FFCC;border-right:2px solid #00FFCC;"></div>
    <div style="position:absolute;bottom:24px;left:24px;font-family:monospace;font-size:11px;color:#2A4050;letter-spacing:2px;">CROSS-SECTION // VIEW-A</div>
  </div>
  <div style="flex:1;padding:56px 48px;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">TECHNICAL ANNOTATION</div>
    <h1 style="margin:0 0 40px 0;font-size:40px;font-weight:900;color:#FFFFFF;line-height:1.2;">${title}</h1>
    <div style="display:flex;flex-direction:column;gap:24px;">${noteRows}</div>
  </div>
</section>`;
}
