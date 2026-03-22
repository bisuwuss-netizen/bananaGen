/**
 * 工业蓝图型：结束 - 精工归档封章
 * 设计：图纸竣工印章栏格式，大型审批方框
 */
import React from 'react';
import type { EndingModel, ThemeConfig } from '../../types/schema';

interface Props { model: EndingModel; theme: ThemeConfig; }

export const BlueprintClosingLayout: React.FC<Props> = ({ model }) => {
  const { title='', subtitle='' } = model;
  const contact = (model as any).contact || '';
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',monospace", display:'flex', flexDirection:'column', justifyContent:'center', padding:'80px', boxSizing:'border-box', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
      <div style={{ position:'absolute', top:32, right:32, bottom:32, left:32, border:'1px solid rgba(0,255,204,0.08)', pointerEvents:'none' }} />
      {/* Approval corners */}
      <div style={{ position:'absolute', top:40, left:40, width:60, height:60, borderTop:'2px solid #00FFCC', borderLeft:'2px solid #00FFCC', opacity:.5 }} />
      <div style={{ position:'absolute', bottom:40, right:40, width:60, height:60, borderBottom:'2px solid #00FFCC', borderRight:'2px solid #00FFCC', opacity:.5 }} />
      {/* Giant watermark approval */}
      <div style={{ position:'absolute', right:80, top:'50%', transform:'translateY(-50%)', fontSize:200, color:'rgba(0,255,204,0.04)', fontWeight:900, fontFamily:'monospace', pointerEvents:'none', letterSpacing:-8 }}>FILED</div>
      <div style={{ position:'relative', zIndex:1, maxWidth:800 }}>
        <div style={{ fontFamily:'monospace', fontSize:11, color:'#00FFCC', letterSpacing:4, textTransform:'uppercase', marginBottom:16 }}>END OF SESSION // 讲课收束</div>
        <h1 style={{ margin:'0 0 32px 0', fontSize:64, fontWeight:900, color:'#FFFFFF', lineHeight:1.1 }}>{title}</h1>
        {subtitle && <p style={{ margin:'0 0 48px 0', fontSize:24, color:'#7A9FB8', lineHeight:1.5, maxWidth:640 }}>{subtitle}</p>}
        {/* Signature row */}
        <div style={{ display:'flex', gap:64, paddingTop:32, borderTop:'1px solid #0D1A24' }}>
          <div>
            <p style={{ margin:'0 0 8px 0', fontSize:11, color:'#4A6070', fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase' }}>VERIFIED BY</p>
            <div style={{ width:160, height:40, borderBottom:'1px dashed #1A2A38' }} />
          </div>
          <div>
            <p style={{ margin:'0 0 8px 0', fontSize:11, color:'#4A6070', fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase' }}>COURSE FILE</p>
            <p style={{ margin:0, fontSize:17, fontWeight:700, color:'#A8C8D8' }}>{contact || 'N/A'}</p>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center' }}>
            <div style={{ border:'2px solid #00FFCC', padding:'12px 32px', color:'#00FFCC', fontWeight:900, fontSize:18, letterSpacing:4, textTransform:'uppercase', transform:'rotate(-3deg)', opacity:.8 }}>APPROVED</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function renderBlueprintClosingLayoutHTML(model: any): string {
  const { title='', subtitle='' } = model;
  const contact = model.contact||'';
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',monospace;display:flex;flex-direction:column;justify-content:center;padding:80px;box-sizing:border-box;overflow:hidden;position:relative;">
  <div style="position:absolute;inset:0;opacity:0.04;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="position:absolute;top:32px;right:32px;bottom:32px;left:32px;border:1px solid rgba(0,255,204,0.08);pointer-events:none;"></div>
  <div style="position:absolute;top:40px;left:40px;width:60px;height:60px;border-top:2px solid #00FFCC;border-left:2px solid #00FFCC;opacity:.5;"></div>
  <div style="position:absolute;bottom:40px;right:40px;width:60px;height:60px;border-bottom:2px solid #00FFCC;border-right:2px solid #00FFCC;opacity:.5;"></div>
  <div style="position:absolute;right:80px;top:50%;transform:translateY(-50%);font-size:200px;color:rgba(0,255,204,0.04);font-weight:900;font-family:monospace;pointer-events:none;letter-spacing:-8px;">FILED</div>
  <div style="position:relative;z-index:1;max-width:800px;">
    <div style="font-family:monospace;font-size:11px;color:#00FFCC;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">END OF SESSION // 讲课收束</div>
    <h1 style="margin:0 0 32px 0;font-size:64px;font-weight:900;color:#FFFFFF;line-height:1.1;">${title}</h1>
    ${subtitle?`<p style="margin:0 0 48px 0;font-size:24px;color:#7A9FB8;line-height:1.5;max-width:640px;">${subtitle}</p>`:''}
    <div style="display:flex;gap:64px;padding-top:32px;border-top:1px solid #0D1A24;">
      <div>
        <p style="margin:0 0 8px 0;font-size:11px;color:#4A6070;font-family:monospace;letter-spacing:2px;text-transform:uppercase;">VERIFIED BY</p>
        <div style="width:160px;height:40px;border-bottom:1px dashed #1A2A38;"></div>
      </div>
      <div>
        <p style="margin:0 0 8px 0;font-size:11px;color:#4A6070;font-family:monospace;letter-spacing:2px;text-transform:uppercase;">COURSE FILE</p>
        <p style="margin:0;font-size:17px;font-weight:700;color:#A8C8D8;">${contact||'N/A'}</p>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;">
        <div style="border:2px solid #00FFCC;padding:12px 32px;color:#00FFCC;font-weight:900;font-size:18px;letter-spacing:4px;text-transform:uppercase;transform:rotate(-3deg);opacity:.8;">APPROVED</div>
      </div>
    </div>
  </div>
</section>`;
}
