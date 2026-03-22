/**
 * 工业蓝图型：引言 - 大师准则墙报
 * 设计：巨型引语 + 极简极白 + 大号引号装饰，editorial magazine风格
 */
import React from 'react';
import type { QuoteModel, ThemeConfig } from '../../types/schema';

interface Props { model: QuoteModel; theme: ThemeConfig; }

export const BlueprintQuoteLayout: React.FC<Props> = ({ model }) => {
  const { quote = '', author = '', description = '' } = model;
  return (
    <div style={{ width:'100%', height:'100%', background:'#04070D', color:'#E0EFF5', fontFamily:"'PingFang SC','Microsoft YaHei',serif", display:'flex', alignItems:'center', padding:'80px 120px', boxSizing:'border-box', position:'relative', overflow:'hidden' }}>
      {/* Subtle grid */}
      <div style={{ position:'absolute', inset:0, opacity:0.03, backgroundImage:'linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px)', backgroundSize:'60px 60px' }} />
      {/* Decorative giant quote mark */}
      <div style={{ position:'absolute', top:32, left:64, fontSize:320, color:'rgba(0,255,204,0.04)', lineHeight:1, fontFamily:'Georgia,serif', pointerEvents:'none' }}>"</div>
      <div style={{ position:'relative', zIndex:1, maxWidth:960 }}>
        <div style={{ width:80, height:4, background:'#00FFCC', marginBottom:48 }} />
        <blockquote style={{ margin:0, fontSize:46, fontWeight:800, lineHeight:1.4, color:'#FFFFFF', fontStyle:'normal', letterSpacing:-0.5 }}>
          {quote}
        </blockquote>
        <div style={{ marginTop:48, display:'flex', alignItems:'center', gap:24 }}>
          <div style={{ width:40, height:1, background:'#00FFCC' }} />
          <div>
            <p style={{ margin:0, fontSize:18, fontWeight:800, color:'#00FFCC', letterSpacing:2 }}>{author}</p>
            {description && <p style={{ margin:'4px 0 0 0', fontSize:15, color:'#4A6070' }}>{description}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export function renderBlueprintQuoteLayoutHTML(model: any): string {
  const { quote='', author='', description='' } = model;
  return `<section style="width:1280px;height:720px;background:#04070D;color:#E0EFF5;font-family:'PingFang SC','Microsoft YaHei',serif;display:flex;align-items:center;padding:80px 120px;box-sizing:border-box;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;opacity:0.03;background-image:linear-gradient(#00FFCC 1px,transparent 1px),linear-gradient(90deg,#00FFCC 1px,transparent 1px);background-size:60px 60px;"></div>
  <div style="position:absolute;top:32px;left:64px;font-size:320px;color:rgba(0,255,204,0.04);line-height:1;font-family:Georgia,serif;pointer-events:none;">"</div>
  <div style="position:relative;z-index:1;max-width:960px;">
    <div style="width:80px;height:4px;background:#00FFCC;margin-bottom:48px;"></div>
    <blockquote style="margin:0;font-size:46px;font-weight:800;line-height:1.4;color:#FFFFFF;letter-spacing:-0.5px;">${quote}</blockquote>
    <div style="margin-top:48px;display:flex;align-items:center;gap:24px;">
      <div style="width:40px;height:1px;background:#00FFCC;"></div>
      <div>
        <p style="margin:0;font-size:18px;font-weight:800;color:#00FFCC;letter-spacing:2px;">${author}</p>
        ${description?`<p style="margin:4px 0 0 0;font-size:15px;color:#4A6070;">${description}</p>`:''}
      </div>
    </div>
  </div>
</section>`;
}
