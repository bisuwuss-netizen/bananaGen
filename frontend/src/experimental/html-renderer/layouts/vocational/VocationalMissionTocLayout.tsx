import React from 'react';
import type { TocModel, ThemeConfig } from '../../types/schema';
import { Target, Server, ShieldCheck } from 'lucide-react';

interface Props {
  model: TocModel & { layoutId?: string };
  theme: ThemeConfig;
}

export const VocationalMissionTocLayout: React.FC<Props> = ({ model, theme }) => {
  const { title = '作战序列 / SEQUENCE', items = [] } = model;
  const subtitle = (model as any).subtitle;
  
  return (
    <div className="w-full h-full bg-[#111318] text-white flex p-16 font-sans overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[45%] h-full bg-slate-800/10 transform skew-x-[-15deg] translate-x-32 border-l border-slate-700/30" />
      <div className="absolute bottom-8 right-16 opacity-10">
        <Server size={240} strokeWidth={1} />
      </div>

      {/* Main Layout Area: Grid 1:2 */}
      <div className="relative z-10 w-full flex gap-16">
        
        {/* Left Side: Sequence Info */}
        <div className="w-1/3 flex flex-col justify-center pb-12">
          <div className="w-16 h-2 bg-cyan-500 mb-8" />
          <h1 className="text-6xl font-black mb-4 leading-tight tracking-tight">{title}</h1>
          <h2 className="text-xl text-slate-400 font-mono mb-12 flex items-center gap-3">
            <Target className="text-cyan-500" size={24} />
            {subtitle || 'OPERATION PHASES'}
          </h2>
          
          <div className="mt-auto p-6 bg-slate-900/80 border-l-4 border-red-500 border-t border-r border-b border-slate-800">
            <p className="text-sm font-mono text-red-500 mb-2 font-bold flex items-center gap-2">
              <ShieldCheck size={18} /> SYSTEM CHECK
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Total <span className="text-white font-bold">{items.length}</span> phases locked. Awaiting tactical engagement. Proceed in strict sequence to avoid critical faults.
            </p>
          </div>
        </div>

        {/* Right Side: Hard-Cut Plates */}
        <div className="w-2/3 flex flex-col justify-center gap-5 pr-8">
          {items.map((item, index) => {
            const numStr = String(index + 1).padStart(2, '0');
            const isActive = index === 0; // Visual demo: first sequence block is lit
            
            return (
              <div 
                key={index}
                className={`relative flex items-center h-24 pl-8 pr-8 transition-transform transform shadow-xl
                  ${isActive ? 'bg-cyan-950/40 border border-cyan-500/50' : 'bg-slate-800/40 border border-slate-700/60'}
                `}
                style={{ 
                  clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)',
                  boxShadow: isActive ? 'inset 0 0 20px rgba(6, 182, 212, 0.1)' : 'none'
                }}
              >
                {/* Left Accent Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${isActive ? 'bg-cyan-500' : 'bg-slate-600'}`} />
                
                {/* Number */}
                <div className={`text-5xl font-black font-mono w-28 tracking-tighter ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {numStr}
                </div>
                
                {/* Text Title */}
                <div className={`flex-1 text-2xl font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {typeof item === 'string' ? item : (item as any).text || ''}
                </div>
                
                {/* Tech Deco */}
                <div className="ml-6 flex gap-1.5 opacity-80">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-8 ${isActive && i < 3 ? 'bg-cyan-500' : 'bg-slate-700'}`} 
                      style={{ transform: 'skewX(-20deg)' }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function renderVocationalMissionTocLayoutHTML(model: any, theme: any): string {
  const { title = '作战序列 / SEQUENCE', subtitle = '', items = [] } = model;

  const phasesHTML = items.map((item: any, idx: number) => {
    const numStr = String(idx + 1).padStart(2, '0');
    const text = typeof item === 'string' ? item : item.text || '';
    const isActive = idx === 0;
    const bgColor = isActive ? '#0c2643' : 'rgba(30,41,59,0.4)';
    const borderColor = isActive ? '#06B6D4' : 'rgba(71,85,105,0.6)';
    const accentBarColor = isActive ? '#06B6D4' : '#475569';
    const numColor = isActive ? '#06B6D4' : '#475569';
    const textColor = isActive ? '#FFFFFF' : '#CBD5E1';
    const clipPath = 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)';

    const bars = [0,1,2,3,4].map(i =>
      `<div style="width:8px;height:32px;background:${isActive && i < 3 ? '#06B6D4' : '#1e293b'};transform:skewX(-20deg);"></div>`
    ).join('');

    return `
    <div style="position:relative;display:flex;align-items:center;height:96px;padding:0 32px;background:${bgColor};border:1px solid ${borderColor};clip-path:${clipPath};box-shadow:${isActive ? 'inset 0 0 20px rgba(6,182,212,0.1)' : 'none'};">
      <div style="position:absolute;left:0;top:0;bottom:0;width:10px;background:${accentBarColor};"></div>
      <div style="font-size:48px;font-weight:900;font-family:monospace;width:112px;letter-spacing:-1px;color:${numColor};">${numStr}</div>
      <div style="flex:1;font-size:24px;font-weight:700;color:${textColor};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${text}</div>
      <div style="display:flex;gap:6px;opacity:0.8;">${bars}</div>
    </div>`;
  }).join('\n');

  return `
<section style="width:1280px;height:720px;box-sizing:border-box;background:#111318;color:#FFFFFF;display:flex;padding:64px;font-family:'PingFang SC','Microsoft YaHei',sans-serif;overflow:hidden;position:relative;">
  <!-- Skewed bg decor -->
  <div style="position:absolute;top:0;right:0;width:40%;height:100%;background:rgba(30,41,59,0.08);transform:skewX(-15deg) translateX(128px);border-left:1px solid rgba(71,85,105,0.25);z-index:0;"></div>

  <div style="position:relative;z-index:1;width:100%;display:flex;gap:64px;">
    <!-- Left column -->
    <div style="width:33%;display:flex;flex-direction:column;justify-content:center;padding-bottom:48px;">
      <div style="width:64px;height:8px;background:#06B6D4;margin-bottom:32px;"></div>
      <h1 style="margin:0 0 16px 0;font-size:52px;font-weight:900;line-height:1.15;">${title}</h1>
      <div style="display:flex;align-items:center;gap:12px;color:#94A3B8;font-family:monospace;font-size:18px;margin-bottom:48px;">
        <span>◎</span>
        <span>${subtitle || 'OPERATION PHASES'}</span>
      </div>
      <div style="margin-top:auto;padding:24px;background:rgba(15,23,42,0.8);border-left:4px solid #EF4444;border:1px solid #1E293B;border-left:4px solid #EF4444;">
        <p style="margin:0 0 8px 0;font-size:13px;font-family:monospace;color:#EF4444;font-weight:700;letter-spacing:1px;">✔ SYSTEM CHECK</p>
        <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6;">
          Total <strong style="color:#FFFFFF;">${items.length}</strong> phases locked. Proceed in strict sequence to avoid critical faults.
        </p>
      </div>
    </div>

    <!-- Right column: phases -->
    <div style="width:67%;display:flex;flex-direction:column;justify-content:center;gap:16px;">
      ${phasesHTML}
    </div>
  </div>
</section>`;
}
