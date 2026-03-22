import React from 'react';
import type { LayoutModel, ThemeConfig } from '../../types/schema';
import { MousePointerClick, Focus, Play, Scan } from 'lucide-react';

interface Props {
  model: LayoutModel & { layoutId?: string };
  theme: ThemeConfig;
}

export const VocationalPracticeSandboxLayout: React.FC<Props> = ({ model, theme }) => {
  const title = (model as any).title || 'PRACTICAL SANDBOX / 实操沙盘';
  const subtitle = (model as any).subtitle || 'DRAG & DROP SIMULATION MODULE';

  return (
    <div className="w-full h-full bg-[#06090e] p-12 text-slate-300 font-sans flex flex-col relative overflow-hidden">
      
      {/* Background blueprint grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-700/50 p-6 relative z-10 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="bg-cyan-900 text-cyan-400 p-3 rounded">
            <MousePointerClick size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-widest uppercase">{title}</h1>
            <h2 className="text-cyan-600 font-mono tracking-widest text-sm mt-1">{subtitle}</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 border border-slate-600 bg-slate-800 text-slate-400 font-mono text-sm flex items-center gap-2">
            <Scan size={16} /> GRID_SNAP: ON
          </div>
          <button className="px-6 py-2 bg-cyan-600 text-white font-bold tracking-widest hover:bg-cyan-500 transition-colors flex items-center gap-2">
            <Play size={18} fill="currentColor" /> INITIATE_SIM
          </button>
        </div>
      </div>

      {/* Sandbox Workspace */}
      <div className="flex-1 mt-8 border-2 border-dashed border-slate-700 relative flex items-center justify-center">
        {/* Placeholder for the schematic to practice on */}
        <div className="absolute inset-x-1/4 inset-y-1/4 border border-cyan-500/30 bg-cyan-950/10 flex items-center justify-center p-8">
          <Focus size={80} className="text-cyan-800 opacity-50" />
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500" />
        </div>

        {/* Drag Items Tray */}
        <div className="absolute bottom-8 left-8 right-8 h-28 bg-slate-900/80 border border-slate-700 shadow-2xl backdrop-blur-md flex items-center px-6 gap-6">
          <div className="text-slate-500 font-mono text-sm mr-4 writing-vertical-lr tracking-widest border-r border-slate-700 pr-6 h-full flex justify-center">
            COMPONENTS
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-20 h-16 bg-slate-800 border border-slate-600 hover:border-cyan-400 hover:bg-cyan-950/50 transition-colors cursor-move flex items-center justify-center text-slate-400 font-mono text-xs">
              M-0{i}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export function renderVocationalPracticeSandboxLayoutHTML(model: any, theme: any): string {
  const title = (model as any).title || 'PRACTICAL SANDBOX / 实操沙盘';
  const subtitle = (model as any).subtitle || 'DRAG & DROP SIMULATION MODULE';

  const componentSlots = [1,2,3,4,5].map(i =>
    `<div style="width:80px;height:64px;background:#1E293B;border:1px solid #334155;display:flex;align-items:center;justify-content:center;color:#64748B;font-family:monospace;font-size:12px;font-weight:700;">M-0${i}</div>`
  ).join('');

  return `
<section style="width:1280px;height:720px;box-sizing:border-box;background:#06090E;color:#CBD5E1;display:flex;flex-direction:column;padding:48px;font-family:'PingFang SC','Microsoft YaHei',sans-serif;overflow:hidden;position:relative;">
  <!-- Blueprint grid background -->
  <div style="position:absolute;inset:0;opacity:0.08;pointer-events:none;background-image:linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px);background-size:40px 40px;"></div>

  <!-- Header -->
  <div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;background:rgba(15,23,42,0.6);border:1px solid rgba(71,85,105,0.5);padding:24px 32px;margin-bottom:32px;flex-shrink:0;">
    <div style="display:flex;align-items:center;gap:24px;">
      <div style="background:#164E63;padding:12px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;color:#06B6D4;">↖</span>
      </div>
      <div>
        <h1 style="margin:0;font-size:34px;font-weight:900;color:#FFFFFF;letter-spacing:3px;text-transform:uppercase;">${title}</h1>
        <div style="color:#0E7490;font-family:monospace;letter-spacing:3px;font-size:12px;margin-top:4px;">${subtitle}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="padding:8px 16px;border:1px solid #475569;background:#1E293B;color:#64748B;font-family:monospace;font-size:13px;display:flex;align-items:center;gap:8px;">
        ⬛ GRID_SNAP: ON
      </div>
      <div style="padding:8px 24px;background:#0E7490;color:#FFFFFF;font-weight:700;letter-spacing:3px;font-size:14px;display:flex;align-items:center;gap:8px;">
        ▶ INITIATE_SIM
      </div>
    </div>
  </div>

  <!-- Sandbox Work Area -->
  <div style="position:relative;z-index:1;flex:1;border:2px dashed #334155;display:flex;align-items:center;justify-content:center;overflow:hidden;">
    <!-- Inner focus box -->
    <div style="position:absolute;left:25%;right:25%;top:25%;bottom:35%;border:1px solid rgba(6,182,212,0.3);background:rgba(8,145,178,0.04);display:flex;align-items:center;justify-content:center;">
      <!-- Corner markers -->
      <div style="position:absolute;top:0;left:0;width:32px;height:32px;border-top:2px solid #06B6D4;border-left:2px solid #06B6D4;"></div>
      <div style="position:absolute;top:0;right:0;width:32px;height:32px;border-top:2px solid #06B6D4;border-right:2px solid #06B6D4;"></div>
      <div style="position:absolute;bottom:0;left:0;width:32px;height:32px;border-bottom:2px solid #06B6D4;border-left:2px solid #06B6D4;"></div>
      <div style="position:absolute;bottom:0;right:0;width:32px;height:32px;border-bottom:2px solid #06B6D4;border-right:2px solid #06B6D4;"></div>
      <!-- Center radar icon -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;opacity:0.4;">
        <div style="width:80px;height:80px;border:2px solid #0E7490;border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <div style="width:48px;height:48px;border:2px dashed #0E7490;border-radius:50%;display:flex;align-items:center;justify-content:center;">
            <div style="width:12px;height:12px;background:#06B6D4;border-radius:50%;"></div>
          </div>
        </div>
        <span style="font-family:monospace;font-size:12px;color:#0E7490;letter-spacing:2px;">FOCUS_ZONE</span>
      </div>
    </div>

    <!-- Components Tray -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:100px;background:rgba(15,23,42,0.8);border-top:1px solid #334155;display:flex;align-items:center;padding:0 24px;gap:16px;">
      <div style="color:#475569;font-family:monospace;font-size:11px;letter-spacing:3px;border-right:1px solid #334155;padding-right:24px;height:64px;display:flex;align-items:center;flex-shrink:0;">COMPONENTS</div>
      ${componentSlots}
    </div>
  </div>
</section>`;
}
