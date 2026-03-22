import React from 'react';
import type { TitleBulletsModel, ThemeConfig } from '../../types/schema';
import { Target, ScanLine, LocateFixed } from 'lucide-react';

interface Props {
  model: TitleBulletsModel & { layoutId?: string };
  theme: ThemeConfig;
}

export const VocationalTargetLockLayout: React.FC<Props> = ({ model, theme }) => {
  const { title, subtitle, bullets = [] } = model;
  
  return (
    <div className="w-full h-full bg-[#0a0f16] text-white flex p-16 font-sans overflow-hidden relative">
      
      {/* Background Radar / Scope Overlay */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex items-center justify-center">
        <div className="w-[800px] h-[800px] rounded-full border border-cyan-500/30 relative flex items-center justify-center">
          <div className="w-[600px] h-[600px] rounded-full border border-cyan-500/20" />
          <div className="w-[400px] h-[400px] rounded-full border border-cyan-500/40 border-dashed animate-[spin_60s_linear_infinite]" />
          {/* Crosshairs */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-cyan-500/20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-cyan-500/20" />
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full flex flex-col h-full">
        {/* Header section */}
        <div className="flex justify-between items-end border-b border-cyan-900/50 pb-6 mb-12">
          <div>
            <div className="flex items-center gap-3 text-cyan-500 mb-3 font-mono text-sm tracking-widest">
              <ScanLine size={18} className="animate-pulse" />
              <span>TARGET IDENTIFICATION & LOCK</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight">{title}</h1>
          </div>
          {subtitle && (
            <div className="bg-cyan-950/40 border border-cyan-800/50 px-6 py-3 text-cyan-200 font-medium max-w-md text-right flex items-center gap-4 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              {subtitle}
            </div>
          )}
        </div>

        {/* Targets Area */}
        <div className="flex-1 flex gap-8 items-center justify-center px-12">
          {bullets.map((bullet, idx) => (
            <div 
              key={idx}
              className="flex-1 bg-slate-900/60 border border-slate-700/60 relative p-8 group transition-all hover:border-cyan-500/60 hover:bg-cyan-950/20 backdrop-blur-sm"
              style={{ minHeight: '300px' }}
            >
              {/* Corner Brackets (Sniper Box) */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-500/80 transition-all group-hover:w-8 group-hover:h-8 group-hover:border-cyan-400" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-500/80 transition-all group-hover:w-8 group-hover:h-8 group-hover:border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-500/80 transition-all group-hover:w-8 group-hover:h-8 group-hover:border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-500/80 transition-all group-hover:w-8 group-hover:h-8 group-hover:border-cyan-400" />
              
              <div className="flex flex-col h-full items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full border-2 border-slate-600 flex items-center justify-center mb-6 group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">
                  <LocateFixed size={28} className="text-slate-400 group-hover:text-cyan-400" />
                </div>
                <div className="text-4xl font-black font-mono text-slate-700 absolute top-8 right-8 pointer-events-none group-hover:text-cyan-900/50 transition-colors">
                  0{idx + 1}
                </div>
                <p className="text-2xl font-bold text-slate-200 leading-snug">
                  {typeof bullet === 'string' ? bullet : (bullet as any).text || ''}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer info stats */}
        <div className="mt-auto pt-8 flex justify-between items-center text-slate-500 font-mono text-xs">
          <span>{bullets.length} TARGETS ACQUIRED</span>
          <div className="flex gap-1">
            {[...Array(20)].map((_, i) => (
              <div key={i} className={`h-1.5 w-3 ${i < bullets.length * 5 ? 'bg-cyan-600' : 'bg-slate-800'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export function renderVocationalTargetLockLayoutHTML(model: any, theme: any): string {
  const { title = '本工位目标契约', subtitle = '', bullets = [] } = model;

  const cardsHTML = bullets.map((bulletRaw: any, idx: number) => {
    const text = typeof bulletRaw === 'string' ? bulletRaw : bulletRaw.text || '';
    return `
    <div style="flex:1;background:rgba(15,23,42,0.6);border:1px solid rgba(71,85,105,0.6);position:relative;padding:32px;min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
      <!-- Corner brackets -->
      <div style="position:absolute;top:-2px;left:-2px;width:24px;height:24px;border-top:2px solid #06B6D4;border-left:2px solid #06B6D4;"></div>
      <div style="position:absolute;top:-2px;right:-2px;width:24px;height:24px;border-top:2px solid #06B6D4;border-right:2px solid #06B6D4;"></div>
      <div style="position:absolute;bottom:-2px;left:-2px;width:24px;height:24px;border-bottom:2px solid #06B6D4;border-left:2px solid #06B6D4;"></div>
      <div style="position:absolute;bottom:-2px;right:-2px;width:24px;height:24px;border-bottom:2px solid #06B6D4;border-right:2px solid #06B6D4;"></div>
      <!-- Ghost number -->
      <div style="position:absolute;top:24px;right:24px;font-size:36px;font-weight:900;font-family:monospace;color:rgba(30,41,59,1);pointer-events:none;">0${idx + 1}</div>
      <!-- Target icon -->
      <div style="width:64px;height:64px;border:2px solid #475569;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <div style="width:24px;height:24px;border:2px solid #94A3B8;border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <div style="width:8px;height:8px;background:#06B6D4;border-radius:50%;"></div>
        </div>
      </div>
      <p style="margin:0;font-size:22px;font-weight:700;color:#E2E8F0;line-height:1.4;">${text}</p>
    </div>`;
  }).join('\n');

  const progressBars = `<div style="display:flex;gap:4px;">${
    Array.from({length:20}, (_,i) =>
      `<div style="height:6px;width:12px;background:${i < bullets.length * Math.floor(20 / Math.max(bullets.length,1)) ? '#0891B2' : '#1E293B'};"></div>`
    ).join('')
  }</div>`;

  return `
<section style="width:1280px;height:720px;box-sizing:border-box;background:#0a0f16;color:#FFFFFF;display:flex;flex-direction:column;padding:64px;font-family:'PingFang SC','Microsoft YaHei',sans-serif;overflow:hidden;position:relative;">
  <!-- Radar background circles -->
  <div style="position:absolute;inset:0;z-index:0;opacity:0.15;display:flex;align-items:center;justify-content:center;pointer-events:none;">
    <div style="width:700px;height:700px;border-radius:50%;border:1px solid rgba(6,182,212,0.3);position:absolute;display:flex;align-items:center;justify-content:center;">
      <div style="width:520px;height:520px;border-radius:50%;border:1px solid rgba(6,182,212,0.2);display:flex;align-items:center;justify-content:center;">
        <div style="width:340px;height:340px;border-radius:50%;border:1px dashed rgba(6,182,212,0.4);"></div>
      </div>
      <!-- Crosshairs -->
      <div style="position:absolute;width:100%;height:1px;background:rgba(6,182,212,0.2);"></div>
      <div style="position:absolute;width:1px;height:100%;background:rgba(6,182,212,0.2);"></div>
    </div>
  </div>

  <div style="position:relative;z-index:1;width:100%;display:flex;flex-direction:column;height:100%;">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(8,145,178,0.3);padding-bottom:24px;margin-bottom:40px;">
      <div>
        <div style="display:flex;align-items:center;gap:12px;color:#06B6D4;margin-bottom:12px;font-family:monospace;font-size:13px;letter-spacing:3px;">
          <span>⊕ TARGET IDENTIFICATION &amp; LOCK</span>
        </div>
        <h1 style="margin:0;font-size:48px;font-weight:900;letter-spacing:-1px;">${title}</h1>
      </div>
      ${subtitle ? `<div style="background:rgba(8,145,178,0.15);border:1px solid rgba(8,145,178,0.4);padding:12px 24px;color:#A5F3FC;font-size:16px;font-weight:500;max-width:360px;text-align:right;">${subtitle}</div>` : ''}
    </div>

    <!-- Cards -->
    <div style="flex:1;display:flex;gap:24px;align-items:center;">
      ${cardsHTML}
    </div>

    <!-- Footer progress -->
    <div style="margin-top:24px;display:flex;justify-content:space-between;align-items:center;color:#475569;font-family:monospace;font-size:12px;">
      <span>${bullets.length} TARGETS ACQUIRED</span>
      ${progressBars}
    </div>
  </div>
</section>`;
}
